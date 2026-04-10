# Content Studio

## What This Is

Content Studio is a content pipeline manager used internally by Macroscope's content team. It organizes work into a three-level hierarchy: **labels** tag **projects** (content initiatives like "make a video about custom eligibility rules"), projects contain **tickets** (units of work like "write script", "record screencast"), and tickets carry **assets** (markdown scripts, images, other files). The Home view is a Kanban of Projects filtered by Label; clicking a Project opens a Kanban of its Tickets; clicking a Ticket opens a Linear-style issue view with description, assets, activity feed, and comments.

It started life as an AI-first content-pipeline app. Phase 1 (April 2026) stripped every AI feature down to a minimal Linear-clone tracker. Phase 2 (April 2026, in progress) is the structural rewrite into the labels/projects/tickets/assets model described above. Phase 3 adds production telemetry; Phase 4 is the reskin. See `../ROADMAP.md` in the parent directory for the full multi-phase plan and `../PHASE-2-PLAN.md` for the current PR sequence.

**Terminology flip (important).** Phase 1 used "project" for what Phase 2 calls a "label", and "card" for what Phase 2 calls a "project". The Phase 1 names are dead. If you see "card" in source, comments, or new code during Phase 2 execution: it's a bug, rename it.

## Key Documents — Read These First

Before doing any work, read these files in order:

1. **`docs/PRODUCT-SPEC.md`** — Data model, API surface, frontend surface, scope boundaries. The single source of truth for what the app does today.
2. **`docs/DESIGN-SYSTEM.md`** — Every design token, typography rule, component spec, and layout pattern. Follow this exactly for all UI work.
3. **`docs/AGENTS.md`** — The agent team and PR workflow.
4. **`docs/SETUP-GUIDE.md`** — Bootstrap instructions (GitHub, Railway, Supabase, env vars).

## Skills

Skills are structured, repeatable workflows the PM agent invokes at specific points:

- **`skills/design-qa.md`** — Reviews changed frontend code against `docs/DESIGN-SYSTEM.md`. Run after completing frontend work, before creating a PR. Returns pass/fail with specific violations.
- **`skills/macroscope-review.md`** — Polls for Macroscope's code review, reads findings, triages each one, and returns a structured report. Run after creating a PR or pushing fix commits. Loop until clean.

## Tech Stack

- **Frontend:** React (Vite), deployed as a Railway service
- **Backend:** Node.js (Hono), deployed as a Railway service
- **Database:** Supabase (PostgreSQL + Realtime)
- **Hosting:** Railway
- **Fonts:** Space Grotesk (sans), JetBrains Mono (mono) — Google Fonts

No workers. No AI services. No queue. No chat. The backend is CRUD-only.

## Project Structure

```
content-studio/
├── apps/
│   ├── web/                 # React frontend (Vite)
│   │   └── src/
│   │       ├── components/  # Reusable UI components
│   │       ├── hooks/       # useProjects, useCards
│   │       ├── lib/         # Supabase client, API helpers
│   │       └── styles/      # tokens.css, global styles
│   └── api/                 # Hono backend API
│       └── src/
│           ├── routes/      # projects.ts, cards.ts
│           └── db/          # Supabase client
├── packages/
│   └── shared/              # Shared types (Project, Card, Stage, ContentType, ApiResponse)
├── supabase/
│   └── migrations/          # SQL migrations
├── docs/
│   ├── PRODUCT-SPEC.md
│   ├── DESIGN-SYSTEM.md
│   ├── AGENTS.md
│   └── SETUP-GUIDE.md
├── skills/
│   ├── design-qa.md
│   └── macroscope-review.md
├── CLAUDE.md                # This file
├── package.json             # Workspace root (npm workspaces)
└── railway.toml
```

## Development Workflow

### Branch Strategy

- `main` — production branch, deployed to Railway automatically
- Feature branches: `feat/<feature-name>` or `chore/<description>` — one per implementation unit
- All work goes through PRs. Never commit directly to `main`.

### PR Workflow

1. Create a feature branch and implement the change.
2. If frontend files changed, run the **Design QA skill** (`skills/design-qa.md`) and fix any violations before opening the PR.
3. Create the PR with `gh pr create` and a description that includes a **Plan deviations** section whenever the PR departs from its planning doc.
4. Run the **Macroscope Review skill** (`skills/macroscope-review.md`). It polls for the review, reads findings, triages them, and returns a report.
5. If findings exist: fix all valid bugs in a single commit, push, and re-run the skill. Repeat until clean.
6. Merge the PR with `gh pr merge --squash --delete-branch`.
7. Pull `main` and move on.

Macroscope reviews take 1–10 minutes. Do not merge a PR until the review is clean.

## Code Style

- TypeScript everywhere, strict mode
- Functional React components with hooks
- No `any` types — define interfaces in `packages/shared`
- Style with inline styles using CSS custom properties from `docs/DESIGN-SYSTEM.md`. No CSS-in-JS libraries.
- API routes return `{ data, error }`
- Keep components small and the directory flat

## CLI Tools Available

- `gh` — GitHub CLI
- `railway` — Railway CLI
- `supabase` — Supabase CLI
- `npm` / `npx` — package management
- `git` — version control

## Environment Variables

See `docs/SETUP-GUIDE.md` for the full list. The runtime only needs Supabase keys, `FRONTEND_URL`, and `NODE_ENV`.
