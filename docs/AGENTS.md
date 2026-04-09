# Content Studio — Agent Team & Workflow

## Overview

Content Studio is built by a lean team: **two agents** (PM and Engineer) supported by **two skills** (Design QA and Macroscope Review). Agents handle open-ended judgment and coordination. Skills handle structured, repeatable workflows.

**Why this split:** The Macroscope review loop and design QA checks are highly structured processes — check → classify → report. They don't need a dedicated agent with its own context and handoff overhead. A skill the PM invokes directly is faster, more consistent, and portable to future projects.

---

## Agents

### 1. Project Manager (PM)

**Responsibility:** Orchestration, planning, task breakdown, PR lifecycle management, skill invocation.

**What it does:**
- Reads `PRODUCT-SPEC.md` and breaks Phase 1 into a sequence of PRs (see `CLAUDE.md` for the PR plan).
- For each PR, writes a clear scope document: what's included, what's not, acceptance criteria.
- Creates the feature branch and initiates work by delegating to the Engineer.
- After the Engineer completes frontend work, runs the **Design QA skill** (`skills/design-qa.md`).
- If Design QA finds violations, delegates fixes to the Engineer and re-runs the skill.
- Once Design QA passes, creates the PR via `gh pr create`.
- Runs the **Macroscope Review skill** (`skills/macroscope-review.md`), which handles waiting, reading, and triaging findings.
- If the skill reports valid bugs, delegates fixes to the Engineer, then re-runs the skill.
- When the skill reports "CLEAN," merges the PR.
- Tracks overall progress and reports status.

**Tools it uses:** `gh`, `git`, file read/write, skill invocation.

**Does NOT:** Write application code or make design decisions directly.

---

### 2. Engineer

**Responsibility:** Writing all application code — frontend, backend, database, worker.

**What it does:**
- Receives a scoped task from the PM (e.g., "Implement card CRUD API endpoints per PRODUCT-SPEC.md §6.3").
- Reads the relevant sections of `PRODUCT-SPEC.md`, `DESIGN-SYSTEM.md`, and any existing code.
- Implements the feature: writes TypeScript, React components, API routes, database migrations, prompts.
- Runs the dev server and verifies the feature works locally.
- Commits clean, well-structured code with descriptive commit messages.
- When the PM relays Design QA violations or Macroscope bug fixes, implements ALL fixes in a single commit.
- Hands back to PM when implementation is complete.

**Tools it uses:** `npm`, `npx`, `supabase`, file read/write/edit, dev server.

**Does NOT:** Create PRs, merge branches, interact with GitHub, or run review skills.

---

## Skills

### Design QA Skill

**File:** `skills/design-qa.md`

**When to invoke:** After the Engineer completes any PR that includes frontend changes, BEFORE creating the PR.

**What it does:**
1. Reviews all changed frontend files against `DESIGN-SYSTEM.md`.
2. Checks every design token, typography rule, border-radius exception, shadow prohibition, spacing value, and component spec.
3. Returns a PASS/FAIL report with specific violations, file locations, and fix instructions.

**PM invokes it by:** Reading `skills/design-qa.md` and following its steps against the changed files.

**Loop:** If FAIL → PM sends violation list to Engineer → Engineer fixes in one commit → PM re-runs skill → repeat until PASS.

---

### Macroscope Review Skill

**File:** `skills/macroscope-review.md`

**When to invoke:** Immediately after creating a PR or after the Engineer pushes fix commits to the PR branch.

**What it does:**
1. **Waits** for Macroscope to complete its review by polling `gh api` every 30 seconds (reviews take 1–10 minutes).
2. **Reads** all review findings once the review is detected.
3. **Triages** each finding as valid bug, false positive, or style preference.
4. **Returns** a structured report with fix instructions for valid bugs.

**PM invokes it by:** Reading `skills/macroscope-review.md` and following its steps with the current PR number.

**Loop:** If FIXES NEEDED → PM sends fix list to Engineer → Engineer fixes in one commit → Engineer pushes → PM re-runs skill from Step 1 → repeat until CLEAN.

**Waiting behavior:** The skill owns the entire wait cycle. It polls every 30 seconds and times out at 15 minutes. The PM does not need to manually check — the skill handles it. This prevents premature merges and ensures every review pass is fully processed.

---

## Workflow: Building a Feature

```
PM: Scopes the PR, writes task description
                ↓
PM → Engineer: "Implement {task}"
                ↓
Engineer: Implements the feature, commits
                ↓
Engineer → PM: "Implementation complete"
                ↓
        ┌── Has frontend changes? ──┐
        │ YES                       │ NO
        ↓                           │
PM: Runs Design QA skill            │
        ↓                           │
    ┌─ PASS? ──┐                    │
    │ NO       │ YES                │
    ↓          │                    │
PM → Engineer  │                    │
fixes in one   │                    │
commit, re-run │                    │
    └──────────┘                    │
        ↓ ◄─────────────────────────┘
PM: Creates PR via `gh pr create`
        ↓
PM: Runs Macroscope Review skill
    (skill waits for review automatically)
        ↓
    ┌─ CLEAN? ─┐
    │ NO       │ YES
    ↓          ↓
PM → Engineer  PM: Merges PR
fixes in one   PM: Moves to next PR
commit, push,
re-run skill
    └──────────┘
```

---

## PR Scope Guidelines

Each PR should be:

- **Self-contained:** It adds a complete, testable unit of functionality.
- **Focused:** One concern per PR. Don't mix backend API work with frontend components.
- **Small enough to review:** Aim for under 500 lines of meaningful code changes (excluding generated files).
- **Documented:** PR description explains what was built, what sections of PRODUCT-SPEC.md it implements, and any decisions made.

### PR Description Template

```markdown
## What

Brief description of what this PR implements.

## Spec Reference

Which sections of PRODUCT-SPEC.md this covers (e.g., §3.1 Core Entities, §6.1 Projects API).

## Changes

- List of significant changes

## Design System Compliance

- [ ] Design QA skill passed on all frontend files
- [ ] No violations found (or list exceptions with justification)

## Testing

How this was verified (dev server, API calls, etc.)
```

---

## Agent Communication Protocol

The PM orchestrates everything. The Engineer receives tasks and returns results. Skills are invoked by the PM inline — they don't require handoffs.

**PM → Engineer (task delegation):**

```
@Engineer: Please implement [specific task].
- Scope: [what to build]
- Spec reference: PRODUCT-SPEC.md §[section]
- Design reference: DESIGN-SYSTEM.md §[section] (for UI work)
- Files to create/modify: [list]
- Acceptance criteria: [what "done" looks like]
```

**PM → Engineer (fix delegation after Design QA or Macroscope):**

```
@Engineer: Fix the following issues (commit all fixes together):
1. {file}:{line} — {what to fix}
2. {file}:{line} — {what to fix}
Then push to the PR branch.
```

**PM invoking a skill:**

No special syntax. The PM reads the skill file and executes its steps directly. The skill's output (the triage report or QA report) becomes the PM's input for the next decision.
