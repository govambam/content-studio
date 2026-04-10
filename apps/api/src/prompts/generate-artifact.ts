export function buildGenerateDemoFlowPrompt(
  cardTitle: string,
  cardSummary: string,
  contentType: string
): string {
  return `Create a detailed demo flow for this content idea:

Title: ${cardTitle}
Summary: ${cardSummary}
Target length: ${contentType === "short" ? "60-90 seconds" : "5-10 minutes"}

The demo flow should be a structured markdown document that a video creator can follow to record the demo. Include:

## Setup
What repos, branches, data, and environments are needed.

## Scenes
Numbered scene-by-scene breakdown with approximate timestamps. For each scene:
- What's on screen
- What the viewer should notice
- What the narration conveys

## Key Moments
The specific "wow" moments to emphasize.

Use realistic repo names, realistic code, and realistic scenarios that engineering teams actually encounter.

IMPORTANT: Return ONLY the markdown document. No JSON, no preamble, no code fences around the whole thing. Start with "## Setup".`;
}

export function buildGenerateScriptPrompt(
  cardTitle: string,
  cardSummary: string,
  contentType: string,
  demoFlowContent: string | null
): string {
  const demoFlowSection = demoFlowContent
    ? `\n\n## Existing Demo Flow (base the script on this)\n\n${demoFlowContent}`
    : "";

  return `Create a video script for this content idea:

Title: ${cardTitle}
Summary: ${cardSummary}
Target length: ${contentType === "short" ? "60-90 seconds spoken" : "5-10 minutes spoken"}${demoFlowSection}

The script should be a structured markdown document with:

## Hook
The opening line/moment that earns attention (first 5 seconds).

## Script
Scene-by-scene narration: what the presenter says during each demo scene. Include on-screen callouts in square brackets [like this].

## CTA
The closing moment and call-to-action.

Tone: technically credible, conversational, not salesy. Reference Aaron Francis-style delivery — rigorous technical content explained like you're talking to a smart colleague, not like marketing copy. Assume the viewer is an engineering leader who values depth and authenticity.

IMPORTANT: Return ONLY the markdown document. No JSON, no preamble, no code fences around the whole thing. Start with "## Hook".`;
}
