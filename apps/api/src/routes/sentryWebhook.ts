import { Hono } from "hono";
import { logger, type Logger } from "../lib/logger.js";

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
      transaction?: string;
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
  const transaction = payload.data?.event?.transaction;

  return [
    `A new Sentry issue just fired: ${shortId} — ${title}.`,
    transaction ? `Affected transaction: ${transaction}.` : "",
    url ? `Sentry issue URL: ${url}` : "",
    "",
    "Investigate this issue end-to-end for the govambam/content-studio repository, following the Custom Agent Instructions saved in this workspace.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function postInvestigatingMessage(
  slackWebhookUrl: string,
  payload: SentryWebhookPayload,
  log: Logger
): Promise<void> {
  const issue = payload.data?.issue;
  const shortId = issue?.shortId ?? issue?.id ?? "new issue";
  const title = issue?.title ?? "a new error";
  const transaction = payload.data?.event?.transaction;
  const url = buildIssueUrl(payload);

  const lines = [
    `:mag: Macroscope is investigating *${shortId}* — ${title}`,
    transaction ? `Endpoint: \`${transaction}\`` : "",
    url ? `Sentry: <${url}|view issue>` : "",
    "Stand by for a fix PR…",
  ].filter(Boolean);

  try {
    const res = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
    });
    if (!res.ok) {
      const body = await res.text();
      log.warn(
        { status: res.status, body },
        "slack investigating-message post failed"
      );
    }
  } catch (err) {
    log.warn({ err }, "slack investigating-message post threw");
  }
}

sentryWebhook.post("/", async (c) => {
  const macroscopeUrl = process.env.MACROSCOPE_WEBHOOK_URL;
  const macroscopeSecret = process.env.MACROSCOPE_WEBHOOK_SECRET;
  const slackChannelId = process.env.MACROSCOPE_SLACK_CHANNEL_ID ?? "C0ASQPY3GE7";
  const slackInvestigatingWebhookUrl =
    process.env.SLACK_INVESTIGATING_WEBHOOK_URL;

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

  if (slackInvestigatingWebhookUrl) {
    await postInvestigatingMessage(slackInvestigatingWebhookUrl, payload, log);
  }

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
