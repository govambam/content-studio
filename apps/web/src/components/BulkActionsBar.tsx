import { useEffect, useState } from "react";
import type { ContentStatus, Label } from "@content-studio/shared";
import { CONTENT_STATUSES, STATUS_LABELS } from "@content-studio/shared";

interface BulkActionsBarProps {
  selectedCount: number;
  labels: Label[];
  onBulkStatus: (status: ContentStatus) => void;
  onBulkLabel: (labelId: string) => void;
  onBulkDelete: () => void;
  onClear: () => void;
}

// Banner shown across the top of the Home board whenever one or more
// project cards are selected. Offers the three bulk operations plus a
// clear affordance. The dropdown menus reuse the click-outside +
// Esc-to-close pattern used by the pickers in ProjectDetailView.
export function BulkActionsBar({
  selectedCount,
  labels,
  onBulkStatus,
  onBulkLabel,
  onBulkDelete,
  onClear,
}: BulkActionsBarProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 24px",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--rule-strong)",
        fontFamily: "var(--font-sans)",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: "12px",
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.01em",
        }}
      >
        {selectedCount} selected
      </span>

      <div style={{ width: "1px", height: "16px", background: "var(--rule-faint)" }} />

      <div style={{ position: "relative" }}>
        <button
          onClick={() => {
            setLabelOpen(false);
            setStatusOpen((v) => !v);
          }}
          style={barButtonStyle}
        >
          Change status ▾
        </button>
        {statusOpen && (
          <Dropdown onClose={() => setStatusOpen(false)}>
            {CONTENT_STATUSES.map((status) => (
              <DropdownItem
                key={status}
                onClick={() => {
                  setStatusOpen(false);
                  onBulkStatus(status);
                }}
              >
                {STATUS_LABELS[status]}
              </DropdownItem>
            ))}
          </Dropdown>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <button
          onClick={() => {
            setStatusOpen(false);
            setLabelOpen((v) => !v);
          }}
          style={barButtonStyle}
        >
          Apply label ▾
        </button>
        {labelOpen && (
          <Dropdown onClose={() => setLabelOpen(false)}>
            {labels.length === 0 && (
              <div
                style={{
                  padding: "8px 12px",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                }}
              >
                No labels yet
              </div>
            )}
            {labels.map((label) => (
              <DropdownItem
                key={label.id}
                onClick={() => {
                  setLabelOpen(false);
                  onBulkLabel(label.id);
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: label.color,
                  }}
                />
                {label.name}
              </DropdownItem>
            ))}
          </Dropdown>
        )}
      </div>

      <div style={{ flex: 1 }} />

      <button
        onClick={onBulkDelete}
        style={{
          ...barButtonStyle,
          color: "var(--text-primary)",
        }}
      >
        Delete
      </button>

      <button
        onClick={onClear}
        aria-label="Clear selection"
        style={{
          background: "transparent",
          border: "none",
          padding: "4px 8px",
          fontSize: "14px",
          fontWeight: 700,
          color: "var(--text-secondary)",
          fontFamily: "var(--font-sans)",
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}

const barButtonStyle = {
  background: "transparent",
  border: "1px solid var(--rule-faint)",
  borderRadius: "0",
  padding: "6px 12px",
  fontSize: "12px",
  fontWeight: 700,
  color: "var(--text-secondary)",
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
} as const;

function Dropdown({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleClickOutside = () => onClose();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const t = setTimeout(() => {
      window.addEventListener("click", handleClickOutside);
    }, 0);
    window.addEventListener("keydown", handleKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        left: 0,
        background: "var(--bg-surface)",
        border: "1px solid var(--rule-strong)",
        borderRadius: "0",
        zIndex: 30,
        minWidth: "180px",
        maxHeight: "280px",
        overflowY: "auto",
      }}
    >
      {children}
    </div>
  );
}

function DropdownItem({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        textAlign: "left",
        padding: "8px 12px",
        background: "transparent",
        border: "none",
        fontSize: "12px",
        fontWeight: 500,
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--bg-secondary)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}
