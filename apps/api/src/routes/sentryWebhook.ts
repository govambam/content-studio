import { Hono } from "hono";
import { logger } from "../lib/logger.js";

const sentryWebhook = new Hono();

interface SentryWebhookPayload {
  action?: string;
  data?: {
    issue?: {
      id?: string;
      shortId?: string;
      title?: string;
      permalink?: string;
      web_url?: string;
      project?: { slug?: string };
    };
    event?: {
      event_id?: string;
      web_url?: string;
    };
  };
}

function buildIssueUrl(payload: SentryWebhookPayload): string | null {
  const issue = payload.data?.issue;
  if (!issue) return null;
  return issue.permalink ?? issue.web_url ?? null;
}

function buildAgentQuery(payload: SentryWebhookPayload): string {
  const issue = payload.data?.issue;
  const url = buildIssueUrl(payload);
  const shortId = issue?.shortId ?? issue?.id ?? "unknown";
  const title = issue?.title ?? "a new Sentry error";

  return [
    `A new Sentry issue just fired: ${shortId} — ${title}.`,
    url ? `Sentry issue URL: ${url}` : "",
    "",
    "Investigate this issue end-to-end for the govambam/content-studio repository:",
    "1. Read the Sentry issue: pull the error type, message, stack trace, request context, and release SHA.",
    "2. Locate the offending code on the main branch, starting from the top stack frame.",
    "3. Open a pull request against main with a descriptive title, a body that links the Sentry issue and explains the root cause, and only the minimal code change.",
    "4. Reply in this Slack thread with a 2-3 sentence root-cause summary, a summary of the fix, and a link to the PR.",
    "",
    "If you cannot confidently identify a fix, post a diagnostic summary instead of opening a low-confidence PR.",
  ]
    .filter(Boolean)
    .join("\n");
}

sentryWebhook.post("/", async (c) => {
  const macroscopeUrl = process.env.MACROSCOPE_WEBHOOK_URL;
  const macroscopeSecret = process.env.MACROSCOPE_WEBHOOK_SECRET;
  const slackChannelId = process.env.MACROSCOPE_SLACK_CHANNEL_ID ?? "C0ASQPY3GE7";

  if (!macroscopeUrl || !macroscopeSecret) {
    throw new Error(
      "MACROSCOPE_WEBHOOK_URL and MACROSCOPE_WEBHOOK_SECRET must be set"
    );
  }

  const log = c.get("logger") ?? logger;
  const payload = (await c.req.json().catch(() => ({}))) as SentryWebhookPayload;
  const issueUrl = buildIssueUrl(payload);
  const query = buildAgentQuery(payload);

  log.info(
    {
      action: payload.action,
      issueShortId: payload.data?.issue?.shortId,
      issueUrl,
    },
    "sentry webhook received"
  );

  const response = await fetch(macroscopeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": macroscopeSecret,
    },
    body: JSON.stringify({
      query,
      responseDestination: { slackChannelId },
      timezone: "America/Chicago",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    log.error(
      { status: response.status, body },
      "macroscope webhook forward failed"
    );
    return c.json(
      { data: null, error: "upstream forward failed" },
      502
    );
  }

  const body = (await response.json().catch(() => ({}))) as {
    workflowId?: string;
  };
  return c.json({ data: { workflowId: body.workflowId ?? null }, error: null });
});

export default sentryWebhook;
