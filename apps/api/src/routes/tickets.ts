import { Hono } from "hono";
import { supabase } from "../db/supabase.js";
import type { ApiResponse, ContentStatus, Ticket } from "@content-studio/shared";

const tickets = new Hono();

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

  // Confirm the project exists so we return 404 instead of a cryptic FK error
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

  // Next sort_order at the bottom of the backlog column
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

// Update a ticket
tickets.put("/tickets/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{
    title?: string;
    description?: string;
    status?: ContentStatus;
    sort_order?: number;
  }>();

  const clientId = c.req.header("x-client-id") ?? null;

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
    // only updated_by_client — nothing to update
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
