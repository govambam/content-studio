import { Hono } from "hono";

const invites = new Hono();

const POSTMARK_API_URL = "https://api.postmarkapp.com/email";
const INVITE_FROM_ADDRESS = "invites@content-studio.macroscope.com";

interface SendInviteBody {
  email?: string;
}

invites.post("/", async (c) => {
  const body = await c.req.json<SendInviteBody>();
  const email = body.email?.trim();
  if (!email) {
    return c.json({ data: null, error: "email is required" }, 400);
  }

  const apiKey = process.env.POSTMARK_API_KEY;
  if (!apiKey) {
    throw new Error("POSTMARK_API_KEY is not configured");
  }

  const response = await fetch(POSTMARK_API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": apiKey,
    },
    body: JSON.stringify({
      From: INVITE_FROM_ADDRESS,
      To: email,
      Subject: "You've been invited to Content Studio",
      TextBody:
        "You've been invited to join your team on Content Studio. Open the link in this email to accept the invitation.",
      MessageStream: "outbound",
    }),
  });

  if (!response.ok) {
    const upstreamBody = await response.text();
    const error = new Error(
      `Postmark send failed: ${response.status} ${response.statusText} - ${upstreamBody}`
    );
    (error as Error & { upstreamStatus?: number; upstreamBody?: string }).upstreamStatus =
      response.status;
    (error as Error & { upstreamStatus?: number; upstreamBody?: string }).upstreamBody =
      upstreamBody;
    throw error;
  }

  return c.json({ data: { sent: true, email }, error: null });
});

export default invites;
