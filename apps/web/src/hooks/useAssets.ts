import { useCallback, useEffect, useState } from "react";
import type { Asset } from "@content-studio/shared";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { track } from "../lib/analytics";

interface CreateAssetResponse {
  asset: Asset;
  upload: { signedUrl: string; token: string; path: string };
}

export function useAssets(ticketId: string | null) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!ticketId) {
      setAssets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await api.get<Asset[]>(`/tickets/${ticketId}/assets`);
    if (res.error) {
      setError(res.error);
    } else {
      setAssets(res.data ?? []);
      setError(null);
    }
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    void fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    if (!ticketId || !supabase) return;
    const channel = supabase
      .channel(`assets:${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assets",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          void fetchAssets();
        }
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [ticketId, fetchAssets]);

  const uploadAsset = async (file: File): Promise<{ error: string | null }> => {
    if (!ticketId) return { error: "no ticket" };

    const startedAt = performance.now();
    track("asset_upload_started", {
      ticket_id: ticketId,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
    });

    // Step 1: create the asset row and get a signed upload URL.
    const createRes = await api.post<CreateAssetResponse>(
      `/tickets/${ticketId}/assets`,
      {
        filename: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      }
    );
    if (createRes.error || !createRes.data) {
      track("asset_upload_failed", {
        ticket_id: ticketId,
        reason: createRes.error ?? "create failed",
      });
      return { error: createRes.error ?? "create failed" };
    }

    const { asset, upload } = createRes.data;

    // Step 2: PUT the file bytes to the signed URL. Supabase signed
    // upload URLs accept a raw PUT with the file as the body.
    try {
      const putRes = await fetch(upload.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": asset.mime_type || "application/octet-stream",
          "x-upsert": "false",
        },
        body: file,
      });
      if (!putRes.ok) {
        // Cleanup the orphan row server-side.
        await api.del<null>(`/assets/${asset.id}`);
        track("asset_upload_failed", {
          ticket_id: ticketId,
          reason: `${putRes.status} ${putRes.statusText}`,
        });
        return { error: `upload failed: ${putRes.status} ${putRes.statusText}` };
      }
    } catch (err) {
      await api.del<null>(`/assets/${asset.id}`);
      const message = err instanceof Error ? err.message : String(err);
      track("asset_upload_failed", { ticket_id: ticketId, reason: message });
      return { error: message };
    }

    // Step 3: tell the API the bytes landed so it can write the
    // `asset_uploaded` activity event. Best-effort — the upload
    // itself is done, so even if the confirm call fails we still
    // return success and just miss the audit-log entry.
    await api.post<null>(`/assets/${asset.id}/confirm`, {});

    await fetchAssets();
    track("asset_upload_succeeded", {
      ticket_id: ticketId,
      asset_id: asset.id,
      duration_ms: Math.round(performance.now() - startedAt),
    });
    return { error: null };
  };

  const deleteAsset = async (id: string) => {
    const res = await api.del<null>(`/assets/${id}`);
    if (!res.error) {
      setAssets((prev) => prev.filter((a) => a.id !== id));
      track("asset_deleted", { asset_id: id });
    }
    return res;
  };

  const getDownloadUrl = async (
    id: string
  ): Promise<{ url: string | null; error: string | null }> => {
    const res = await api.get<{ url: string }>(`/assets/${id}/download`);
    if (res.error || !res.data) {
      return { url: null, error: res.error ?? "download failed" };
    }
    return { url: res.data.url, error: null };
  };

  return {
    assets,
    loading,
    error,
    uploadAsset,
    deleteAsset,
    getDownloadUrl,
    refetch: fetchAssets,
  };
}
