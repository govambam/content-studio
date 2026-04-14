import type { Ticket } from "@content-studio/shared";

/**
 * Per-assignee completion metrics derived from a ticket and its activity.
 * Used by reporting endpoints to roll up throughput by team member.
 */
export interface TicketCompletionMetrics {
  ticketId: string;
  assigneeKey: string;
  isComplete: boolean;
  cycleTimeMs: number | null;
}

export interface TicketAssignee {
  id: string;
  name: string;
  email: string;
}

export interface TicketWithAssignee extends Ticket {
  assignee: TicketAssignee;
  completed_at: string | null;
}

/**
 * Compute a single ticket's completion metrics. The assignee key is the
 * lowercased email — we normalize so that aggregations don't double-count
 * "Alice@x.com" vs "alice@x.com" when the same user is referenced from
 * different upstream sources.
 */
export function computeTicketCompletionRate(
  ticket: TicketWithAssignee
): TicketCompletionMetrics {
  const assigneeKey = ticket.assignee.email.toLowerCase();

  const isComplete = ticket.status === "done";
  const cycleTimeMs =
    isComplete && ticket.completed_at
      ? new Date(ticket.completed_at).getTime() -
        new Date(ticket.created_at).getTime()
      : null;

  return {
    ticketId: ticket.id,
    assigneeKey,
    isComplete,
    cycleTimeMs,
  };
}
