import type { Project } from "@content-studio/shared";
import { LabelChip } from "./LabelChip";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const descriptionPreview = project.description.trim().slice(0, 60);
  const doneCount = project.ticket_counts.done;
  const totalCount =
    project.ticket_counts.backlog +
    project.ticket_counts.in_progress +
    project.ticket_counts.in_review +
    project.ticket_counts.done;

  return (
    <div
      onClick={onClick}
      style={{
        padding: "12px",
        background: "var(--bg-surface)",
        border: "1px solid var(--rule-faint)",
        borderRadius: "0",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        fontFamily: "var(--font-sans)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--rule-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--rule-faint)";
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
        {project.title}
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
}
