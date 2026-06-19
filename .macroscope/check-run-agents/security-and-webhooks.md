---
title: Security & webhooks
model: claude-opus-4-6
reasoning: high
effort: high
input: full_diff
include:
  - "apps/api/src/**"
  - "apps/payments-api/src/**"
---

You review backend changes (`apps/api`, `apps/payments-api`) for the team's security
conventions. These are high-value: a miss here is a vulnerability, not a style nit.

### Inbound webhook handlers verify the sender — 🔴 Must fix

**Flag** any new or modified inbound webhook handler that acts on the payload without
first authenticating the sender: it must verify the provider's signature (HMAC / shared
secret) against the **raw** request body and reject with `401` on a missing or
mismatched signature. `pagerdutyWebhook.ts` is the reference implementation; existing
webhook routes include `sentryWebhook.ts` and `pagerdutyWebhook.ts`. **Flag** a handler
that reads/parses the body and trusts it before verifying (read raw → verify → parse,
never parse-then-trust). Note that sending a secret on an *outbound* call is **not** the
same as verifying an *inbound* request — flag code that confuses the two.

**Don't flag** non-webhook routes, or webhook handlers that already verify the signature
against the raw body and 401 correctly.

### Secrets come from the environment only — 🔴 Must fix

**Flag** any hardcoded secret, API key, token, or service URL in source. Secrets must
come from environment variables, never be committed, logged, or hardcoded. **Flag** a
newly referenced environment variable that isn't added to `.env.example`.

**Don't flag** reading config from `process.env`, or non-secret constants.

### Don't bypass security middleware — 🟡 Should fix

**Flag** a route that disables or bypasses the `rateLimit`, `securityHeaders`, or
`requestContext` middleware without an explicit, commented reason for the exception.

**Don't flag** routes that apply the standard middleware, or a documented bypass with a
clear inline justification.

### User-facing errors don't leak internals — 🟡 Should fix

**Flag** an error response whose `error` string exposes internal structure — stack
traces, SQL, table names, upstream URLs, or secret config. User-facing errors must stay
opaque about implementation.

**Don't flag** generic user-safe messages, or internal details that only go to the
structured logger (not the response).

## Output

For each finding, **post an inline review comment on the exact offending line**
(file + line), with the severity emoji and a one-sentence explanation of the problem
and the fix. After the inline comments, post one top-level PR comment that lists each
finding on a single line. If nothing here applies, post a single top-level comment
"All clear." and add no inline comments. Never invent findings to fill space.
