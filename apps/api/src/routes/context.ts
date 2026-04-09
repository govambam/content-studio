import { Hono } from "hono";
import { supabase } from "../db/supabase.js";
import type { ApiResponse, ContextFile } from "@content-studio/shared";

const context = new Hono();

// List context files for a project
context.get("/projects/:projectId/context", async (c) => {
  const projectId = c.req.param("projectId");

  const { data, error } = await supabase
    .from("context_files")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return c.json({ data: null, error: error.message } satisfies ApiResponse<null>, 500);
  }

  return c.json({ data, error: null } satisfies ApiResponse<ContextFile[]>);
});

// Upload a context file
context.post("/projects/:projectId/context", async (c) => {
  const projectId = c.req.param("projectId");
  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  const fileType = (formData.get("file_type") as string) || "other";

  if (!file) {
    return c.json({ data: null, error: "file is required" } satisfies ApiResponse<null>, 400);
  }

  // Upload to Supabase Storage
  const storagePath = `${projectId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("context-files")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return c.json({ data: null, error: uploadError.message } satisfies ApiResponse<null>, 500);
  }

  // Extract text content for Claude context injection
  const textContent = await file.text();

  // Create the database record
  const { data, error } = await supabase
    .from("context_files")
    .insert({
      project_id: projectId,
      name: file.name,
      file_path: storagePath,
      file_type: fileType,
      size_bytes: file.size,
      content_text: textContent,
    })
    .select()
    .single();

  if (error) {
    return c.json({ data: null, error: error.message } satisfies ApiResponse<null>, 500);
  }

  return c.json({ data, error: null } satisfies ApiResponse<ContextFile>, 201);
});

// Delete a context file
context.delete("/context/:id", async (c) => {
  const id = c.req.param("id");

  // Get the file record to find the storage path
  const { data: file, error: fetchError } = await supabase
    .from("context_files")
    .select("file_path")
    .eq("id", id)
    .single();

  if (fetchError) {
    const status = fetchError.code === "PGRST116" ? 404 : 500;
    return c.json({ data: null, error: fetchError.message } satisfies ApiResponse<null>, status);
  }

  // Delete from storage
  await supabase.storage.from("context-files").remove([file.file_path]);

  // Delete the database record
  const { error } = await supabase
    .from("context_files")
    .delete()
    .eq("id", id);

  if (error) {
    return c.json({ data: null, error: error.message } satisfies ApiResponse<null>, 500);
  }

  return c.json({ data: null, error: null } satisfies ApiResponse<null>);
});

export default context;
