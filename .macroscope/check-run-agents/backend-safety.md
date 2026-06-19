---
title: Backend Logging & Webhook Safety
model: claude-opus-4-6
reasoning: high
effort: high
input: full_diff
include:
  - "apps/api/src/**"
  - "apps/payments-api/src/**"
exclude:
  - "apps/api/src/**/*.test.ts"
  - "apps/payments-api/src/**/*.test.ts"
---

You review backend changes for logging hygiene and inbound-webhook authentication.
Only flag the rules below.

### Use the structured pino logger, never `console.*` — 🟡 Should fix

**What to flag:** a `console.log` / `console.error` / `console.warn` (etc.) added in
`apps/api` or `apps/payments-api` code. Inside a request, logging should go through the
request-scoped child logger (`c.get("logger")?.warn({ ...fields }, "event_name")`) so
the `requestId` is carried.

**Don't flag:** `console.*` in test files or dev-only tooling.

### Log events must be structured and snake_case — 🟢 Nit

**What to flag:** a log call whose event name is not a short, lowercase `snake_case`
string, or that interpolates structured data into the message string instead of passing
it as the first-argument object (e.g. `logger.warn(\`failed for ${id}\`)` instead of
`logger.warn({ id }, "validation_failed")`).

**Don't flag:** log calls that already pass a structured object first with a
`snake_case` event name.

### Never log secrets, tokens, raw bodies, or PII — 🔴 Must fix

**What to flag:** a log line that includes a secret/token/API key, a raw request body,
or user PII; or user-derived input written to a log without being bounded/pattern-checked
first (the request-id is validated against `/^[A-Za-z0-9_-]{8,64}$/` for exactly this
reason — see `middleware/requestContext.ts`).

**Don't flag:** logging of bounded, non-sensitive identifiers or already-sanitized
fields.

### Inbound webhooks must verify the sender's signature — 🔴 Must fix

**What to flag:** an inbound webhook handler that acts on the payload without verifying
the provider's signature (HMAC / shared secret) against the **raw** request body and
rejecting with `401` on a missing or mismatched signature; a handler that parses the
body before verifying (parse-then-trust); or one that relies on sending a secret on an
*outbound* call as if that authenticated the *inbound* request. `pagerdutyWebhook.ts`
is the reference implementation.

**Don't flag:** outbound integration calls, or webhook handlers that already read the
raw body once, verify the signature, reject on mismatch, then parse.

## Output

For each finding, **post an inline review comment on the exact offending line**
(file + line), with the severity emoji and a one-sentence explanation of the problem
and the fix. After the inline comments, post one top-level PR comment that lists each
finding on a single line. If nothing here applies, post a single top-level comment
"All clear." and add no inline comments. Never invent findings to fill space.
