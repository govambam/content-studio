import { useState, useEffect, useCallback, useRef } from "react";
import type { Card, ContentType, Stage } from "@content-studio/shared";
import { api } from "../lib/api";
import { Breadcrumbs } from "./Breadcrumbs";
import { TypeBadge } from "./TypeBadge";
import { PropertiesSidebar } from "./PropertiesSidebar";

interface ExpandedCardViewProps {
  cardId: string;
  onBack: () => void;
  onDelete?: () => void;
}

export function ExpandedCardView({
  cardId,
  onBack,
  onDelete,
}: ExpandedCardViewProps) {
  const [card, setCard] = useState<Card | null>(null);
  const [editingSummary, setEditingSummary] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const fetchCard = useCallback(async () => {
    const res = await api.get<Card>(`/cards/${cardId}`);
    if (res.data) {
      setCard(res.data);
    }
  }, [cardId]);

  useEffect(() => {
    fetchCard();
  }, [fetchCard]);

  const handleStageChange = async (newStage: Stage) => {
    const res = await api.put<Card>(`/cards/${cardId}`, { stage: newStage });
    if (res.data) setCard((prev) => (prev ? { ...prev, stage: res.data!.stage } : prev));
  };

  const handleDeleteCard = async () => {
    if (!confirm("Delete this card?")) return;
    const res = await api.del(`/cards/${cardId}`);
    if (!res.error) {
      onDelete?.();
      onBack();
    }
  };

  const handleSummaryChange = (value: string) => {
    setEditingSummary(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      saveTimerRef.current = null;
      await api.put(`/cards/${cardId}`, { summary: value });
      setCard((prev) => (prev ? { ...prev, summary: value } : prev));
    }, 1000);
  };

  const handleSummaryBlur = async () => {
    if (editingSummary === null) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      await api.put(`/cards/${cardId}`, { summary: editingSummary });
      setCard((prev) => (prev ? { ...prev, summary: editingSummary } : prev));
    }
    setEditingSummary(null);
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

  const summaryValue = editingSummary ?? card.summary;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Content column */}
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--page-padding)" }}>
        <Breadcrumbs
          segments={[{ label: "Board", onClick: onBack }, { label: card.title }]}
        />

        {/* Card header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
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
          <TypeBadge type={card.content_type as ContentType} />
        </div>

        {/* Editable summary */}
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
            Summary
          </div>
          <textarea
            value={summaryValue}
            onChange={(e) => handleSummaryChange(e.target.value)}
            onBlur={handleSummaryBlur}
            placeholder="Describe the card..."
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
