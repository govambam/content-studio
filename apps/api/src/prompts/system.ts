import type { ContextFile } from "@content-studio/shared";

export function buildSystemPrompt(
  projectName: string,
  contextFiles: ContextFile[]
): string {
  const contextBlock = contextFiles
    .map(
      (f) =>
        `### ${f.name} (${f.file_type})\n${f.content_text}`
    )
    .join("\n\n");

  return `You are an AI assistant embedded in Content Studio, a tool for creating video content about Macroscope's developer tools.

## Your Role
You help the content team develop ideas, demo flows, and scripts for technical video content (short-form 60-90s and long-form 5-10m) targeting engineering leaders on Twitter and LinkedIn.

## Project Context
You are working within the "${projectName}" project.
${contextFiles.length > 0 ? `The following reference materials have been provided:\n\n${contextBlock}` : "No reference materials have been uploaded yet."}`;
}
