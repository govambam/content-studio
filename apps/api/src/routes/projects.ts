import { Hono } from "hono";
import { supabase } from "../db/supabase.js";
import { parseBody, parseParams } from "../lib/validate.js";
import {
  createProjectSchema,
  idParam,
  updateProjectSchema,
} from "../lib/schemas.js";
import type {
  ApiResponse,
  ContentStatus,
  Label,
  Project,
} from "@content-studio/shared";

const projects = new Hono();

type ProjectRow = {
  id: string;
  title: string;
  description: string;
  status: ContentStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ProjectWithJoins = ProjectRow & {
  project_labels: { labels: Label }[] | null;
};

const EMPTY_COUNTS: Record<ContentStatus, number> = {
  backlog: 0,
  in_progress: 0,
  in_review: 0,
  done: 0,
};

function flattenLabels(row: ProjectWithJoins): ProjectRow & { labels: Label[] } {
  const labels = (row.project_labels ?? [])
    .map((rel) => rel.labels)
    .filter((l): l is Label => l != null);
  const { project_labels, ...rest } = row;
  void project_labels;
  return { ...rest, labels };
}

function buildTicketCountsMap(
  ticketRows: { project_id: string; status: ContentStatus }[] | null
): Map<string, Record<ContentStatus, number>> {
  const counts = new Map<string, Record<ContentStatus, number>>();
  for (const row of ticketRows ?? []) {
    let bucket = counts.get(row.project_id);
    if (!bucket) {
      bucket = { ...EMPTY_COUNTS };
      counts.set(row.project_id, bucket);
    }
    bucket[row.status] += 1;
  }
  return counts;
}

// List all projects with joined labels and ticket counts
projects.get("/", async (c) => {
  const { data: rows, error } = await supabase
    .from("projects")
    .select("*, project_labels(labels(*))")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return c.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      500
    );
  }

  const flattened = ((rows ?? []) as ProjectWithJoins[]).map(flattenLabels);
  const projectIds = flattened.map((p) => p.id);

  let countsMap = new Map<string, Record<ContentStatus, number>>();
  if (projectIds.length > 0) {
    const { data: ticketRows, error: ticketError } = await supabase
      .from("tickets")
      .select("project_id, status")
      .in("project_id", projectIds);

    if (ticketError) {
      return c.json(
        { data: null, error: ticketError.message } satisfies ApiResponse<null>,
        500
      );
    }
    countsMap = buildTicketCountsMap(ticketRows);
  }

  const projectsOut: Project[] = flattened.map((p) => ({
    ...p,
    ticket_counts: countsMap.get(p.id) ?? { ...EMPTY_COUNTS },
  }));

  return c.json({ data: projectsOut, error: null } satisfies ApiResponse<Project[]>);
});

// Create a project with optional labelIds
projects.post("/", async (c) => {
  const parsed = await parseBody(c, createProjectSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const clientId = c.req.header("x-client-id") ?? null;

  // Next sort_order in the backlog column
  const { data: maxRow, error: maxError } = await supabase
    .from("projects")
    .select("sort_order")
    .eq("status", "backlog")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) {
    return c.json(
      { data: null, error: maxError.message } satisfies ApiResponse<null>,
      500
    );
  }

  const nextSort = (maxRow?.sort_order ?? -1) + 1;

  const { data: inserted, error: insertError } = await supabase
    .from("projects")
    .insert({
      title: body.title,
      description: body.description ?? "",
      sort_order: nextSort,
      updated_by_client: clientId,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    return c.json(
      { data: null, error: insertError?.message ?? "insert failed" } satisfies ApiResponse<null>,
      500
    );
  }

  // Attach labels if provided
  if (body.labelIds && body.labelIds.length > 0) {
    const rels = body.labelIds.map((label_id) => ({
      project_id: inserted.id,
      label_id,
    }));
    const { error: relError } = await supabase
      .from("project_labels")
      .insert(rels);
    if (relError) {
      // Best-effort cleanup: remove the half-created project
      await supabase.from("projects").delete().eq("id", inserted.id);
      return c.json(
        { data: null, error: relError.message } satisfies ApiResponse<null>,
        500
      );
    }
  }

  // Refetch with labels joined so the response matches list shape
  const full = await loadProjectById(inserted.id);
  if (!full) {
    return c.json(
      { data: null, error: "created but could not refetch" } satisfies ApiResponse<null>,
      500
    );
  }
  return c.json({ data: full, error: null } satisfies ApiResponse<Project>, 201);
});

// Get a single project with labels + ticket counts
projects.get("/:id", async (c) => {
  const params = parseParams(c, idParam);
  if (!params.ok) return params.response;
  const id = params.data.id;
  const project = await loadProjectById(id);
  if (!project) {
    return c.json(
      { data: null, error: "not found" } satisfies ApiResponse<null>,
      404
    );
  }
  return c.json({ data: project, error: null } satisfies ApiResponse<Project>);
});

// Update a project (title / description / status / sort_order / labelIds)
projects.put("/:id", async (c) => {
  const params = parseParams(c, idParam);
  if (!params.ok) return params.response;
  const id = params.data.id;
  const parsed = await parseBody(c, updateProjectSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  // Verify the project exists before touching anything. Without this,
  // Supabase's `update().eq(id)` succeeds silently with 0 rows affected
  // when the id does not exist, and we would return a misleading 500
  // from `loadProjectById` returning null below.
  const existing = await loadProjectById(id);
  if (!existing) {
    return c.json(
      { data: null, error: "not found" } satisfies ApiResponse<null>,
      404
    );
  }

  const clientId = c.req.header("x-client-id") ?? null;

  const patch: Record<string, unknown> = { updated_by_client: clientId };
  if ("title" in body) patch.title = body.title;
  if ("description" in body) patch.description = body.description;
  if ("status" in body) patch.status = body.status;
  if ("sort_order" in body) patch.sort_order = body.sort_order;

  const { error: updateError } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id);

  if (updateError) {
    return c.json(
      { data: null, error: updateError.message } satisfies ApiResponse<null>,
      500
    );
  }

  // Replace label set if labelIds was provided. The replace_project_labels
  // RPC wraps the delete+insert in one transaction so a failed insert
  // no longer leaves the project unlabeled — no snapshot/restore dance
  // required.
  if (body.labelIds) {
    const { error: rpcError } = await supabase.rpc(
      "replace_project_labels",
      { p_project_id: id, p_label_ids: body.labelIds }
    );
    if (rpcError) {
      return c.json(
        { data: null, error: rpcError.message } satisfies ApiResponse<null>,
        500
      );
    }
  }

  const full = await loadProjectById(id);
  if (!full) {
    return c.json(
      { data: null, error: "updated but could not refetch" } satisfies ApiResponse<null>,
      500
    );
  }
  return c.json({ data: full, error: null } satisfies ApiResponse<Project>);
});

// Delete a project (cascades tickets, assets, comments, activity)
projects.delete("/:id", async (c) => {
  const params = parseParams(c, idParam);
  if (!params.ok) return params.response;
  const id = params.data.id;

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return c.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      status
    );
  }

  return c.json({ data: null, error: null } satisfies ApiResponse<null>);
});

async function loadProjectById(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*, project_labels(labels(*))")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const flattened = flattenLabels(data as ProjectWithJoins);

  const { data: ticketRows, error: ticketError } = await supabase
    .from("tickets")
    .select("status")
    .eq("project_id", id);

  const counts: Record<ContentStatus, number> = { ...EMPTY_COUNTS };
  if (!ticketError && ticketRows) {
    for (const row of ticketRows) {
      counts[row.status as ContentStatus] += 1;
    }
  }

  return { ...flattened, ticket_counts: counts };
}

export default projects;
