import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { NewProjectModal } from "./components/NewProjectModal";
import { KanbanBoard } from "./components/KanbanBoard";
import { useProjects } from "./hooks/useProjects";
import { useCards } from "./hooks/useCards";

function App() {
  const { projects, loading, createProject } = useProjects();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const { cards } = useCards(activeProjectId);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onNewProject={() => setShowNewProject(true)}
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
        {activeProject ? (
          <>
            {/* Header bar */}
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                {/* Project icon */}
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: `${activeProject.color}33`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: activeProject.color,
                    flexShrink: 0,
                  }}
                >
                  {activeProject.icon}
                </div>

                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {activeProject.name}
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  style={{
                    background: "var(--bg-surface)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--rule-faint)",
                    borderRadius: "0",
                    padding: "8px 14px",
                    fontSize: "12px",
                    fontWeight: 500,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Context (0)
                </button>
                <button
                  style={{
                    background: "#1E293B",
                    color: "var(--accent-inverse)",
                    border: "none",
                    borderRadius: "0",
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: 600,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Generate Ideas
                </button>
              </div>
            </header>

            {/* Kanban board */}
            <KanbanBoard
              cards={cards}
              onCardClick={(cardId) => {
                // Expanded card view — coming in PR #8
                console.log("Card clicked:", cardId);
              }}
            />
          </>
        ) : (
          /* Empty state */
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "var(--page-padding)",
            }}
          >
            {loading ? (
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 400,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Loading...
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Content Studio
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 400,
                    color: "var(--text-secondary)",
                    marginTop: "8px",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Select or create a project to get started.
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={async (data) => {
            const project = await createProject(data);
            if (project) {
              setActiveProjectId(project.id);
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
