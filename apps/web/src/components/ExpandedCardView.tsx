import { useState, useEffect, useCallback, useRef } from "react";
import type { Card, ChatMessage, ContentType, Stage, ContextFile } from "@content-studio/shared";
import { api } from "../lib/api";
import { Breadcrumbs } from "./Breadcrumbs";
import { SubItems } from "./SubItems";
import { Attachments } from "./Attachments";
import { ActivityThread } from "./ActivityThread";
import { TypeBadge } from "./TypeBadge";
import { PropertiesSidebar } from "./PropertiesSidebar";

interface ExpandedCardViewProps {
  cardId: string;
  projectName: string;
  projectId: string;
  onBack: () => void;
  onDelete?: () => void;
  contextFiles: ContextFile[];
  onUploadFile: (file: File, fileType: string) => Promise<unknown>;
  onDeleteFile: (fileId: string) => Promise<boolean>;
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

const QUICK_ACTIONS: Record<ViewScope, Array<{ label: string; prompt: string }>> = {
  details: [
    { label: "Expand idea", prompt: "Expand on this idea. Add more detail about the target audience, the key visual moments, and why this would resonate with engineering leaders." },
    { label: "Suggest variations", prompt: "Suggest 2-3 alternative angles or variations on this idea that we could also consider." },
  ],
  "demo-flow": [
    { label: "Add more detail", prompt: "Add more detail to each scene. Include specific on-screen elements, transition notes, and timing guidance." },
    { label: "Suggest B-roll", prompt: "Suggest B-roll shots and visual inserts that would elevate this demo." },
    { label: "Restructure scenes", prompt: "Restructure the scene order for better narrative flow." },
  ],
  script: [
    { label: "Punch up the hook", prompt: "Rewrite the opening hook to be more attention-grabbing. The first 5 seconds need to stop the scroll." },
    { label: "Shorten to 60s", prompt: "Condense this script to fit within 60-90 seconds of spoken narration." },
    { label: "Add social copy", prompt: "Write social media copy for posting this video: one for Twitter, one for LinkedIn." },
  ],
};

export function ExpandedCardView({
  cardId,
  projectName,
  onBack,
  onDelete,
  contextFiles,
  onUploadFile,
  onDeleteFile,
}: ExpandedCardViewProps) {
  const [card, setCard] = useState<CardDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [viewScope, setViewScope] = useState<ViewScope>("details");
  const [generatingArtifact, setGeneratingArtifact] = useState<string | null>(null);
  const [editingSummary, setEditingSummary] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Cleanup save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const fetchCard = useCallback(async () => {
    const res = await api.get<CardDetail>(`/cards/${cardId}`);
    if (res.data) {
      setCard(res.data);
      setMessages(res.data.messages ?? []);
    }
  }, [cardId]);

  useEffect(() => { fetchCard(); }, [fetchCard]);

  useEffect(() => {
    if (!cardId) return;
    const fetchChat = async () => {
      const res = await api.get<ChatMessage[]>(`/cards/${cardId}/chat`);
      if (res.data) setMessages(res.data);
    };
    fetchChat();
  }, [cardId, viewScope]);

  const handleStageChange = async (newStage: Stage) => {
    const res = await api.put<Card>(`/cards/${cardId}`, { stage: newStage });
    if (res.data) setCard((prev) => prev ? { ...prev, stage: res.data!.stage } : prev);
  };

  const handleDeleteCard = async () => {
    if (!confirm("Delete this card and all its content?")) return;
    const res = await api.del(`/cards/${cardId}`);
    if (!res.error) { onDelete?.(); onBack(); }
  };

  const handleSummaryChange = (value: string) => {
    setEditingSummary(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await api.put(`/cards/${cardId}`, { summary: value });
      setCard((prev) => prev ? { ...prev, summary: value } : prev);
    }, 1000);
  };

  const handleSummaryBlur = async () => {
    if (editingSummary !== null && saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      await api.put(`/cards/${cardId}`, { summary: editingSummary });
      setCard((prev) => prev ? { ...prev, summary: editingSummary } : prev);
      setEditingSummary(null);
    }
  };

  const handleGenerateArtifact = async (artifactType: string) => {
    setGeneratingArtifact(artifactType);
    try {
      const prompt = artifactType === "demo-flow"
        ? "Generate a detailed demo flow for this idea."
        : "Generate a full script based on this demo flow.";
      await api.post(`/cards/${cardId}/chat`, { content: prompt, active_tab: artifactType });
      await fetchCard();
      setViewScope(artifactType as ViewScope);
    } finally {
      setGeneratingArtifact(null);
    }
  };

  const handleSendMessage = async (content: string) => {
    setSending(true);
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`, card_id: cardId, artifact_id: null,
      role: "user", content, metadata: null, change_summary: null,
      created_at: new Date().toISOString(), user_id: null,
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await api.post<{
        user_message: ChatMessage;
        assistant_message: ChatMessage;
        updated_content: string | null;
      }>(`/cards/${cardId}/chat`, { content, active_tab: viewScope });

      if (res.data) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempMsg.id),
          res.data!.user_message,
          res.data!.assistant_message,
        ]);
        if (res.data.updated_content && viewScope === "details") {
          setCard((prev) => prev ? { ...prev, summary: res.data!.updated_content! } : prev);
        } else if (res.data.updated_content) {
          await fetchCard();
        }
      } else {
        throw new Error(res.error ?? "Unknown error");
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`, card_id: cardId, artifact_id: null,
        role: "assistant", content: "Claude encountered an error processing this request.",
        metadata: null, change_summary: null, created_at: new Date().toISOString(), user_id: null,
      }]);
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

  const currentArtifact = viewScope !== "details" ? card.artifacts.find((a) => a.type === viewScope) : null;
  const summaryValue = editingSummary ?? card.summary;

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
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Content column */}
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--page-padding)" }}>
        {/* Breadcrumbs */}
        <Breadcrumbs segments={breadcrumbSegments} />

        {/* Card header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)", fontFamily: "var(--font-sans)", margin: 0 }}>
            {card.title}
          </h1>
          <TypeBadge type={card.content_type as ContentType} />
        </div>

        {/* Content area */}
        {viewScope === "details" ? (
          <>
            {/* Editable idea summary */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "var(--text-secondary)", marginBottom: "8px", fontFamily: "var(--font-sans)" }}>
                Idea Summary
              </div>
              <textarea
                value={summaryValue}
                onChange={(e) => handleSummaryChange(e.target.value)}
                onBlur={handleSummaryBlur}
                placeholder="Describe the idea..."
                style={{
                  width: "100%",
                  minHeight: "80px",
                  padding: "16px 20px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--rule-faint)",
                  borderRadius: "0",
                  fontSize: "14px",
                  fontWeight: 400,
                  color: "var(--text-primary)",
                  lineHeight: 1.7,
                  fontFamily: "var(--font-sans)",
                  outline: "none",
                  resize: "vertical" as const,
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--rule-strong)")}
              />
            </div>

            <SubItems
              artifacts={card.artifacts}
              onNavigate={(type) => setViewScope(type as ViewScope)}
              onGenerate={handleGenerateArtifact}
              generating={generatingArtifact}
            />

            <Attachments
              files={contextFiles}
              onUpload={onUploadFile}
              onDelete={onDeleteFile}
            />
          </>
        ) : (
          <>
            <button
              onClick={() => setViewScope("details")}
              style={{
                background: "none", border: "none", fontSize: "12px", fontWeight: 500,
                color: "var(--text-secondary)", fontFamily: "var(--font-sans)", padding: 0,
                cursor: "pointer", marginBottom: "16px", display: "block",
              }}
            >
              ← Back to idea
            </button>

            {currentArtifact ? (
              <div style={{
                padding: "24px", background: "var(--bg-surface)", border: "1px solid var(--rule-faint)",
                borderRadius: "0", fontSize: "14px", fontWeight: 400, color: "var(--text-primary)",
                lineHeight: 1.7, fontFamily: "var(--font-sans)", whiteSpace: "pre-wrap",
              }}>
                {currentArtifact.content || "Content is being generated..."}
              </div>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center", fontSize: "14px", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                No {viewScope === "demo-flow" ? "demo flow" : "script"} yet. Use the thread below to generate one.
              </div>
            )}
          </>
        )}

        {/* Activity thread */}
        <ActivityThread
          messages={messages}
          projectName={projectName}
          onSendMessage={handleSendMessage}
          sending={sending}
          quickActions={QUICK_ACTIONS[viewScope]}
        />
      </div>

      {/* Properties sidebar */}
      <PropertiesSidebar
        stage={card.stage}
        contentType={card.content_type as ContentType}
        createdAt={card.created_at}
        summary={summaryValue}
        onStageChange={handleStageChange}
        onDelete={handleDeleteCard}
      />
    </div>
  );
}
