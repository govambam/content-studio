import { useCallback, useEffect, useState } from "react";
import type { ContentStatus, Ticket } from "@content-studio/shared";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { CLIENT_ID } from "../lib/clientId";

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  status?: ContentStatus;
  sort_order?: number;
}

export function useTicket(ticketId: string | null) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    if (!ticketId) {
      setTicket(null);
      setLoading(false);
      return;
    }
    const res = await api.get<Ticket>(`/tickets/${ticketId}`);
    if (res.error) {
      setError(res.error);
    } else {
      setTicket(res.data);
      setError(null);
    }
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    void fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    if (!ticketId || !supabase) return;
    const channel = supabase
      .channel(`ticket:${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `id=eq.${ticketId}`,
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
          void fetchTicket();
        }
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [ticketId, fetchTicket]);

  const updateTicket = async (input: UpdateTicketInput) => {
    if (!ticketId) return { data: null, error: "no ticket" };
    const res = await api.put<Ticket>(`/tickets/${ticketId}`, input);
    if (res.data) {
      setTicket(res.data);
    }
    return res;
  };

  const deleteTicket = async () => {
    if (!ticketId) return { data: null, error: "no ticket" };
    return api.del<null>(`/tickets/${ticketId}`);
  };

  return { ticket, loading, error, updateTicket, deleteTicket, refetch: fetchTicket };
}
