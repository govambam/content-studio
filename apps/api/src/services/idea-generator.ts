import { supabase } from "../db/supabase.js";
import { callClaude } from "./claude.js";
import { buildSystemPrompt } from "../prompts/system.js";
import { buildGenerateIdeasPrompt } from "../prompts/generate-ideas.js";
import type { ContextFile } from "@content-studio/shared";

interface GeneratedIdea {
  title: string;
  summary: string;
  content_type: "short" | "long";
}

export async function generateIdeas(
  projectId: string,
  jobId: string
): Promise<void> {
  // Mark job as running
  await supabase
    .from("worker_jobs")
    .update({ status: "running" })
    .eq("id", jobId);

  try {
    // Get project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Get context files
    const { data: contextFiles } = await supabase
      .from("context_files")
      .select("*")
      .eq("project_id", projectId);

    // Get existing card titles to avoid duplicates
    const { data: existingCards } = await supabase
      .from("cards")
      .select("title")
      .eq("project_id", projectId);

    const existingTitles = (existingCards ?? []).map((c) => c.title);

    // Build prompts
    const systemPrompt = buildSystemPrompt(
      project.name,
      (contextFiles ?? []) as ContextFile[]
    );
    const userPrompt = buildGenerateIdeasPrompt(existingTitles);

    // Call Claude
    const rawResponse = await callClaude(systemPrompt, userPrompt);

    // Parse ideas from response
    let ideas: GeneratedIdea[];
    try {
      ideas = JSON.parse(rawResponse);
    } catch {
      // Try extracting JSON from markdown fencing
      const match = rawResponse.match(/\[[\s\S]*\]/);
      if (!match) {
        throw new Error(`Failed to parse Claude response as JSON: ${rawResponse.slice(0, 200)}`);
      }
      ideas = JSON.parse(match[0]);
    }

    if (!Array.isArray(ideas) || ideas.length === 0) {
      throw new Error("Claude returned no ideas");
    }

    // Get max sort_order for unreviewed stage
    const { data: maxCard } = await supabase
      .from("cards")
      .select("sort_order")
      .eq("project_id", projectId)
      .eq("stage", "unreviewed")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextSort = (maxCard?.sort_order ?? -1) + 1;

    // Create cards for each idea
    const cardInserts = ideas.map((idea) => ({
      project_id: projectId,
      title: idea.title,
      summary: idea.summary,
      content_type: idea.content_type === "long" ? "long" : "short",
      stage: "unreviewed" as const,
      created_by: "ai" as const,
      sort_order: nextSort++,
    }));

    const { error: insertError } = await supabase
      .from("cards")
      .insert(cardInserts);

    if (insertError) {
      throw new Error(`Failed to insert cards: ${insertError.message}`);
    }

    // Mark job as completed
    await supabase
      .from("worker_jobs")
      .update({
        status: "completed",
        result: { ideas_count: ideas.length },
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Update job attempts and status
    const { data: job } = await supabase
      .from("worker_jobs")
      .select("attempts")
      .eq("id", jobId)
      .single();

    const attempts = (job?.attempts ?? 0) + 1;

    await supabase
      .from("worker_jobs")
      .update({
        status: "failed",
        error: errorMessage,
        attempts,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}
