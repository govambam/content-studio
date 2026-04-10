import { useState } from "react";

const PRESET_COLORS = [
  "#8B5CF6", // violet
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#14B8A6", // teal
  "#EF4444", // red
  "#EC4899", // pink
  "#6366F1", // indigo
];

interface NewLabelFormProps {
  onSubmit: (
    name: string,
    color: string
  ) => Promise<{ error: string | null }>;
  onCancel: () => void;
}

export function NewLabelForm({ onSubmit, onCancel }: NewLabelFormProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await onSubmit(trimmed, color);
      if (res.error) {
        setSubmitError(res.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "8px",
        border: "1px solid var(--rule-faint)",
        background: "var(--bg-surface)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <input
        type="text"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            // Stop the event so host modals with a window-level Escape
            // listener (e.g. NewProjectModal) don't also close.
            e.stopPropagation();
            onCancel();
          }
        }}
        placeholder="Label name"
        disabled={submitting}
        style={{
          width: "100%",
          padding: "6px 8px",
          border: "1px solid var(--rule-faint)",
          borderRadius: "0",
          fontSize: "12px",
          fontFamily: "var(--font-sans)",
          color: "var(--text-primary)",
          background: "var(--bg-surface)",
          outline: "none",
        }}
      />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
        }}
      >
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              border:
                color === c
                  ? "2px solid var(--text-primary)"
                  : "1px solid var(--rule-faint)",
              background: c,
              cursor: "pointer",
              padding: 0,
            }}
          />
        ))}
      </div>
      {submitError && (
        <div
          role="alert"
          style={{
            fontSize: "11px",
            fontWeight: 500,
            color: "var(--text-primary)",
            background: "var(--bg-secondary)",
            padding: "6px 8px",
            border: "1px solid var(--rule-strong)",
            fontFamily: "var(--font-sans)",
            lineHeight: 1.4,
          }}
        >
          {submitError}
        </div>
      )}
      <div style={{ display: "flex", gap: "6px" }}>
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          style={{
            flex: 1,
            padding: "6px 8px",
            background: "var(--text-primary)",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "0",
            fontSize: "11px",
            fontWeight: 700,
            fontFamily: "var(--font-sans)",
            cursor: !name.trim() || submitting ? "default" : "pointer",
            opacity: !name.trim() || submitting ? 0.5 : 1,
          }}
        >
          {submitting ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "6px 8px",
            background: "var(--bg-surface)",
            color: "var(--text-secondary)",
            border: "1px solid var(--rule-faint)",
            borderRadius: "0",
            fontSize: "11px",
            fontWeight: 700,
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
