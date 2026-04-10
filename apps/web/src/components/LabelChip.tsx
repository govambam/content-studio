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

  // Chip chrome. Shared between the two render paths (clickable button
  // vs inert span) so the only difference between them is the tag and
  // role, not the visuals.
  const chipStyle: React.CSSProperties = {
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
  };

  const innerContent = (
    <>
      <span
        aria-hidden="true"
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: label.color,
          flexShrink: 0,
        }}
      />
      {label.name}
    </>
  );

  // A11y audit: an interactive <span> is not focusable and screen
  // readers don't announce it as a control. Use a real <button> when
  // there's an onClick handler so Tab navigation and SR roles work.
  // The Remove affordance is rendered as a sibling button so we don't
  // nest buttons (invalid HTML).
  if (clickable) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "stretch",
          gap: 0,
        }}
      >
        <button
          type="button"
          onClick={onClick}
          style={{
            ...chipStyle,
            borderTopRightRadius: onRemove ? 0 : "4px",
            borderBottomRightRadius: onRemove ? 0 : "4px",
            borderRight: onRemove ? "none" : chipStyle.border,
          }}
        >
          {innerContent}
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label.name}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0 8px",
              background: chipStyle.background,
              border: chipStyle.border,
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              borderTopRightRadius: "4px",
              borderBottomRightRadius: "4px",
              color: "var(--text-muted)",
              cursor: "pointer",
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

  // Non-clickable label chip with an optional Remove button. The chip
  // itself is inert (span) but the Remove sub-control is still a real
  // <button>.
  return (
    <span style={chipStyle}>
      {innerContent}
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
