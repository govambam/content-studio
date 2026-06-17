---
title: API Conventions
model: claude-opus-4-8
effort: medium
input: full_diff
tools:
  - browse_code
  - git_tools
  - github_api_read_only
  - modify_pr
include:
  - "apps/api/src/**"
  - "apps/web/src/**"
exclude:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/*.d.ts"
---

You review changes for adherence to Content Studio's API response contract: every
backend route returns a `{ data, error }` envelope, and every caller checks the
`error`. Only flag the rules below. Format each finding as a bullet with its severity
emoji, the file and line, and a one-sentence explanation. If the PR violates none of
these rules, say so in one line and report nothing else — do not invent findings.

### Route handlers must return the `{ data, error }` envelope — 🔴 Must fix

**What to flag:** a new or modified Hono route handler under `apps/api/src/` whose
success or error response does not use the project's `{ data, error }` shape — e.g.
`c.json(rows)` or `c.json({ items })` instead of `c.json({ data, error })`, or an
error path that returns a bare string/object without an `error` field. On success
`error` is `null`; on failure `data` is `null` and `error` carries the message.

**Don't flag:** non-JSON responses that legitimately have no body (e.g. `204 No
Content`, redirects, health checks, webhook ack endpoints that must echo a
third-party's required shape); internal helper functions that aren't route handlers;
unchanged handlers the PR merely moves.

**Source:** CLAUDE.md Code Style ("API routes return `{ data, error }`"); confirmed
as the pervasive pattern across `apps/api/src/routes/*`.

### Callers must check the `error` field — 🟡 Should fix

**What to flag:** a caller of an API helper that returns `{ data, error }` (e.g. the
helpers in `apps/web/src/lib/api.ts`, or any `await deleteX()/createX()/updateX()`
returning that envelope) that ignores the result — destructuring only `data`, or
discarding the return value entirely — on a path where a failed `error` would leave
the UI in a wrong state (e.g. navigating away, optimistic removal, or showing success
after a failed mutation).

**Don't flag:** fire-and-forget calls where failure is genuinely inconsequential and
that intent is clear; reads whose `error` is already surfaced by a shared hook/loader
that the diff doesn't change.

**Source:** CLAUDE.md `{ data, error }` contract; recurring Macroscope review findings
on ignored mutation results in #29 (TicketDetailView) and #30 (ActivityFeed).

---

If the diff touches none of the above, report that the PR meets the API conventions
and stop. You have explicit permission to report nothing on a clean PR — do not pad
with nits.
