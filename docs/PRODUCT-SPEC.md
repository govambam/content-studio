# Content Studio — Product Spec

**Version:** 2.0 (Phase 1 — Linear-style rewrite)
**Date:** April 10, 2026
**Status:** Current

---

## 1. What This Is

Content Studio is a minimal, Linear-style issue tracker used internally by Macroscope's content team. It organises work into projects, each containing cards that move through a simple Kanban pipeline.

It started life as an AI-first content pipeline app. Phase 1 stripped every AI feature (idea generation, demo-flow/script artifacts, per-card Claude chat, project context files) so the remaining surface is small, correct, and easy to iterate on. Future phases will add Linear-style tracker features (Phase 2), production-grade telemetry and simulated traffic (Phase 3), and a reskin (Phase 4). See `../ROADMAP.md` in the parent directory for the four-phase plan.

Content Studio also doubles as the real product used in Macroscope demo videos, so it needs to feel polished on camera.

---

## 2. Users

| User | Role |
|------|------|
| Ivan | Dev Advocate — primary user, manages projects and cards |
| Kayvon | Strategy — reviews ideas, directional feedback |
| Eliza | Events / Partnerships — occasional use |

Single-tenant, trusted users only. No auth beyond Supabase's default RLS.

---

## 3. Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React + Vite | SPA, deployed as a Railway service |
| Backend API | Node.js + Hono | CRUD only, deployed as a Railway service |
| Database | Supabase (PostgreSQL + Realtime) | Two tables: `projects`, `cards`. Realtime for live board updates. |
| Hosting | Railway | One web service, one api service. |

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │────▶│ API      │────▶│ Supabase │
│ (React)  │     │ (Hono)   │     │ (Postgres│
│          │◀────│          │◀────│ +Realtime│
└──────────┘     └──────────┘     └──────────┘
        ▲                                │
        └────────── Realtime ────────────┘
```

No workers, no queues, no AI services. The frontend subscribes to Supabase Realtime for card changes so multi-tab sessions stay in sync.

---

## 4. Data Model

Two tables. Both live in the `public` schema.

### `projects`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `name` | `text` | Display name |
| `slug` | `text` unique | URL-safe identifier |
| `icon` | `text` | 1–2 character mnemonic, auto-generated from name |
| `color` | `text` | Hex color used for the project badge |
| `created_at` | `timestamptz` | Defaults to `now()` |
| `updated_at` | `timestamptz` | Auto-updated by trigger |
| `created_by` | `uuid` | Nullable reference to `auth.users(id)` |

### `cards`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `project_id` | `uuid` FK → `projects` | `on delete cascade` |
| `title` | `text` | Required, set at creation |
| `summary` | `text` | Free-form body; autosaved from the expanded view |
| `stage` | `stage` enum | `unreviewed` / `considering` / `in_production` / `published` |
| `content_type` | `content_type` enum | `short` / `long`. Pre-existing metadata from the content-pipeline era; kept for now. |
| `sort_order` | `integer` | Per-stage ordering |
| `created_at` | `timestamptz` | Defaults to `now()` |
| `updated_at` | `timestamptz` | Auto-updated by trigger |

Both tables have RLS enabled with permissive `authenticated` + `service_role` policies. `cards` is in the `supabase_realtime` publication so the frontend receives live change events.

### Dropped in Phase 1
The `worker_jobs`, `chat_messages`, `artifacts`, and `context_files` tables were dropped along with their enums (`artifact_type`, `artifact_status`, `chat_role`, `job_status`, `card_creator`, `file_type`), the `context-files` storage bucket, and the `cards.created_by` column. See migration `20260410154149_drop_ai_tables.sql`.

---

## 5. API Surface

All responses are shaped `{ data, error }`. Base path `/api`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness check |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/:id` | Get a project with per-stage card counts |
| PUT | `/api/projects/:id` | Update a project |
| DELETE | `/api/projects/:id` | Delete a project (cascades to cards) |
| GET | `/api/projects/:projectId/cards` | List cards in a project |
| POST | `/api/projects/:projectId/cards` | Create a card |
| GET | `/api/cards/:id` | Get a single card |
| PUT | `/api/cards/:id` | Update `title` / `summary` / `stage` / `content_type` / `sort_order` |
| DELETE | `/api/cards/:id` | Delete a card |

That's it. There are no AI endpoints, no chat endpoints, no context-file endpoints, no worker-job status endpoints.

---

## 6. Frontend Surface

| Area | Component | Responsibility |
|------|-----------|----------------|
| Sidebar | `Sidebar.tsx` | Wordmark, project list, new-project trigger |
| Header | Inline in `App.tsx` | Active project badge, stats, inline `+ Card` input |
| Board | `KanbanBoard.tsx` + `KanbanCard.tsx` | Four-column Kanban grouped by stage |
| Expanded card | `ExpandedCardView.tsx` | Breadcrumbs, title, type badge, editable autosaving summary, properties sidebar, delete |
| Properties sidebar | `PropertiesSidebar.tsx` | Stage dropdown, content type, created date, word count, delete action |
| Modals | `NewProjectModal.tsx` | Create project |

`useProjects` and `useCards` wrap the REST API and subscribe to Supabase Realtime for `cards` changes.

### Interaction notes
- The `+ Card` header button toggles an inline title-only input. Pressing Enter creates the card and opens its expanded view. Escape or blur-with-empty cancels.
- The expanded summary textarea autosaves on 1-second debounce and on blur. Local state is only updated when the PUT succeeds, and the blur handler guards against stale races if the user re-focuses and keeps typing mid-save.
- Stage changes from the properties sidebar PUT immediately and optimistically update local state on success.

---

## 7. Out of scope for Phase 1

Explicitly *not* in this app right now:
- AI / Claude anything (idea generation, chat, artifacts, prompts)
- Comments, threaded discussions, or activity feed
- File attachments
- Rich text / markdown editor
- Keyboard shortcuts beyond Escape
- Filters, search, saved views
- Priority, assignee, labels, due dates
- Multi-user auth flows
- List view (only the Kanban board exists)

Most of this is planned for Phase 2. See `../ROADMAP.md`.

---

## 8. Environment

See `SETUP-GUIDE.md` for the bootstrap steps. The runtime needs three Supabase env vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), `FRONTEND_URL` for CORS, and `NODE_ENV`. No Anthropic key, no worker env vars.
