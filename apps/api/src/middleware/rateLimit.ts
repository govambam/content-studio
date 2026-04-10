import { rateLimiter } from "hono-rate-limiter";
import type { Context } from "hono";

// One limiter for all traffic. Generous by default because the intended
// audience is three trusted internal users; the point is back-pressure
// against accidents (runaway hook, broken test loop) and cheap Phase 3
// telemetry on 429s, not hostile-traffic mitigation. Tighten per-route
// if the Claude path returns.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 300;

function keyFor(c: Context): string {
  // Client id is stable per tab and already sent on every mutation; it
  // is a more reliable bucket than the IP behind Railway's proxy. Fall
  // back to the forwarded IP or a fixed bucket.
  return (
    c.req.header("x-client-id") ||
    c.req.header("x-forwarded-for") ||
    "global"
  );
}

export const rateLimit = rateLimiter({
  windowMs: WINDOW_MS,
  limit: MAX_REQUESTS,
  standardHeaders: "draft-6",
  keyGenerator: keyFor,
  handler: (c) =>
    c.json(
      {
        data: null,
        error: "rate limit exceeded — slow down and retry shortly",
      },
      429
    ),
});
