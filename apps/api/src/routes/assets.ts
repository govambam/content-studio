import { Hono } from "hono";
import { supabase } from "../db/supabase.js";
import { parseBody, parseParams } from "../lib/validate.js";
import {
  createAssetSchema,
  idParam,
  ticketIdParam,
} from "../lib/schemas.js";
import { resolveMimeType } from "../lib/mimeTypes.js";
import type { ApiResponse, Asset } from "@content-studio/shared";

const assets = new Hono();

const BUCKET = "assets";
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// List assets on a ticket
assets.get("/tickets/:ticketId/assets", async (c) => {
  const params = parseParams(c, ticketIdParam);
  if (!params.ok) return params.response;
  const ticketId = params.data.ticketId;

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    return c.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      500
    );
  }

  return c.json({ data, error: null } satisfies ApiResponse<Asset[]>);
});

// Create an asset row and return a signed upload URL so the client can
// PUT the file bytes directly to Supabase Storage.
assets.post("/tickets/:ticketId/assets", async (c) => {
  const params = parseParams(c, ticketIdParam);
  if (!params.ok) return params.response;
  const ticketId = params.data.ticketId;
  const parsed = await parseBody(c, createAssetSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  if (body.size_bytes > MAX_SIZE_BYTES) {
    return c.json(
      {
        data: null,
        error: `file exceeds ${MAX_SIZE_BYTES / (1024 * 1024)} MB limit`,
      } satisfies ApiResponse<null>,
      400
    );
  }

  // Resolve MIME server-side. We do NOT trust body.mime_type past the
  // allowlist check; resolveMimeType either returns a canonical type
  // or rejects the upload outright.
  const resolvedMime = resolveMimeType(body.filename, body.mime_type);
  if (!resolvedMime.ok) {
    return c.json(
      { data: null, error: resolvedMime.reason ?? "mime type not allowed" } satisfies ApiResponse<null>,
      400
    );
  }

  // Verify the parent ticket
  const { data: ticketRow, error: ticketError } = await supabase
    .from("tickets")
    .select("id")
    .eq("id", ticketId)
    .maybeSingle();
  if (ticketError) {
    return c.json(
      { data: null, error: ticketError.message } satisfies ApiResponse<null>,
      500
    );
  }
  if (!ticketRow) {
    return c.json(
      { data: null, error: "ticket not found" } satisfies ApiResponse<null>,
      404
    );
  }

  const clientId = c.req.header("x-client-id") ?? null;

  // Insert the asset row first. We need its id for the storage path so
  // the file and the row are linked 1:1. Store the server-resolved MIME
  // so the row reflects what we validated, not what the caller claimed.
  const { data: assetRow, error: insertError } = await supabase
    .from("assets")
    .insert({
      ticket_id: ticketId,
      filename: body.filename,
      mime_type: resolvedMime.mimeType,
      size_bytes: body.size_bytes,
      storage_path: "",
    })
    .select()
    .single();

  if (insertError || !assetRow) {
    return c.json(
      {
        data: null,
        error: insertError?.message ?? "asset row insert failed",
      } satisfies ApiResponse<null>,
      500
    );
  }

  const storagePath = `${ticketId}/${assetRow.id}-${sanitizeFilename(
    body.filename
  )}`;

  // Patch the row with its storage path
  const { error: patchError } = await supabase
    .from("assets")
    .update({ storage_path: storagePath })
    .eq("id", assetRow.id);
  if (patchError) {
    await supabase.from("assets").delete().eq("id", assetRow.id);
    return c.json(
      { data: null, error: patchError.message } satisfies ApiResponse<null>,
      500
    );
  }

  // Request a signed upload URL. The client PUTs the bytes directly.
  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath);

  if (signError || !signed) {
    // Cleanup the orphan row
    await supabase.from("assets").delete().eq("id", assetRow.id);
    return c.json(
      {
        data: null,
        error: signError?.message ?? "failed to sign upload url",
      } satisfies ApiResponse<null>,
      500
    );
  }

  // NOTE: no activity event here. The client has not PUT the bytes
  // yet — writing `asset_uploaded` at this point means the feed shows
  // an upload that may never have completed. The client calls
  // POST /assets/:id/confirm after a successful PUT, which is where
  // the event is written. See asset_uploaded ordering fix.

  return c.json(
    {
      data: {
        asset: { ...assetRow, storage_path: storagePath, mime_type: resolvedMime.mimeType },
        upload: signed,
      },
      error: null,
    } satisfies ApiResponse<{
      asset: Asset;
      upload: { signedUrl: string; token: string; path: string };
    }>,
    201
  );
});

// Confirm that the client successfully PUT the bytes to the signed
// URL. This is where the `asset_uploaded` activity event gets written,
// so the feed only shows uploads that actually completed.
assets.post("/assets/:id/confirm", async (c) => {
  const params = parseParams(c, idParam);
  if (!params.ok) return params.response;
  const id = params.data.id;
  const clientId = c.req.header("x-client-id") ?? null;

  const { data: row, error: rowError } = await supabase
    .from("assets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (rowError) {
    return c.json(
      { data: null, error: rowError.message } satisfies ApiResponse<null>,
      500
    );
  }
  if (!row) {
    return c.json(
      { data: null, error: "asset not found" } satisfies ApiResponse<null>,
      404
    );
  }

  // Idempotency: a retried confirm (network hiccup, double-click, etc.)
  // must not produce duplicate `asset_uploaded` events. Check for an
  // existing event keyed on `meta->>'asset_id'` before inserting. This
  // still has a race under concurrent retries, but for the 3-user team
  // using this app the pre-check closes the common case.
  const { data: existing, error: existingError } = await supabase
    .from("activity_events")
    .select("id")
    .eq("ticket_id", row.ticket_id)
    .eq("event_type", "asset_uploaded")
    .eq("meta->>asset_id", row.id)
    .limit(1)
    .maybeSingle();
  if (existingError) {
    c.get("logger").warn(
      { err: existingError.message, assetId: row.id },
      "activity_event_idempotency_check_failed"
    );
    // Don't block the confirm on a failed pre-check — fall through and
    // accept the (very unlikely) duplicate.
  }
  if (!existing) {
    const { error: actError } = await supabase.from("activity_events").insert({
      ticket_id: row.ticket_id,
      event_type: "asset_uploaded",
      meta: {
        asset_id: row.id,
        filename: row.filename,
        source: clientId,
      },
    });
    if (actError) {
      c.get("logger").error(
        { err: actError.message, assetId: row.id, ticketId: row.ticket_id },
        "activity_event_write_failed"
      );
    }
  }

  return c.json({ data: null, error: null } satisfies ApiResponse<null>);
});

// Signed download URL for an asset (short TTL)
assets.get("/assets/:id/download", async (c) => {
  const params = parseParams(c, idParam);
  if (!params.ok) return params.response;
  const id = params.data.id;

  const { data: row, error: rowError } = await supabase
    .from("assets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (rowError) {
    return c.json(
      { data: null, error: rowError.message } satisfies ApiResponse<null>,
      500
    );
  }
  if (!row) {
    return c.json(
      { data: null, error: "asset not found" } satisfies ApiResponse<null>,
      404
    );
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, 300);

  if (signError || !signed) {
    return c.json(
      {
        data: null,
        error: signError?.message ?? "failed to sign url",
      } satisfies ApiResponse<null>,
      500
    );
  }

  return c.json(
    { data: { url: signed.signedUrl }, error: null } satisfies ApiResponse<{
      url: string;
    }>
  );
});

// Delete an asset (row + storage object + activity event)
assets.delete("/assets/:id", async (c) => {
  const params = parseParams(c, idParam);
  if (!params.ok) return params.response;
  const id = params.data.id;
  const clientId = c.req.header("x-client-id") ?? null;

  const { data: row, error: rowError } = await supabase
    .from("assets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (rowError) {
    return c.json(
      { data: null, error: rowError.message } satisfies ApiResponse<null>,
      500
    );
  }
  if (!row) {
    return c.json(
      { data: null, error: "asset not found" } satisfies ApiResponse<null>,
      404
    );
  }

  // Remove the storage object first; if it fails, surface but still
  // continue — a dangling row is worse than a dangling object.
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([row.storage_path]);
  if (storageError) {
    c.get("logger").error(
      { err: storageError.message, storagePath: row.storage_path },
      "storage_object_remove_failed"
    );
  }

  const { error: deleteError } = await supabase
    .from("assets")
    .delete()
    .eq("id", id);
  if (deleteError) {
    return c.json(
      { data: null, error: deleteError.message } satisfies ApiResponse<null>,
      500
    );
  }

  const { error: actError } = await supabase.from("activity_events").insert({
    ticket_id: row.ticket_id,
    event_type: "asset_deleted",
    meta: { filename: row.filename, source: clientId },
  });
  if (actError) {
    c.get("logger").error(
      { err: actError.message, assetId: id, ticketId: row.ticket_id },
      "activity_event_write_failed"
    );
  }

  return c.json({ data: null, error: null } satisfies ApiResponse<null>);
});

function sanitizeFilename(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

export default assets;
