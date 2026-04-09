import { Hono } from "hono";
import { supabase } from "../db/supabase.js";
import type { ApiResponse, Project } from "@content-studio/shared";

const projects = new Hono();

// List all projects
projects.get("/", async (c) => {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return c.json({ data: null, error: error.message } satisfies ApiResponse<null>, 500);
  }

  return c.json({ data, error: null } satisfies ApiResponse<Project[]>);
});

// Create a project
projects.post("/", async (c) => {
  const body = await c.req.json<{ name: string; slug: string; icon?: string; color?: string }>();

  if (!body.name || !body.slug) {
    return c.json({ data: null, error: "name and slug are required" } satisfies ApiResponse<null>, 400);
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: body.name,
      slug: body.slug,
      icon: body.icon || body.name.slice(0, 2).toUpperCase(),
      color: body.color || "#1E3AFF",
    })
    .select()
    .single();

  if (error) {
    return c.json({ data: null, error: error.message } satisfies ApiResponse<null>, 500);
  }

  return c.json({ data, error: null } satisfies ApiResponse<Project>, 201);
});

// Get a single project with card stats
projects.get("/:id", async (c) => {
  const id = c.req.param("id");

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return c.json({ data: null, error: error.message } satisfies ApiResponse<null>, status);
  }

  // Get card counts per stage
  const { data: cards } = await supabase
    .from("cards")
    .select("stage")
    .eq("project_id", id);

  const stats = {
    unreviewed: 0,
    considering: 0,
    in_production: 0,
    published: 0,
  };

  if (cards) {
    for (const card of cards) {
      stats[card.stage as keyof typeof stats]++;
    }
  }

  return c.json({ data: { ...project, stats }, error: null });
});

// Update a project
projects.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Partial<Pick<Project, "name" | "slug" | "icon" | "color">>>();

  const { data, error } = await supabase
    .from("projects")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return c.json({ data: null, error: error.message } satisfies ApiResponse<null>, status);
  }

  return c.json({ data, error: null } satisfies ApiResponse<Project>);
});

// Delete a project and all children (cascade handled by DB)
projects.delete("/:id", async (c) => {
  const id = c.req.param("id");

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) {
    return c.json({ data: null, error: error.message } satisfies ApiResponse<null>, 500);
  }

  return c.json({ data: null, error: null } satisfies ApiResponse<null>);
});

export default projects;
