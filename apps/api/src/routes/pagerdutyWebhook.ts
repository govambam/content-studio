// PagerDuty -> Macroscope relay (inbound).
//
// Receives a PagerDuty V3 webhook (`incident.triggered`) and forwards an
// investigation prompt to the Macroscope Agent webhook trigger. The Agent's
// reply is routed back to the outbound /findings route via
// `responseDestination`, which writes the reply into a custom field on the
// originating PagerDuty incident.
//
// Sister route: `pagerdutyFindings.ts`.
// Pattern source: `sentryWebhook.ts` (env handling, logging, return shape).
//
// ---
// Notes resolved here:
//
// 1. `responseDestination` field name is `webhookUrl` (sibling of the Slack
//    flavor's `slackChannelId`), per docs.macroscope.com/api. Macroscope
//    silently ignores unknown fields, so an incorrect name produces a
//    200+workflowId with no callback ever firing. Macroscope's POST body to
//    the webhook URL has the shape `{ query, response, workflowId }` —
//    `pagerdutyFindings.ts` reads `response` (with fallbacks).
//
// 2. Inbound PD signature verification. PagerDuty's V3 webhook scheme signs
//    the raw body with HMAC-SHA256 and lists one or more `v1=<hex>` entries in
//    `X-PagerDuty-Signature`. If `PAGERDUTY_WEBHOOK_SECRET` is unset, we
//    accept the request anyway (warn-and-accept) so the demo works before a
//    subscription is wired.

import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "../lib/logger.js";

const pagerdutyWebhook = new Hono();

// ---- Types ---------------------------------------------------------------

interface PagerDutyV3WebhookPayload {
  event?: {
    id?: string;
    event_type?: string;
    occurred_at?: string;
    data?: {
      id?: string;
      type?: string;
      self?: string;
      html_url?: string;
      title?: string;
      summary?: string;
      urgency?: string;
      service?: {
        id?: string;
        summary?: string;
        html_url?: string;
      };
    };
  };
}

interface IncidentSummary {
  incidentId: string;
  title: string;
  serviceName: string | null;
  urgency: string | null;
  htmlUrl: string | null;
}

// ---- Helpers -------------------------------------------------------------

function extractIncident(payload: PagerDutyV3WebhookPayload): IncidentSummary {
  const data = payload.event?.data ?? {};
  return {
    incidentId: data.id ?? "unknown",
    title: data.title ?? data.summary ?? "a new PagerDuty incident",
    serviceName: data.service?.summary ?? null,
    urgency: data.urgency ?? null,
    htmlUrl: data.html_url ?? null,
  };
}

// The `[INCIDENT_ID:...]` tag at the start of the query is structural — the
// findings route parses it out of Macroscope's echoed `query` field to know
// which PagerDuty incident to attach the reply to. Keep the tag exactly as
// formatted (uppercase, square brackets, colon) so the regex in
// `pagerdutyFindings.ts` matches.
function buildInvestigationQuery(
  incident: IncidentSummary,
  occurredAt: string | null
): string {
  const service = incident.serviceName ?? "payments-api";
  const lines: string[] = [
    `[INCIDENT_ID:${incident.incidentId}]`,
    "",
    `You are responding to an active PagerDuty incident on the \`${service}\` service. An on-call engineer was just paged. Investigate the issue and identify the root cause for the on-call engineer to fix.`,
    "",
    "Use the PagerDuty MCP server to look up the incident, GCP Cloud Logging, Sentry issues in the `payments-api` project, and the `govambam/content-studio` codebase to find the root cause.",
    "",
    "Incident:",
    `- ID: ${incident.incidentId}`,
    `- Title: ${incident.title}`,
  ];
  if (incident.serviceName) lines.push(`- Service: ${incident.serviceName}`);
  if (occurredAt) lines.push(`- Triggered at: ${occurredAt}`);
  if (incident.htmlUrl) lines.push(`- PagerDuty URL: ${incident.htmlUrl}`);
  lines.push(
    "",
    "Reply (plain text, will be written to a custom field on the incident — do not use markdown headers or code fences):",
    "",
    "ROOT CAUSE",
    "<one or two sentences. State the bug plainly. If you can't determine it confidently, say so and skip FIX PROMPT.>",
    "",
    "EVIDENCE",
    "- Log pattern: <error + count over window>",
    '- Suspect commit: <short_sha> "<message>" by <author> at <timestamp> — <one-line why>',
    "- Code location: <path:line> — <what's wrong>",
    '- Sentry: <issue title + first-seen, or "no related issue">',
    "",
    "FIX PROMPT",
    '<A self-contained instruction the engineer pastes into Claude Code. Start with "In apps/payments-api/..., open a PR that...". Include the file path, the specific change, and a one-line PR title. Do not write the diff yourself — just the instruction.>'
  );
  return lines.join("\n");
}

function deriveBaseUrl(requestUrl: string): string {
  const override = process.env.API_BASE_URL;
  if (override) return override.replace(/\/+$/, "");
  // Derive from the incoming request: scheme://host
  const u = new URL(requestUrl);
  return `${u.protocol}//${u.host}`;
}

function buildResponseDestination(baseUrl: string) {
  // Static callback URL (no per-incident path variable). Macroscope's
  // workspace allowlist does strict literal matching — no prefix, no
  // wildcard. A path with the incident ID baked in would require seeding
  // the allowlist for every possible incident, which is impossible. The
  // findings route extracts the incident ID from Macroscope's echoed
  // `query` field instead (see `buildInvestigationQuery` above and the
  // INCIDENT_ID regex in `pagerdutyFindings.ts`).
  //
  // Per docs.macroscope.com/api: `responseDestination` accepts
  // `slackChannelId` for Slack or `webhookUrl` for an external URL.
  const callbackUrl = `${baseUrl}/api/webhooks/pagerduty/findings`;
  return { webhookUrl: callbackUrl };
}

// PagerDuty V3 webhook signature: HMAC-SHA256 of the raw request body using
// the subscription's secret. Header is `X-PagerDuty-Signature`, value like
// `v1=<hex>,v1=<hex>` (multiple entries during secret rotation).
//
// https://developer.pagerduty.com/docs/webhook-verification
function verifyPagerDutySignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader) return false;

  const provided = signatureHeader
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("v1="))
    .map((s) => s.slice(3));

  if (provided.length === 0) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");

  for (const candidate of provided) {
    let candidateBuf: Buffer;
    try {
      candidateBuf = Buffer.from(candidate, "hex");
    } catch {
      continue;
    }
    if (
      candidateBuf.length === expectedBuf.length &&
      timingSafeEqual(candidateBuf, expectedBuf)
    ) {
      return true;
    }
  }

  return false;
}

// ---- Route ---------------------------------------------------------------

pagerdutyWebhook.post("/", async (c) => {
  const macroscopeUrl = process.env.MACROSCOPE_WEBHOOK_URL_PAGERDUTY;
  const macroscopeSecret = process.env.MACROSCOPE_WEBHOOK_SECRET_PAGERDUTY;

  if (!macroscopeUrl || !macroscopeSecret) {
    throw new Error(
      "MACROSCOPE_WEBHOOK_URL_PAGERDUTY and MACROSCOPE_WEBHOOK_SECRET_PAGERDUTY must be set"
    );
  }

  const log = c.get("logger") ?? logger;

  // Read the raw body once so we can both verify the signature and parse it.
  const rawBody = await c.req.text();

  const pdSecret = process.env.PAGERDUTY_WEBHOOK_SECRET;
  const signatureHeader = c.req.header("x-pagerduty-signature");

  if (pdSecret) {
    const ok = verifyPagerDutySignature(rawBody, signatureHeader, pdSecret);
    if (!ok) {
      log.warn(
        { hasSignature: Boolean(signatureHeader) },
        "pagerduty webhook signature verification failed"
      );
      return c.json(
        { data: null, error: "invalid signature" },
        401
      );
    }
  } else {
    log.warn(
      "PAGERDUTY_WEBHOOK_SECRET is not set; accepting inbound webhook without verification"
    );
  }

  let payload: PagerDutyV3WebhookPayload;
  try {
    payload = rawBody ? (JSON.parse(rawBody) as PagerDutyV3WebhookPayload) : {};
  } catch (err) {
    log.warn({ err }, "failed to parse pagerduty webhook payload");
    return c.json({ data: null, error: "invalid json" }, 400);
  }

  const eventType = payload.event?.event_type ?? null;
  const incident = extractIncident(payload);

  log.info(
    {
      eventType,
      incidentId: incident.incidentId,
      service: incident.serviceName,
      urgency: incident.urgency,
      htmlUrl: incident.htmlUrl,
    },
    "pagerduty webhook received"
  );

  // We forward `incident.triggered` events. Anything else — including a
  // missing or null event type — gets a 200 ack so PD doesn't retry, but
  // we don't trigger an Agent run. Treating null as "not a triggered
  // event" prevents forwarding garbage payloads to Macroscope with
  // incidentId="unknown".
  if (eventType !== "incident.triggered") {
    log.info({ eventType }, "ignoring non-triggered pagerduty event");
    return c.json({ data: { workflowId: null }, error: null });
  }

  const occurredAt = payload.event?.occurred_at ?? null;
  const query = buildInvestigationQuery(incident, occurredAt);
  const baseUrl = deriveBaseUrl(c.req.url);
  const responseDestination = buildResponseDestination(baseUrl);

  const upstream = await fetch(macroscopeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": macroscopeSecret,
    },
    body: JSON.stringify({
      query,
      responseDestination,
      timezone: "America/Chicago",
    }),
  });

  if (!upstream.ok) {
    const body = await upstream.text();
    log.error(
      {
        status: upstream.status,
        body,
        incidentId: incident.incidentId,
      },
      "macroscope webhook forward failed"
    );
    return c.json({ data: null, error: "upstream forward failed" }, 502);
  }

  const responseBody = (await upstream.json().catch(() => ({}))) as {
    workflowId?: string;
  };

  log.info(
    {
      incidentId: incident.incidentId,
      workflowId: responseBody.workflowId ?? null,
      callbackUrl: responseDestination.webhookUrl,
    },
    "pagerduty -> macroscope relay forwarded"
  );

  return c.json({
    data: { workflowId: responseBody.workflowId ?? null },
    error: null,
  });
});

export default pagerdutyWebhook;
