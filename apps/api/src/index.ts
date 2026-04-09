import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import projects from "./routes/projects.js";
import context from "./routes/context.js";
import cards from "./routes/cards.js";

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

// Mount routes
app.route("/api/projects", projects);
app.route("/api", context);
app.route("/api", cards);

const port = parseInt(process.env.PORT || "3001", 10);

console.log(`API server starting on port ${port}`);

serve({ fetch: app.fetch, port });

export default app;
