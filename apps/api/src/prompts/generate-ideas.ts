export function buildGenerateIdeasPrompt(
  existingTitles: string[]
): string {
  const exclusion =
    existingTitles.length > 0
      ? `\nDo not duplicate these existing ideas: ${existingTitles.join(", ")}`
      : "";

  return `Generate 3-5 content ideas based on the project context. For each idea, provide:
- A concise, compelling title
- A 2-3 sentence summary describing the content concept
- A recommended content type: "short" (60-90s punchy clip) or "long" (5-10m deep dive)

Focus on ideas that would resonate with engineering leaders.
Prioritize concepts that are visual, demo-friendly, and showcase a clear before/after or "aha moment."
${exclusion}

Return as a JSON array: [{ "title": "...", "summary": "...", "content_type": "short" | "long" }]

IMPORTANT: Return ONLY the JSON array. No markdown fencing, no explanation, just the raw JSON.`;
}
