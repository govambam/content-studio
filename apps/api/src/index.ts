import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import labels from "./routes/labels.js";
import projects from "./routes/projects.js";
import tickets from "./routes/tickets.js";
import comments from "./routes/comments.js";
import assets from "./routes/assets.js";
import { logger } from "./lib/logger.js";
import { requestContext } from "./middleware/requestContext.js";

const app = new Hono();

app.use("*", requestContext);

app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    allowHeaders: ["Content-Type", "Authorization", "x-client-id", "x-request-id"],
    exposeHeaders: ["x-request-id"],
  })
);

app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    service: "content-studio-api",
    release: process.env.RELEASE_SHA ?? null,
  });
});

app.route("/api/labels", labels);
app.route("/api/projects", projects);
app.route("/api", tickets);
app.route("/api", comments);
app.route("/api", assets);

app.notFound((c) =>
  c.json({ data: null, error: "not found" }, 404)
);

app.onError((err, c) => {
  const log = c.get("logger") ?? logger;
  log.error(
    {
      err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
      path: new URL(c.req.url).pathname,
      method: c.req.method,
    },
    "unhandled error"
  );
  return c.json({ data: null, error: "internal error" }, 500);
});

const port = parseInt(process.env.PORT || "3001", 10);

logger.info({ port, release: process.env.RELEASE_SHA ?? null }, "api starting");

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
