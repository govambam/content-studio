# Content Studio — Product Spec

**Version:** 1.0
**Date:** April 9, 2026
**Author:** Ivan (Dev Advocate, Macroscope)
**Status:** Approved for implementation

---

## 1. Overview

Content Studio is an internal web application for Macroscope's content team (2–4 people). It manages the full lifecycle of content production — from feeding context about a Macroscope product feature, to AI-generated content ideas, to refined demo flows and video scripts — all organized around a project-per-feature model with an integrated Claude-powered chat interface.

Content Studio also doubles as the real product shown in Macroscope demo videos. It should feel polished enough to put on camera.

### 1.1 Background

Macroscope is pivoting its outbound strategy from volume-based cold email/LinkedIn to a social-first, content-driven model (see `Outbound Strategy - Social & Video Pivot.md`). The content engine runs on two video formats: long-form deep dives (5–10 min) and short-form clips (60–90 sec) distributed on Twitter and LinkedIn. Content Studio is the operational backbone that powers this content engine.

### 1.2 Goals

1. Give the content team a single place to manage all content work, organized by Macroscope product feature.
2. Use Claude to accelerate every stage: ideation, demo flow design, and script writing.
3. Keep Claude's context scoped — each project and each card has its own isolated context window so the LLM stays focused and relevant.
4. Be demo-worthy — this is a real tool the team uses daily, and it will appear in Macroscope's own content.

### 1.3 Users

| User | Role |
|------|------|
| Ivan | Dev Advocate — primary content creator, manages projects, interacts with Claude on cards |
| Kayvon | Strategy — reviews ideas, provides directional feedback |
| Eliza | Events/Partnerships — may review content related to event-driven campaigns |
| Future hires | Additional content or dev advocate team members |

---

## 2. Architecture

### 2.1 Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React (Vite or Next.js) | Single-page app, deployed as a Railway service |
| Backend API | Node.js (Express or Hono) | Handles auth, CRUD, dispatches work to Claude workers |
| AI Workers | Railway workers | Long-running Claude tasks (idea generation, script writing, demo flow creation). Each worker call includes scoped context. |
| Database | Supabase (PostgreSQL + Realtime) | Projects, cards, artifacts, chat history, file metadata. Realtime subscriptions for live UI updates when workers complete. |
| File Storage | Supabase Storage or Railway persistent volume | Uploaded context files (docs, posts, markdown). Potentially generated assets. |
| Auth | Supabase Auth | Email/password or magic link. Small team, simple auth. |
| Hosting | Railway | All services on Railway. Workers scale independently. |

### 2.2 Service Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Railway Project                    │
│                                                       │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Frontend  │  │ Backend API  │  │ Claude Workers │ │
│  │ (React)   │──│ (Node.js)    │──│ (Railway)      │ │
│  └──────────┘  └──────┬───────┘  └────────────────┘ │
│                       │                               │
│                ┌──────┴───────┐                       │
│                │   Supabase   │                       │
│                │  (DB + Auth  │                       │
│                │  + Storage)  │                       │
│                └──────────────┘                       │
└─────────────────────────────────────────────────────┘
```

### 2.3 Claude Worker Design

Workers are Railway background services that execute Claude API calls. Each worker invocation receives a structured payload specifying:

1. **System prompt** — includes the project's context files and the specific card/artifact being worked on.
2. **Task type** — one of: `generate-ideas`, `expand-idea`, `generate-demo-flow`, `update-demo-flow`, `generate-script`, `update-script`, `chat-response`.
3. **Chat history** — the card-scoped conversation history so Claude can maintain continuity.
4. **User message** — the latest user input (for chat interactions).

The worker executes the Claude call, writes results back to Supabase (updating the card/artifact content and appending to chat history), and the frontend picks up changes via Supabase Realtime subscriptions.

**Context scoping rules:**

- Claude always receives the active project's context files.
- Claude always receives the current card's content (idea summary, demo flow, script — whichever is being worked on).
- Claude never receives context from other projects.
- Claude receives the chat history for the current card only.

---

## 3. Data Model

### 3.1 Core Entities

#### Project

A project represents a single Macroscope product feature that content is being created for.

```
project
├── id              UUID, primary key
├── name            string (e.g., "Custom Reviews")
├── slug            string, unique (e.g., "custom-reviews")
├── icon            string, 2-char abbreviation (e.g., "CR")
├── color           string, hex color
├── created_at      timestamp
├── updated_at      timestamp
└── created_by      UUID, references user
```

#### Context File

Files uploaded to a project that provide Claude with domain knowledge.

```
context_file
├── id              UUID, primary key
├── project_id      UUID, references project
├── name            string (display name)
├── file_path       string (storage path)
├── file_type       enum: "docs", "post", "ideas", "other"
├── size_bytes      integer
├── content_text    text (extracted plaintext for Claude context injection)
├── created_at      timestamp
└── uploaded_by     UUID, references user
```

#### Card (Idea)

A content idea within a project. Cards move through Kanban stages and may have child artifacts.

```
card
├── id              UUID, primary key
├── project_id      UUID, references project
├── title           string
├── summary         text (the idea description, updated by Claude and user)
├── stage           enum: "unreviewed", "considering", "in_production", "published"
├── content_type    enum: "short" (60-90s), "long" (5-10m)
├── sort_order      integer (position within stage column)
├── created_at      timestamp
├── updated_at      timestamp
└── created_by      enum: "ai", "user"
```

#### Artifact

A child document belonging to a card. Currently two types: demo flow and script.

```
artifact
├── id              UUID, primary key
├── card_id         UUID, references card
├── type            enum: "demo-flow", "script"
├── title           string
├── content         text (markdown body — the living document)
├── status          enum: "not-started", "draft", "complete"
├── created_at      timestamp
└── updated_at      timestamp
```

#### Chat Message

Conversation history scoped to a specific card. Claude uses this history to maintain continuity. Each message may reference a specific artifact being discussed.

```
chat_message
├── id              UUID, primary key
├── card_id         UUID, references card
├── artifact_id     UUID, nullable, references artifact (if chat is scoped to a specific tab)
├── role            enum: "user", "assistant"
├── content         text
├── metadata        jsonb (optional — e.g., what content was updated, which quick action was triggered)
├── created_at      timestamp
└── user_id         UUID, nullable, references user (for user messages)
```

### 3.2 Relationships

```
project 1──* context_file
project 1──* card
card    1──* artifact
card    1──* chat_message
artifact 1──* chat_message (optional scope)
```

---

## 4. User Interface

Reference wireframe: `content-studio-v2-wireframe.jsx`

### 4.1 Layout

The app has three zones:

1. **Sidebar (left, 220px, dark)** — project list, new project button, team avatars.
2. **Main area (center)** — switches between project board view and expanded card view.
3. **Chat panel (right, 360px, within expanded card only)** — Claude conversation scoped to the active card.

### 4.2 Views

#### 4.2.1 Project Board View

Displayed when a project is selected and no card is expanded.

**Header bar:**
- Project icon, name, and summary stats (X ideas, Y considering, Z in production).
- "Context (N)" button — opens the context panel slide-over from the right.
- "Generate Ideas" button — triggers Claude to generate new content ideas based on project context. Results populate the Unreviewed column.

**Kanban board:**
Four columns: Unreviewed → Considering → In Production → Published.

Each column shows:
- Stage name with colored dot and count.
- Cards for that stage.
- The Unreviewed column has a "+ Generate more ideas" button at the bottom.

**Card (on the board):**
- Title (the idea name).
- Type badge: "60-90s" or "5-10m".
- Child artifact badges showing what exists and its status (e.g., "Demo · draft", "Script · not-started").

**Card interaction:** Click a card to enter the expanded card view.

**Stage transitions:** Cards can be moved between stages. Implementation can be drag-and-drop or a dropdown in the expanded view. Both are acceptable; dropdown is simpler to build first.

#### 4.2.2 Context Panel (slide-over)

Appears from the right edge when "Context" is clicked.

Shows:
- List of uploaded files with type badge (DOC, POST, IDEA), filename, size, and date added.
- "+ Upload file" button.
- "Auto-indexed" section (future: shows what Claude has pulled from release notes, Slack, etc.).

#### 4.2.3 Expanded Card View

Displayed when a card is clicked from the board. Replaces the board view (not a modal).

**Header:**
- "← Back to board" link.
- Card title, stage badge, type badge.
- Stage dropdown to move the card between stages.

**Left panel (content area):**
Tabbed interface. Tabs are dynamic based on what artifacts exist:

- **Details** (always present) — shows the idea summary in a styled content block. Below it, an "Artifacts" section listing child items (demo flow, script) as clickable rows. Clicking an artifact switches to its tab.
- **Demo Flow** (present if artifact exists) — renders the demo flow markdown content. This is the living document that Claude updates when the user interacts via chat.
- **Script** (present if artifact exists) — renders the script markdown. Same living-document behavior.
- **"+ Demo Flow" / "+ Script"** buttons appear as tab-like elements when those artifacts don't exist yet. Clicking them creates the artifact (initially empty or Claude-generated).

**Right panel (chat):**
Fixed 360px chat panel with:
- Header: green dot, "Claude", "scoped to this card".
- Message history: user messages right-aligned (dark), Claude messages left-aligned (light).
- Quick action chips above the input — contextual to the active tab:
  - Details tab: "Expand idea", "Generate demo flow", "Suggest variations"
  - Demo Flow tab: "Add more detail", "Suggest B-roll", "Generate script"
  - Script tab: "Punch up the hook", "Shorten to 60s", "Add social copy"
- Text input + Send button.

**Chat behavior:**
When the user sends a message (typed or via quick action), the backend:
1. Sends the message + card context + project context + chat history to a Claude worker.
2. Claude generates a response.
3. If Claude determines the content should be updated (idea summary, demo flow, or script), it updates the artifact content in the database.
4. Claude's response is appended to chat history.
5. The frontend updates both the chat panel (new message) and the content area (updated document) via Realtime.

The user sees: their message appears in the chat, a brief loading state, then Claude's response appears and the content on the left updates simultaneously.

---

## 5. Core Workflows

### 5.1 Create a New Project

1. User clicks "+ New Project" in the sidebar.
2. Modal or inline form: project name, icon (auto-generated from initials), color picker.
3. Project is created. User lands on empty board view.
4. User uploads context files (docs, blog posts, markdown ideas) via the Context panel.

### 5.2 Generate Ideas

1. User clicks "Generate Ideas" in the project header.
2. Backend dispatches a Claude worker with task type `generate-ideas`.
3. Worker receives all project context files as input.
4. Claude generates 3–5 content ideas, each with a title, summary, and suggested content type (short/long).
5. Ideas are created as cards in the "Unreviewed" stage.
6. Cards appear on the board via Realtime.

The user can also click "+ Generate more ideas" at the bottom of the Unreviewed column to get additional ideas (Claude receives existing ideas to avoid duplicates).

### 5.3 Review and Promote an Idea

1. User clicks a card in the Unreviewed column.
2. Expanded card view opens showing the idea summary and an empty chat.
3. User reads the idea. If they like it, they move it to "Considering" via the stage dropdown.
4. If they want refinement, they chat with Claude: "Make this more focused on the security use case" or "Let's use this specific example: …"
5. Claude updates the idea summary and responds in the chat explaining what changed.

### 5.4 Create a Demo Flow

1. From the expanded card view, user clicks the "+ Demo Flow" tab button (or the "Generate demo flow" quick action in chat).
2. Backend dispatches a Claude worker with task type `generate-demo-flow`.
3. Worker receives project context + card summary + chat history.
4. Claude generates a structured demo flow in markdown (setup, scenes, transitions, key moments).
5. A new artifact (type: demo-flow, status: draft) is created and its content populated.
6. The Demo Flow tab appears and displays the content.

User can then refine via chat: "In scene 2, let's use a more realistic repo name" → Claude updates the demo flow markdown and responds.

### 5.5 Create a Script

1. From the expanded card view (ideally after a demo flow exists), user clicks "+ Script" or the "Generate script" quick action.
2. Backend dispatches a Claude worker with task type `generate-script`.
3. Worker receives project context + card summary + demo flow content (if it exists) + chat history.
4. Claude generates a video script in markdown (hook, scene-by-scene narration, on-screen actions, CTA).
5. A new artifact (type: script, status: draft) is created.
6. The Script tab appears.

Same chat-driven refinement loop: "Punch up the hook" → Claude rewrites the opening and explains what changed.

### 5.6 Chat Interaction (general)

All chat interactions follow the same pattern:

1. User sends a message (freeform text or quick action).
2. The active tab determines what Claude focuses on:
   - Details tab → Claude may update the idea summary.
   - Demo Flow tab → Claude may update the demo flow content.
   - Script tab → Claude may update the script content.
3. Claude always responds in the chat explaining what it did.
4. Content updates and chat responses are written to Supabase atomically.
5. Frontend updates via Realtime subscriptions.

Quick actions are pre-written prompts sent as user messages. They appear in the chat as regular user messages so the conversation history remains coherent.

**Quick action definitions:**

| Tab | Chip Label | Prompt sent to Claude |
|-----|-----------|----------------------|
| Details | Expand idea | "Expand on this idea. Add more detail about the target audience, the key visual moments, and why this would resonate with engineering leaders." |
| Details | Generate demo flow | "Generate a detailed demo flow for this idea." (triggers `generate-demo-flow` task) |
| Details | Suggest variations | "Suggest 2-3 alternative angles or variations on this idea that we could also consider." |
| Demo Flow | Add more detail | "Add more detail to each scene. Include specific on-screen elements, transition notes, and timing guidance." |
| Demo Flow | Suggest B-roll | "Suggest B-roll shots and visual inserts that would elevate this demo. Think: close-ups, diagram overlays, before/after cuts." |
| Demo Flow | Generate script | "Generate a full script based on this demo flow." (triggers `generate-script` task) |
| Script | Punch up the hook | "Rewrite the opening hook to be more attention-grabbing. The first 5 seconds need to stop the scroll." |
| Script | Shorten to 60s | "Condense this script to fit within 60-90 seconds of spoken narration. Keep the strongest moments, cut everything else." |
| Script | Add social copy | "Write social media copy for posting this video: one version for Twitter (punchy, under 280 chars) and one for LinkedIn (2-3 paragraphs, outcomes-focused)." |

---

## 6. API Endpoints

### 6.1 Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/:id` | Get project with stats |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project and all children |

### 6.2 Context Files

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/:id/context` | List context files for a project |
| POST | `/api/projects/:id/context` | Upload a context file (multipart) |
| DELETE | `/api/context/:id` | Delete a context file |

### 6.3 Cards

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/:id/cards` | List cards for a project (with artifacts summary) |
| POST | `/api/projects/:id/cards` | Create a card manually |
| GET | `/api/cards/:id` | Get card with artifacts and recent chat |
| PUT | `/api/cards/:id` | Update card (title, summary, stage, type, sort_order) |
| DELETE | `/api/cards/:id` | Delete card and all children |

### 6.4 Artifacts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cards/:id/artifacts` | List artifacts for a card |
| POST | `/api/cards/:id/artifacts` | Create an artifact |
| GET | `/api/artifacts/:id` | Get artifact content |
| PUT | `/api/artifacts/:id` | Update artifact (content, status) |
| DELETE | `/api/artifacts/:id` | Delete artifact |

### 6.5 Chat

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cards/:id/chat` | Get chat history for a card (paginated) |
| POST | `/api/cards/:id/chat` | Send a message — triggers Claude worker |

### 6.6 AI Actions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/projects/:id/generate-ideas` | Generate ideas for a project |
| POST | `/api/cards/:id/generate-demo-flow` | Generate a demo flow for a card |
| POST | `/api/cards/:id/generate-script` | Generate a script for a card |

These endpoints dispatch work to Railway workers and return immediately with a `202 Accepted` and a job ID. The frontend listens for results via Supabase Realtime.

---

## 7. Claude Prompt Architecture

### 7.1 System Prompt Template

Every Claude invocation uses a system prompt structured as:

```
You are an AI assistant embedded in Content Studio, a tool for creating 
video content about Macroscope's developer tools.

## Your Role
You help the content team develop ideas, demo flows, and scripts for 
technical video content (short-form 60-90s and long-form 5-10m) 
targeting engineering leaders on Twitter and LinkedIn.

## Project Context
You are working within the "{project_name}" project.
The following reference materials have been provided:

{for each context_file}
### {file_name} ({file_type})
{file_content}
{end for}

## Current Card
Title: {card_title}
Stage: {card_stage}
Type: {card_content_type}
Summary: {card_summary}

{if demo_flow_exists}
## Demo Flow
{demo_flow_content}
{end if}

{if script_exists}
## Script
{script_content}
{end if}

## Active Focus
The user is currently viewing the {active_tab} tab.

## Instructions
{task_specific_instructions}
```

### 7.2 Task-Specific Instructions

**generate-ideas:**
```
Generate 3-5 content ideas based on the project context. For each idea, provide:
- A concise, compelling title
- A 2-3 sentence summary describing the content concept
- A recommended content type: "short" (60-90s punchy clip) or "long" (5-10m deep dive)

Focus on ideas that would resonate with engineering leaders. 
Prioritize concepts that are visual, demo-friendly, and showcase 
a clear before/after or "aha moment."

Do not duplicate these existing ideas: {existing_idea_titles}

Return as JSON array: [{ title, summary, content_type }]
```

**expand-idea / chat on details tab:**
```
The user is discussing this content idea with you. When they provide 
feedback or direction, update the idea summary to incorporate their input.

Always respond with two parts:
1. Your updated version of the summary (returned as structured output).
2. A conversational response explaining what you changed and why, and 
   any follow-up suggestions.
```

**generate-demo-flow:**
```
Create a detailed demo flow for this content idea. The demo flow should be 
a markdown document that a video creator can follow to record the demo.

Structure it as:
- Setup: what repos, branches, data, and environments are needed
- Scenes: numbered scene-by-scene breakdown with timestamps
- For each scene: what's on screen, what the viewer should notice, 
  what the narration is conveying
- Key moments: the specific "wow" moments to emphasize

Make the demo feel authentic — use realistic repo names, realistic code, 
and realistic scenarios that engineering teams actually encounter.
```

**generate-script:**
```
Create a video script based on the card summary and demo flow 
(if available). The script should be a markdown document structured as:

- Hook: the opening line/moment that earns attention (first 5 seconds)
- Scene-by-scene narration: what the presenter says during each demo scene
- On-screen callouts: text overlays or annotations to add in post
- CTA: the closing moment

Target length: {if short: "60-90 seconds spoken"} {if long: "5-10 minutes spoken"}
Tone: technically credible, conversational, not salesy.
Reference: Aaron Francis-style delivery — rigorous technical content 
with sophisticated visual presentation. Scripts should read like someone 
explaining something to a smart colleague, not like marketing copy.
Assume the viewer is an engineering leader who values depth and authenticity.
```

**chat on demo-flow tab / script tab:**
```
The user is refining the {artifact_type}. When they provide feedback, 
update the {artifact_type} content to incorporate their changes.

Always respond with two parts:
1. The updated {artifact_type} content (returned as structured output).
2. A conversational response explaining what you changed.
```

### 7.3 Structured Output

All Claude responses for content-modifying interactions should use structured output (tool use) with two fields:

```json
{
  "updated_content": "...",  // The new content for the card/artifact, or null if no update
  "chat_response": "..."     // The message to display in the chat panel
}
```

This ensures the backend can atomically update both the artifact content and the chat history.

---

## 8. Implementation Phases

### Phase 1: Foundation (MVP)

Build the core app with manual workflows and Claude integration.

**Scope:**
- Project CRUD with sidebar navigation.
- Context file upload and storage.
- Card CRUD with Kanban board (4 stages, stage transitions via dropdown).
- Expanded card view with details tab.
- Claude integration: generate ideas, expand idea via chat.
- Basic chat panel on the expanded card view.
- Supabase schema, auth, and Realtime setup.
- Deploy to Railway (frontend + backend + 1 worker).

**Out of scope for Phase 1:**
- Artifacts (demo flow, script) — cards only have summaries.
- Quick action chips.
- Drag-and-drop on Kanban.

### Phase 2: Artifacts & Deep Workflows

Add demo flows, scripts, and the full tab-based card experience.

**Scope:**
- Artifact CRUD (demo flow and script).
- Tabbed interface in expanded card view.
- "+ Demo Flow" / "+ Script" creation buttons.
- Claude integration: generate-demo-flow, generate-script, chat on artifact tabs.
- Quick action chips (contextual to active tab).
- Artifact status tracking (not-started, draft, complete).

### Phase 3: Polish & Production

Make it demo-worthy and add quality-of-life features.

**Scope:**
- Drag-and-drop on Kanban board.
- Markdown rendering with syntax highlighting in demo flow and script views.
- Loading states and optimistic UI for Claude interactions.
- Inline editing of card titles and summaries (not just via chat).
- Project-level stats and simple analytics.
- Mobile-responsive layout (nice-to-have).

### Phase 4: Agentic Pipeline (Future)

The long-term vision from the outbound strategy doc.

**Scope:**
- Auto-indexing of release notes and Slack threads as project context.
- Proactive idea generation when new context is added.
- Social copy generation and distribution scheduling.
- Integration with Twitter/LinkedIn APIs for publishing.

---

## 9. Non-Functional Requirements

### Performance
- Claude worker responses should complete in under 30 seconds for idea generation, under 20 seconds for chat responses.
- Frontend should feel snappy — optimistic UI for stage transitions, immediate chat message display before Claude responds.

### Security
- All API endpoints require authentication.
- Context files are private to the workspace (not publicly accessible URLs).
- Claude API key stored as Railway environment variable, never exposed to frontend.

### Reliability
- Worker failures should be logged and surfaceable in the UI. When a worker fails:
  1. The chat panel shows an error message: "Claude encountered an error processing this request."
  2. A "Retry" button appears inline, allowing the user to re-send the same request.
  3. The failed job is logged with error details in a `worker_jobs` table for debugging.
  4. After 3 consecutive failures on the same request, show "Something went wrong. Try rephrasing your request or check back later."
- Chat history should never be lost — the user's message is written to Supabase before triggering the Claude worker. If the worker fails, the user's message is still visible in the chat (with the error appearing as the response).

---

## 10. File Reference

| File | Purpose |
|------|---------|
| `Outbound Strategy - Social & Video Pivot.md` | The strategy document that motivates this entire project |
| `content-studio-v2-wireframe.jsx` | Interactive React wireframe showing the agreed-upon UI design |
| `PRODUCT-SPEC.md` | This document |
| `DESIGN-SYSTEM.md` | Complete design system — tokens, typography, components, layout rules |
| `CLAUDE.md` | Project root instructions for Claude Code — tech stack, structure, workflow |
| `AGENTS.md` | Agent team definitions, roles, PR workflow, Macroscope review loop |
| `SETUP-GUIDE.md` | Bootstrap instructions — CLIs, env vars, project creation steps |
