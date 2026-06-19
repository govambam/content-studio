---
title: API conventions
model: claude-opus-4-6
reasoning: high
effort: high
input: full_diff
include:
  - "apps/api/src/**"
  - "apps/payments-api/src/**"
---

You review changes to the Hono backends (`apps/api`, `apps/payments-api`) for the
house API conventions. Only flag what these sections describe; defer general
runtime-bug hunting to the built-in Correctness agent.

### Response envelope & status discipline — 🟡 Should fix

**Flag** any route handler that returns a response which is not the canonical
`{ data, error }` envelope, or that omits the `satisfies ApiResponse<T>` assertion on
the returned object. On success the shape is `{ data, error: null }`; on failure it is
`{ data: null, error: <message> }` — flag responses that return both as non-null, or
return a bare object/array/string (e.g. `c.json(label)` or `c.json({ label, ok: true })`).

Also flag status-code mistakes: a successful create that doesn't return `201`, a
missing row that doesn't return `404`, a validation failure that isn't `400`, an
unexpected DB error that isn't `500`. Supabase's "no rows" code `PGRST116` must map to
`404` and every other DB error to `500` — flag handlers that don't make this
distinction.

**Don't flag** non-route helper/service code that intentionally returns raw values for
a handler to wrap, or middleware responses (rate-limit/security) that have their own
shape.

### Input validation at the edge — 🟡 Should fix

**Flag** any handler that calls `c.req.json()` or `c.req.param()` directly instead of
going through `parseBody(c, schema)` / `parseParams(c, schema)`. After a parse call,
flag a missing immediate early return on failure (`if (!parsed.ok) return parsed.response;`
must come before any other work). **Flag** Zod schemas defined inline in a route file
instead of in `apps/api/src/lib/schemas.ts`, and re-declarations of the shared
primitives (`uuidSchema`, `nonEmptyString`, `contentStatusSchema`) instead of reusing
them. **Flag** an "update" schema (PATCH/PUT) that does not `.refine(...)` to reject an
empty payload.

**Don't flag** read-only GET handlers that legitimately take no body, or validation
that already routes through the `parseBody`/`parseParams` helpers.

### Errors are never ignored — 🟡 Should fix

**Flag** any `{ data, error }` returned from Supabase whose `error` is used or whose
`data` is consumed without the `error` being checked first — a silent discard is a
review blocker. **Flag** an `async`/fetch boundary not wrapped so thrown values become
the `{ data: null, error }` envelope (`err instanceof Error ? err.message : String(err)`).

**Don't flag** error handling that is already present and correct, or library code that
deliberately returns the error upward for the handler to present.

## Output

For each finding, **post an inline review comment on the exact offending line**
(file + line), with the severity emoji and a one-sentence explanation of the problem
and the fix. After the inline comments, post one top-level PR comment that lists each
finding on a single line. If nothing here applies, post a single top-level comment
"All clear." and add no inline comments. Never invent findings to fill space.
