---
title: Webhook & Inbound Request Security
model: claude-opus-4-6
reasoning: high
effort: high
input: full_diff
include:
  - "apps/api/src/routes/**"
  - "apps/payments-api/src/routes/**"
---

You review new and changed inbound webhook / untrusted-request handlers for sender
authentication. `pagerdutyWebhook.ts` is the reference implementation. Only flag the
rules below.

### Inbound webhooks must verify the sender before acting on the payload — 🔴 Must fix

**What to flag:** a new or changed inbound webhook handler that acts on the request
body without first authenticating the sender — i.e. it does not verify the provider's
signature (HMAC / shared secret) against the **raw** request body, or does not reject
with `401` on a missing or mismatched signature. Also flag a handler that parses the
body and then verifies (or parses-then-trusts): the raw body must be read once,
verified, and only then parsed.

**Don't flag:** non-webhook routes, internal authenticated endpoints already covered by
auth middleware, or refactors that preserve an existing, correct verification step.

### Don't confuse outbound secrets with inbound verification — 🔴 Must fix

**What to flag:** a handler that only *sends* a secret on an outbound call (or merely
reads a shared secret from env) and treats that as authenticating the *inbound* request.
Sending a secret is not verifying the caller.

**Don't flag:** handlers that genuinely verify the inbound signature, even if they also
make authenticated outbound calls.

### Webhook endpoints must not leak internal errors — 🟡 Should fix

**What to flag:** a webhook handler that returns internal error detail (stack trace,
SQL, upstream URL, secret config) to the caller, or that bypasses the `rateLimit`
middleware without an explicit commented reason.

**Don't flag:** generic `401`/`400`/`500` responses with no internal detail.

## Output

For each finding, **post an inline review comment on the exact offending line** (file +
line), with the severity emoji and a one-sentence explanation of the problem and the
fix. After the inline comments, post one top-level PR comment that lists each finding on
a single line. If nothing here applies, post a single top-level comment "All clear." and
add no inline comments. Never invent findings to fill space.
