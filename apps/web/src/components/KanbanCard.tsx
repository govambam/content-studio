import type { Card, ContentType } from "@content-studio/shared";
import { TypeBadge } from "./TypeBadge";

interface KanbanCardProps {
  card: Card;
  onClick: () => void;
}

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
      </div>
    </div>
  );
}
