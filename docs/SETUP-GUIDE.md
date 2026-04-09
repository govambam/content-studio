# Content Studio — Setup Guide

This guide walks through everything needed to bootstrap the Content Studio project. Complete these steps before starting any implementation work.

---

## 1. Prerequisites

### 1.1 CLI Tools

Ensure these are installed and authenticated on the machine running Claude Code:

| Tool | Install | Auth Command | Verify |
|------|---------|-------------|--------|
| **GitHub CLI** | `brew install gh` | `gh auth login` | `gh auth status` |
| **Railway CLI** | `npm install -g @railway/cli` | `railway login` | `railway whoami` |
| **Supabase CLI** | `brew install supabase/tap/supabase` | `supabase login` | `supabase projects list` |
| **Node.js** | `brew install node` (v20+) | n/a | `node --version` |

### 1.2 Accounts

- **GitHub:** Account with permission to create repos under the target org/user.
- **Railway:** Account with a team/project space.
- **Supabase:** Account with permission to create projects.
- **Anthropic:** API key for Claude (for the app's AI worker).

---

## 2. Environment Variables

### 2.1 For the CLI tools (local machine / Claude Code session)

These need to be available in the terminal session:

| Variable | Purpose | How to Get |
|----------|---------|-----------|
| `GITHUB_TOKEN` | GitHub CLI auth | `gh auth login` sets this automatically, or generate a PAT at github.com/settings/tokens |
| `RAILWAY_TOKEN` | Railway CLI auth | `railway login` sets this automatically, or generate at railway.app/account/tokens |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI auth | `supabase login` sets this automatically, or generate at supabase.com/dashboard/account/tokens |

### 2.2 For the app (Railway environment variables)

These will be set on the Railway project so the deployed app can use them:

| Variable | Purpose | How to Get |
|----------|---------|-----------|
| `ANTHROPIC_API_KEY` | Claude API for the AI worker | Generate at console.anthropic.com/settings/keys |
| `SUPABASE_URL` | Supabase project URL | From Supabase dashboard → Project Settings → API |
| `SUPABASE_ANON_KEY` | Supabase public anon key (frontend) | From Supabase dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key (backend only, never expose to frontend) | From Supabase dashboard → Project Settings → API |
| `FRONTEND_URL` | Frontend URL for CORS | Railway-assigned URL after first deploy |
| `NODE_ENV` | Runtime environment | Set to `production` on Railway |

### 2.3 Checklist before starting

- [ ] `gh auth status` returns authenticated
- [ ] `railway whoami` returns your account
- [ ] `supabase projects list` works
- [ ] You have an Anthropic API key ready
- [ ] You know which GitHub org/user to create the repo under

---

## 3. Project Bootstrap Sequence

Run these steps in order. Each step should succeed before moving to the next.

### Step 1: Create GitHub Repository

```bash
# Create the repo
gh repo create <org>/content-studio --public --description "Content pipeline tool for Macroscope" --clone

# Or if personal account:
gh repo create content-studio --public --description "Content pipeline tool for Macroscope" --clone

cd content-studio
```

### Step 2: Initialize Monorepo

```bash
# Initialize root package.json with npm workspaces
npm init -y
# Edit package.json to add workspaces: ["apps/*", "packages/*"]

# Create workspace directories
mkdir -p apps/web apps/api apps/worker packages/shared supabase/migrations docs

# Initialize each workspace package
cd apps/web && npm init -y && cd ../..
cd apps/api && npm init -y && cd ../..
cd apps/worker && npm init -y && cd ../..
cd packages/shared && npm init -y && cd ../..
```

### Step 3: Create Supabase Project

```bash
# Create the Supabase project (or link to existing)
supabase projects create content-studio --org-id <your-org-id> --region us-east-1

# Or link to an existing project:
supabase link --project-ref <project-ref>

# Initialize local Supabase config
supabase init
```

After creation, grab these from the Supabase dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: Create Railway Project

```bash
# Create a new Railway project
railway init

# Or link to existing:
railway link
```

Then in the Railway dashboard (or via CLI):
1. Create three services: `web`, `api`, `worker`.
2. Connect the GitHub repo for automatic deployments.
3. Set each service's root directory: `apps/web`, `apps/api`, `apps/worker`.
4. Set build commands and start commands per service.
5. Add all app environment variables (§2.2) to the Railway project.

### Step 5: Configure Railway ↔ GitHub Auto-Deploy

In the Railway dashboard for each service:
1. Go to Settings → Source.
2. Connect to the GitHub repo.
3. Set the deploy trigger to: **Deploy on merge to `main`**.
4. Optionally enable PR preview deploys for testing.

### Step 6: Push Initial Scaffolding

```bash
# Copy project docs into the repo
cp PRODUCT-SPEC.md DESIGN-SYSTEM.md AGENTS.md SETUP-GUIDE.md docs/
cp CLAUDE.md .

git add -A
git commit -m "Initial project scaffolding"
git push origin main
```

This first commit goes directly to `main` (the only exception to the PR rule). All subsequent work must go through PRs.

---

## 4. Supabase Schema Setup

The first real PR (PR #2 after scaffolding) creates the database schema. The migration file should implement the data model from `PRODUCT-SPEC.md` §3.

```bash
# Create a new migration
supabase migration new initial_schema

# Edit the generated file in supabase/migrations/
# Then apply locally:
supabase db reset

# Push to remote:
supabase db push
```

---

## 5. MCP Configuration

### Supabase MCP (Recommended)

Supabase has an MCP server available that can be connected in Claude's desktop app or Claude Code. This gives Claude direct access to manage the Supabase project (create tables, run queries, manage auth) without going through the CLI.

**To connect:** Add the Supabase MCP server in your Claude settings with your project URL and service role key.

**However:** For this project, the Supabase CLI is sufficient for all operations (migrations, type generation, local dev). The MCP is optional — use it if you want Claude to have direct database access for debugging.

### GitHub and Railway

No MCP servers available. Use the CLI tools (`gh`, `railway`) which are fully capable and well-documented.

---

## 6. Verification Checklist

Before starting PR #1, verify:

- [ ] GitHub repo exists and is cloneable
- [ ] `gh pr list` works against the repo
- [ ] Railway project exists with three services configured
- [ ] Railway is connected to the GitHub repo for auto-deploy on `main`
- [ ] Supabase project exists and is accessible
- [ ] All environment variables are set on Railway
- [ ] `CLAUDE.md` is in the repo root
- [ ] `PRODUCT-SPEC.md` and `DESIGN-SYSTEM.md` are in `docs/`
- [ ] You can run `npm install` at the root without errors
- [ ] Macroscope is configured to review PRs on this repo

---

## 7. Macroscope Configuration

Ensure Macroscope is set up to automatically review PRs on the Content Studio repo:

1. Install the Macroscope GitHub app on the repo (if not already org-wide).
2. Verify it triggers on PR creation and on subsequent pushes.
3. Confirm review comments appear within 2–10 minutes of a push.

If Macroscope is already configured at the org level, no additional setup is needed — it will automatically pick up new repos.
