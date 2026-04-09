import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);

app.get("/api/health", (c) => {
  return c.json({ status: "ok", service: "content-studio-api" });
});

const port = parseInt(process.env.PORT || "3001", 10);

console.log(`API server starting on port ${port}`);

serve({ fetch: app.fetch, port });

export default app;
