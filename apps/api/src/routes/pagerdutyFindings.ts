// Macroscope -> PagerDuty relay (outbound).
//
// Receives Macroscope's Agent reply (sent via the `responseDestination` URL
// configured by `pagerdutyWebhook.ts`) and posts the reply text as a note on
// the originating PagerDuty incident.
//
// Sister route: `pagerdutyWebhook.ts`.
//
// ---
// Why we extract the incident ID from the request body, not the URL:
//
// Macroscope's workspace allowlist for `webhookUrl` destinations does strict
// literal matching — no prefix, no wildcard. A callback URL like
// `/findings/<incidentId>` would require the operator to manually allowlist
// every possible incident URL, which is impossible. So the inbound relay
// uses one static callback URL (`/api/webhooks/pagerduty/findings`) and
// encodes the incident ID inside the query text as `[INCIDENT_ID:<id>]`.
// Macroscope echoes the original query verbatim in its reply body's
// `query` field, so we regex it back out here.
//
// Notes on the inbound body shape from Macroscope:
//
// Confirmed via docs.macroscope.com/api: `{ query, response, workflowId }`.
// `query` is our original query (verbatim — that's how we recover the
// incident ID). `response` is the agent's reply text. We additionally accept
// `answer|message|text|output|result` as fallbacks for resilience, and
// stringify the whole body if no obvious text field is present.
//
// Notes on the outbound PagerDuty Notes API:
//
// - Endpoint: `POST https://api.pagerduty.com/incidents/{id}/notes`
// - Auth: `Authorization: Token token=$PAGERDUTY_API_TOKEN`
// - Required header: `From: <pd-user-email>` — even with account-scoped
//   tokens, PD requires a real user email here. See pd-setup.md gotcha.
// - Headers also include `Accept: application/vnd.pagerduty+json;version=2`.
// - Body: `{ "note": { "content": "<text>" } }`
// - PD notes render reliably as plain text; markdown rendering is
//   inconsistent. We pass through Macroscope's text untouched.

import { Hono } from "hono";
import { logger } from "../lib/logger.js";

const pagerdutyFindings = new Hono();

interface MacroscopeReplyBody {
  query?: unknown;
  answer?: unknown;
  response?: unknown;
  message?: unknown;
  text?: unknown;
  output?: unknown;
  result?: unknown;
}

// Pattern that the inbound relay embeds at the start of every query
// (`[INCIDENT_ID:Q1AB...]`). Mirrors the formatting in
// `pagerdutyWebhook.ts::buildSmokeTestQuery`.
const INCIDENT_ID_PATTERN = /\[INCIDENT_ID:([A-Z0-9]+)\]/;

function extractIncidentId(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const obj = body as MacroscopeReplyBody;
  if (typeof obj.query !== "string") return null;
  const match = obj.query.match(INCIDENT_ID_PATTERN);
  return match?.[1] ?? null;
}

interface PagerDutyNoteResponse {
  note?: {
    id?: string;
    content?: string;
  };
}

const TEXT_FIELDS = [
  "answer",
  "response",
  "message",
  "text",
  "output",
  "result",
] as const;

function extractReplyText(body: unknown): string {
  if (typeof body === "string" && body.length > 0) return body;
  if (body === null || typeof body !== "object") {
    return JSON.stringify(body);
  }

  const obj = body as MacroscopeReplyBody & Record<string, unknown>;
  for (const key of TEXT_FIELDS) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  // Fall back to a stringified payload so the operator at least sees something
  // on the incident timeline rather than silently dropping the reply.
  return JSON.stringify(body);
}

pagerdutyFindings.post("/", async (c) => {
  const log = c.get("logger") ?? logger;

  const pdToken = process.env.PAGERDUTY_API_TOKEN;
  const fromEmail = process.env.PAGERDUTY_FROM_EMAIL ?? "ivan@prasso.ai";

  if (!pdToken) {
    log.error("PAGERDUTY_API_TOKEN is not set; cannot post incident note");
    return c.json(
      { data: null, error: "pagerduty api token not configured" },
      500
    );
  }

  const body = (await c.req.json().catch(() => ({}))) as unknown;

  const incidentId = extractIncidentId(body);
  if (!incidentId) {
    log.warn(
      "pagerduty findings request missing INCIDENT_ID tag in echoed query"
    );
    return c.json(
      { data: null, error: "incident id not found in macroscope reply" },
      400
    );
  }

  const noteContent = extractReplyText(body);

  log.info(
    {
      incidentId,
      noteLength: noteContent.length,
    },
    "pagerduty findings received from macroscope"
  );

  const pdResponse = await fetch(
    `https://api.pagerduty.com/incidents/${encodeURIComponent(incidentId)}/notes`,
    {
      method: "POST",
      headers: {
        Authorization: `Token token=${pdToken}`,
        Accept: "application/vnd.pagerduty+json;version=2",
        "Content-Type": "application/json",
        From: fromEmail,
      },
      body: JSON.stringify({
        note: { content: noteContent },
      }),
    }
  );

  if (!pdResponse.ok) {
    const errBody = await pdResponse.text();
    log.error(
      {
        incidentId,
        status: pdResponse.status,
        body: errBody,
      },
      "pagerduty note create failed"
    );
    return c.json(
      { data: null, error: "pagerduty note create failed" },
      502
    );
  }

  const responseBody = (await pdResponse
    .json()
    .catch(() => ({}))) as PagerDutyNoteResponse;
  const noteId = responseBody.note?.id ?? null;

  log.info(
    {
      incidentId,
      noteId,
    },
    "pagerduty incident note created"
  );

  return c.json({ data: { noteId }, error: null });
});

export default pagerdutyFindings;
