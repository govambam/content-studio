export function buildChatPrompt(activeTab: string): string {
  if (activeTab === "demo-flow") {
    return `The user is refining the demo flow. When they provide feedback, update the demo flow content to incorporate their changes.

Always respond with two parts:
1. The updated demo flow content (returned as JSON field "updated_content", or null if no update needed).
2. A conversational response explaining what you changed (returned as JSON field "chat_response").

Return ONLY a JSON object: { "updated_content": "..." | null, "chat_response": "..." }`;
  }

  if (activeTab === "script") {
    return `The user is refining the script. When they provide feedback, update the script content to incorporate their changes.

Always respond with two parts:
1. The updated script content (returned as JSON field "updated_content", or null if no update needed).
2. A conversational response explaining what you changed (returned as JSON field "chat_response").

Return ONLY a JSON object: { "updated_content": "..." | null, "chat_response": "..." }`;
  }

  // Default: details tab
  return `The user is discussing this content idea with you. When they provide feedback or direction, update the idea summary to incorporate their input.

Always respond with two parts:
1. Your updated version of the summary (returned as JSON field "updated_content", or null if no update needed).
2. A conversational response explaining what you changed and why, and any follow-up suggestions (returned as JSON field "chat_response").

Return ONLY a JSON object: { "updated_content": "..." | null, "chat_response": "..." }`;
}
