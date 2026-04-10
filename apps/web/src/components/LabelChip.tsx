import type { Label } from "@content-studio/shared";

interface LabelChipProps {
  label: Label;
  active?: boolean;
  small?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

export function LabelChip({
  label,
  active,
  small,
  onClick,
  onRemove,
}: LabelChipProps) {
  const clickable = Boolean(onClick);
  const padding = small ? "2px 8px" : "4px 10px";
  const fontSize = small ? "10px" : "11px";
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding,
        borderRadius: "4px",
        border: active
          ? `1px solid ${label.color}`
          : "1px solid var(--rule-faint)",
        background: active ? hexToRgba(label.color, 0.12) : "transparent",
        color: active ? label.color : "var(--text-secondary)",
        fontSize,
        fontWeight: 600,
        fontFamily: "var(--font-sans)",
        cursor: clickable ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: label.color,
          flexShrink: 0,
        }}
      />
      {label.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label.name}`}
          style={{
            marginLeft: "4px",
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: 0,
            fontSize: "12px",
            fontFamily: "var(--font-sans)",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
