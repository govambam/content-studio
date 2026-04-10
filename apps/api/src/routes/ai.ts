import { Hono } from "hono";
import { supabase } from "../db/supabase.js";
import { generateIdeas } from "../services/idea-generator.js";
import type { ApiResponse } from "@content-studio/shared";

const ai = new Hono();

// Generate ideas for a project
ai.post("/projects/:projectId/generate-ideas", async (c) => {
  const projectId = c.req.param("projectId");

  // Verify project exists
  const { error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .single();

  if (projectError) {
    const status = projectError.code === "PGRST116" ? 404 : 500;
    return c.json(
      { data: null, error: projectError.message } satisfies ApiResponse<null>,
      status
    );
  }

  // Create a worker job
  const { data: job, error: jobError } = await supabase
    .from("worker_jobs")
    .insert({
      task_type: "generate-ideas",
      payload: { project_id: projectId },
      status: "pending",
    })
    .select()
    .single();

  if (jobError || !job) {
    return c.json(
      { data: null, error: jobError?.message ?? "Failed to create job" } satisfies ApiResponse<null>,
      500
    );
  }

  // Run the generation in the background (non-blocking)
  generateIdeas(projectId, job.id).catch((err) => {
    console.error("Idea generation failed:", err);
  });

  return c.json({ data: { job_id: job.id }, error: null }, 202);
});

export default ai;
