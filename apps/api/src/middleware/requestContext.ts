import type { MiddlewareHandler } from "hono";
import { logger, type Logger } from "../lib/logger.js";

declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
    logger: Logger;
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readOrMintRequestId(headerValue: string | undefined): string {
  if (headerValue && UUID_RE.test(headerValue)) return headerValue;
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
