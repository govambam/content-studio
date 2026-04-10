import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type {
  ApiResponse,
  ContentStatus,
  Label,
  Project,
} from "@content-studio/shared";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { CLIENT_ID } from "../lib/clientId";
import { track } from "../lib/analytics";

// Shared data context for entities that appear on multiple views and
// should only be fetched once per session. Previously each view's own
// useLabels()/useProjects() triggered a refetch on every navigation,
// making the sidebar flicker. With this provider above <Routes> the
// fetches happen once at mount and are shared across every consumer.
//
// View-scoped data (tickets inside a project, ticket detail, activity,
// assets) still lives in per-view hooks — those legitimately re-fetch
// when the user navigates to a different project / ticket.

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

interface LabelsValue {
  labels: Label[];
  loading: boolean;
  error: string | null;
  createLabel: (
    name: string,
    color: string
  ) => Promise<ApiResponse<Label>>;
  deleteLabel: (id: string) => Promise<ApiResponse<null>>;
  getLabelUsage: (
    id: string
  ) => Promise<ApiResponse<{ project_count: number }>>;
  refetch: () => Promise<void>;
}

interface ProjectsValue {
  projects: Project[];
  loading: boolean;
  error: string | null;
  createProject: (input: CreateProjectInput) => Promise<ApiResponse<Project>>;
  updateProject: (
    id: string,
    input: UpdateProjectInput
  ) => Promise<ApiResponse<Project>>;
  deleteProject: (id: string) => Promise<ApiResponse<null>>;
  refetch: () => Promise<void>;
}

interface DataContextValue {
  labels: LabelsValue;
  projects: ProjectsValue;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const labelsStore = useLabelsStore();
  const projectsStore = useProjectsStore();
  const value = useMemo<DataContextValue>(
    () => ({ labels: labelsStore, projects: projectsStore }),
    [labelsStore, projectsStore]
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useLabels(): LabelsValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useLabels must be used inside <DataProvider>");
  }
  return ctx.labels;
}

export function useProjects(): ProjectsValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useProjects must be used inside <DataProvider>");
  }
  return ctx.projects;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

function useLabelsStore(): LabelsValue {
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

  const createLabel = useCallback(
    async (name: string, color: string) => {
      const res = await api.post<Label>("/labels", { name, color });
      if (res.data) {
        setLabels((prev) =>
          [...prev, res.data!].sort((a, b) => a.name.localeCompare(b.name))
        );
        track("label_created", { label_id: res.data.id, color });
      }
      return res;
    },
    []
  );

  const getLabelUsage = useCallback(async (id: string) => {
    return api.get<{ project_count: number }>(`/labels/${id}/usage`);
  }, []);

  const deleteLabel = useCallback(async (id: string) => {
    const res = await api.del<null>(`/labels/${id}`);
    if (!res.error) {
      setLabels((prev) => prev.filter((l) => l.id !== id));
      track("label_deleted", { label_id: id });
    }
    return res;
  }, []);

  return useMemo(
    () => ({
      labels,
      loading,
      error,
      createLabel,
      deleteLabel,
      getLabelUsage,
      refetch: fetchLabels,
    }),
    [
      labels,
      loading,
      error,
      createLabel,
      deleteLabel,
      getLabelUsage,
      fetchLabels,
    ]
  );
}

function useProjectsStore(): ProjectsValue {
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

  // Echo suppression: when a `projects` UPDATE arrives whose
  // updated_by_client matches our CLIENT_ID, skip the refetch — local
  // state already reflects the change.
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

  const createProject = useCallback(async (input: CreateProjectInput) => {
    const res = await api.post<Project>("/projects", input);
    if (res.data) {
      setProjects((prev) => [...prev, res.data!]);
      track("project_created", {
        project_id: res.data.id,
        label_count: input.labelIds?.length ?? 0,
        has_description: Boolean(input.description?.trim()),
      });
    }
    return res;
  }, []);

  const updateProject = useCallback(
    async (id: string, input: UpdateProjectInput) => {
      const res = await api.put<Project>(`/projects/${id}`, input);
      if (res.data) {
        setProjects((prev) => prev.map((p) => (p.id === id ? res.data! : p)));
        track("project_updated", {
          project_id: id,
          fields_changed: Object.keys(input),
        });
      }
      return res;
    },
    []
  );

  const deleteProject = useCallback(async (id: string) => {
    const res = await api.del<null>(`/projects/${id}`);
    if (!res.error) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      track("project_deleted", { project_id: id });
    }
    return res;
  }, []);

  return useMemo(
    () => ({
      projects,
      loading,
      error,
      createProject,
      updateProject,
      deleteProject,
      refetch: fetchProjects,
    }),
    [
      projects,
      loading,
      error,
      createProject,
      updateProject,
      deleteProject,
      fetchProjects,
    ]
  );
}
