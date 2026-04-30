# payments-api

Standalone Hono service that processes charges. Lives alongside
`content-studio-api` in the monorepo as its own Railway service. Default
port `3002`.

## Endpoints

- `GET /health` — liveness probe. Returns `{status, service, release}`.
- `POST /charge` — record a charge. Validates a `{amount, currency, customerId, idempotencyKey}` body with Zod, persists to Postgres, and returns the charge id.

## Logging

Pino writes to two destinations via `pino.multistream`:

1. **stdout** — picked up by Railway's log drain.
2. **Google Cloud Logging** (`@google-cloud/logging`) — log name `payments-api`, resource type `global`. Each entry has its severity set at the `LogEntry` level (mapped from Pino's numeric level), not just inside the JSON payload, so log-based metrics in Cloud Monitoring filter correctly.

GCP credentials are read from `GOOGLE_APPLICATION_CREDENTIALS`. Failures
writing to GCP are logged to stdout but never block the request path.

## Environment

| Variable                         | Purpose                                                                 |
| -------------------------------- | ----------------------------------------------------------------------- |
| `PORT`                           | Listen port (default `3002`).                                           |
| `NODE_ENV`                       | `development` | `production`. Production fails closed without `SENTRY_DSN`. |
| `RELEASE_SHA`                    | Commit SHA. Injected by Railway from `RAILWAY_GIT_COMMIT_SHA`.          |
| `LOG_LEVEL`                      | Pino level. Defaults to `info` in production, `debug` otherwise.        |
| `SENTRY_DSN`                     | Sentry project DSN. Required in production.                             |
| `DATABASE_URL`                   | Postgres connection string for the charges database.                    |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service-account JSON for log writes.                        |
| `GCP_PROJECT_ID`                 | Optional override; falls back to the SA key's `project_id`.             |

## Local dev

From the repo root:

```bash
npm install
npm run dev:payments-api
curl -s localhost:3002/health
```
