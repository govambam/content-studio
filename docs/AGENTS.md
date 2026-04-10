# Content Studio — Agent Team & Workflow

## Overview

Content Studio is built by a lean team: **two agents** (PM and Engineer) supported by **two skills** (Design QA and Macroscope Review). Agents handle open-ended judgment and coordination. Skills handle structured, repeatable workflows.

In practice the "team" is one Claude Code session acting as the PM, which orchestrates implementation, invokes skills, and runs the PR lifecycle end-to-end.

---

## Agents

### Project Manager (PM)

**Responsibility:** Orchestration, planning, PR lifecycle, skill invocation.

**What it does:**
- Reads the active roadmap (`../ROADMAP.md` in the parent directory) and `docs/PRODUCT-SPEC.md` to scope each PR.
- Creates the feature branch, implements the change, commits clean history.
- For any PR that touches frontend files, runs the **Design QA skill** (`skills/design-qa.md`) before opening the PR and fixes any violations.
- Opens the PR via `gh pr create` with a description that documents the change and any **Plan deviations**.
- Runs the **Macroscope Review skill** (`skills/macroscope-review.md`), which polls for the review, reads findings, triages them, and returns a structured report.
- If findings exist, fixes all valid bugs in a single commit, pushes, and re-runs the skill. Loops until clean.
- Merges the PR with `gh pr merge --squash --delete-branch` and moves on.

**Does NOT:**
- Ask the human whether to run a skill — just runs it.
- Skip the Macroscope wait loop.
- Merge a PR without a clean review.

### Engineer

In the current single-session model, the PM is also the Engineer. The distinction exists so that if the team splits, the PM can delegate cleanly. The Engineer's job is to write code, run local verification (`npx tsc -b`, `npm run build`), and hand back when the diff is ready for review.

---

## Skills

### Design QA (`skills/design-qa.md`)

**When:** After completing frontend work, before creating the PR.

**What:** Reviews changed frontend files against `docs/DESIGN-SYSTEM.md`. Checks color tokens, typography, border radii, shadows/blurs (banned), spacing, layout structure, and component specs. Returns PASS/FAIL with specific violations and fix instructions.

**Loop:** FAIL → fix in one commit → re-run → repeat until PASS.

### Macroscope Review (`skills/macroscope-review.md`)

**When:** Immediately after creating a PR or pushing fix commits.

**What:** Polls the `Macroscope - Correctness Check` check run on the head commit every 30 seconds until it completes (timeout: 15 minutes). Reads inline review comments, triages each as valid bug / false positive / style preference, and returns a triage report.

**Loop:** Findings → fix all valid bugs in one commit → push → re-run the skill on the new head commit → repeat until CLEAN.

**Critical rule:** One commit per fix pass. Do not push fixes incrementally — each push triggers a new review and creates noise.

---

## Workflow

```
Scope PR from roadmap
        ↓
Implement the change
        ↓
Frontend touched? ── YES → Run Design QA → fix violations → re-run until PASS
        │
        NO
        ↓
gh pr create (with Plan deviations section if applicable)
        ↓
Run Macroscope Review skill (polls automatically)
        ↓
CLEAN? ── NO → Fix all findings in one commit → push → re-run
        │
        YES
        ↓
gh pr merge --squash --delete-branch
        ↓
Next PR
```

---

## PR Scope Guidelines

- **Self-contained.** Each PR is a reviewable unit that leaves `main` in a working state.
- **Focused.** One concern per PR. Backend and frontend sweeps in the same phase can ship separately.
- **Sized for review.** Aim for under ~600 lines of meaningful diff. Splits are fine.
- **Deviations documented.** Every PR description has a `## Plan deviations` section when the work departs from the planning doc. Say what you changed and why.

### PR description template

```markdown
## Summary
What this PR does, in a few bullets.

## Plan deviations
What differs from the roadmap / spec and why. "None" is fine if nothing deviated.

## Design-QA self-check
PASS / FAIL, violations found, violations fixed. Skip this section for non-frontend PRs.

## Test plan
- [x] Local verification steps
- [ ] Anything that still needs to happen before merge
```
