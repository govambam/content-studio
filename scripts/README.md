# scripts/

Operational and demo-orchestration scripts. Not runtime code; not bundled into any service.

## `load-payments-api.mjs`

Sustained load against the `payments-api` service for the video 003 demo. Drives concurrent `POST /charge` requests with realistic random payloads. Once the pg pool exhausts (default size 10 + the bug introduced in `feat(payments-api): add idempotency check on /charge`), every subsequent request times out acquiring a connection and the service starts logging ERROR-severity entries. Those entries trip the GCP Cloud Monitoring log-based metric, which fires the PagerDuty incident.

### Run

Plain Node 20+, no deps.

Local:
```
node scripts/load-payments-api.mjs
```

Against deployed service:
```
PAYMENTS_API_URL=https://payments-api-production-xxxx.up.railway.app \
node scripts/load-payments-api.mjs
```

### Env vars

| Var                  | Default                  | Purpose                                              |
|----------------------|--------------------------|------------------------------------------------------|
| `PAYMENTS_API_URL`   | `http://localhost:3002`  | Target service base URL                              |
| `CONCURRENCY`        | `15`                     | Number of parallel workers                           |
| `DURATION_SECONDS`   | `300`                    | How long to run before exiting                       |
| `IDEMPOTENCY_REUSE`  | `0`                      | 0–1 fraction of requests that reuse a prior key. Higher = more cache-hits = slower pool exhaustion. Default 0 (every request leaks). |

### What you'll see

- First ~10–20s: 200 responses, latencies climbing as the pool fills with leaked clients.
- Around the time the pool is fully leaked: requests start timing out at the pool-acquire step (~30s default `pg.Pool` connect timeout). Status code shifts to 500.
- `[worker N] first error at <iso-ts>` logs the moment errors start.
- Tick stats every 10s; a final summary on exit.

### Cleanup between recording takes

The `charges` table will accumulate rows. If that bothers you, truncate it via Supabase. The bug itself doesn't depend on any pre-existing data; only `charge_idempotency` rows would skew behavior on subsequent takes (cache-hits don't leak), so wipe it too if you want clean repeats:

```sql
TRUNCATE charge_idempotency, charges RESTART IDENTITY CASCADE;
```
