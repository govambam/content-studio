import { useState, useEffect, useCallback } from "react";
import type { Card, ChatMessage, ContentType, Stage } from "@content-studio/shared";
import { api } from "../lib/api";
import { Breadcrumbs } from "./Breadcrumbs";
import { NextSteps } from "./NextSteps";
import { TypeBadge } from "./TypeBadge";
import { ChatPanel } from "./ChatPanel";

interface ExpandedCardViewProps {
  cardId: string;
  projectName: string;
  onBack: () => void;
  onDelete?: () => void;
}

interface ArtifactDetail {
  id: string;
  type: string;
  title: string;
  content: string;
  status: string;
}

interface CardDetail extends Card {
  artifacts: ArtifactDetail[];
  messages: ChatMessage[];
}

type ViewScope = "details" | "demo-flow" | "script";

const STAGES: { value: Stage; label: string }[] = [
  { value: "unreviewed", label: "Unreviewed" },
  { value: "considering", label: "Considering" },
  { value: "in_production", label: "In Production" },
  { value: "published", label: "Published" },
];

const QUICK_ACTIONS: Record<ViewScope, Array<{ label: string; prompt: string }>> = {
  details: [
    { label: "Expand idea", prompt: "Expand on this idea. Add more detail about the target audience, the key visual moments, and why this would resonate with engineering leaders." },
    { label: "Suggest variations", prompt: "Suggest 2-3 alternative angles or variations on this idea that we could also consider." },
  ],
  "demo-flow": [
    { label: "Add more detail", prompt: "Add more detail to each scene. Include specific on-screen elements, transition notes, and timing guidance." },
    { label: "Suggest B-roll", prompt: "Suggest B-roll shots and visual inserts that would elevate this demo. Think: close-ups, diagram overlays, before/after cuts." },
    { label: "Restructure scenes", prompt: "Restructure the scene order for better narrative flow. Consider what hooks the viewer and what builds tension." },
  ],
  script: [
    { label: "Punch up the hook", prompt: "Rewrite the opening hook to be more attention-grabbing. The first 5 seconds need to stop the scroll." },
    { label: "Shorten to 60s", prompt: "Condense this script to fit within 60-90 seconds of spoken narration. Keep the strongest moments, cut everything else." },
    { label: "Add social copy", prompt: "Write social media copy for posting this video: one version for Twitter (punchy, under 280 chars) and one for LinkedIn (2-3 paragraphs, outcomes-focused)." },
  ],
};

const SCOPE_LABELS: Record<ViewScope, string> = {
  details: "scoped to this idea",
  "demo-flow": "scoped to demo flow",
  script: "scoped to script",
};

export function ExpandedCardView({
  cardId,
  projectName,
  onBack,
  onDelete,
}: ExpandedCardViewProps) {
  const [card, setCard] = useState<CardDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [viewScope, setViewScope] = useState<ViewScope>("details");
  const [generatingArtifact, setGeneratingArtifact] = useState<string | null>(null);

  const fetchCard = useCallback(async () => {
    const res = await api.get<CardDetail>(`/cards/${cardId}`);
    if (res.data) {
      setCard(res.data);
      setMessages(res.data.messages ?? []);
    }
  }, [cardId]);

  useEffect(() => {
    fetchCard();
  }, [fetchCard]);

  // Fetch chat messages when scope changes
  useEffect(() => {
    if (!cardId) return;
    const fetchChat = async () => {
      const res = await api.get<ChatMessage[]>(`/cards/${cardId}/chat`);
      if (res.data) {
        setMessages(res.data);
      }
    };
    fetchChat();
  }, [cardId, viewScope]);

  const handleStageChange = async (newStage: Stage) => {
    if (!card) return;
    const res = await api.put<Card>(`/cards/${cardId}`, { stage: newStage });
    if (res.data) {
      setCard((prev) => prev ? { ...prev, stage: res.data!.stage } : prev);
    }
  };

  const handleDeleteCard = async () => {
    if (!confirm("Delete this card and all its content?")) return;
    const res = await api.del(`/cards/${cardId}`);
    if (!res.error) {
      onDelete?.();
      onBack();
    }
  };

  const handleGenerateArtifact = async (artifactType: string) => {
    setGeneratingArtifact(artifactType);
    try {
      if (artifactType === "demo-flow") {
        await api.post(`/cards/${cardId}/chat`, {
          content: "Generate a detailed demo flow for this idea.",
          active_tab: "demo-flow",
        });
      } else if (artifactType === "script") {
        await api.post(`/cards/${cardId}/chat`, {
          content: "Generate a full script based on this demo flow.",
          active_tab: "script",
        });
      }
      // Refetch card to get the new artifact
      await fetchCard();
      setViewScope(artifactType as ViewScope);
    } finally {
      setGeneratingArtifact(null);
    }
  };

  const handleSendMessage = async (content: string) => {
    setSending(true);
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      card_id: cardId,
      artifact_id: null,
      role: "user",
      content,
      metadata: null,
      created_at: new Date().toISOString(),
      user_id: null,
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await api.post<{
        user_message: ChatMessage;
        assistant_message: ChatMessage;
        updated_content: string | null;
      }>(`/cards/${cardId}/chat`, { content, active_tab: viewScope });

      if (res.data) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          res.data!.user_message,
          res.data!.assistant_message,
        ]);

        // Update content based on scope
        if (res.data.updated_content && card) {
          if (viewScope === "details") {
            setCard((prev) => prev ? { ...prev, summary: res.data!.updated_content! } : prev);
          } else {
            // Refetch to get updated artifact
            await fetchCard();
          }
        }
      } else {
        throw new Error(res.error ?? "Unknown error");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          card_id: cardId,
          artifact_id: null,
          role: "assistant",
          content: "Claude encountered an error processing this request.",
          metadata: null,
          created_at: new Date().toISOString(),
          user_id: null,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!card) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", fontSize: "14px", color: "var(--text-muted)" }}>
        Loading...
      </div>
    );
  }

  const currentArtifact = viewScope !== "details"
    ? card.artifacts.find((a) => a.type === viewScope)
    : null;

  // Build breadcrumbs
  const breadcrumbSegments = [
    { label: "Board", onClick: onBack },
    ...(viewScope === "details"
      ? [{ label: card.title }]
      : [
          { label: card.title, onClick: () => setViewScope("details") },
          { label: viewScope === "demo-flow" ? "Demo Flow" : "Script" },
        ]),
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <header
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--rule-faint)",
          padding: "12px 24px 16px",
          flexShrink: 0,
        }}
      >
        {/* Breadcrumbs + delete */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Breadcrumbs segments={breadcrumbSegments} />
          <button
            onClick={handleDeleteCard}
            style={{
              background: "none",
              border: "none",
              fontSize: "11px",
              fontWeight: 500,
              color: "var(--text-muted)",
              fontFamily: "var(--font-sans)",
              padding: 0,
              cursor: "pointer",
            }}
          >
            Delete card
          </button>
        </div>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1
            style={{
              fontSize: "18px",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              margin: 0,
            }}
          >
            {card.title}
          </h1>

          <select
            value={card.stage}
            onChange={(e) => handleStageChange(e.target.value as Stage)}
            style={{
              padding: "4px 8px",
              border: "1px solid var(--rule-faint)",
              borderRadius: "0",
              fontFamily: "var(--font-sans)",
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <TypeBadge type={card.content_type as ContentType} />
        </div>
      </header>

      {/* Content + Chat */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Content area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--page-padding)" }}>
          {viewScope === "details" ? (
            <>
              {/* Idea summary */}
              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase" as const,
                    color: "var(--text-secondary)",
                    marginBottom: "8px",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Idea Summary
                </div>
                <div
                  style={{
                    padding: "16px 20px",
                    background: "#F8FAFC",
                    border: "1px solid var(--rule-faint)",
                    borderRadius: "0",
                    fontSize: "14px",
                    fontWeight: 400,
                    color: "#334155",
                    lineHeight: 1.7,
                    fontFamily: "var(--font-sans)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {card.summary || "No summary yet. Chat with Claude to develop this idea."}
                </div>
              </div>

              {/* Next Steps */}
              <NextSteps
                artifacts={card.artifacts}
                onNavigate={(type) => setViewScope(type as ViewScope)}
                onGenerate={handleGenerateArtifact}
                generating={generatingArtifact}
              />
            </>
          ) : (
            /* Sub-page: Demo Flow or Script */
            <>
              <button
                onClick={() => setViewScope("details")}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-sans)",
                  padding: 0,
                  cursor: "pointer",
                  marginBottom: "16px",
                  display: "block",
                }}
              >
                ← Back to idea
              </button>

              {currentArtifact ? (
                <div
                  style={{
                    padding: "24px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--rule-faint)",
                    borderRadius: "0",
                    fontSize: "14px",
                    fontWeight: 400,
                    color: "var(--text-primary)",
                    lineHeight: 1.7,
                    fontFamily: "var(--font-sans)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {currentArtifact.content || "Content is being generated..."}
                </div>
              ) : (
                <div
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    fontSize: "14px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  No {viewScope === "demo-flow" ? "demo flow" : "script"} yet. Use the chat to generate one.
                </div>
              )}
            </>
          )}
        </div>

        {/* Chat panel */}
        <ChatPanel
          messages={messages}
          projectName={projectName}
          onSendMessage={handleSendMessage}
          sending={sending}
          activeTab={viewScope}
          scopeLabel={SCOPE_LABELS[viewScope]}
          quickActions={QUICK_ACTIONS[viewScope]}
        />
      </div>
    </div>
  );
}
