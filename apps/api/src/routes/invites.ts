import { Hono } from "hono";
import { isAlreadyMember } from "../lib/workspaceMembers.js";

const invites = new Hono();

interface SendInviteBody {
  email?: string;
}

invites.post("/", async (c) => {
  const body = await c.req.json<SendInviteBody>();
  const email = body.email?.trim();
  if (!email) {
    return c.json({ data: null, error: "email is required" }, 400);
  }

  if (isAlreadyMember(email)) {
    return c.json(
      { data: null, error: "that email is already in this workspace" },
      409
    );
  }

  return c.json({ data: { sent: true, email }, error: null });
});

export default invites;
