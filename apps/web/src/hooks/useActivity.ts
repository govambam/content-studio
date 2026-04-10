import { useCallback, useEffect, useState } from "react";
import type {
  ActivityFeedItem,
  Comment,
} from "@content-studio/shared";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { CLIENT_ID } from "../lib/clientId";
import { track } from "../lib/analytics";

export function useActivity(ticketId: string | null) {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    if (!ticketId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await api.get<ActivityFeedItem[]>(
      `/tickets/${ticketId}/activity`
    );
    if (res.error) {
      setError(res.error);
    } else {
      setItems(res.data ?? []);
      setError(null);
    }
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed]);

  // Subscribe to both activity_events and comments for this ticket.
  // Echo suppression: activity events carry meta.source, comments use
  // the ticket's updated_by_client column (N/A) so we rely purely on
  // refetching — but skip if the trigger is an activity_event whose
  // source matches this client.
  useEffect(() => {
    if (!ticketId || !supabase) return;
    const channel = supabase
      .channel(`activity:${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_events",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as
            | { meta?: { source?: string } }
            | undefined;
          if (
            payload.eventType === "INSERT" &&
            row?.meta?.source === CLIENT_ID
          ) {
            // Our own write; local state already reflects it.
            return;
          }
          void fetchFeed();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          void fetchFeed();
        }
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [ticketId, fetchFeed]);

  const addComment = async (body: string) => {
    if (!ticketId) return { data: null, error: "no ticket" };
    const res = await api.post<Comment>(`/tickets/${ticketId}/comments`, {
      body,
    });
    if (res.data) {
      track("comment_added", { ticket_id: ticketId, length: body.length });
      // Optimistic: prepend the new comment and a synthetic comment_added
      // event. On realtime echo, fetchFeed would dedupe anyway.
      await fetchFeed();
    }
    return res;
  };

  const editComment = async (id: string, body: string) => {
    const res = await api.put<Comment>(`/comments/${id}`, { body });
    if (res.data) {
      track("comment_edited", { comment_id: id });
      await fetchFeed();
    }
    return res;
  };

  const deleteComment = async (id: string) => {
    const res = await api.del<null>(`/comments/${id}`);
    if (!res.error) {
      track("comment_deleted", { comment_id: id });
      await fetchFeed();
    }
    return res;
  };

  return {
    items,
    loading,
    error,
    addComment,
    editComment,
    deleteComment,
    refetch: fetchFeed,
  };
}
