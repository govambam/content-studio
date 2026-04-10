# Content Studio — Product Spec

**Version:** 3.0 (Phase 2 — content pipeline manager)
**Date:** April 10, 2026
**Status:** Current — Phase 2 in progress

This document describes the **target** Phase 2 state of Content Studio. During execution, parts of the app may still reflect the Phase 1 data model until the migration PR lands. The target is the contract; deviations must be documented in PR descriptions.

---

## 1. What This Is

Content Studio is a content pipeline manager used internally by Macroscope's content team. It plans and tracks the production of videos (and other content) about Macroscope features.

The product is organized around a three-level hierarchy:

- **Labels** — tags that represent Macroscope feature areas ("Approvability", "Intent", "Sprint Health"). Labels are a filter dimension, not a container.
- **Projects** — content initiatives. One project is "make a video about custom eligibility rules in Approvability". Projects live on the Home Kanban and flow through four status columns.
- **Tickets** — units of work inside a Project. "Write script", "Record screencast", "Design thumbnail", "Upload to YouTube". Each Project has its own Kanban of Tickets.
- **Assets** — files attached to Tickets. The actual markdown script for a "Write script" ticket, a reference image for a "Design thumbnail" ticket.

Phase 1 stripped AI features out of an earlier incarnation of the app. Phase 2 is the structural rewrite from a minimal Linear-clone tracker into a content pipeline manager with a real three-level hierarchy. Phase 3 adds production telemetry; Phase 4 is the reskin. See `../ROADMAP.md` in the parent directory for the full multi-phase plan.

Content Studio also doubles as the real product used in Macroscope demo videos, so it needs to feel polished on camera.

---

## 2. Terminology

Phase 2 renames Phase 1's top-level entity and adds two new nested levels. The Phase 1 names are dead — new readers should only see the Phase 2 names.

| Phase 1 (gone) | Phase 2 (current) | What it means |
|---|---|---|
| `projects` table | `labels` | A Macroscope feature-area tag. Many-to-many with projects. |
| `cards` table | `projects` | A content initiative. One project → many tickets. |
| — | `tickets` | A unit of work inside a project. |
| — | `assets` | A file attached to a ticket. |

If you see "card" or Phase-1-style "project" anywhere in source, comments, or new code: it's a bug in Phase 2. Rename it.

---

## 3. Users

| User | Role |
|------|------|
| Ivan | Dev Advocate — primary user, manages projects and tickets |
| Kayvon | Strategy — reviews ideas, directional feedback |
| Eliza | Events / Partnerships — occasional use |

Single-tenant, trusted users only. No assignees, no per-user filtering, no auth flows beyond Supabase's defaults.

---

## 4. Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React + Vite | SPA, deployed as a Railway service |
| Backend API | Node.js + Hono | CRUD-only, deployed as a Railway service |
| Database | Supabase (PostgreSQL + Realtime) | Six tables (see §5). Realtime powers two-tab sync. |
| Storage | Supabase Storage | `assets` bucket for ticket attachments |
| Hosting | Railway | One web service, one api service |

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │────▶│ API      │────▶│ Supabase │
│ (React)  │     │ (Hono)   │     │ (Postgres│
│          │◀────│          │◀────│ +Realtime│
└──────────┘     └──────────┘     │ +Storage)│
        ▲                          └──────────┘
        │                                │
        └────────── Realtime ────────────┘
```

No workers, no queues, no background jobs, no AI services. The frontend subscribes to Supabase Realtime on every Phase 2 table so multi-tab sessions stay in sync.

---

## 5. Data Model

Six tables in `public`. All have RLS enabled with permissive `authenticated` + `service_role` policies.

### `labels`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `name` | `text` unique (case-insensitive) | Display name |
| `color` | `text` | Hex color for the chip |
| `created_at` | `timestamptz` | |

### `projects`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `title` | `text` | Required |
| `description` | `text` | Markdown, defaults to `''` |
| `status` | `content_status` enum | `backlog` / `in_progress` / `in_review` / `done` |
| `sort_order` | `integer` | Per-status ordering |
| `updated_by_client` | `text` nullable | Per-tab client UUID stamped on every PUT (used for realtime echo suppression) |
| `created_at` / `updated_at` | `timestamptz` | Auto-updated by trigger |

### `project_labels` (join)
Primary key `(project_id, label_id)`. Both foreign keys `on delete cascade`.

### `tickets`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `project_id` | `uuid` FK → `projects` `on delete cascade` | |
| `title` | `text` | Required |
| `description` | `text` | Markdown, defaults to `''` |
| `status` | `content_status` enum | Same four values as projects |
| `sort_order` | `integer` | Per-status ordering inside a project |
| `updated_by_client` | `text` nullable | Echo suppression |
| `created_at` / `updated_at` | `timestamptz` | |

### `assets`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `ticket_id` | `uuid` FK → `tickets` `on delete cascade` | |
| `filename` | `text` | |
| `storage_path` | `text` | Path in the `assets` Storage bucket |
| `mime_type` | `text` | |
| `size_bytes` | `integer` | |
| `created_at` | `timestamptz` | |

### `comments`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `ticket_id` | `uuid` FK → `tickets` `on delete cascade` | |
| `body` | `text` | Markdown |
| `created_at` / `updated_at` | `timestamptz` | |

### `activity_events`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `ticket_id` | `uuid` FK → `tickets` `on delete cascade` | |
| `event_type` | `activity_event_type` enum | `ticket_created` / `title_changed` / `description_changed` / `status_changed` / `comment_added` / `asset_uploaded` / `asset_deleted` |
| `meta` | `jsonb` | Event-specific payload (old/new values, comment id, filename, `source` client UUID) |
| `created_at` | `timestamptz` | |

### Status enum
```
content_status = ('backlog', 'in_progress', 'in_review', 'done')
```
Projects and tickets share this enum. The same four-column Kanban component renders both.

### Storage bucket
`assets` (private). Path convention: `{ticket_id}/{asset_id}-{filename}`. Authenticated-insert / authenticated-select / authenticated-delete policies.

### Realtime
The `supabase_realtime` publication includes: `labels`, `projects`, `tickets`, `comments`, `activity_events`, `assets`.

---

## 6. API Surface

All responses are shaped `{ data, error }`. Base path `/api`. Every mutation request carries an `x-client-id` header (a per-tab UUID) which the server stamps into `updated_by_client` (for projects/tickets) or `activity_events.meta.source` (for activity writes) for realtime echo suppression.

### Labels
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/labels` | List all labels |
| POST | `/api/labels` | Create (body: `name`, `color`) |
| GET | `/api/labels/:id` | Get one label |
| PUT | `/api/labels/:id` | Update name/color |
| DELETE | `/api/labels/:id` | Delete; cascade removes from `project_labels` only |

### Projects
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/projects` | List projects with their labels joined and per-status ticket counts |
| POST | `/api/projects` | Create (body: `title`, `description?`, `labelIds?`) |
| GET | `/api/projects/:id` | Get one project with labels + ticket counts |
| PUT | `/api/projects/:id` | Update any of `title`, `description`, `status`, `sort_order`, `labelIds` |
| DELETE | `/api/projects/:id` | Cascade deletes all tickets, assets, comments, activity |

### Tickets
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/projects/:projectId/tickets` | List tickets in a project |
| POST | `/api/projects/:projectId/tickets` | Create (body: `title`, `description?`) — new tickets go to the bottom of Backlog |
| GET | `/api/tickets/:id` | Get one ticket |
| PUT | `/api/tickets/:id` | Update any of `title`, `description`, `status`, `sort_order`; writes activity events |
| DELETE | `/api/tickets/:id` | Cascade deletes assets, comments, activity |
| GET | `/api/tickets/:ticketId/activity` | Merged reverse-chronological feed of `activity_events` + `comments` for the ticket |

### Comments
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/tickets/:ticketId/comments` | List comments on a ticket |
| POST | `/api/tickets/:ticketId/comments` | Create (body: `body`); writes a `comment_added` activity event |
| PUT | `/api/comments/:id` | Edit body (no activity event) |
| DELETE | `/api/comments/:id` | Delete (no activity event) |

### Assets
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/tickets/:ticketId/assets` | List assets on a ticket |
| POST | `/api/tickets/:ticketId/assets` | Create row + return a signed upload URL (50 MB max); writes `asset_uploaded` |
| GET | `/api/assets/:id/download` | Return a short-TTL signed download URL |
| DELETE | `/api/assets/:id` | Delete row + storage object; writes `asset_deleted` |

---

## 7. Frontend Surface

Three primary views, routed via `react-router-dom`:

| Route | View | Responsibility |
|---|---|---|
| `/` | Home | Labels sidebar filter + Projects Kanban + New Project modal + New Label inline form |
| `/projects/:projectId` | Project detail | Project header (inline-editable title, labels, status, description) + Tickets Kanban + New Ticket modal |
| `/projects/:projectId/tickets/:ticketId` | Ticket detail | Linear-style issue view — title, metadata, markdown description, assets, activity feed, comments |

### Shared components
| Component | Responsibility |
|---|---|
| `Sidebar` | Macroscope wordmark, Home link, Labels filter list, New Label form |
| `KanbanBoard` | Generic four-column Kanban used by Home (Projects) and Project detail (Tickets). Parameterized by item type and status-change callback. Supports drag-and-drop via `@dnd-kit`. |
| `LabelChip` | Colored label chip (used in sidebar filter, on Project cards, on Project detail header) |
| `StatusBadge` | Status pill used on cards and ticket detail header |
| `Markdown` | `react-markdown` + `remark-gfm` renderer with design-system styling |
| `MarkdownEditor` | Textarea with Preview toggle; autosaves on blur + 800 ms debounce; Esc cancels |
| `Breadcrumbs` | Navigation crumbs used on Project and Ticket detail views |

### Hooks
| Hook | Responsibility |
|---|---|
| `useLabels` | List labels + create/delete + realtime subscription |
| `useProjects` | List projects with joined labels + create/update/delete + realtime subscription |
| `useTickets` | List tickets for a project + create/update/delete + realtime subscription |
| `useTicket` | Fetch a single ticket by id + realtime subscription |
| `useActivity` | Fetch merged activity+comments feed + realtime subscription, with echo suppression |
| `useAssets` | List assets + upload/delete + realtime subscription |

### Interaction notes
- **Inline editing.** Titles and descriptions across all views use the same click-to-edit pattern: click to enter edit mode, type, blur or Cmd+Enter to save, Esc to cancel. Saves debounce at 800 ms while typing and flush on blur.
- **Drag and drop.** Kanban boards support drag within and between status columns. Cross-column drops update `status`; same-column drops update `sort_order`.
- **Filter behavior.** The Home sidebar lets users toggle multiple labels to filter the projects Kanban. The filter is OR across selected labels and is view-local (does not persist across reloads). A label filter does not affect drag-and-drop membership (filters are by label, drag changes status).
- **Echo suppression.** Every mutation carries an `x-client-id` header. On realtime receipt, hooks skip events whose `source` (for activity) or `updated_by_client` (for projects/tickets) matches the local client id — local state already reflects the change.
- **Editing a comment does NOT write an activity event.** Only `comment_added` is recorded. Edits and deletes update the comment row in place or remove it from the feed.
- **Optimism.** Status changes, inline edits, new comments are optimistic. Asset uploads, deletions, and cross-column drops with long payloads are pessimistic.

---

## 8. Behaviors

### 8.1 Activity feed
Every ticket mutation writes an `activity_events` row:
- `ticket_created` — on create, meta `{}`
- `title_changed` — meta `{ from, to }`
- `description_changed` — meta `{}` (no diff)
- `status_changed` — meta `{ from, to }`
- `comment_added` — meta `{ comment_id }`
- `asset_uploaded` — meta `{ asset_id, filename }`
- `asset_deleted` — meta `{ filename }`

All meta objects also carry a `source` field with the originating client UUID. Activity is ticket-scoped; project- and label-level mutations do not write events.

### 8.2 Empty states
- Home with no projects: "No projects yet. Click + New Project to start your first content initiative."
- Home with filter and no matches: "No projects match the current label filter."
- Project detail with no tickets: "This project has no tickets yet. Break down the work by clicking + New Ticket."
- Ticket detail with no assets: "No assets attached. Upload files to keep your work together."
- Ticket detail activity feed is never empty — `ticket_created` is always present.

### 8.3 Loading states
Skeleton loaders on initial fetch; no spinners. Subsequent updates are optimistic where safe and pessimistic where risky (see §7 Interaction notes).

### 8.4 Label deletion
Deleting a label opens a confirm dialog that reads the live project count: "This label is applied to N projects. Deleting it will remove it from all of them. Delete?" On confirm, cascade removes the `project_labels` rows; projects themselves are untouched.

---

## 9. Out of scope for Phase 2

Explicitly *not* in this app right now:
- Command palette, keyboard shortcuts beyond Escape/Cmd+Enter
- Cycles, sprints, time-boxing
- Teams, multi-team workspaces
- Roadmap / initiative views
- Triage inbox
- Automations, rules engine
- GitHub integration
- Notifications (inbox, desktop, email, Slack)
- Subscriptions / follow mechanics
- Integrations marketplace
- Analytics, reporting, velocity
- Import, bulk export
- Auth beyond Supabase defaults (single-user-for-demo is fine)
- Assignees on tickets or projects
- Rich-text WYSIWYG (markdown + preview is sufficient)
- Sub-tickets or ticket relations
- Due dates, priority, estimates
- Project lead / owner fields
- Project progress bar calculated from ticket completion
- Rich realtime collaboration beyond last-write-wins

Most of these are planned for later phases or skipped entirely. See `../ROADMAP.md`.

---

## 10. Environment

See `SETUP-GUIDE.md` for the bootstrap steps. The runtime needs three Supabase env vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), `FRONTEND_URL` for CORS, and `NODE_ENV`. No Anthropic key. No worker env vars.
