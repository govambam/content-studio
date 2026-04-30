// PagerDuty -> Macroscope relay (inbound).
//
// Receives a PagerDuty V3 webhook (`incident.triggered`) and forwards a query
// to the Macroscope Agent webhook trigger. The Agent's reply is routed back to
// the outbound /findings route via `responseDestination`, which the relay then
// posts as a note on the originating PagerDuty incident.
//
// Sister route: `pagerdutyFindings.ts`.
// Pattern source: `sentryWebhook.ts` (env handling, logging, return shape).
//
// ---
// Open questions resolved here (or being probed):
//
// 1. `responseDestination` field name for a webhook URL. Macroscope's public
//    docs document the capability ("Outputs forwarded to a webhook URL") but
//    not the exact field name. We try `url` first because it is the most
//    natural shape and matches the canonical convention used by Slack-flavored
//    response destinations elsewhere in the API. If the upstream rejects this,
//    update the comment block at the top of this file with the discovered
//    field name and adjust `buildResponseDestination` below.
//
// 2. Inbound PD signature verification. PagerDuty's V3 webhook scheme signs
//    the raw body with HMAC-SHA256 and lists one or more `v1=<hex>` entries in
//    `X-PagerDuty-Signature`. If `PAGERDUTY_WEBHOOK_SECRET` is unset, we
//    accept the request anyway (warn-and-accept) so the demo works before a
//    subscription is wired. This mirrors how `sentryWebhook.ts` tolerates a
//    missing secret in dev.
//
// SMOKE-TEST PROMPT. Replace with the real investigation prompt once relay
// wiring is verified. Tracked in
// video-content/videos/003-pagerduty-investigation/demo-flow.md.

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

// SMOKE-TEST PROMPT. Replace with the real investigation prompt once relay
// wiring is verified. Tracked in
// video-content/videos/003-pagerduty-investigation/demo-flow.md.
function buildSmokeTestQuery(incidentId: string): string {
  const nowIso = new Date().toISOString();
  return [
    "Hello, Macroscope! This is the PagerDuty relay smoke test.",
    `Please reply with: "Hello back from Macroscope. Incident \`${incidentId}\` was received from the PagerDuty relay at ${nowIso}."`,
    "Do not investigate anything yet. Do not query any integrations. Just acknowledge.",
  ].join(" ");
}

function deriveBaseUrl(requestUrl: string): string {
  const override = process.env.API_BASE_URL;
  if (override) return override.replace(/\/+$/, "");
  // Derive from the incoming request: scheme://host
  const u = new URL(requestUrl);
  return `${u.protocol}//${u.host}`;
}

function buildResponseDestination(baseUrl: string, incidentId: string) {
  const callbackUrl = `${baseUrl}/api/webhooks/pagerduty/findings/${encodeURIComponent(
    incidentId
  )}`;
  // Best-guess field name. See header comment.
  return { url: callbackUrl };
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

  // We forward `incident.triggered` events. Other event types ack with 200 so
  // PD doesn't retry, but we don't trigger an Agent run.
  if (eventType && eventType !== "incident.triggered") {
    log.info({ eventType }, "ignoring non-triggered pagerduty event");
    return c.json({ data: { workflowId: null }, error: null });
  }

  const query = buildSmokeTestQuery(incident.incidentId);
  const baseUrl = deriveBaseUrl(c.req.url);
  const responseDestination = buildResponseDestination(
    baseUrl,
    incident.incidentId
  );

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
      callbackUrl: responseDestination.url,
    },
    "pagerduty -> macroscope relay forwarded"
  );

  return c.json({
    data: { workflowId: responseBody.workflowId ?? null },
    error: null,
  });
});

export default pagerdutyWebhook;
