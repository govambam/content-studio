import { Sentry } from "./instrument.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "./lib/logger.js";
import { requestContext } from "./middleware/requestContext.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import charge from "./routes/charge.js";

const app = new Hono();

app.use("*", requestContext);
app.use("*", securityHeaders);

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "payments-api",
    release: process.env.RELEASE_SHA ?? null,
  });
});

app.route("/charge", charge);

app.notFound((c) => c.json({ data: null, error: "not found" }, 404));

app.onError((err, c) => {
  Sentry.captureException(err);
  const log = c.get("logger") ?? logger;
  const requestId = c.get("requestId");
  log.error(
    {
      err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
      path: new URL(c.req.url).pathname,
      method: c.req.method,
    },
    "unhandled error",
  );
  return c.json({ data: null, error: "internal error", requestId }, 500);
});

const port = parseInt(process.env.PORT || "3002", 10);

logger.info({ port, release: process.env.RELEASE_SHA ?? null }, "payments-api starting");

const server = serve({ fetch: app.fetch, port });

function shutdown(signal: string) {
  logger.info({ signal }, "shutdown received");
  server.close(() => {
    logger.info("shutdown complete");
    process.exit(0);
  });
  // Failsafe: don't hang forever if an open connection blocks close.
  setTimeout(() => {
    logger.warn("shutdown timeout; forcing exit");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
