// Macroscope -> PagerDuty relay (outbound).
//
// Receives Macroscope's Agent reply (sent via the `responseDestination` URL
// configured by `pagerdutyWebhook.ts`) and posts the reply text as a note on
// the originating PagerDuty incident.
//
// Sister route: `pagerdutyWebhook.ts`.
//
// ---
// Notes on the inbound body shape from Macroscope:
//
// The exact response shape Macroscope POSTs to a webhook-URL response
// destination is not publicly documented at the time of writing. Plausible
// shapes include `{ "answer": "..." }`, `{ "response": "..." }`, or a richer
// envelope wrapping the text. We accept any of these and fall back to
// `JSON.stringify(body)` if no obvious text field is present, so the relay is
// robust to schema drift while we observe real traffic. Update this comment
// with the confirmed shape once it's been seen in practice.
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
  answer?: unknown;
  response?: unknown;
  message?: unknown;
  text?: unknown;
  output?: unknown;
  result?: unknown;
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

pagerdutyFindings.post("/:incidentId", async (c) => {
  const log = c.get("logger") ?? logger;
  const incidentId = c.req.param("incidentId");

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
