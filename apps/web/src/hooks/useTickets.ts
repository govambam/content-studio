import { useCallback, useEffect, useState } from "react";
import type { ContentStatus, Ticket } from "@content-studio/shared";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { CLIENT_ID } from "../lib/clientId";

export interface CreateTicketInput {
  title: string;
  description?: string;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  status?: ContentStatus;
  sort_order?: number;
}

export function useTickets(projectId: string | null) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!projectId) {
      setTickets([]);
      setLoading(false);
      return;
    }
    const res = await api.get<Ticket[]>(`/projects/${projectId}/tickets`);
    if (res.error) {
      setError(res.error);
    } else {
      setTickets(res.data ?? []);
      setError(null);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (!projectId || !supabase) return;
    const channel = supabase
      .channel(`tickets:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as
            | { updated_by_client?: string | null }
            | undefined;
          if (
            payload.eventType === "UPDATE" &&
            row?.updated_by_client === CLIENT_ID
          ) {
            return;
          }
          void fetchTickets();
        }
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [projectId, fetchTickets]);

  const createTicket = async (input: CreateTicketInput) => {
    if (!projectId) return { data: null, error: "no project" };
    const res = await api.post<Ticket>(
      `/projects/${projectId}/tickets`,
      input
    );
    if (res.data) {
      setTickets((prev) => [...prev, res.data!]);
    }
    return res;
  };

  const updateTicket = async (id: string, input: UpdateTicketInput) => {
    const res = await api.put<Ticket>(`/tickets/${id}`, input);
    if (res.data) {
      setTickets((prev) => prev.map((t) => (t.id === id ? res.data! : t)));
    }
    return res;
  };

  const deleteTicket = async (id: string) => {
    const res = await api.del<null>(`/tickets/${id}`);
    if (!res.error) {
      setTickets((prev) => prev.filter((t) => t.id !== id));
    }
    return res;
  };

  // Reorder one column atomically. `ticketIds` is the new in-column
  // order; the backend RPC rewrites status + sort_order for every id in
  // one round trip instead of N sequential PUTs.
  const reorderTickets = async (
    status: ContentStatus,
    ticketIds: string[]
  ) => {
    if (!projectId) return { data: null, error: "no project" };
    // Optimistic update: rebuild the tickets array with the new order
    // for the target column, untouched elsewhere. The realtime echo is
    // suppressed by `updated_by_client = CLIENT_ID`.
    setTickets((prev) => {
      const byId = new Map(prev.map((t) => [t.id, t]));
      const reordered = ticketIds
        .map((id, idx) => {
          const t = byId.get(id);
          return t ? { ...t, status, sort_order: idx } : null;
        })
        .filter((t): t is Ticket => t !== null);
      const others = prev.filter((t) => !ticketIds.includes(t.id));
      return [...others, ...reordered];
    });
    const res = await api.post<null>(
      `/projects/${projectId}/tickets/reorder`,
      { status, ticketIds }
    );
    if (res.error) {
      // Refetch to recover authoritative state on failure.
      await fetchTickets();
    }
    return res;
  };

  return {
    tickets,
    loading,
    error,
    createTicket,
    updateTicket,
    deleteTicket,
    reorderTickets,
    refetch: fetchTickets,
  };
}
