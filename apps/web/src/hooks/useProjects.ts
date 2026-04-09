import { useState, useEffect, useCallback } from "react";
import type { Project } from "@content-studio/shared";
import { api } from "../lib/api";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const res = await api.get<Project[]>("/projects");
    if (res.error) {
      setError(res.error);
    } else {
      setProjects(res.data ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = async (data: {
    name: string;
    slug: string;
    icon?: string;
    color?: string;
  }): Promise<Project | null> => {
    const res = await api.post<Project>("/projects", data);
    if (res.error) {
      setError(res.error);
      return null;
    }
    if (res.data) {
      setProjects((prev) => [res.data!, ...prev]);
    }
    return res.data;
  };

  return { projects, loading, error, createProject, refetch: fetchProjects };
}
