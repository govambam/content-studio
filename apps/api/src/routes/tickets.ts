import { Hono } from "hono";
import { supabase } from "../db/supabase.js";
import type {
  ActivityEventType,
  ApiResponse,
  ContentStatus,
  Ticket,
} from "@content-studio/shared";

const tickets = new Hono();

// Write an activity event; best-effort (log on failure, don't block).
async function writeActivityEvent(
  ticketId: string,
  eventType: ActivityEventType,
  meta: Record<string, unknown>,
  clientId: string | null
): Promise<void> {
  const { error } = await supabase.from("activity_events").insert({
    ticket_id: ticketId,
    event_type: eventType,
    meta: { ...meta, source: clientId },
  });
  if (error) {
    console.error(
      `failed to write activity event ${eventType} for ticket ${ticketId}:`,
      error.message
    );
  }
}

// List tickets in a project
tickets.get("/projects/:projectId/tickets", async (c) => {
  const projectId = c.req.param("projectId");

  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return c.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      500
    );
  }

  return c.json({ data, error: null } satisfies ApiResponse<Ticket[]>);
});

// Create a ticket (bottom of Backlog per PHASE-2-PLAN.md §4, Q7)
tickets.post("/projects/:projectId/tickets", async (c) => {
  const projectId = c.req.param("projectId");
  const body = await c.req.json<{
    title: string;
    description?: string;
  }>();

  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return c.json(
      { data: null, error: "title is required" } satisfies ApiResponse<null>,
      400
    );
  }

  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    return c.json(
      { data: null, error: projectError.message } satisfies ApiResponse<null>,
      500
    );
  }
  if (!projectRow) {
    return c.json(
      { data: null, error: "project not found" } satisfies ApiResponse<null>,
      404
    );
  }

  const { data: maxRow, error: maxError } = await supabase
    .from("tickets")
    .select("sort_order")
    .eq("project_id", projectId)
    .eq("status", "backlog")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) {
    return c.json(
      { data: null, error: maxError.message } satisfies ApiResponse<null>,
      500
    );
  }

  const nextSort = (maxRow?.sort_order ?? -1) + 1;
  const clientId = c.req.header("x-client-id") ?? null;

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      project_id: projectId,
      title: body.title.trim(),
      description: body.description ?? "",
      sort_order: nextSort,
      updated_by_client: clientId,
    })
    .select()
    .single();

  if (error) {
    return c.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      500
    );
  }

  await writeActivityEvent(data.id, "ticket_created", {}, clientId);

  return c.json({ data, error: null } satisfies ApiResponse<Ticket>, 201);
});

// Get a single ticket
tickets.get("/tickets/:id", async (c) => {
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return c.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      status
    );
  }

  return c.json({ data, error: null } satisfies ApiResponse<Ticket>);
});

// Update a ticket + emit activity events for any fields that changed
tickets.put("/tickets/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{
    title?: string;
    description?: string;
    status?: ContentStatus;
    sort_order?: number;
  }>();

  const clientId = c.req.header("x-client-id") ?? null;

  // Fetch the prior row so we can compute diffs for activity events and
  // return a proper 404 when the ticket does not exist.
  const { data: prior, error: priorError } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (priorError) {
    return c.json(
      { data: null, error: priorError.message } satisfies ApiResponse<null>,
      500
    );
  }
  if (!prior) {
    return c.json(
      { data: null, error: "not found" } satisfies ApiResponse<null>,
      404
    );
  }

  const patch: Record<string, unknown> = { updated_by_client: clientId };
  if ("title" in body) {
    if (
      typeof body.title !== "string" ||
      body.title.trim().length === 0
    ) {
      return c.json(
        { data: null, error: "title must be a non-empty string" } satisfies ApiResponse<null>,
        400
      );
    }
    patch.title = body.title.trim();
  }
  if ("description" in body) patch.description = body.description;
  if ("status" in body) patch.status = body.status;
  if ("sort_order" in body) patch.sort_order = body.sort_order;

  if (Object.keys(patch).length === 1) {
    return c.json(
      { data: null, error: "no fields to update" } satisfies ApiResponse<null>,
      400
    );
  }

  const { data, error } = await supabase
    .from("tickets")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return c.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      status
    );
  }

  // Emit activity events for anything that actually changed. sort_order
  // changes are intentionally NOT recorded — drag-and-drop would flood
  // the feed with every reorder. The spec records status changes for
  // both the drag and the dropdown cases, but not pure reorders.
  if ("title" in patch && patch.title !== prior.title) {
    await writeActivityEvent(
      id,
      "title_changed",
      { from: prior.title, to: patch.title },
      clientId
    );
  }
  if ("description" in patch && patch.description !== prior.description) {
    await writeActivityEvent(id, "description_changed", {}, clientId);
  }
  if ("status" in patch && patch.status !== prior.status) {
    await writeActivityEvent(
      id,
      "status_changed",
      { from: prior.status, to: patch.status },
      clientId
    );
  }

  return c.json({ data, error: null } satisfies ApiResponse<Ticket>);
});

// Delete a ticket (cascades assets, comments, activity)
tickets.delete("/tickets/:id", async (c) => {
  const id = c.req.param("id");

  const { error } = await supabase
    .from("tickets")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return c.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      status
    );
  }

  return c.json({ data: null, error: null } satisfies ApiResponse<null>);
});

export default tickets;
