import type { Card, Stage } from "@content-studio/shared";
import { KanbanCard } from "./KanbanCard";
import { StageDot, STAGE_CONFIG } from "./StageBadge";

interface CardWithArtifacts extends Card {
  artifacts: Array<{ id: string; type: string; status: string }>;
}

interface KanbanBoardProps {
  cards: CardWithArtifacts[];
  onCardClick: (cardId: string) => void;
  onGenerateMore?: () => void;
}

const STAGES: Stage[] = ["unreviewed", "considering", "in_production", "published"];

const STAGE_LABELS: Record<Stage, string> = {
  unreviewed: "UNREVIEWED",
  considering: "CONSIDERING",
  in_production: "IN PRODUCTION",
  published: "PUBLISHED",
};

export function KanbanBoard({ cards, onCardClick, onGenerateMore }: KanbanBoardProps) {
  const cardsByStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage] = cards.filter((c) => c.stage === stage);
      return acc;
    },
    {} as Record<Stage, CardWithArtifacts[]>
  );

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
                color: "#334155",
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

            {stage === "unreviewed" && onGenerateMore && (
              <button
                onClick={onGenerateMore}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px dashed #CBD5E1",
                  borderRadius: "0",
                  background: "transparent",
                  color: "var(--text-muted)",
                  fontSize: "12px",
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  marginTop: "4px",
                }}
              >
                + Generate more ideas
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
