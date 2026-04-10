import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

type Message = { role: "user" | "assistant"; content: string };

export async function callClaude(
  systemPrompt: string,
  messages: string | Message[]
): Promise<string> {
  const messageArray: Message[] =
    typeof messages === "string"
      ? [{ role: "user", content: messages }]
      : messages;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: messageArray,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text ?? "";
}
