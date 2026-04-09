import type { Stage } from "@content-studio/shared";

const STAGE_CONFIG: Record<Stage, { color: string; label: string }> = {
  unreviewed: { color: "#94A3B8", label: "UNREVIEWED" },
  considering: { color: "#8B5CF6", label: "CONSIDERING" },
  in_production: { color: "#F59E0B", label: "IN PRODUCTION" },
  published: { color: "#10B981", label: "PUBLISHED" },
};

export function StageBadge({ stage }: { stage: Stage }) {
  const config = STAGE_CONFIG[stage];
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: "4px",
        background: `${config.color}1A`,
        color: config.color,
        textTransform: "uppercase" as const,
        letterSpacing: "0.05em",
        fontFamily: "var(--font-sans)",
        whiteSpace: "nowrap",
      }}
    >
      {config.label}
    </span>
  );
}

export function StageDot({ stage }: { stage: Stage }) {
  const config = STAGE_CONFIG[stage];
  return (
    <span
      style={{
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        background: config.color,
        flexShrink: 0,
        display: "inline-block",
      }}
    />
  );
}

export { STAGE_CONFIG };
