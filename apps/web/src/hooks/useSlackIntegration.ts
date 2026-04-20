import { useCallback, useEffect, useState } from "react";
import type { ContentStatus, SlackIntegrationSummary } from "@content-studio/shared";
import { api } from "../lib/api";

interface UseSlackIntegrationResult {
  summary: SlackIntegrationSummary | null;
  loading: boolean;
  error: string | null;
  save: (input: SaveSlackIntegrationInput) => Promise<{ error: string | null }>;
  remove: () => Promise<{ error: string | null }>;
  refresh: () => Promise<void>;
}

export interface SaveSlackIntegrationInput {
  webhook_url: string;
  channel_name: string;
  enabled: boolean;
  enabled_statuses: ContentStatus[];
}

// Settings UI hook. The webhook URL is write-only from the frontend —
// the GET endpoint returns a redacted summary, so on edit the user
// must either resend the current URL or leave the field blank (the
// form disables save when blank on first setup).
export function useSlackIntegration(): UseSlackIntegrationResult {
  const [summary, setSummary] = useState<SlackIntegrationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await api.get<SlackIntegrationSummary>("/slack-integration");
    if (res.error) {
      setError(res.error);
    } else {
      setSummary(res.data);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (input: SaveSlackIntegrationInput) => {
      const res = await api.put<SlackIntegrationSummary>(
        "/slack-integration",
        input
      );
      if (res.error) return { error: res.error };
      setSummary(res.data);
      return { error: null };
    },
    []
  );

  const remove = useCallback(async () => {
    const res = await api.del<SlackIntegrationSummary>("/slack-integration");
    if (res.error) return { error: res.error };
    setSummary(res.data);
    return { error: null };
  }, []);

  return { summary, loading, error, save, remove, refresh };
}
