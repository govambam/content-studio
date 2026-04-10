import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ContentStatus, Project } from "@content-studio/shared";
import { Sidebar } from "../components/Sidebar";
import { KanbanBoard } from "../components/KanbanBoard";
import { ProjectCard } from "../components/ProjectCard";
import { NewProjectModal } from "../components/NewProjectModal";
import { SkeletonKanbanBoard } from "../components/Skeleton";
import { useLabels } from "../hooks/useLabels";
import { useProjects } from "../hooks/useProjects";

export function HomeView() {
  const navigate = useNavigate();
  const { labels, createLabel, deleteLabel, getLabelUsage } = useLabels();
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
      if (next.has(labelId)) next.delete(labelId);
      else next.add(labelId);
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

  const handleItemMoved = async (
    itemId: string,
    toStatus: ContentStatus,
    toIndex: number
  ) => {
    const project = projects.find((p) => p.id === itemId);
    if (!project) return;
    // Compute a new sort_order that slots into the target column at toIndex.
    // Simple approach: renumber the target column after insertion.
    const columnItems = projects
      .filter((p) => p.status === toStatus && p.id !== itemId)
      .sort((a, b) => a.sort_order - b.sort_order);
    columnItems.splice(toIndex, 0, { ...project, status: toStatus });
    // Issue updates for anything whose (status, sort_order) changed.
    await Promise.all(
      columnItems.map((item, idx) => {
        const needsStatus = item.status !== toStatus;
        const needsOrder = item.sort_order !== idx;
        if (item.id === itemId || needsStatus || needsOrder) {
          return updateProject(item.id, { status: toStatus, sort_order: idx });
        }
        return Promise.resolve();
      })
    );
  };

  const handleCreateProject = async (input: {
    title: string;
    description?: string;
    labelIds: string[];
  }) => {
    const res = await createProject(input);
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

  const handleDeleteLabel = async (labelId: string) => {
    const usageRes = await getLabelUsage(labelId);
    const count = usageRes.data?.project_count ?? 0;
    const label = labels.find((l) => l.id === labelId);
    const name = label?.name ?? "this label";
    const message =
      count === 0
        ? `Delete "${name}"? It is not applied to any projects.`
        : `Delete "${name}"? It is applied to ${count} project${
            count === 1 ? "" : "s"
          } — those projects will stay, but the label will be removed from them.`;
    if (!window.confirm(message)) return;
    const res = await deleteLabel(labelId);
    if (res.error) {
      window.alert(`Could not delete label: ${res.error}`);
      return;
    }
    setActiveFilterIds((prev) => {
      if (!prev.has(labelId)) return prev;
      const next = new Set(prev);
      next.delete(labelId);
      return next;
    });
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        labels={labels}
        activeFilterIds={activeFilterIds}
        onToggleFilter={toggleFilter}
        onClearFilters={clearFilters}
        onCreateLabel={handleCreateLabelFromSidebar}
        onDeleteLabel={handleDeleteLabel}
      />

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-primary)",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            height: "var(--header-height)",
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--rule-faint)",
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
            onClick={() => setShowNewProject(true)}
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
            renderItem={(project) => (
              <ProjectCard
                project={project}
                onClick={() => navigate(`/projects/${project.id}`)}
              />
            )}
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
                  onClick={() => setShowNewProject(true)}
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
