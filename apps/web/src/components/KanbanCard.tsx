import type { Card, ContentType } from "@content-studio/shared";
import { TypeBadge } from "./TypeBadge";

interface KanbanCardProps {
  card: Card & { artifacts: Array<{ id: string; type: string; status: string }> };
  onClick: () => void;
}

const ARTIFACT_STATUS_COLOR: Record<string, string> = {
  complete: "#10B981",
  draft: "#F59E0B",
  "not-started": "#94A3B8",
};

export function KanbanCard({ card, onClick }: KanbanCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "12px 14px",
        background: "var(--bg-surface)",
        border: "1px solid var(--rule-faint)",
        borderRadius: "0",
        cursor: "pointer",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--rule-strong)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--rule-faint)")
      }
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--text-primary)",
          fontFamily: "var(--font-sans)",
          marginBottom: "8px",
          lineHeight: 1.4,
        }}
      >
        {card.title}
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
        <TypeBadge type={card.content_type as ContentType} />

        {card.artifacts.map((artifact) => (
          <span
            key={artifact.id}
            style={{
              fontSize: "10px",
              fontWeight: 500,
              padding: "2px 6px",
              borderRadius: "4px",
              border: `1px solid ${(ARTIFACT_STATUS_COLOR[artifact.status] ?? "#94A3B8")}40`,
              color: ARTIFACT_STATUS_COLOR[artifact.status] ?? "#94A3B8",
              fontFamily: "var(--font-sans)",
              whiteSpace: "nowrap",
            }}
          >
            {artifact.type === "demo-flow" ? "Demo" : "Script"} · {artifact.status}
          </span>
        ))}
      </div>
    </div>
  );
}
