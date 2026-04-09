import { useState, useEffect, useCallback } from "react";
import type { Card } from "@content-studio/shared";
import { api } from "../lib/api";

interface CardWithArtifacts extends Card {
  artifacts: Array<{ id: string; type: string; status: string }>;
}

export function useCards(projectId: string | null) {
  const [cards, setCards] = useState<CardWithArtifacts[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = useCallback(async () => {
    if (!projectId) {
      setCards([]);
      return;
    }
    setLoading(true);
    const res = await api.get<CardWithArtifacts[]>(`/projects/${projectId}/cards`);
    if (res.error) {
      setError(res.error);
    } else {
      setCards(res.data ?? []);
      setError(null);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const updateCard = async (
    cardId: string,
    updates: Partial<Pick<Card, "title" | "summary" | "stage" | "content_type" | "sort_order">>
  ) => {
    const res = await api.put<Card>(`/cards/${cardId}`, updates);
    if (res.error) {
      setError(res.error);
      return null;
    }
    if (res.data) {
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, ...res.data! } : c))
      );
    }
    return res.data;
  };

  return { cards, loading, error, updateCard, refetch: fetchCards };
}
