import { supabase } from "../db/supabase.js";
import { callClaude } from "./claude.js";
import { buildSystemPrompt } from "../prompts/system.js";
import {
  buildGenerateDemoFlowPrompt,
  buildGenerateScriptPrompt,
} from "../prompts/generate-artifact.js";
import type { ContextFile } from "@content-studio/shared";

type ArtifactType = "demo-flow" | "script";

interface GenerateResult {
  artifact: {
    id: string;
    type: string;
    content: string;
    status: string;
  };
}

export async function generateArtifact(
  cardId: string,
  type: ArtifactType
): Promise<GenerateResult> {
  // Get the card with its artifacts
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("*, artifacts(*)")
    .eq("id", cardId)
    .single();

  if (cardError || !card) {
    throw new Error(cardError?.message ?? "Card not found");
  }

  // Get project context
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", card.project_id)
    .single();

  const { data: contextFiles } = await supabase
    .from("context_files")
    .select("*")
    .eq("project_id", card.project_id);

  // Build prompts
  const systemPrompt = buildSystemPrompt(
    project?.name ?? "Unknown",
    (contextFiles ?? []) as ContextFile[]
  );

  const artifacts = card.artifacts as Array<{ id: string; type: string; content: string }>;
  const demoFlow = artifacts.find((a) => a.type === "demo-flow");

  const userPrompt =
    type === "demo-flow"
      ? buildGenerateDemoFlowPrompt(card.title, card.summary, card.content_type)
      : buildGenerateScriptPrompt(
          card.title,
          card.summary,
          card.content_type,
          demoFlow?.content ?? null
        );

  // Call Claude — expect plain markdown
  const rawContent = await callClaude(systemPrompt, userPrompt);

  // Clean up any accidental code fences around the whole thing
  let content = rawContent.trim();
  if (content.startsWith("```markdown")) {
    content = content.replace(/^```markdown\n?/, "").replace(/\n?```$/, "");
  } else if (content.startsWith("```")) {
    content = content.replace(/^```\n?/, "").replace(/\n?```$/, "");
  }

  // Create or update the artifact
  const existing = artifacts.find((a) => a.type === type);

  let artifactRecord;
  if (existing) {
    const { data, error } = await supabase
      .from("artifacts")
      .update({ content, status: "draft" })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    artifactRecord = data;
  } else {
    const { data, error } = await supabase
      .from("artifacts")
      .insert({
        card_id: cardId,
        type,
        title: type === "demo-flow" ? "Demo Flow" : "Script",
        content,
        status: "draft",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    artifactRecord = data;
  }

  // Post a system event to the thread
  const label = type === "demo-flow" ? "Demo Flow" : "Script";
  await supabase.from("chat_messages").insert({
    card_id: cardId,
    role: "system",
    content: `${label} ${existing ? "regenerated" : "created"}`,
  });

  return {
    artifact: {
      id: artifactRecord.id,
      type: artifactRecord.type,
      content: artifactRecord.content,
      status: artifactRecord.status,
    },
  };
}
