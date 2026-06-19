---
title: Backend code quality
model: claude-opus-4-6
reasoning: high
effort: high
input: full_diff
include:
  - "apps/api/src/**"
  - "apps/payments-api/src/**"
---

You review changes to the Node/Hono backends (`apps/api`, `apps/payments-api`) for
logging and TypeScript conventions. Only flag what these sections describe.

### Structured logging only — 🟡 Should fix

**Flag** any use of `console.log` / `console.warn` / `console.error` in backend code —
logging must go through the structured **pino** logger. Inside a request, it should use
the request-scoped child logger (`c.get("logger")?.warn({ ...fields }, "event_name")`)
so the `requestId` is carried automatically. **Flag** log event names that aren't short,
lowercase `snake_case` (e.g. `"validation_failed"`), and **flag** structured data
interpolated into the message string instead of passed as the **first** argument object.

**Flag** any log line that includes secrets, tokens, raw request bodies, or PII, or
unbounded user-derived input that isn't pattern/length-checked before reaching the log
(see the request-id regex in `middleware/requestContext.ts`).

**Don't flag** `console.*` in the `apps/web` logger shim or in dev/build tooling (out of
scope here anyway), and don't flag logging that already uses the request-scoped pino
child logger correctly.

### TypeScript discipline — 🟡 Should fix

**Flag** any `any` type (use `unknown` at boundaries and narrow, or a proper interface).
**Flag** a relative import in backend code that omits the `.js` extension — this is
NodeNext ESM, so it must be `from "../db/supabase.js"`, not `from "../db/supabase"`; a
missing extension breaks the build. **Flag** type-only imports that don't use
`import type { … }`, and `as` casts used where `satisfies` would assert a literal matches
a type. **Flag** a locally redefined shared type (`ApiResponse`, `Label`,
`ContentStatus`, …) that should be imported from `@content-studio/shared`.

**Don't flag** an unavoidable boundary `as` cast that has no `satisfies` equivalent, or
imports of third-party packages (the `.js` rule is for relative imports only).

## Output

For each finding, **post an inline review comment on the exact offending line**
(file + line), with the severity emoji and a one-sentence explanation of the problem
and the fix. After the inline comments, post one top-level PR comment that lists each
finding on a single line. If nothing here applies, post a single top-level comment
"All clear." and add no inline comments. Never invent findings to fill space.
