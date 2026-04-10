import { useCallback, useEffect, useState } from "react";
import type { Label } from "@content-studio/shared";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";

export function useLabels() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLabels = useCallback(async () => {
    const res = await api.get<Label[]>("/labels");
    if (res.error) {
      setError(res.error);
    } else {
      setLabels(res.data ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchLabels();
  }, [fetchLabels]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("labels-all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "labels" },
        () => {
          void fetchLabels();
        }
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [fetchLabels]);

  const createLabel = async (name: string, color: string) => {
    const res = await api.post<Label>("/labels", { name, color });
    if (res.data) {
      setLabels((prev) => [...prev, res.data!].sort((a, b) => a.name.localeCompare(b.name)));
    }
    return res;
  };

  const deleteLabel = async (id: string) => {
    const res = await api.del<null>(`/labels/${id}`);
    if (!res.error) {
      setLabels((prev) => prev.filter((l) => l.id !== id));
    }
    return res;
  };

  return { labels, loading, error, createLabel, deleteLabel, refetch: fetchLabels };
}
