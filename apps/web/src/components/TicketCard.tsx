import { memo } from "react";
import type { Ticket } from "@content-studio/shared";

interface TicketCardProps {
  ticket: Ticket;
  onClick: () => void;
  assetCount?: number;
  commentCount?: number;
}

export const TicketCard = memo(function TicketCard({
  ticket,
  onClick,
  assetCount = 0,
  commentCount = 0,
}: TicketCardProps) {
  const descriptionPreview = ticket.description.trim().slice(0, 80);
  return (
    <div
      onClick={onClick}
      className="cs-hoverable-card"
      style={{
        padding: "12px",
        borderRadius: "0",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.01em",
          lineHeight: 1.3,
        }}
      >
        {ticket.title}
      </div>

      {descriptionPreview && (
        <div
          style={{
            fontSize: "11px",
            fontWeight: 400,
            color: "var(--text-secondary)",
            lineHeight: 1.4,
          }}
        >
          {descriptionPreview}
          {ticket.description.length > 80 ? "…" : ""}
        </div>
      )}

      {(assetCount > 0 || commentCount > 0) && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--text-muted)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {assetCount > 0 && <span>{assetCount} Assets</span>}
          {commentCount > 0 && <span>{commentCount} Comments</span>}
        </div>
      )}
    </div>
  );
});
