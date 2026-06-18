---
title: Backend Conventions
model: claude-opus-4-8
reasoning: high
effort: high
input: full_diff
include:
  - "apps/api/src/**"
  - "apps/payments-api/src/**"
exclude:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/*.d.ts"
  - "**/dist/**"
---

You review backend changes (Hono API and payments-api) for adherence to Content
Studio's engineering conventions. Only flag the rules below. If the PR violates none
of them, say so in one line and report nothing else — do not invent findings.

### Validate input at the edge of every handler — 🔴 Must fix

**What to flag:**
- A route handler that reads `c.req.json()` or `c.req.param()` directly instead of
  going through `parseBody(c, schema)` / `parseParams(c, schema)`.
- A parse call whose failure is not returned immediately — the next line after
  `const parsed = await parseBody(...)` must be `if (!parsed.ok) return parsed.response;`
  before any other work.
- A Zod schema defined inline in a route file instead of in `apps/api/src/lib/schemas.ts`.
- An "update" (PATCH/PUT) schema that does not `.refine(...)` to reject an empty
  payload ("no fields to update").

**Don't flag:** handlers that legitimately take no body or params; reuse of an
existing shared schema; non-route helper functions.

### NodeNext relative imports must carry the `.js` extension — 🟡 Should fix

**What to flag:** a relative import (`./` or `../`) in backend code that omits the
`.js` extension — e.g. `from "../db/supabase"` instead of `from "../db/supabase.js"`.
This is NodeNext ESM; a missing extension breaks at runtime even if the type-checker
stays quiet.

**Don't flag:** bare package imports (`from "hono"`, `from "@content-studio/shared"`);
imports that already end in `.js`; `import type` lines are still subject to this rule,
so check them too.

### Use the structured logger, never `console.*` — 🟡 Should fix

**What to flag:**
- `console.log` / `console.warn` / `console.error` in `apps/api` or `apps/payments-api`
  application code. Logging goes through the request-scoped pino child logger
  (`c.get("logger")?.warn({ ...fields }, "event_name")`).
- A log call whose event name is not a short, lowercase `snake_case` string, or that
  interpolates structured data into the message string instead of passing it as the
  first argument object.

**Don't flag:** `console.*` in `instrument.ts` (the Sentry bootstrap), in a documented
idle-client error handler, or in dev-only tooling; the `apps/web` logger shim.

## Output

For each finding, **post an inline review comment on the exact offending line**
(file + line), with the severity emoji and a one-sentence explanation of the problem
and the fix. After the inline comments, post one top-level PR comment that lists each
finding on a single line. If nothing here applies, post a single top-level comment
"All clear." and add no inline comments. Never invent findings to fill space.
