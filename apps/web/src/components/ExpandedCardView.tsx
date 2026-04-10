import { useState, useEffect, useCallback } from "react";
import type { Card, ChatMessage, ContentType, Stage } from "@content-studio/shared";
import { api } from "../lib/api";
import { TypeBadge } from "./TypeBadge";
import { ChatPanel } from "./ChatPanel";

interface ExpandedCardViewProps {
  cardId: string;
  projectName: string;
  onBack: () => void;
  onDelete?: () => void;
}

interface CardDetail extends Card {
  artifacts: Array<{ id: string; type: string; title: string; content: string; status: string }>;
  messages: ChatMessage[];
}

const STAGES: { value: Stage; label: string }[] = [
  { value: "unreviewed", label: "Unreviewed" },
  { value: "considering", label: "Considering" },
  { value: "in_production", label: "In Production" },
  { value: "published", label: "Published" },
];

export function ExpandedCardView({
  cardId,
  projectName,
  onBack,
  onDelete,
}: ExpandedCardViewProps) {
  const [card, setCard] = useState<CardDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [activeTab] = useState("details");

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

  const handleStageChange = async (newStage: Stage) => {
    if (!card) return;
    const res = await api.put<Card>(`/cards/${cardId}`, { stage: newStage });
    if (res.data) {
      setCard({ ...card, stage: res.data.stage });
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
      }>(`/cards/${cardId}/chat`, { content, active_tab: activeTab });

      if (res.data) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          res.data!.user_message,
          res.data!.assistant_message,
        ]);

        if (res.data.updated_content && card) {
          setCard({ ...card, summary: res.data.updated_content });
        }
      } else {
        // API returned an error response
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
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-sans)",
          fontSize: "14px",
          color: "var(--text-muted)",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <header
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--rule-faint)",
          padding: "0 24px",
          flexShrink: 0,
        }}
      >
        {/* Back link */}
        <div
          style={{
            padding: "12px 0 8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              fontSize: "12px",
              fontWeight: 500,
              color: "#64748B",
              fontFamily: "var(--font-sans)",
              padding: 0,
              cursor: "pointer",
            }}
          >
            ← Back to board
          </button>
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            paddingBottom: "16px",
          }}
        >
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

          {/* Stage dropdown */}
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
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <TypeBadge type={card.content_type as ContentType} />
        </div>
      </header>

      {/* Content + Chat */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Content area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "var(--page-padding)",
          }}
        >
          {/* Details tab content */}
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

          {/* Artifacts section */}
          {card.artifacts && card.artifacts.length > 0 && (
            <div>
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
                Artifacts
              </div>
              {card.artifacts.map((artifact) => (
                <div
                  key={artifact.id}
                  style={{
                    padding: "12px 16px",
                    border: "1px solid var(--rule-faint)",
                    borderRadius: "0",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {artifact.type === "demo-flow" ? "Demo Flow" : "Script"}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 500,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      border: `1px solid ${artifact.status === "complete" ? "#10B98140" : artifact.status === "draft" ? "#F59E0B40" : "#94A3B840"}`,
                      color: artifact.status === "complete" ? "#10B981" : artifact.status === "draft" ? "#F59E0B" : "#94A3B8",
                    }}
                  >
                    {artifact.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat panel */}
        <ChatPanel
          messages={messages}
          projectName={projectName}
          onSendMessage={handleSendMessage}
          sending={sending}
          activeTab={activeTab}
        />
      </div>
    </div>
  );
}
