import { useState, useEffect, useCallback } from "react";
import type { ContextFile } from "@content-studio/shared";
import { api } from "../lib/api";

export function useContextFiles(projectId: string | null) {
  const [files, setFiles] = useState<ContextFile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!projectId) {
      setFiles([]);
      return;
    }
    setLoading(true);
    const res = await api.get<ContextFile[]>(`/projects/${projectId}/context`);
    if (res.data) {
      setFiles(res.data);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const uploadFile = async (
    file: File,
    fileType: string
  ): Promise<ContextFile | null> => {
    if (!projectId) return null;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("file_type", fileType);

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/projects/${projectId}/context`,
        { method: "POST", body: formData }
      );

      const json = await res.json();
      if (json.data) {
        setFiles((prev) => [json.data, ...prev]);
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  };

  const deleteFile = async (fileId: string): Promise<boolean> => {
    const res = await api.del(`/context/${fileId}`);
    if (!res.error) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      return true;
    }
    return false;
  };

  return { files, loading, uploadFile, deleteFile, refetch: fetchFiles };
}
