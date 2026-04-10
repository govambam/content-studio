import { Hono } from "hono";
import { supabase } from "../db/supabase.js";
import type { ApiResponse, Comment } from "@content-studio/shared";

const comments = new Hono();

// List comments on a ticket (oldest first)
comments.get("/tickets/:ticketId/comments", async (c) => {
  const ticketId = c.req.param("ticketId");

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    return c.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      500
    );
  }

  return c.json({ data, error: null } satisfies ApiResponse<Comment[]>);
});

// Create a comment (also writes an activity event)
comments.post("/tickets/:ticketId/comments", async (c) => {
  const ticketId = c.req.param("ticketId");
  const body = await c.req.json<{ body: string }>();

  const trimmed = typeof body.body === "string" ? body.body.trim() : "";
  if (!trimmed) {
    return c.json(
      { data: null, error: "body is required" } satisfies ApiResponse<null>,
      400
    );
  }

  // Verify the ticket exists so we return 404 rather than a cryptic FK error
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

  const { data, error } = await supabase
    .from("comments")
    .insert({ ticket_id: ticketId, body: trimmed })
    .select()
    .single();

  if (error) {
    return c.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      500
    );
  }

  // Best-effort activity event
  const { error: actError } = await supabase.from("activity_events").insert({
    ticket_id: ticketId,
    event_type: "comment_added",
    meta: { comment_id: data.id, source: clientId },
  });
  if (actError) {
    console.error(
      `failed to write comment_added activity for comment ${data.id}:`,
      actError.message
    );
  }

  return c.json({ data, error: null } satisfies ApiResponse<Comment>, 201);
});

// Update a comment body (no activity event per spec §6.1)
comments.put("/comments/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ body: string }>();

  const trimmed = typeof body.body === "string" ? body.body.trim() : "";
  if (!trimmed) {
    return c.json(
      { data: null, error: "body is required" } satisfies ApiResponse<null>,
      400
    );
  }

  const { data, error } = await supabase
    .from("comments")
    .update({ body: trimmed })
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

  return c.json({ data, error: null } satisfies ApiResponse<Comment>);
});

// Delete a comment (no activity event per spec §6.1)
comments.delete("/comments/:id", async (c) => {
  const id = c.req.param("id");

  const { error } = await supabase
    .from("comments")
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

export default comments;
