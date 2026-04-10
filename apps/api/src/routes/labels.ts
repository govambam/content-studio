import { Hono } from "hono";
import { supabase } from "../db/supabase.js";
import { parseBody, parseParams } from "../lib/validate.js";
import {
  createLabelSchema,
  idParam,
  updateLabelSchema,
} from "../lib/schemas.js";
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
  const parsed = await parseBody(c, createLabelSchema);
  if (!parsed.ok) return parsed.response;

  const { data, error } = await supabase
    .from("labels")
    .insert({ name: parsed.data.name, color: parsed.data.color })
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
  const params = parseParams(c, idParam);
  if (!params.ok) return params.response;

  const { count, error } = await supabase
    .from("project_labels")
    .select("project_id", { count: "exact", head: true })
    .eq("label_id", params.data.id);

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
  const params = parseParams(c, idParam);
  if (!params.ok) return params.response;

  const { data, error } = await supabase
    .from("labels")
    .select("*")
    .eq("id", params.data.id)
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
  const params = parseParams(c, idParam);
  if (!params.ok) return params.response;
  const parsed = await parseBody(c, updateLabelSchema);
  if (!parsed.ok) return parsed.response;

  const { data, error } = await supabase
    .from("labels")
    .update(parsed.data)
    .eq("id", params.data.id)
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
  const params = parseParams(c, idParam);
  if (!params.ok) return params.response;

  const { error } = await supabase
    .from("labels")
    .delete()
    .eq("id", params.data.id)
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
