import { supabase } from "../db/supabase.js";
import { logger, type Logger } from "../lib/logger.js";
import type { ContentStatus, SlackIntegration, Ticket } from "@content-studio/shared";
import { STATUS_LABELS } from "@content-studio/shared";

// Result discriminator so the caller (the tickets.ts PUT handler) can
// record an activity event only when the post actually went out.
export type SlackNotifyResult =
  | { posted: true; channel: string | null }
  | { posted: false; reason: "not_configured" | "disabled" | "status_not_enabled" | "error" };

async function loadIntegration(log: Logger): Promise<SlackIntegration | null> {
  const { data, error } = await supabase
    .from("slack_integrations")
    .select("*")
    .eq("singleton", true)
    .maybeSingle();

  if (error) {
    log.error({ err: error.message }, "slack_integration_load_failed");
    return null;
  }
  return (data ?? null) as SlackIntegration | null;
}

interface BuildPayloadArgs {
  ticket: Ticket;
  projectTitle: string | null;
  frontendUrl: string;
  newStatus: ContentStatus;
}

// Slack uses `&`, `<`, `>` as control characters in mrkdwn text, so
// any user-supplied string interpolated into a block must HTML-escape
// those three before the send. The `&` replacement runs first so the
// encoded ampersand doesn't get re-escaped on the next passes.
// https://docs.slack.dev/messaging/formatting-message-text
function escapeSlackMrkdwn(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Builds a Slack Block Kit payload. The block layout is intentionally
// small — the Slack docs recommend <=5 blocks for an incoming webhook
// to stay readable in busy channels. A fallback `text` field is
// included so the message renders in notifications that don't support
// blocks.
function buildSlackPayload({
  ticket,
  projectTitle,
  frontendUrl,
  newStatus,
}: BuildPayloadArgs): Record<string, unknown> {
  const deeplink = `${frontendUrl.replace(/\/$/, "")}/projects/${ticket.project_id}/tickets/${ticket.id}`;
  const statusLabel = STATUS_LABELS[newStatus];
  const headerEmoji = newStatus === "done" ? ":white_check_mark:" : ":eyes:";
  // `|` is the link-body separator inside `<url|text>`, so replace it
  // in the link label on top of the standard mrkdwn escapes.
  const linkLabel = escapeSlackMrkdwn(ticket.title).replace(/\|/g, "｜");
  const projectLabel = projectTitle ? escapeSlackMrkdwn(projectTitle) : "—";

  return {
    text: `${statusLabel}: ${ticket.title}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${headerEmoji} Ticket moved to ${statusLabel}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Ticket*\n<${deeplink}|${linkLabel}>`,
          },
          {
            type: "mrkdwn",
            text: `*Project*\n${projectLabel}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open ticket", emoji: true },
            url: deeplink,
            style: "primary",
          },
        ],
      },
    ],
  };
}

interface NotifyArgs {
  ticket: Ticket;
  projectTitle: string | null;
  newStatus: ContentStatus;
  log?: Logger;
}

// Post a Slack notification for a ticket status transition. Returns a
// discriminated result so the caller can decide whether to log an
// activity event. This function never throws — upstream webhook
// failures are logged and reported via the result.
export async function notifyTicketStatusChange({
  ticket,
  projectTitle,
  newStatus,
  log = logger,
}: NotifyArgs): Promise<SlackNotifyResult> {
  const integration = await loadIntegration(log);
  if (!integration) return { posted: false, reason: "not_configured" };
  if (!integration.enabled) return { posted: false, reason: "disabled" };
  if (!integration.enabled_statuses.includes(newStatus)) {
    return { posted: false, reason: "status_not_enabled" };
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const payload = buildSlackPayload({
    ticket,
    projectTitle,
    frontendUrl,
    newStatus,
  });

  try {
    const response = await fetch(integration.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      log.error(
        { status: response.status, body: body.slice(0, 200), ticketId: ticket.id },
        "slack_webhook_post_failed"
      );
      return { posted: false, reason: "error" };
    }
    return { posted: true, channel: integration.channel_name || null };
  } catch (err) {
    log.error(
      { err: err instanceof Error ? err.message : String(err), ticketId: ticket.id },
      "slack_webhook_post_threw"
    );
    return { posted: false, reason: "error" };
  }
}
