# Contributing to Content Studio

This document captures the engineering conventions every change to Content Studio
must follow. It exists so that reviewers (human and automated) have one place to
point at when a PR drifts from house style.

The rules below are **deliberately specific and enforceable** — most of them can
be checked against a diff. They are derived from the patterns already established
in `apps/api`, `apps/web`, and `apps/payments-api`. When in doubt, read the
surrounding code first and mirror it; consistency with the existing codebase
beats personal preference.

> **Core mandate.** Mimic existing structure, naming, typing, and architectural
> patterns. Verify a library is already used (check `package.json` and existing
> imports) before reaching for a new one. Changes should integrate so naturally
> that a reviewer can't tell which hand wrote them.

---

## 1. API Response Envelope

Every API route returns the canonical `{ data, error }` envelope — never a bare
object, array, or string.

- **Always** type the response with `satisfies ApiResponse<T>`. This forces the
  shape to match the shared contract without widening the inferred type.
- On success: `{ data, error: null }`. On failure: `{ data: null, error: <message> }`.
  Never return both `data` and `error` as non-null.
- Use the correct HTTP status. A successful create returns `201`; a missing row
  returns `404`; a validation failure returns `400`; an unexpected DB error
  returns `500`.
- Map Supabase's "no rows" code (`PGRST116`) to `404`, everything else to `500`.

```ts
// ✅ Correct
return c.json({ data, error: null } satisfies ApiResponse<Label>, 201);

const status = error.code === "PGRST116" ? 404 : 500;
return c.json({ data: null, error: error.message } satisfies ApiResponse<null>, status);

// ❌ Wrong — bare payload, no envelope, no status discipline
return c.json(label);
return c.json({ label, ok: true });
```

---

## 2. Input Validation

User input is validated at the edge of every handler, never deep in business logic.

- **All** request bodies go through `parseBody(c, schema)`; **all** route params
  go through `parseParams(c, schema)`. Never call `c.req.json()` or
  `c.req.param()` directly inside a route handler.
- After a parse call, return immediately on failure before doing anything else:
  `if (!parsed.ok) return parsed.response;`
- Every Zod schema lives in `apps/api/src/lib/schemas.ts`. Do not define ad-hoc
  inline schemas in route files.
- "Update" schemas must use `.refine(...)` to reject empty payloads ("no fields
  to update"). A PATCH/PUT that changes nothing is a client bug, not a no-op.
- Reuse the shared primitives (`uuidSchema`, `nonEmptyString`,
  `contentStatusSchema`) rather than re-declaring `z.string().uuid()` etc.

```ts
// ✅ Correct
const parsed = await parseBody(c, createLabelSchema);
if (!parsed.ok) return parsed.response;

// ❌ Wrong — raw body, no validation, no early return
const body = await c.req.json();
```

---

## 3. Error Handling

- **Never ignore an error.** Every `{ data, error }` returned from Supabase must
  be checked before the data is used. A silent discard is a review blocker.
- Library and service code returns errors; it does not decide how to present
  them. Let the route handler choose the status and shape.
- Validate early in the handler, not buried inside a helper three calls deep.
- Wrap fetch / async boundaries in `try/catch` and convert thrown values into the
  `{ data: null, error }` envelope — `err instanceof Error ? err.message : String(err)`.
  Never let an unhandled rejection escape a request.
- Do not leak internal implementation details (stack traces, SQL, secret config)
  into a user-facing `error` string.

---

## 4. Logging & Observability

- Use the structured **pino** logger, never `console.log` / `console.error`, in
  `apps/api`, `apps/payments-api`, or any worker code. (`console.*` is allowed
  only in the `apps/web` logger shim and dev tooling.)
- Inside a request, log through the request-scoped child logger:
  `c.get("logger")?.warn({ ...fields }, "event_name")`. This carries the
  `requestId` automatically.
- Log messages are short, lowercase, `snake_case` event names
  (e.g. `"validation_failed"`), with structured data passed as the **first**
  argument object — not interpolated into the string.
- **Never** log secrets, tokens, raw request bodies, or PII. Bound anything
  derived from user input before it reaches a log line (see the request-id regex
  in `middleware/requestContext.ts`).
- Thread the correlation id end to end: the web client sends `x-request-id` and
  `x-client-id`; the API echoes and logs them. Don't break that chain.

---

## 5. TypeScript

- `strict` mode is non-negotiable. **No `any`.** Use `unknown` at boundaries and
  narrow, or define a proper interface.
- Shared types (`ApiResponse`, `Label`, `ContentStatus`, …) live in
  `packages/shared` and are imported from `@content-studio/shared`. Do not
  redefine a shared type locally.
- Use `import type { … }` for type-only imports so they're erased from the build.
- In backend (`apps/api`, `apps/payments-api`) code, **relative imports must
  carry the `.js` extension** — this is NodeNext ESM. `from "../db/supabase.js"`,
  not `from "../db/supabase"`.
- Prefer `satisfies` over `as` casts when asserting a literal matches a type.
  Reserve `as` for genuinely unavoidable boundary casts.

---

## 6. Naming

- **No `get` prefix** on accessor-style functions; name them for what they return
  (`store()`, not `getStore()`). Reserve `get*` for HTTP verbs and React-less
  data fetchers where it reads naturally.
- React components are `PascalCase` and live in `PascalCase.tsx` files. Hooks are
  `useThing` in `useThing.ts`. Plain modules are `camelCase.ts`.
- API field names and database columns are `snake_case` (`sort_order`,
  `project_count`, `mime_type`). Client-only/in-memory identifiers may be
  `camelCase` (`labelIds`), but anything that crosses the DB boundary is
  `snake_case`.
- Don't stutter: a `Label` type in the labels module is `Label`, not
  `LabelLabel` / `LabelType`.

---

## 7. Frontend Conventions

- **All** network calls go through the `api` helper (`apps/web/src/lib/api.ts`)
  or a hook that wraps it. Never call `fetch()` directly from a component or view.
- Server state is fetched through the `useThing` hooks in `apps/web/src/hooks`,
  not inlined into components.
- Use the logger shim (`apps/web/src/lib/logger.ts`), not `console.*`, in
  application code.
- **All** styling uses the design tokens defined in `apps/web/src/styles/tokens.css`
  (see `docs/DESIGN-SYSTEM.md`). Do **not** hardcode hex colors, raw pixel
  spacing, font sizes, or font families in component styles — reference the
  CSS custom properties instead.
- Components are functional with hooks. No class components except the existing
  `ErrorBoundary`.

---

## 8. Security

- Treat every inbound header and field as untrusted. Bound and pattern-check
  anything that lands in a log, a query, or a response (the request-id is
  validated against `/^[A-Za-z0-9_-]{8,64}$/` for exactly this reason).
- Don't disable or bypass the `rateLimit`, `securityHeaders`, or `requestContext`
  middleware for a route without an explicit, commented reason.
- Secrets come from environment variables only — never commit them, never log
  them, never hardcode a key or URL. Add new env vars to `.env.example`.
- User-facing errors must not reveal internal structure (table names, SQL,
  upstream URLs, secret config).

---

## 9. Database & Migrations

- Schema changes are numbered SQL migration files under `supabase/migrations/`.
  Never edit an already-merged migration; add a new one.
- Columns are `snake_case`. Document non-obvious cascade / FK behavior in a SQL
  comment (e.g. "cascades `project_labels` rows; projects themselves stay").
- Don't hand-write types that mirror a table — generate or import them from the
  shared package.

---

## 10. Comments

- Comment the **why**, not the **what**. The reader can see *what* the code does;
  explain the constraint, the edge case, or the reason a non-obvious choice was
  made (the request-id regex comment and the "non-JSON response" comment in
  `api.ts` are the standard to match).
- Do not leave commented-out code, `console.log` debugging, or "explain my diff
  to the reviewer" comments in a PR.
- Use `// TODO(name):` for deferred work and `// CONSIDER(name):` for design
  questions worth revisiting — never a bare `// TODO`.

---

## 11. Feature Flags & Safe Rollout

- **Gate every high-traffic or high-risk, customer-facing change behind a feature
  flag** (`useFlag("flag_key", false)` from `apps/web/src/lib/flags.ts`). A flag
  lets us dark-launch, ramp gradually, and **revert without a deploy** if the
  change misbehaves in production.
- "High-risk" includes: anything in the create/edit/delete path a customer can
  trigger, changes to the board/ticket experience, anything touching billing or
  the charge flow, and any new third-party integration surface.
- New flags default to **off** and are removed once the feature is fully ramped —
  don't leave dead flags behind.
- Don't ship a one-way door (irreversible data migration + UI change) in a single
  flagless PR. Land the reversible piece behind a flag first.

```tsx
// ✅ Correct — risky new surface is flagged and reversible
const showBulkActions = useFlag("kanban_bulk_actions", false);
return showBulkActions ? <BulkActionsBar /> : null;

// ❌ Wrong — customer-facing feature shipped unconditionally, no kill switch
return <BulkActionsBar />;
```

---

## 12. Tests

- Every new or changed **API route** ships with a test covering at least the
  success path and one failure path (validation error and/or not-found).
- Every **bug fix** includes a regression test that fails before the fix and
  passes after. "Fixed in the UI, verified by hand" is not sufficient.
- Test both success **and** failure scenarios — a handler that only proves the
  happy path is half-tested.
- Don't assert things already guaranteed by the type system or by other code, and
  don't test framework behavior. Test *our* logic.

---

## 13. Webhooks & Untrusted Inbound Requests

- **Every inbound webhook handler must authenticate the sender before acting on
  the payload** — verify the provider's signature (HMAC / shared secret) against
  the **raw** request body, and reject with `401` on mismatch or missing
  signature. `pagerdutyWebhook.ts` is the reference implementation.
- A webhook that only *sends* a secret on an outbound call is **not** the same as
  verifying the *inbound* request. Don't confuse the two.
- Read the raw body once, verify, then parse. Never parse-then-trust.
- Webhook endpoints are rate-limited and never leak internal errors back to the
  caller.

---

## 14. Analytics & Observability

- **Customer-facing actions emit a `track()` event** (`apps/web/src/lib/analytics.ts`):
  project/ticket create, edit, delete, status change, invite sent, etc. If a PM
  couldn't tell from the data that the action happened, it's under-instrumented.
- Event names are `snake_case` verbs/objects (`ticket_created`, `invite_sent`)
  and pass structured props, not interpolated strings.
- **List endpoints must bound their result set** — paginate or cap the row count.
  An unbounded `select("*")` that grows with tenant data is a latency and cost
  regression waiting to happen.
- New server work that can fail in production is captured for error tracking
  (Sentry via `instrument.ts`); don't swallow exceptions silently.

---

## 15. Before You Open a PR

- The PR is a single self-contained, reviewable unit (see the PR plan in
  `CLAUDE.md`). Don't bundle unrelated changes.
- Frontend changes have been checked against `docs/DESIGN-SYSTEM.md`
  (`skills/design-qa.md`).
- No `any`, no `console.*` in backend code, no raw `fetch` in components, no
  bypassed validation, no hardcoded design values.
- High-risk / customer-facing changes are gated behind a feature flag (§11).
- New or changed routes and bug fixes include tests (§12).
- New inbound webhooks verify the sender's signature (§13).
- New database migrations are reversible / paired with a rollback (§9, §11).
- Customer-facing actions emit an analytics event and list endpoints are bounded (§14).
- Commit messages are descriptive and explain the *why* of the change.
