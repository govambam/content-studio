import type { Stage, ContentType } from "@content-studio/shared";

interface PropertiesSidebarProps {
  stage: Stage;
  contentType: ContentType;
  createdAt: string;
  summary: string;
  onStageChange: (stage: Stage) => void;
  onDelete: () => void;
}

const STAGES: { value: Stage; label: string }[] = [
  { value: "unreviewed", label: "Unreviewed" },
  { value: "considering", label: "Considering" },
  { value: "in_production", label: "In Production" },
  { value: "published", label: "Published" },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PropertiesSidebar({
  stage,
  contentType,
  createdAt,
  summary,
  onStageChange,
  onDelete,
}: PropertiesSidebarProps) {
  const wordCount = summary.trim() ? summary.trim().split(/\s+/).length : 0;

  return (
    <div
      style={{
        width: "220px",
        padding: "24px",
        borderLeft: "1px solid var(--rule-faint)",
        background: "var(--bg-surface)",
        flexShrink: 0,
        fontFamily: "var(--font-sans)",
        overflowY: "auto",
      }}
    >
      {/* Stage */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "4px" }}>
          Stage
        </div>
        <select
          value={stage}
          onChange={(e) => onStageChange(e.target.value as Stage)}
          style={{
            width: "100%",
            padding: "6px 8px",
            border: "1px solid var(--rule-faint)",
            borderRadius: "0",
            fontFamily: "var(--font-sans)",
            fontSize: "13px",
            fontWeight: 400,
            color: "var(--text-primary)",
            background: "var(--bg-surface)",
            outline: "none",
            cursor: "pointer",
          }}
        >
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Type */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "4px" }}>
          Type
        </div>
        <div style={{ fontSize: "13px", fontWeight: 400, color: "var(--text-primary)" }}>
          {contentType === "short" ? "60-90s" : "5-10m"}
        </div>
      </div>

      {/* Created */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "4px" }}>
          Created
        </div>
        <div style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
          {formatDate(createdAt)}
        </div>
      </div>

      {/* Word count */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "4px" }}>
          Word Count
        </div>
        <div style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
          {wordCount}
        </div>
      </div>

      {/* Delete action */}
      <div
        style={{
          marginTop: "24px",
          borderTop: "1px solid var(--rule-faint)",
          paddingTop: "16px",
        }}
      >
        <button
          onClick={onDelete}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontSize: "12px",
            fontWeight: 500,
            color: "#DC2626",
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          Delete card
        </button>
      </div>
    </div>
  );
}
