import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { NewProjectModal } from "./components/NewProjectModal";
import { NewIdeaModal } from "./components/NewIdeaModal";
import { KanbanBoard } from "./components/KanbanBoard";
import { ExpandedCardView } from "./components/ExpandedCardView";
import { useProjects } from "./hooks/useProjects";
import { useCards } from "./hooks/useCards";
import { useContextFiles } from "./hooks/useContextFiles";
import { api } from "./lib/api";
import type { Card, ContentType } from "@content-studio/shared";

function App() {
  const { projects, loading, createProject } = useProjects();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewIdea, setShowNewIdea] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const { cards, refetch: refetchCards } = useCards(activeProjectId);
  const { files: contextFiles, uploadFile, deleteFile } = useContextFiles(activeProjectId);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showNewProject) setShowNewProject(false);
        else if (showNewIdea) setShowNewIdea(false);
        else if (expandedCardId) {
          setExpandedCardId(null);
          refetchCards();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showNewProject, showNewIdea, expandedCardId, refetchCards]);

  const handleCreateIdea = async (data: { title: string; summary: string; content_type: ContentType }) => {
    if (!activeProject) return;
    const res = await api.post<Card>(`/projects/${activeProject.id}/cards`, {
      title: data.title,
      summary: data.summary,
      content_type: data.content_type,
      created_by: "user",
    });
    if (res.data) {
      await refetchCards();
      setExpandedCardId(res.data.id);
    }
  };

  const handleGenerateIdeas = async () => {
    if (!activeProject) return;
    await api.post(`/projects/${activeProject.id}/generate-ideas`, {});
    await new Promise((r) => setTimeout(r, 10000));
    await refetchCards();
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={(id) => {
          setActiveProjectId(id);
          setExpandedCardId(null);
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
        }}
      >
        {activeProject ? (
          <>
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
                <div style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>
                  {activeProject.name}
                </div>
                {cards.length > 0 && (
                  <div style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                    {cards.length} ideas · {cards.filter((c) => c.stage === "considering").length} considering · {cards.filter((c) => c.stage === "in_production").length} in production
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowNewIdea(true)}
                style={{
                  background: "var(--text-primary)",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "0",
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                }}
              >
                + Idea
              </button>
            </header>

            {expandedCardId ? (
              <ExpandedCardView
                cardId={expandedCardId}
                projectName={activeProject.name}
                projectId={activeProject.id}
                onBack={() => {
                  setExpandedCardId(null);
                  refetchCards();
                }}
                onDelete={refetchCards}
                contextFiles={contextFiles}
                onUploadFile={uploadFile}
                onDeleteFile={deleteFile}
              />
            ) : (
              <KanbanBoard
                cards={cards}
                onCardClick={setExpandedCardId}
              />
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--page-padding)" }}>
            {loading ? (
              <div style={{ fontSize: "14px", fontWeight: 400, color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>Loading...</div>
            ) : (
              <>
                <div style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>Content Studio</div>
                <div style={{ fontSize: "14px", fontWeight: 400, color: "var(--text-secondary)", marginTop: "8px", fontFamily: "var(--font-sans)" }}>Select or create a project to get started.</div>
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
            if (project) setActiveProjectId(project.id);
          }}
        />
      )}

      {showNewIdea && activeProject && (
        <NewIdeaModal
          onClose={() => setShowNewIdea(false)}
          onCreate={handleCreateIdea}
          onGenerate={handleGenerateIdeas}
        />
      )}
    </div>
  );
}

export default App;
