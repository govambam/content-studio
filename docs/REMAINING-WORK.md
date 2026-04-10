# Content Studio — Remaining Work (Phase 1 Completion)

> **Status:** In progress
> **Scope:** Everything needed to make the Phase 1 MVP fully functional, minus auth.
> **Tracking:** Check off items as PRs are merged.

---

## PR A: Context Panel UI + File Upload
**Goal:** Let users upload context files so Claude has project-specific knowledge.

- [ ] **Context panel slide-over** — 340px panel from the right edge (DESIGN-SYSTEM.md §11)
  - Opens when "Context (N)" button is clicked in the header
  - Closes on click outside or close button
  - Shows list of uploaded files with type badge (DOC/POST/IDEA), filename, size, date
  - "+ Upload file" button at the top
- [ ] **File upload flow** — multipart form upload
  - File picker accepts .md, .txt, .pdf, .doc
  - File type selector (docs, post, ideas, other)
  - Upload progress indicator
  - File appears in list after upload completes
- [ ] **File deletion** — click to remove a context file
- [ ] **Header count** — "Context (N)" shows actual file count, not hardcoded 0
- [ ] **useContextFiles hook** — fetch/upload/delete context files for active project

---

## PR B: Stage Transitions + Card Management
**Goal:** Let users move cards between Kanban stages and manage cards.

- [ ] **Stage dropdown on expanded card view** — select element in the card header
  - Options: Unreviewed, Considering, In Production, Published
  - Changing the dropdown calls `PUT /api/cards/:id` with the new stage
  - Card moves to the new column when user returns to board
- [ ] **Card deletion** — delete button on expanded card view
  - Confirmation before deleting
  - Returns to board after deletion
- [ ] **Project deletion** — delete option accessible from sidebar or project settings
  - Confirmation dialog: "Delete {project name} and all its cards?"
  - Removes project and returns to empty state
- [ ] **Card sort order** — cards within a column maintain sort order
  - New cards go to the top of their stage column

---

## PR C: Generate Ideas UX + Loading States
**Goal:** Make idea generation feel responsive and complete.

- [ ] **"Generate Ideas" button loading state** — button shows "Generating..." while working
  - Disable the button during generation
  - Poll the worker job status (`GET /api/worker-jobs/:id` — needs new endpoint) or poll cards
- [ ] **"+ Generate more ideas" button wiring** — Unreviewed column button triggers idea generation
  - Same behavior as header button
- [ ] **Card stats in project header** — "X ideas · Y considering · Z in production"
  - Fetch from project detail endpoint (already returns stats)
  - Update after card stage changes or idea generation
- [ ] **Auto-refresh after generation** — poll for new cards every 2s for 30s after triggering generation
  - Or use Supabase Realtime subscription on cards table

---

## PR D: Supabase Realtime Integration
**Goal:** Live updates across the app without manual refresh.

- [ ] **Cards subscription** — subscribe to INSERT/UPDATE/DELETE on cards for the active project
  - New cards from idea generation appear on the board automatically
  - Stage changes from other tabs/users reflect immediately
  - Card summary updates from chat reflect on the board
- [ ] **Chat messages subscription** — subscribe to INSERT on chat_messages for the active card
  - If Claude's response arrives while viewing the card, it appears without refresh
  - Enables future multi-user collaboration (two people chatting on the same card)
- [ ] **Cleanup** — unsubscribe when switching projects/cards to avoid stale subscriptions
- [ ] **Remove manual polling/setTimeout hacks** — replace with Realtime where applicable

---

## PR E: Worker Service (Background Claude Tasks)
**Goal:** Move Claude calls out of the API process into a separate worker.

- [ ] **Worker polling loop** — `apps/worker/src/index.ts` polls `worker_jobs` for pending jobs
  - Picks up jobs with `status: 'pending'`, marks as `'running'`
  - Dispatches to task handlers based on `task_type`
  - Handles graceful shutdown (SIGTERM/SIGINT)
- [ ] **Move idea generation to worker** — API creates the job, worker executes it
  - `POST /api/projects/:id/generate-ideas` only creates the job row
  - Worker picks it up and runs `generateIdeas()`
  - Remove inline `generateIdeas()` call from the API route
- [ ] **Worker job status endpoint** — `GET /api/worker-jobs/:id`
  - Returns job status, result, error, attempts
  - Frontend can poll this for progress
- [ ] **Worker Dockerfile** — similar to API Dockerfile
  - Deployed as a third Railway service
- [ ] **Retry logic** — worker retries failed jobs up to 3 times
  - Exponential backoff between retries

---

## PR F: Integration Polish
**Goal:** Final pass to make the app feel complete and demo-worthy.

- [ ] **Error handling UI** — toast/notification for failed API calls
  - "Failed to create project" / "Failed to generate ideas" / etc.
  - Retry button where applicable
- [ ] **Empty states** — meaningful empty states for:
  - Empty Kanban board ("No ideas yet. Upload context files and generate ideas.")
  - Empty context panel ("No files uploaded. Add docs, posts, or ideas for Claude to reference.")
- [ ] **Loading skeletons** — subtle loading indicators for:
  - Project list loading
  - Cards loading
  - Card detail loading
- [ ] **Keyboard shortcuts** — Enter to send chat message (already done), Escape to close panels
- [ ] **Responsive tweaks** — ensure nothing breaks at common desktop widths (1280-1920px)
- [ ] **Full Design QA audit** — run skills/design-qa.md against ALL frontend files one final time
- [ ] **Deploy verification** — test full flow on Railway production

---

## Implementation Order

```
PR A: Context Panel UI + File Upload        ← enables Claude to have project knowledge
PR B: Stage Transitions + Card Management   ← enables the core Kanban workflow
PR C: Generate Ideas UX + Loading States    ← makes idea generation usable
PR D: Supabase Realtime Integration         ← live updates, removes refresh hacks
PR E: Worker Service                        ← moves Claude to background (optional for MVP)
PR F: Integration Polish                    ← final pass, error handling, empty states
```

**PR E (Worker) is optional for MVP.** The inline Claude calls work fine for a 2-4 person team. It only becomes a problem under concurrent load, which isn't a Phase 1 concern.

---

## Out of Scope (Phase 2+)

- Auth (Supabase Auth, email/magic link)
- Artifacts (demo flow, script tabs, tab-based chat)
- Quick action chips beyond "Expand idea" / "Suggest variations"
- Drag-and-drop on Kanban board
- Markdown rendering in content blocks
- Mobile responsive layout
