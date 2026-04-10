import type { Card, Stage } from "@content-studio/shared";
import { KanbanCard } from "./KanbanCard";
import { StageDot, STAGE_CONFIG } from "./StageBadge";
import { SkeletonCard } from "./SkeletonCard";

interface CardWithArtifacts extends Card {
  artifacts: Array<{ id: string; type: string; status: string }>;
}

interface KanbanBoardProps {
  cards: CardWithArtifacts[];
  onCardClick: (cardId: string) => void;
  generating?: boolean;
}

const STAGES: Stage[] = ["unreviewed", "considering", "in_production", "published"];

const STAGE_LABELS: Record<Stage, string> = {
  unreviewed: "UNREVIEWED",
  considering: "CONSIDERING",
  in_production: "IN PRODUCTION",
  published: "PUBLISHED",
};

export function KanbanBoard({ cards, onCardClick, generating = false }: KanbanBoardProps) {
  const cardsByStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage] = cards.filter((c) => c.stage === stage);
      return acc;
    },
    {} as Record<Stage, CardWithArtifacts[]>
  );

  if (cards.length === 0 && !generating) {
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
          No ideas yet. Click "+ Idea" to create or generate ideas.
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
              {stage === "unreviewed" && generating && " · generating..."}
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

            {/* Skeleton cards during idea generation */}
            {stage === "unreviewed" && generating &&
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={`skeleton-${i}`} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
