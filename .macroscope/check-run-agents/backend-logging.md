---
title: Backend Logging & Data Safety
model: claude-opus-4-6
reasoning: high
effort: high
input: full_diff
include:
  - "apps/api/src/**"
  - "apps/payments-api/src/**"
exclude:
  - "apps/**/*.test.ts"
  - "apps/**/*.spec.ts"
---

You review backend logging and data-handling for adherence to this team's
observability conventions. Only flag the rules below.

### No `console.*` in backend code — 🟡 Should fix

**What to flag:** a `console.log` / `console.error` / `console.warn` / `console.debug`
call introduced in `apps/api` or `apps/payments-api`. Backend code must use the
structured pino logger, and inside a request the request-scoped child logger
(`c.get("logger")?.warn({ ...fields }, "event_name")`) so the `requestId` is carried.

**Don't flag:** `console.*` in `apps/web` (the logger shim and dev tooling are
exempt), or logger calls that already go through pino.

### Log event names and structure must follow house style — 🟢 Nit

**What to flag:** a log call whose message isn't a short, lowercase, `snake_case` event
name (e.g. `"validation_failed"`), or that interpolates structured data into the
message string instead of passing it as the **first** argument object.

**Don't flag:** existing log lines the diff doesn't touch.

### Never log secrets, tokens, raw bodies, or PII — 🔴 Must fix

**What to flag:** a log call (or error message returned to the caller) that includes a
secret, token, API key, raw request body, or PII, or that passes unbounded
user-derived input straight into a log line without bounding/pattern-checking it
first (see the request-id regex in `middleware/requestContext.ts`). Also flag
user-facing `error` strings that leak internal structure — stack traces, SQL, table
names, upstream URLs, or secret config.

**Don't flag:** logging of already-bounded, non-sensitive fields (a validated id, an
event name, a status code).

## Output

For each finding, **post an inline review comment on the exact offending line** (file +
line), with the severity emoji and a one-sentence explanation of the problem and the
fix. After the inline comments, post one top-level PR comment that lists each finding on
a single line. If nothing here applies, post a single top-level comment "All clear." and
add no inline comments. Never invent findings to fill space.
