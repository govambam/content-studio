import { Hono } from "hono";
import { supabase } from "../db/supabase.js";
import { parseBody } from "../lib/validate.js";
import { upsertSlackIntegrationSchema } from "../lib/schemas.js";
import type {
  ApiResponse,
  SlackIntegration,
  SlackIntegrationSummary,
} from "@content-studio/shared";

const slackIntegrations = new Hono();

// Redacts the webhook URL before returning the config to the frontend.
// The webhook URL is a bearer credential that lets anyone post to the
// Slack channel, so it never leaves the API. The summary tells the UI
// whether a config exists so it can show the right empty state.
function toSummary(row: SlackIntegration | null): SlackIntegrationSummary {
  if (!row) {
    return {
      configured: false,
      channel_name: "",
      enabled: false,
      enabled_statuses: ["in_review", "done"],
      updated_at: null,
    };
  }
  return {
    configured: true,
    channel_name: row.channel_name,
    enabled: row.enabled,
    enabled_statuses: row.enabled_statuses,
    updated_at: row.updated_at,
  };
}

slackIntegrations.get("/", async (c) => {
  const { data, error } = await supabase
    .from("slack_integrations")
    .select("*")
    .eq("singleton", true)
    .maybeSingle();

  if (error) {
    return c.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      500
    );
  }

  return c.json({
    data: toSummary((data ?? null) as SlackIntegration | null),
    error: null,
  } satisfies ApiResponse<SlackIntegrationSummary>);
});

// Upsert pattern: there's exactly one row keyed by `singleton = true`.
// Using upsert + onConflict keeps the handler idempotent whether a
// previous row exists or not.
slackIntegrations.put("/", async (c) => {
  const parsed = await parseBody(c, upsertSlackIntegrationSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const { data, error } = await supabase
    .from("slack_integrations")
    .upsert(
      {
        singleton: true,
        webhook_url: body.webhook_url,
        channel_name: body.channel_name,
        enabled: body.enabled,
        enabled_statuses: body.enabled_statuses,
      },
      { onConflict: "singleton" }
    )
    .select()
    .single();

  if (error) {
    return c.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      500
    );
  }

  return c.json({
    data: toSummary(data as SlackIntegration),
    error: null,
  } satisfies ApiResponse<SlackIntegrationSummary>);
});

slackIntegrations.delete("/", async (c) => {
  const { error } = await supabase
    .from("slack_integrations")
    .delete()
    .eq("singleton", true);

  if (error) {
    return c.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      500
    );
  }

  return c.json({
    data: toSummary(null),
    error: null,
  } satisfies ApiResponse<SlackIntegrationSummary>);
});

export default slackIntegrations;
