# Content Studio — Setup Guide

This guide covers the tools, accounts, and environment variables needed to run Content Studio locally and in production.

---

## 1. Prerequisites

### CLI tools

| Tool | Install | Auth | Verify |
|------|---------|------|--------|
| GitHub CLI | `brew install gh` | `gh auth login` | `gh auth status` |
| Railway CLI | `npm install -g @railway/cli` | `railway login` | `railway whoami` |
| Supabase CLI | `brew install supabase/tap/supabase` | `supabase login` | `supabase projects list` |
| Node.js (v20+) | `brew install node` | — | `node --version` |

### Accounts

- **GitHub** with permission to push to the `content-studio` repo.
- **Railway** with access to the project hosting `web` and `api`.
- **Supabase** with access to the project backing the app.

No Anthropic key is required. Phase 1 removed all AI features.

---

## 2. Environment Variables

### Local CLI session

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | Set automatically by `gh auth login` |
| `RAILWAY_TOKEN` | Set automatically by `railway login` |
| `SUPABASE_ACCESS_TOKEN` | Set automatically by `supabase login` |

### Application runtime (local `.env` and Railway services)

| Variable | Purpose | Where to find it |
|----------|---------|------------------|
| `SUPABASE_URL` | Supabase project URL | Supabase dashboard → Project Settings → API |
| `SUPABASE_ANON_KEY` | Public anon key (used by the frontend) | Same place |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (backend only — never ship to the frontend) | Same place |
| `FRONTEND_URL` | CORS origin for the API | The deployed Vite URL, or `http://localhost:5173` in dev |
| `NODE_ENV` | `development` locally, `production` on Railway | — |
| `VITE_LD_CLIENT_ID` | LaunchDarkly client-side ID (frontend). Optional — defaults to the demo env client-side ID baked into `apps/web/src/main.tsx`. Override per-environment if you point at a different LD project. | LaunchDarkly dashboard → Account settings → Projects → Environment → Client-side ID |

Copy `.env.example` to `.env` and fill in the Supabase keys to run locally.

---

## 3. Local Development

```bash
# From the repo root
npm install

# Apply migrations to a local or linked Supabase project
supabase db reset        # nuke and re-apply all migrations
# or
supabase db push         # push new migrations to a linked remote project

# Run the API (port 3001)
npm run dev:api

# Run the web app (port 5173)
npm run dev:web
```

Open `http://localhost:5173`. The web app expects the API at the path `/api` or at `VITE_API_URL` if set.

---

## 4. Railway Deployment

The Railway project has two services:

1. **`web`** — root directory `apps/web`, build command `npm run build -w apps/web`, start command served by Vite's preview or a static host.
2. **`api`** — root directory `apps/api`, build command `npm run build -w apps/api`, start command `node dist/index.js`.

Both services auto-deploy on merge to `main`. Set the application env vars from §2 on each service. `FRONTEND_URL` on the `api` service must match the `web` service's public URL.

There is no worker service. The previous `apps/worker` workspace was removed in Phase 1.

---

## 5. Supabase

The database has six tables — `labels`, `projects`, `project_labels` (join), `tickets`, `assets`, `comments`, `activity_events` — plus the `content_status` and `activity_event_type` enums. All migrations live in `supabase/migrations/` and are applied in timestamp order. The `assets` Storage bucket holds ticket attachments.

Realtime is enabled on `labels`, `projects`, `tickets`, `comments`, `activity_events`, and `assets` so the frontend can subscribe to live updates across tabs. RLS is on with permissive `authenticated` + `service_role` policies — the app assumes trusted users only.

---

## 6. Macroscope Configuration

Macroscope reviews every PR automatically. Verify:

1. The Macroscope GitHub app is installed on the repo.
2. It runs on PR creation and on every subsequent push.
3. Reviews complete within 2–10 minutes.

If a review hasn't arrived after 15 minutes, the `macroscope-review` skill will time out and ask for human help.

---

## 7. Verification Checklist

- [ ] `gh auth status` authenticated
- [ ] `railway whoami` returns your account
- [ ] `supabase projects list` works
- [ ] `npm install` from the repo root completes without errors
- [ ] `npx tsc -b` is clean
- [ ] `npm run dev:api` starts on port 3001 and `/api/health` returns `{status:"ok"}`
- [ ] `npm run dev:web` serves the board at `http://localhost:5173`
