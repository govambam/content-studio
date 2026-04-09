import { useState } from "react";

interface NewProjectModalProps {
  onClose: () => void;
  onCreate: (data: {
    name: string;
    slug: string;
    icon?: string;
    color?: string;
  }) => Promise<unknown>;
}

const PROJECT_COLORS = [
  "#1E3AFF",
  "#8B5CF6",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
  "#F97316",
];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function NewProjectModal({ onClose, onCreate }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);

  const slug = toSlug(name);
  const icon = name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSubmit = async () => {
    if (!name.trim() || !slug) return;
    setSubmitting(true);
    await onCreate({ name: name.trim(), slug, icon, color });
    setSubmitting(false);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--overlay-dark)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--rule-strong)",
          borderRadius: "0",
          padding: "24px",
          width: "400px",
          maxWidth: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
            marginBottom: "24px",
            fontFamily: "var(--font-sans)",
          }}
        >
          New Project
        </div>

        {/* Name input */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase" as const,
              color: "var(--text-secondary)",
              marginBottom: "8px",
              fontFamily: "var(--font-sans)",
            }}
          >
            Project Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Custom Reviews"
            autoFocus
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid var(--rule-faint)",
              borderRadius: "0",
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              background: "var(--bg-surface)",
              outline: "none",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = "var(--rule-strong)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = "var(--rule-faint)")
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
        </div>

        {/* Slug preview */}
        {slug && (
          <div
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              marginBottom: "16px",
            }}
          >
            Slug: {slug}
          </div>
        )}

        {/* Color picker */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase" as const,
              color: "var(--text-secondary)",
              marginBottom: "8px",
              fontFamily: "var(--font-sans)",
            }}
          >
            Color
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "0",
                  background: c,
                  border:
                    c === color
                      ? "2px solid var(--text-primary)"
                      : "1px solid var(--rule-faint)",
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        {name.trim() && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px",
              border: "1px solid var(--rule-faint)",
              borderRadius: "0",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: `${color}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 700,
                color: color,
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {name.trim()}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg-surface)",
              color: "var(--text-secondary)",
              border: "1px solid var(--rule-faint)",
              borderRadius: "0",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: 500,
              fontFamily: "var(--font-sans)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !slug || submitting}
            style={{
              background: "#1E293B",
              color: "var(--accent-inverse)",
              border: "none",
              borderRadius: "0",
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              opacity: !name.trim() || !slug || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? "Creating..." : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
