import { Hono } from "hono";
import { supabase } from "../db/supabase.js";
import type { ApiResponse, Asset } from "@content-studio/shared";

const assets = new Hono();

const BUCKET = "assets";
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// List assets on a ticket
assets.get("/tickets/:ticketId/assets", async (c) => {
  const ticketId = c.req.param("ticketId");

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
  const ticketId = c.req.param("ticketId");
  const body = await c.req.json<{
    filename: string;
    mime_type: string;
    size_bytes: number;
  }>();

  if (!body || typeof body.filename !== "string" || !body.filename.trim()) {
    return c.json(
      { data: null, error: "filename is required" } satisfies ApiResponse<null>,
      400
    );
  }
  if (typeof body.size_bytes !== "number" || body.size_bytes < 0) {
    return c.json(
      { data: null, error: "size_bytes must be a non-negative number" } satisfies ApiResponse<null>,
      400
    );
  }
  if (body.size_bytes > MAX_SIZE_BYTES) {
    return c.json(
      {
        data: null,
        error: `file exceeds ${MAX_SIZE_BYTES / (1024 * 1024)} MB limit`,
      } satisfies ApiResponse<null>,
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
  // the file and the row are linked 1:1.
  const { data: assetRow, error: insertError } = await supabase
    .from("assets")
    .insert({
      ticket_id: ticketId,
      filename: body.filename.trim(),
      mime_type: typeof body.mime_type === "string" ? body.mime_type : "",
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

  // Best-effort activity event. We write it here even though the client
  // hasn't physically uploaded the bytes yet — the row exists, and if
  // the PUT fails, the client is expected to DELETE the asset which
  // will emit asset_deleted.
  const { error: actError } = await supabase.from("activity_events").insert({
    ticket_id: ticketId,
    event_type: "asset_uploaded",
    meta: {
      asset_id: assetRow.id,
      filename: assetRow.filename,
      source: clientId,
    },
  });
  if (actError) {
    console.error(
      `failed to write asset_uploaded activity for asset ${assetRow.id}:`,
      actError.message
    );
  }

  return c.json(
    {
      data: {
        asset: { ...assetRow, storage_path: storagePath },
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

// Signed download URL for an asset (short TTL)
assets.get("/assets/:id/download", async (c) => {
  const id = c.req.param("id");

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
  const id = c.req.param("id");
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
    console.error(
      `failed to remove storage object ${row.storage_path}:`,
      storageError.message
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
    console.error(
      `failed to write asset_deleted activity for asset ${id}:`,
      actError.message
    );
  }

  return c.json({ data: null, error: null } satisfies ApiResponse<null>);
});

function sanitizeFilename(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

export default assets;
