import { memo } from "react";
import type { MouseEvent } from "react";
import type { Project } from "@content-studio/shared";
import { LabelChip } from "./LabelChip";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  selected: boolean;
  onToggleSelect: () => void;
}

// React.memo so a card only re-renders when its own project reference
// changes. Without this, every parent re-render (e.g. the DataContext
// updating for any reason) would rebuild every card on the board.
export const ProjectCard = memo(function ProjectCard({
  project,
  onClick,
  selected,
  onToggleSelect,
}: ProjectCardProps) {
  const descriptionPreview = project.description.trim().slice(0, 60);
  const doneCount = project.ticket_counts.done;
  const totalCount =
    project.ticket_counts.backlog +
    project.ticket_counts.in_progress +
    project.ticket_counts.in_review +
    project.ticket_counts.done;

  const handleCheckboxClick = (e: MouseEvent) => {
    // Toggle selection without navigating into the project.
    e.stopPropagation();
    onToggleSelect();
  };

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
        borderColor: selected ? "var(--rule-strong)" : undefined,
        background: selected ? "var(--bg-secondary)" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
        }}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={selected ? "Deselect project" : "Select project"}
          className="cs-select-checkbox"
          onClick={handleCheckboxClick}
          style={{
            flexShrink: 0,
            width: "16px",
            height: "16px",
            marginTop: "1px",
            padding: 0,
            borderRadius: "0",
            border: "1px solid var(--rule-strong)",
            background: selected ? "var(--text-primary)" : "var(--bg-surface)",
            color: "#FFFFFF",
            fontSize: "11px",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            // Force the checkbox visible while selected; otherwise the
            // CSS class keeps it hidden until the card is hovered.
            opacity: selected ? 1 : undefined,
          }}
        >
          {selected ? "✓" : ""}
        </button>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            lineHeight: 1.3,
          }}
        >
          {project.title}
        </div>
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
          {project.description.length > 60 ? "…" : ""}
        </div>
      )}

      {project.labels.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {project.labels.map((label) => (
            <LabelChip key={label.id} label={label} small />
          ))}
        </div>
      )}

      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "var(--text-muted)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {totalCount === 0
          ? "No tickets"
          : `${doneCount} of ${totalCount} tickets done`}
      </div>
    </div>
  );
});
