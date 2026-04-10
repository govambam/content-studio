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

  return {
    tickets,
    loading,
    error,
    createTicket,
    updateTicket,
    deleteTicket,
    refetch: fetchTickets,
  };
}
