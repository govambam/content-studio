import { Hono } from "hono";
import { supabase } from "../db/supabase.js";
import { callClaude } from "../services/claude.js";
import { buildSystemPrompt } from "../prompts/system.js";
import { buildChatPrompt } from "../prompts/chat.js";
import type { ApiResponse, ContextFile, ChatMessage } from "@content-studio/shared";

const chat = new Hono();

// Get chat history for a card
chat.get("/cards/:cardId/chat", async (c) => {
  const cardId = c.req.param("cardId");
  const limit = parseInt(c.req.query("limit") || "50", 10) || 50;
  const offset = parseInt(c.req.query("offset") || "0", 10) || 0;

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("card_id", cardId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return c.json({ data: null, error: error.message } satisfies ApiResponse<null>, 500);
  }

  return c.json({ data, error: null } satisfies ApiResponse<ChatMessage[]>);
});

// Send a message — triggers Claude response
chat.post("/cards/:cardId/chat", async (c) => {
  const cardId = c.req.param("cardId");
  const body = await c.req.json<{
    content: string;
    active_tab?: string;
  }>();

  if (!body.content) {
    return c.json({ data: null, error: "content is required" } satisfies ApiResponse<null>, 400);
  }

  // Get the card with its project
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("*, artifacts(*)")
    .eq("id", cardId)
    .single();

  if (cardError || !card) {
    const status = cardError?.code === "PGRST116" ? 404 : 500;
    return c.json({ data: null, error: cardError?.message ?? "Card not found" } satisfies ApiResponse<null>, status);
  }

  // Save the user's message first (never lose it)
  const { data: userMsg, error: userMsgError } = await supabase
    .from("chat_messages")
    .insert({
      card_id: cardId,
      role: "user",
      content: body.content,
    })
    .select()
    .single();

  if (userMsgError) {
    return c.json({ data: null, error: userMsgError.message } satisfies ApiResponse<null>, 500);
  }

  // Get project and context
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", card.project_id)
    .single();

  const { data: contextFiles } = await supabase
    .from("context_files")
    .select("*")
    .eq("project_id", card.project_id);

  // Get most recent 20 messages for context (descending, then reverse)
  const { data: historyDesc } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("card_id", cardId)
    .order("created_at", { ascending: false })
    .limit(20);

  const history = (historyDesc ?? []).reverse();

  // Build system prompt with card context
  const activeTab = body.active_tab ?? "details";
  let systemPrompt = buildSystemPrompt(
    project?.name ?? "Unknown",
    (contextFiles ?? []) as ContextFile[]
  );

  systemPrompt += `\n\n## Current Card\nTitle: ${card.title}\nStage: ${card.stage}\nType: ${card.content_type}\nSummary: ${card.summary}`;

  // Add artifact content if relevant
  const artifacts = card.artifacts as Array<{ type: string; content: string }>;
  const demoFlow = artifacts?.find((a) => a.type === "demo-flow");
  const script = artifacts?.find((a) => a.type === "script");
  if (demoFlow) systemPrompt += `\n\n## Demo Flow\n${demoFlow.content}`;
  if (script) systemPrompt += `\n\n## Script\n${script.content}`;

  systemPrompt += `\n\n## Active Focus\nThe user is currently viewing the ${activeTab} tab.`;
  systemPrompt += `\n\n## Instructions\n${buildChatPrompt(activeTab)}`;

  // Build messages array for Claude (full conversation history)
  const messages = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Ensure messages array is non-empty and starts with a user message
  if (messages.length === 0) {
    messages.push({ role: "user", content: body.content });
  }

  // Call Claude with full conversation
  try {
    const rawResponse = await callClaude(systemPrompt, messages);

    // Parse response
    let chatResponse: string;
    let updatedContent: string | null = null;

    try {
      const parsed = JSON.parse(rawResponse);
      chatResponse = parsed.chat_response ?? rawResponse;
      updatedContent = parsed.updated_content ?? null;
    } catch {
      chatResponse = rawResponse;
    }

    // Update card summary if content was updated and we're on details tab
    if (updatedContent && activeTab === "details") {
      await supabase
        .from("cards")
        .update({ summary: updatedContent })
        .eq("id", cardId);
    }

    // Save assistant message
    const { data: assistantMsg, error: assistantError } = await supabase
      .from("chat_messages")
      .insert({
        card_id: cardId,
        role: "assistant",
        content: chatResponse,
        metadata: updatedContent ? { updated_content: updatedContent } : null,
      })
      .select()
      .single();

    if (assistantError) {
      return c.json({ data: null, error: assistantError.message } satisfies ApiResponse<null>, 500);
    }

    return c.json({
      data: {
        user_message: userMsg,
        assistant_message: assistantMsg,
        updated_content: updatedContent,
      },
      error: null,
    });
  } catch (err) {
    // Save error as assistant message so user sees it
    const errorMessage = err instanceof Error ? err.message : String(err);
    await supabase.from("chat_messages").insert({
      card_id: cardId,
      role: "assistant",
      content: "Claude encountered an error processing this request.",
      metadata: { error: errorMessage },
    });

    return c.json({ data: null, error: errorMessage } satisfies ApiResponse<null>, 500);
  }
});

export default chat;
