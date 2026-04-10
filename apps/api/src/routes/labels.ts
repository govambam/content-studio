import { Hono } from "hono";
import { supabase } from "../db/supabase.js";
import type { ApiResponse, Label } from "@content-studio/shared";

const labels = new Hono();

// List all labels, ordered by name
labels.get("/", async (c) => {
  const { data, error } = await supabase
    .from("labels")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return c.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      500
    );
  }

  return c.json({ data, error: null } satisfies ApiResponse<Label[]>);
});

// Create a label
labels.post("/", async (c) => {
  const body = await c.req.json<{ name: string; color: string }>();

  if (!body.name || !body.color) {
    return c.json(
      { data: null, error: "name and color are required" } satisfies ApiResponse<null>,
      400
    );
  }

  const { data, error } = await supabase
    .from("labels")
    .insert({ name: body.name, color: body.color })
    .select()
    .single();

  if (error) {
    return c.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      500
    );
  }

  return c.json({ data, error: null } satisfies ApiResponse<Label>, 201);
});

// Report how many projects use a label (for the delete confirm dialog)
labels.get("/:id/usage", async (c) => {
  const id = c.req.param("id");

  const { count, error } = await supabase
    .from("project_labels")
    .select("project_id", { count: "exact", head: true })
    .eq("label_id", id);

  if (error) {
    return c.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      500
    );
  }

  return c.json(
    {
      data: { project_count: count ?? 0 },
      error: null,
    } satisfies ApiResponse<{ project_count: number }>
  );
});

// Get a single label
labels.get("/:id", async (c) => {
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("labels")
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

  return c.json({ data, error: null } satisfies ApiResponse<Label>);
});

// Update a label
labels.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Partial<Pick<Label, "name" | "color">>>();

  const sanitized: Record<string, unknown> = {};
  if ("name" in body) {
    const trimmed = typeof body.name === "string" ? body.name.trim() : "";
    if (!trimmed) {
      return c.json(
        { data: null, error: "name must be a non-empty string" } satisfies ApiResponse<null>,
        400
      );
    }
    sanitized.name = trimmed;
  }
  if ("color" in body) {
    const trimmed = typeof body.color === "string" ? body.color.trim() : "";
    if (!trimmed) {
      return c.json(
        { data: null, error: "color must be a non-empty string" } satisfies ApiResponse<null>,
        400
      );
    }
    sanitized.color = trimmed;
  }

  if (Object.keys(sanitized).length === 0) {
    return c.json(
      {
        data: null,
        error: "at least one field (name or color) is required",
      } satisfies ApiResponse<null>,
      400
    );
  }

  const { data, error } = await supabase
    .from("labels")
    .update(sanitized)
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

  return c.json({ data, error: null } satisfies ApiResponse<Label>);
});

// Delete a label (cascades project_labels rows; projects themselves stay)
labels.delete("/:id", async (c) => {
  const id = c.req.param("id");

  const { error } = await supabase
    .from("labels")
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

export default labels;
