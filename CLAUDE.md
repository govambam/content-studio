# Content Studio

## What This Is

Content Studio is a web app for Macroscope's content team to manage their video content pipeline. It's organized around projects (one per Macroscope feature), with AI-powered idea generation, demo flow creation, and script writing — all driven by a scoped Claude chat interface per card.

## Key Documents — Read These First

Before doing any work, read these files in order:

1. **`PRODUCT-SPEC.md`** — The full product specification. Data model, API endpoints, Claude prompt architecture, implementation phases, workflows.
2. **`DESIGN-SYSTEM.md`** — Every design token, typography rule, component spec, and layout pattern. Follow this exactly for all UI work.
3. **`AGENTS.md`** — The agent team (2 agents + 2 skills), workflow, and how PRs flow through review.
4. **`SETUP-GUIDE.md`** — Step-by-step instructions for bootstrapping the project (GitHub, Railway, Supabase, environment variables).

## Skills

Skills are structured, repeatable workflows the PM agent invokes at specific points in the build process:

- **`skills/design-qa.md`** — Reviews all frontend code against `DESIGN-SYSTEM.md`. Run after the Engineer completes frontend work, before creating a PR. Returns a pass/fail report with specific violations.
- **`skills/macroscope-review.md`** — Waits for Macroscope to complete its code review (polling every 30s), reads findings, triages each one (valid bug / false positive / style note), and returns a structured report. Run after creating a PR or pushing fixes.

## Tech Stack

- **Frontend:** React (Vite), deployed as a Railway service
- **Backend:** Node.js (Hono), deployed as a Railway service
- **AI Workers:** Railway worker service, Claude API via Anthropic SDK
- **Database:** Supabase (PostgreSQL + Realtime + Auth + Storage)
- **Hosting:** Railway (all services)
- **Fonts:** Space Grotesk (sans), JetBrains Mono (mono) — loaded from Google Fonts

## Project Structure

```
content-studio/
├── apps/
│   ├── web/                 # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── views/       # Page-level views (Board, CardExpanded, etc.)
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── lib/         # Supabase client, API helpers
│   │   │   ├── styles/      # tokens.css, global styles
│   │   │   └── types/       # TypeScript types
│   │   └── index.html
│   ├── api/                 # Hono backend API
│   │   ├── src/
│   │   │   ├── routes/      # API route handlers
│   │   │   ├── services/    # Business logic
│   │   │   ├── workers/     # Claude worker task handlers
│   │   │   ├── prompts/     # Claude system/task prompt templates
│   │   │   └── db/          # Supabase client, queries
│   │   └── package.json
│   └── worker/              # Railway worker for async Claude tasks
│       ├── src/
│       │   ├── tasks/       # Task type handlers
│       │   └── index.ts     # Worker entry point (polls or receives jobs)
│       └── package.json
├── packages/
│   └── shared/              # Shared types, constants, utilities
│       └── src/
├── supabase/
│   ├── migrations/          # SQL migration files (numbered)
│   └── seed.sql             # Optional seed data
├── docs/                    # Project documentation
│   ├── PRODUCT-SPEC.md
│   ├── DESIGN-SYSTEM.md
│   ├── AGENTS.md
│   └── SETUP-GUIDE.md
├── CLAUDE.md                # This file
├── package.json             # Workspace root (npm workspaces)
├── turbo.json               # Turborepo config (if using)
└── railway.toml             # Railway service config
```

## Development Workflow

### Branch Strategy

- `main` — production branch, deployed to Railway automatically
- Feature branches: `feat/<feature-name>` — one per implementation unit
- All work goes through PRs. Never commit directly to `main`.

### PR Workflow with Macroscope Review

1. Create feature branch and implement the feature.
2. Push branch and create PR via `gh pr create`.
3. **Wait for Macroscope to complete its code review.** Do not merge until review is done.
4. Read Macroscope's review findings.
5. For each finding, determine if it's a valid bug or a false positive.
6. Fix valid bugs in follow-up commits on the same branch.
7. Push fixes. **Wait for Macroscope to re-review** (it runs on every push).
8. Repeat steps 4–7 until Macroscope reports no new valid issues.
9. Merge the PR.

### Implementation Order (Phase 1 MVP)

Follow this PR sequence. Each PR should be a self-contained, reviewable unit:

```
PR #1: Project scaffolding (monorepo, configs, CI, Railway setup)
PR #2: Supabase schema + migrations (all Phase 1 tables)
PR #3: Backend API — project CRUD + context file upload
PR #4: Frontend — sidebar + project list + new project flow
PR #5: Backend API — card CRUD
PR #6: Frontend — Kanban board with cards
PR #7: Backend + Worker — Claude idea generation
PR #8: Frontend — expanded card view (details tab + chat panel)
PR #9: Backend + Worker — card chat (expand idea via conversation)
PR #10: Integration testing + polish
```

## Code Style

- TypeScript everywhere (strict mode)
- Functional components with hooks in React
- No `any` types — define interfaces in `packages/shared`
- Use CSS custom properties from `DESIGN-SYSTEM.md` for all styling
- Prefer inline styles or CSS modules over CSS-in-JS libraries
- API routes return consistent JSON: `{ data, error }`
- All Claude prompts live in `apps/api/src/prompts/` as template functions

## CLI Tools Available

- `gh` — GitHub CLI (create repos, branches, PRs, read reviews)
- `railway` — Railway CLI (create projects, link services, deploy)
- `supabase` — Supabase CLI (manage projects, run migrations, generate types)
- `npm` / `npx` — package management and scaffolding
- `git` — version control

## Environment Variables

See `SETUP-GUIDE.md` for the full list and how to obtain each one.

## Project File Map

```
docs/
├── PRODUCT-SPEC.md          # Full product specification
├── DESIGN-SYSTEM.md         # Design tokens, components, layout rules
├── AGENTS.md                # Agent team + workflow
└── SETUP-GUIDE.md           # Bootstrap instructions
skills/
├── design-qa.md             # Design system compliance checker
└── macroscope-review.md     # Macroscope review wait + triage
reference/
├── Outbound Strategy - Social & Video Pivot.md   # Strategy doc (context only)
└── content-studio-v2-wireframe.jsx               # UI wireframe (reference)
CLAUDE.md                    # This file (project root instructions)
```
