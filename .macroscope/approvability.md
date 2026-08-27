---
tools:
  - github_api_read_only
  - modify_pr
conclusion: neutral
waitsFor:
  - "Correctness"
  - "Design System & Frontend Conventions"
  - "Feature Flags & Analytics"
waitsForTimeout: 20
neverApprove:
  - "supabase/migrations/**"
  - "apps/payments-api/**"
  - "apps/api/src/routes/pagerdutyWebhook.ts"
  - "apps/api/src/routes/sentryWebhook.ts"
  - "apps/api/src/routes/invites.ts"
  - ".github/workflows/**"
  - ".macroscope/**"
---

# Approvability policy — Content Studio

This policy decides which pull requests Macroscope may approve on its own, so reviewer
attention goes to the changes that actually need a human. It is deliberately
conservative: a missed auto-approval costs one review cycle, a wrong one costs trust.

## Eligible for auto-approval

A PR is eligible when the whole diff falls inside one of these, and nothing in the
"always escalate" list is touched:

- **Documentation only** — `docs/**`, `*.md`, `README`, `CONTRIBUTING`, code comments.
- **Tests only** — new or tightened tests that add coverage without changing behavior.
  Per `CONTRIBUTING.md` §12, tests must cover a success path and a failure path; a
  test-only PR that does both is exactly the kind of change a human need not read.
- **Design-token cleanups** — replacing a hardcoded color, spacing, or font value with
  the corresponding custom property from `apps/web/src/styles/tokens.css`, with no
  change to layout logic or behavior.
- **Mechanical renames and pure refactors** — no behavior change, no public API change,
  no change to the `{ data, error }` response envelope.
- **Dependency bumps** within the same major version, with no lockfile-only surprises
  and no new transitive runtime dependency.
- **Code behind a feature flag that is off**, where the flag defaults to `false`.

## Always escalate to a human

Do not approve, regardless of how small or clean the diff looks:

- **Database schema changes** — anything under `supabase/migrations/**`. A migration is
  a one-way door.
- **Billing and payments** — anything under `apps/payments-api/**` or touching the
  charge flow.
- **Auth, invites, secrets, and environment configuration** — including new environment
  variables and changes to `.env.example`.
- **Inbound webhook handlers** — signature verification is security-critical
  (`CONTRIBUTING.md` §13), so a human confirms it.
- **New or changed public API routes** under `apps/api/src/routes/**` — a changed
  response shape is a contract change for every client.
- **Middleware** — `rateLimit`, `securityHeaders`, or `requestContext`. Bypassing these
  needs a human to read the justification.
- **CI workflows** and **this `.macroscope/` directory** — changes to the review system
  itself are reviewed by people.

## Convention findings block approval

**Do not approve a PR when a convention check run agent has reported a 🔴 Must fix
finding.** The agents — *Design System & Frontend Conventions* and *Feature Flags &
Analytics* — encode conventions this team wrote down in `CONTRIBUTING.md`. A PR that
violates them is not ready to merge unattended, even when the code is correct and the
paths are otherwise eligible.

🟡 Should fix and 🟢 Nit findings do not block approval on their own. Note them in the
verdict so the author sees them, and let the eligibility decision rest on the rest of
this policy.

## Writing the verdict

State the decision in one or two sentences, and **name the specific rule from this
policy that drove it** — "not approved: this PR adds a migration under
`supabase/migrations/`, which this policy escalates to a human" is useful; "not
approved: this change looks risky" is not. When the PR is approved, say which eligible
category it fell into.

## When in doubt

Do not approve. Say what would need to be true for the PR to become eligible, so the
author knows how to split or reshape it.
