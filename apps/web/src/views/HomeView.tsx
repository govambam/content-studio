import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ContentStatus, Project } from "@content-studio/shared";
import { Sidebar } from "../components/Sidebar";
import { KanbanBoard } from "../components/KanbanBoard";
import { ProjectCard } from "../components/ProjectCard";
import { NewProjectModal } from "../components/NewProjectModal";
import { SkeletonKanbanBoard } from "../components/Skeleton";
import { useLabels } from "../hooks/useLabels";
import { useProjects } from "../hooks/useProjects";
import { track } from "../lib/analytics";

export function HomeView() {
  const navigate = useNavigate();
  const { labels, createLabel } = useLabels();
  const {
    projects,
    loading: projectsLoading,
    createProject,
    updateProject,
  } = useProjects();
  const [activeFilterIds, setActiveFilterIds] = useState<Set<string>>(new Set());
  const [showNewProject, setShowNewProject] = useState(false);

  const toggleFilter = (labelId: string) => {
    setActiveFilterIds((prev) => {
      const next = new Set(prev);
      const willBeActive = !next.has(labelId);
      if (next.has(labelId)) next.delete(labelId);
      else next.add(labelId);
      track("label_filter_toggled", { label_id: labelId, active: willBeActive });
      return next;
    });
  };

  const clearFilters = () => setActiveFilterIds(new Set());

  const visibleProjects = useMemo(() => {
    if (activeFilterIds.size === 0) return projects;
    return projects.filter((p) =>
      p.labels.some((l) => activeFilterIds.has(l.id))
    );
  }, [projects, activeFilterIds]);

  // useCallback so KanbanBoard's onItemMoved prop has a stable identity
  // and doesn't cascade re-renders into every ProjectCard through the
  // render-prop tree.
  const handleItemMoved = useCallback(
    async (itemId: string, toStatus: ContentStatus, toIndex: number) => {
      const project = projects.find((p) => p.id === itemId);
      if (!project) return;
      if (project.status !== toStatus) {
        track("project_status_changed", {
          project_id: project.id,
          from: project.status,
          to: toStatus,
          method: "drag",
        });
      }
      const columnItems = projects
        .filter((p) => p.status === toStatus && p.id !== itemId)
        .sort((a, b) => a.sort_order - b.sort_order);
      columnItems.splice(toIndex, 0, { ...project, status: toStatus });
      await Promise.all(
        columnItems.map((item, idx) => {
          const needsStatus = item.status !== toStatus;
          const needsOrder = item.sort_order !== idx;
          if (item.id === itemId || needsStatus || needsOrder) {
            return updateProject(item.id, {
              status: toStatus,
              sort_order: idx,
            });
          }
          return Promise.resolve();
        })
      );
    },
    [projects, updateProject]
  );

  const renderProjectCard = useCallback(
    (project: Project) => (
      <ProjectCard
        project={project}
        onClick={() => navigate(`/projects/${project.id}`)}
      />
    ),
    [navigate]
  );

  const handleCreateProject = async (input: {
    title: string;
    description?: string;
    labelIds: string[];
  }) => {
    const res = await createProject(input);
    if (res.data) {
      navigate(`/projects/${res.data.id}`);
    }
    return { error: res.error };
  };

  const handleCreateLabelFromModal = async (name: string, color: string) => {
    const res = await createLabel(name, color);
    return { data: res.data, error: res.error };
  };

  const handleCreateLabelFromSidebar = async (name: string, color: string) => {
    const res = await createLabel(name, color);
    return { error: res.error };
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <Sidebar
        labels={labels}
        activeFilterIds={activeFilterIds}
        onToggleFilter={toggleFilter}
        onClearFilters={clearFilters}
        onCreateLabel={handleCreateLabelFromSidebar}
      />

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-primary)",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <header
          style={{
            height: "var(--header-height)",
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--rule-strong)",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Home
            </div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 400,
                color: "var(--text-muted)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {visibleProjects.length}{" "}
              {visibleProjects.length === 1 ? "project" : "projects"}
              {activeFilterIds.size > 0 ? " (filtered)" : ""}
            </div>
          </div>
          <button
            onClick={() => {
              track("new_project_modal_opened", {});
              setShowNewProject(true);
            }}
            style={{
              background: "var(--text-primary)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "0",
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 700,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
            }}
          >
            + New Project
          </button>
        </header>

        {projectsLoading ? (
          <SkeletonKanbanBoard />
        ) : (
          <KanbanBoard<Project>
            items={visibleProjects}
            renderItem={renderProjectCard}
            onItemMoved={handleItemMoved}
            emptyMessage={
              projects.length === 0
                ? "No projects yet. Start your first content initiative."
                : activeFilterIds.size > 0
                  ? "No projects match the current label filter."
                  : undefined
            }
            emptyAction={
              projects.length === 0 ? (
                <button
                  onClick={() => {
              track("new_project_modal_opened", {});
              setShowNewProject(true);
            }}
                  style={{
                    background: "var(--text-primary)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "0",
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: 700,
                    fontFamily: "var(--font-sans)",
                    cursor: "pointer",
                  }}
                >
                  + New Project
                </button>
              ) : activeFilterIds.size > 0 ? (
                <button
                  onClick={clearFilters}
                  style={{
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--rule-faint)",
                    borderRadius: "0",
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: 700,
                    fontFamily: "var(--font-sans)",
                    cursor: "pointer",
                  }}
                >
                  Clear filter
                </button>
              ) : undefined
            }
          />
        )}
      </main>

      {showNewProject && (
        <NewProjectModal
          labels={labels}
          onClose={() => setShowNewProject(false)}
          onCreate={handleCreateProject}
          onCreateLabel={handleCreateLabelFromModal}
        />
      )}
    </div>
  );
}
