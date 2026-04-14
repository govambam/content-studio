import { useEffect, useState } from "react";

interface InviteTeammateModalProps {
  onClose: () => void;
}

export function InviteTeammateModal({ onClose }: InviteTeammateModalProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSubmitting(false);
    setSuccessMessage(`Invitation sent to ${trimmed}.`);
    setEmail("");
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
          width: "440px",
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
            marginBottom: "8px",
            fontFamily: "var(--font-sans)",
          }}
        >
          Invite Teammate
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-sans)",
            marginBottom: "20px",
            lineHeight: 1.4,
          }}
        >
          Send an invitation link to a teammate so they can join this workspace.
        </div>

        <div style={{ marginBottom: "20px" }}>
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
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (successMessage) setSuccessMessage(null);
            }}
            placeholder="teammate@example.com"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
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

        {successMessage && (
          <div
            role="status"
            style={{
              marginBottom: "16px",
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
            {successMessage}
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
            Close
          </button>
          <button
            onClick={handleSubmit}
            disabled={!email.trim() || submitting}
            style={{
              background: "var(--text-primary)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "0",
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 700,
              fontFamily: "var(--font-sans)",
              opacity: !email.trim() || submitting ? 0.5 : 1,
              cursor: !email.trim() || submitting ? "default" : "pointer",
            }}
          >
            {submitting ? "Sending…" : "Send invite"}
          </button>
        </div>
      </div>
    </div>
  );
}
