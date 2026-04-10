import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { NewProjectModal } from "./components/NewProjectModal";
import { KanbanBoard } from "./components/KanbanBoard";
import { ExpandedCardView } from "./components/ExpandedCardView";
import { ContextPanel } from "./components/ContextPanel";
import { useProjects } from "./hooks/useProjects";
import { useCards } from "./hooks/useCards";
import { useContextFiles } from "./hooks/useContextFiles";
import { api } from "./lib/api";

function App() {
  const { projects, loading, createProject } = useProjects();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);
  const { cards, refetch: refetchCards } = useCards(activeProjectId);
  const { files: contextFiles, uploadFile, deleteFile } = useContextFiles(activeProjectId);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  const [generating, setGenerating] = useState(false);

  const handleGenerateIdeas = async () => {
    if (!activeProject || generating) return;
    setGenerating(true);
    await api.post(`/projects/${activeProject.id}/generate-ideas`, {});
    // Poll for new cards, then stop
    await new Promise((r) => setTimeout(r, 5000));
    await refetchCards();
    await new Promise((r) => setTimeout(r, 5000));
    await refetchCards();
    setGenerating(false);
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={(id) => {
          setActiveProjectId(id);
          setExpandedCardId(null);
          setShowContext(false);
        }}
        onNewProject={() => setShowNewProject(true)}
      />

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-primary)",
          overflow: "hidden",
          position: "relative",
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

                {cards.length > 0 && (
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 400,
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {cards.length} ideas · {cards.filter((c) => c.stage === "considering").length} considering · {cards.filter((c) => c.stage === "in_production").length} in production
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setShowContext(!showContext)}
                  style={{
                    background: showContext ? "var(--bg-secondary)" : "var(--bg-surface)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--rule-faint)",
                    borderRadius: "0",
                    padding: "8px 14px",
                    fontSize: "12px",
                    fontWeight: 500,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Context ({contextFiles.length})
                </button>
                <button
                  style={{
                    background: "var(--text-primary)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "0",
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: 600,
                    fontFamily: "var(--font-sans)",
                    opacity: generating ? 0.5 : 1,
                  }}
                  onClick={handleGenerateIdeas}
                  disabled={generating}
                >
                  {generating ? "Generating..." : "Generate Ideas"}
                </button>
              </div>
            </header>

            {/* Board or expanded card */}
            {expandedCardId ? (
              <ExpandedCardView
                cardId={expandedCardId}
                projectName={activeProject.name}
                onBack={() => {
                  setExpandedCardId(null);
                  refetchCards();
                }}
                onDelete={refetchCards}
              />
            ) : (
              <KanbanBoard
                cards={cards}
                onCardClick={setExpandedCardId}
                onGenerateMore={handleGenerateIdeas}
              />
            )}

            {/* Context panel slide-over */}
            {showContext && (
              <ContextPanel
                files={contextFiles}
                onUpload={uploadFile}
                onDelete={deleteFile}
                onClose={() => setShowContext(false)}
              />
            )}
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
