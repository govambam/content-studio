import type { MiddlewareHandler } from "hono";
import { logger, type Logger } from "../lib/logger.js";

declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
    logger: Logger;
  }
}

// Accept UUIDs or the safe fallback format clients use when
// `crypto.randomUUID` is unavailable (older Safari, jsdom, SSR). Bound the
// length so a caller cannot stuff arbitrarily large ids into log lines.
const REQUEST_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

function readOrMintRequestId(headerValue: string | undefined): string {
  if (headerValue && REQUEST_ID_RE.test(headerValue)) return headerValue;
  return crypto.randomUUID();
}

// Stamps every request with a stable id, binds a child logger carrying that
// id, and emits a structured access log after the handler resolves.
export const requestContext: MiddlewareHandler = async (c, next) => {
  const requestId = readOrMintRequestId(c.req.header("x-request-id"));
  const child = logger.child({ requestId });
  c.set("requestId", requestId);
  c.set("logger", child);
  c.header("x-request-id", requestId);

  const start = performance.now();
  try {
    await next();
  } finally {
    const durationMs = Math.round(performance.now() - start);
    const status = c.res.status;
    child.info(
      {
        method: c.req.method,
        path: new URL(c.req.url).pathname,
        status,
        durationMs,
      },
      "request"
    );
  }
};
