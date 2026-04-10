import { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { NewProjectModal } from "./components/NewProjectModal";
import { KanbanBoard } from "./components/KanbanBoard";
import { ExpandedCardView } from "./components/ExpandedCardView";
import { useProjects } from "./hooks/useProjects";
import { useCards } from "./hooks/useCards";
import { api } from "./lib/api";
import type { Card } from "@content-studio/shared";

function App() {
  const { projects, loading, createProject } = useProjects();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [composingCard, setComposingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [creatingCard, setCreatingCard] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const newCardInputRef = useRef<HTMLInputElement>(null);
  const { cards, refetch: refetchCards } = useCards(activeProjectId);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showNewProject) setShowNewProject(false);
        else if (composingCard) {
          setComposingCard(false);
          setNewCardTitle("");
        } else if (expandedCardId) {
          setExpandedCardId(null);
          refetchCards();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showNewProject, composingCard, expandedCardId, refetchCards]);

  useEffect(() => {
    if (composingCard) {
      newCardInputRef.current?.focus();
    }
  }, [composingCard]);

  const handleStartComposeCard = () => {
    if (!activeProject) return;
    setComposingCard(true);
  };

  const handleSubmitNewCard = async () => {
    const title = newCardTitle.trim();
    if (!title || !activeProject || creatingCard) return;
    setCreatingCard(true);
    try {
      const res = await api.post<Card>(`/projects/${activeProject.id}/cards`, {
        title,
      });
      if (res.data) {
        setComposingCard(false);
        setNewCardTitle("");
        await refetchCards();
        setExpandedCardId(res.data.id);
      }
    } finally {
      setCreatingCard(false);
    }
  };

  const handleCancelNewCard = () => {
    setComposingCard(false);
    setNewCardTitle("");
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
                    {cards.length} cards ·{" "}
                    {cards.filter((c) => c.stage === "considering").length} considering ·{" "}
                    {cards.filter((c) => c.stage === "in_production").length} in production
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {composingCard ? (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      ref={newCardInputRef}
                      type="text"
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSubmitNewCard();
                        if (e.key === "Escape") handleCancelNewCard();
                      }}
                      onBlur={() => {
                        if (!newCardTitle.trim()) handleCancelNewCard();
                      }}
                      placeholder="Card title…"
                      disabled={creatingCard}
                      style={{
                        width: "240px",
                        padding: "8px 12px",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--rule-strong)",
                        borderRadius: "0",
                        fontSize: "12px",
                        fontWeight: 400,
                        fontFamily: "var(--font-sans)",
                        color: "var(--text-primary)",
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={handleSubmitNewCard}
                      disabled={!newCardTitle.trim() || creatingCard}
                      style={{
                        background: "var(--text-primary)",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: "0",
                        padding: "8px 16px",
                        fontSize: "12px",
                        fontWeight: 700,
                        fontFamily: "var(--font-sans)",
                        opacity: !newCardTitle.trim() || creatingCard ? 0.5 : 1,
                        cursor: !newCardTitle.trim() || creatingCard ? "default" : "pointer",
                      }}
                    >
                      {creatingCard ? "Creating…" : "Create"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleStartComposeCard}
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
                    + Card
                  </button>
                )}
              </div>
            </header>

            {expandedCardId ? (
              <ExpandedCardView
                cardId={expandedCardId}
                onBack={() => {
                  setExpandedCardId(null);
                  refetchCards();
                }}
                onDelete={refetchCards}
              />
            ) : (
              <KanbanBoard cards={cards} onCardClick={setExpandedCardId} />
            )}
          </>
        ) : (
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
            if (project) setActiveProjectId(project.id);
          }}
        />
      )}
    </div>
  );
}

export default App;
