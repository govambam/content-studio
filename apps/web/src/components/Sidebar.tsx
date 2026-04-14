import { useState } from "react";
import type { Label } from "@content-studio/shared";
import { LabelChip } from "./LabelChip";
import { NewLabelForm } from "./NewLabelForm";
import { Wordmark } from "./Wordmark";
import { DemoErrorButton } from "./DemoErrorButton";

interface SidebarProps {
  labels: Label[];
  activeFilterIds: Set<string>;
  onToggleFilter: (labelId: string) => void;
  onClearFilters: () => void;
  onCreateLabel: (
    name: string,
    color: string
  ) => Promise<{ error: string | null }>;
  onDeleteLabel?: (labelId: string) => Promise<void>;
}

export function Sidebar({
  labels,
  activeFilterIds,
  onToggleFilter,
  onClearFilters,
  onCreateLabel,
  onDeleteLabel,
}: SidebarProps) {
  const [showNewLabel, setShowNewLabel] = useState(false);

  const handleCreate = async (name: string, color: string) => {
    const res = await onCreateLabel(name, color);
    if (res.error) {
      // Let the inline form render the error; keep the form open.
      return res;
    }
    setShowNewLabel(false);
    return res;
  };

  return (
    <aside
      style={{
        width: "var(--sidebar-width)",
        background: "var(--bg-primary)",
        borderRight: "1px solid var(--rule-strong)",
        padding: "20px 0",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "0 20px", marginBottom: "24px" }}>
        <Wordmark />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--text-secondary)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "var(--font-sans)",
          }}
        >
          Labels
        </div>
        {activeFilterIds.size > 0 && (
          <button
            onClick={onClearFilters}
            style={{
              border: "none",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: "10px",
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
              fontFamily: "var(--font-sans)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 12px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {labels.length === 0 && !showNewLabel && (
          <div
            style={{
              padding: "8px 8px",
              fontSize: "11px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-sans)",
            }}
          >
            No labels yet
          </div>
        )}

        {labels.map((label) => (
          <div
            key={label.id}
            style={{
              padding: "2px 4px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <LabelChip
                label={label}
                active={activeFilterIds.has(label.id)}
                onClick={() => onToggleFilter(label.id)}
              />
            </div>
            {onDeleteLabel && (
              <button
                onClick={() => {
                  void onDeleteLabel(label.id);
                }}
                aria-label={`Delete label ${label.name}`}
                title={`Delete label ${label.name}`}
                style={{
                  background: "transparent",
                  border: "1px solid var(--rule-faint)",
                  borderRadius: "0",
                  padding: "0 6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  lineHeight: "18px",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}

        {showNewLabel && (
          <div style={{ padding: "4px" }}>
            <NewLabelForm
              onSubmit={handleCreate}
              onCancel={() => setShowNewLabel(false)}
            />
          </div>
        )}

        {!showNewLabel && (
          <button
            onClick={() => setShowNewLabel(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: "8px",
              marginTop: "4px",
              border: "1px dashed var(--rule-faint)",
              borderRadius: "0",
              background: "transparent",
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
            }}
          >
            + New Label
          </button>
        )}
      </div>

      <div
        style={{
          padding: "12px 12px 0",
          borderTop: "1px solid var(--rule-faint)",
          marginTop: "8px",
        }}
      >
        <DemoErrorButton />
      </div>
    </aside>
  );
}
