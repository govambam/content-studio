import type { ContentStatus } from "@content-studio/shared";
import { STATUS_LABELS } from "@content-studio/shared";

const STATUS_VAR: Record<ContentStatus, string> = {
  backlog: "var(--status-backlog)",
  in_progress: "var(--status-in-progress)",
  in_review: "var(--status-in-review)",
  done: "var(--status-done)",
};

const STATUS_HEX: Record<ContentStatus, string> = {
  backlog: "#94A3B8",
  in_progress: "#3B82F6",
  in_review: "#F59E0B",
  done: "#10B981",
};

interface StatusBadgeProps {
  status: ContentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = STATUS_VAR[status];
  // rgba tint needs a literal color — DESIGN-SYSTEM.md §2.1 explicitly permits
  // stage/status colors to appear inline when used in computed styles.
  const hex = STATUS_HEX[status];
  const tint = hexToRgba(hex, 0.1);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "3px 8px",
        borderRadius: "4px",
        background: tint,
        color: color,
        fontSize: "10px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        fontFamily: "var(--font-sans)",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: color,
        }}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function StatusDot({ status }: StatusBadgeProps) {
  return (
    <span
      style={{
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: STATUS_VAR[status],
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
