import { Hono } from "hono";
import { supabase } from "../db/supabase.js";
import { generateIdeas } from "../services/idea-generator.js";
import { generateArtifact } from "../services/artifact-generator.js";
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

// Generate a demo flow or script artifact for a card
ai.post("/cards/:cardId/generate-artifact", async (c) => {
  const cardId = c.req.param("cardId");
  const body = await c.req.json<{ type: "demo-flow" | "script" }>();

  if (!body.type || (body.type !== "demo-flow" && body.type !== "script")) {
    return c.json(
      { data: null, error: "type must be 'demo-flow' or 'script'" } satisfies ApiResponse<null>,
      400
    );
  }

  try {
    const result = await generateArtifact(cardId, body.type);
    return c.json({ data: result.artifact, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ data: null, error: message } satisfies ApiResponse<null>, 500);
  }
});

export default ai;
