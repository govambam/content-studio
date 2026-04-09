import { Hono } from "hono";
import { supabase } from "../db/supabase.js";
import type { ApiResponse, Card } from "@content-studio/shared";

const cards = new Hono();

// List cards for a project (with artifacts summary)
cards.get("/projects/:projectId/cards", async (c) => {
  const projectId = c.req.param("projectId");

  const { data, error } = await supabase
    .from("cards")
    .select("*, artifacts(id, type, status)")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return c.json({ data: null, error: error.message } satisfies ApiResponse<null>, 500);
  }

  return c.json({ data, error: null });
});

// Create a card manually
cards.post("/projects/:projectId/cards", async (c) => {
  const projectId = c.req.param("projectId");
  const body = await c.req.json<{
    title: string;
    summary?: string;
    content_type?: "short" | "long";
    created_by?: "ai" | "user";
  }>();

  if (!body.title) {
    return c.json({ data: null, error: "title is required" } satisfies ApiResponse<null>, 400);
  }

  // Get max sort_order for the unreviewed stage
  const { data: maxCard, error: maxError } = await supabase
    .from("cards")
    .select("sort_order")
    .eq("project_id", projectId)
    .eq("stage", "unreviewed")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) {
    return c.json({ data: null, error: maxError.message } satisfies ApiResponse<null>, 500);
  }

  const nextSort = (maxCard?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("cards")
    .insert({
      project_id: projectId,
      title: body.title,
      summary: body.summary ?? "",
      content_type: body.content_type ?? "short",
      created_by: body.created_by ?? "user",
      sort_order: nextSort,
    })
    .select()
    .single();

  if (error) {
    return c.json({ data: null, error: error.message } satisfies ApiResponse<null>, 500);
  }

  return c.json({ data, error: null } satisfies ApiResponse<Card>, 201);
});

// Get a single card with artifacts and recent chat
cards.get("/cards/:id", async (c) => {
  const id = c.req.param("id");

  const { data: card, error } = await supabase
    .from("cards")
    .select("*, artifacts(*)")
    .eq("id", id)
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return c.json({ data: null, error: error.message } satisfies ApiResponse<null>, status);
  }

  // Get recent chat messages
  const { data: messages } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("card_id", id)
    .order("created_at", { ascending: true })
    .limit(50);

  return c.json({ data: { ...card, messages: messages ?? [] }, error: null });
});

// Update a card
cards.put("/cards/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Record<string, unknown>>();

  const allowedFields = ["title", "summary", "stage", "content_type", "sort_order"] as const;
  const sanitized: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      sanitized[key] = body[key];
    }
  }

  const { data, error } = await supabase
    .from("cards")
    .update(sanitized)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return c.json({ data: null, error: error.message } satisfies ApiResponse<null>, status);
  }

  return c.json({ data, error: null } satisfies ApiResponse<Card>);
});

// Delete a card and all children (cascade)
cards.delete("/cards/:id", async (c) => {
  const id = c.req.param("id");

  const { error } = await supabase
    .from("cards")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return c.json({ data: null, error: error.message } satisfies ApiResponse<null>, status);
  }

  return c.json({ data: null, error: null } satisfies ApiResponse<null>);
});

export default cards;
