---
title: Observability & Data Bounds
model: claude-opus-4-6
reasoning: high
effort: high
input: full_diff
include:
  - "apps/api/src/**"
  - "apps/payments-api/src/**"
  - "apps/web/src/**"
exclude:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/*.d.ts"
  - "**/dist/**"
---

You review changes for Content Studio's analytics-and-observability conventions in
`CONTRIBUTING.md` §14: customer-facing actions must be instrumented, and list
endpoints must bound their result set. Only flag the rules below. Read the surrounding
code first — `apps/web/src/lib/analytics.ts` defines `track()`, and existing routes in
`apps/api/src/routes/*` show the established query patterns.

### List endpoints must bound their result set — 🟡 Should fix

**What to flag:** a new or modified backend list/collection endpoint (under
`apps/api/src/**` or `apps/payments-api/src/**`) whose query can grow unbounded with
tenant data — e.g. a `select(...)` with no `.limit(...)`, `.range(...)`, or pagination
on a table that accumulates rows (projects, tickets, comments, assets, activity,
events). An unbounded fetch that scales with usage is a latency and cost regression.

**Don't flag:** queries that fetch a single row by id/unique key; lookups already
bounded by a narrow, non-growing key set (e.g. a fixed enum, a one-tenant config row);
endpoints that already paginate or cap; non-list reads.

### Customer-facing actions emit an analytics event — 🟡 Should fix

**What to flag:** a customer-facing mutation in the web app
(`apps/web/src/**`) — project/ticket create, edit, delete, status change, invite
sent, and similar — that completes without emitting a `track()` event from
`apps/web/src/lib/analytics.ts`. If a PM couldn't tell from the data that the action
happened, it's under-instrumented. Also flag a `track()` call whose event name is not
a `snake_case` verb/object (`ticket_created`, `invite_sent`) or that interpolates
values into the name instead of passing structured props.

**Don't flag:** pure reads/navigation; internal/admin-only or dev-tooling actions;
optimistic UI updates where the underlying mutation already emits the event; actions
where a shared wrapper the diff doesn't change already tracks the event.

## Output

For each finding, **post an inline review comment on the exact offending line**
(file + line), with the severity emoji and a one-sentence explanation of the problem
and the fix. After the inline comments, post one top-level PR comment that lists each
finding on a single line. If nothing here applies, post a single top-level comment
"All clear." and add no inline comments. Never invent findings to fill space.
