import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import labels from "./routes/labels.js";
import projects from "./routes/projects.js";
import tickets from "./routes/tickets.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    allowHeaders: ["Content-Type", "Authorization", "x-client-id"],
  })
);

app.get("/api/health", (c) => {
  return c.json({ status: "ok", service: "content-studio-api" });
});

app.route("/api/labels", labels);
app.route("/api/projects", projects);
app.route("/api", tickets);

const port = parseInt(process.env.PORT || "3001", 10);

console.log(`API server starting on port ${port}`);

serve({ fetch: app.fetch, port });

export default app;
