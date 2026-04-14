import { Hono } from "hono";
import { computeTicketCompletionRate, type TicketWithAssignee } from "../lib/ticketMetrics.js";

const demo = new Hono();

// Triggers the ticket-completion metrics path with an unassigned ticket
// fixture. Used by the in-app diagnostics button to surface a live error
// for instrumentation testing.
demo.post("/trigger-error", (c) => {
  // Fixture mirrors the shape returned by the tickets list endpoint when
  // a ticket has no assignee yet. The metrics helper currently assumes an
  // assignee is always present.
  const ticket = {
    id: "tkt_9f3a2c41",
    project_id: "prj_2b71",
    title: "Draft launch announcement",
    description: "",
    status: "in_review",
    sort_order: 4,
    created_at: "2026-04-10T14:22:00.000Z",
    updated_at: "2026-04-12T09:18:00.000Z",
    assignee: null,
    completed_at: null,
  } as unknown as TicketWithAssignee;

  const metrics = computeTicketCompletionRate(ticket);
  return c.json({ data: metrics, error: null });
});

export default demo;
