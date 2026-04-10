import { useEffect, useState } from "react";

interface NewTicketModalProps {
  onClose: () => void;
  onCreate: (input: {
    title: string;
    description?: string;
  }) => Promise<{ error: string | null }>;
}

export function NewTicketModal({ onClose, onCreate }: NewTicketModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await onCreate({
        title: trimmed,
        description: description.trim() || undefined,
      });
      if (res.error) {
        setSubmitError(res.error);
        return;
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
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
          width: "480px",
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
          New Ticket
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
              marginBottom: "8px",
              fontFamily: "var(--font-sans)",
            }}
          >
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Write script"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid var(--rule-faint)",
              borderRadius: "0",
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--rule-strong)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--rule-faint)")}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
              marginBottom: "8px",
              fontFamily: "var(--font-sans)",
            }}
          >
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            rows={4}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid var(--rule-faint)",
              borderRadius: "0",
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              outline: "none",
              resize: "vertical",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--rule-strong)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--rule-faint)")}
          />
        </div>

        {submitError && (
          <div
            role="alert"
            style={{
              marginBottom: "12px",
              padding: "8px 12px",
              border: "1px solid var(--rule-strong)",
              background: "var(--bg-secondary)",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              lineHeight: 1.4,
            }}
          >
            {submitError}
          </div>
        )}

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
              fontWeight: 700,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            style={{
              background: "var(--text-primary)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "0",
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 700,
              fontFamily: "var(--font-sans)",
              opacity: !title.trim() || submitting ? 0.5 : 1,
              cursor: !title.trim() || submitting ? "default" : "pointer",
            }}
          >
            {submitting ? "Creating…" : "Create Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
