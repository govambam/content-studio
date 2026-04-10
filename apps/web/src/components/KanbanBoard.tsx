import type { Card, Stage } from "@content-studio/shared";
import { KanbanCard } from "./KanbanCard";
import { StageDot } from "./StageBadge";

interface KanbanBoardProps {
  cards: Card[];
  onCardClick: (cardId: string) => void;
}

const STAGES: Stage[] = ["unreviewed", "considering", "in_production", "published"];

const STAGE_LABELS: Record<Stage, string> = {
  unreviewed: "UNREVIEWED",
  considering: "CONSIDERING",
  in_production: "IN PRODUCTION",
  published: "PUBLISHED",
};

export function KanbanBoard({ cards, onCardClick }: KanbanBoardProps) {
  const cardsByStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage] = cards.filter((c) => c.stage === stage);
      return acc;
    },
    {} as Record<Stage, Card[]>
  );

  if (cards.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--page-padding)",
          gap: "8px",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            fontWeight: 400,
            color: "var(--text-muted)",
            fontFamily: "var(--font-sans)",
          }}
        >
          No cards yet. Click "+ Card" to create one.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "16px",
        flex: 1,
        padding: "var(--page-padding)",
        overflow: "auto",
      }}
    >
      {STAGES.map((stage) => (
        <div
          key={stage}
          style={{
            flex: 1,
            minWidth: "200px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Column header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <StageDot stage={stage} />
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--text-primary)",
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
                fontFamily: "var(--font-sans)",
              }}
            >
              {STAGE_LABELS[stage]}
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 400,
                color: "var(--text-muted)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {cardsByStage[stage].length}
            </span>
          </div>

          {/* Cards */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              flex: 1,
              overflowY: "auto",
            }}
          >
            {cardsByStage[stage].map((card) => (
              <KanbanCard
                key={card.id}
                card={card}
                onClick={() => onCardClick(card.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
