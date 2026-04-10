import { useCallback, useEffect, useState } from "react";
import type { ContentStatus, Project } from "@content-studio/shared";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { CLIENT_ID } from "../lib/clientId";

export interface CreateProjectInput {
  title: string;
  description?: string;
  labelIds?: string[];
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  status?: ContentStatus;
  sort_order?: number;
  labelIds?: string[];
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
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
    void fetchProjects();
  }, [fetchProjects]);

  // Subscribe to changes on `projects` and `project_labels`.
  // Echo suppression: when a `projects` UPDATE arrives whose
  // updated_by_client matches our CLIENT_ID, skip the refetch — local state
  // already reflects the change.
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("projects-all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
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
          void fetchProjects();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_labels" },
        () => {
          void fetchProjects();
        }
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [fetchProjects]);

  const createProject = async (input: CreateProjectInput) => {
    const res = await api.post<Project>("/projects", input);
    if (res.data) {
      setProjects((prev) => [...prev, res.data!]);
    }
    return res;
  };

  const updateProject = async (id: string, input: UpdateProjectInput) => {
    const res = await api.put<Project>(`/projects/${id}`, input);
    if (res.data) {
      setProjects((prev) => prev.map((p) => (p.id === id ? res.data! : p)));
    }
    return res;
  };

  const deleteProject = async (id: string) => {
    const res = await api.del<null>(`/projects/${id}`);
    if (!res.error) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
    return res;
  };

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
  };
}
