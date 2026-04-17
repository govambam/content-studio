import { Hono } from "hono";
import { logger, type Logger } from "../lib/logger.js";

const sentryWebhook = new Hono();

interface SentryWebhookPayload {
  // Legacy webhooks plugin fields (top-level)
  id?: string;
  message?: string;
  culprit?: string;
  url?: string;
  project?: string;
  project_slug?: string;
  project_name?: string;
  event?: {
    event_id?: string;
    transaction?: string;
    web_url?: string;
    tags?: Array<[string, string]>;
  };
  // Internal Integration / Sentry App fields (nested under data)
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
  return (
    payload.data?.issue?.permalink ??
    payload.data?.issue?.web_url ??
    payload.url ??
    null
  );
}

function extractIssueShortId(payload: SentryWebhookPayload): string {
  const nested = payload.data?.issue?.shortId ?? payload.data?.issue?.id;
  if (nested) return nested;
  const url = payload.url ?? "";
  const m = url.match(/\/issues\/(\d+)/);
  if (m) return m[1];
  return payload.id ?? "unknown";
}

function extractIssueTitle(payload: SentryWebhookPayload): string {
  return (
    payload.data?.issue?.title ?? payload.message ?? "a new Sentry error"
  );
}

function extractTransaction(payload: SentryWebhookPayload): string | undefined {
  return (
    payload.data?.event?.transaction ??
    payload.event?.transaction ??
    undefined
  );
}

function buildAgentQuery(payload: SentryWebhookPayload): string {
  const url = buildIssueUrl(payload);
  const shortId = extractIssueShortId(payload);
  const title = extractIssueTitle(payload);
  const transaction = extractTransaction(payload);

  const instructions = `Investigate this issue end-to-end for the govambam/content-studio repository and do the following:

* Get the issue details and recent events to understand the error type, stack trace, and culprit.
* Use code research on the content-studio repo to find the relevant source code at the file and function identified in the error.
* Assess whether the root cause is obviously identifiable and fixable.
    * Auto-fixable patterns include:
        * Null reference, missing guard clause, incorrect type, unhandled promise, off-by-one, missing fallback
        * Adding capability detection (e.g. WebGL support checks) before calling external libraries
* If the issue is diagnosable, create a PR in the content-studio repo with a fix. The PR description should reference the Sentry issue link and explain the root cause and fix.`;

  return [
    `A new Sentry issue just fired: ${shortId} — ${title}.`,
    transaction ? `Affected transaction: ${transaction}.` : "",
    url ? `Sentry issue URL: ${url}` : "",
    "",
    instructions,
  ]
    .filter(Boolean)
    .join("\n");
}

async function postInvestigatingMessage(
  slackWebhookUrl: string,
  payload: SentryWebhookPayload,
  log: Logger
): Promise<void> {
  const shortId = extractIssueShortId(payload);
  const title = extractIssueTitle(payload);
  const transaction = extractTransaction(payload);
  const url = buildIssueUrl(payload);

  const lines = [
    `:mag: Macroscope is investigating *${shortId}* — ${title}`,
    transaction ? `Endpoint: \`${transaction}\`` : "",
    url ? `Sentry: ${url}` : "",
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
      issueShortId: extractIssueShortId(payload),
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
