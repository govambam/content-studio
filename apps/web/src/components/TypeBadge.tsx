import type { ContentType } from "@content-studio/shared";

const TYPE_CONFIG: Record<ContentType, { bg: string; color: string; label: string }> = {
  short: { bg: "#DBEAFE", color: "#1E40AF", label: "60-90S" },
  long: { bg: "#EDE9FE", color: "#5B21B6", label: "5-10M" },
};

export function TypeBadge({ type }: { type: ContentType }) {
  const config = TYPE_CONFIG[type];
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: "4px",
        background: config.bg,
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
