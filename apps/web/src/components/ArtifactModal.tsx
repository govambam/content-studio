import { useEffect, useState } from "react";

interface Artifact {
  id: string;
  type: string;
  title: string;
  content: string;
  status: string;
}

interface ArtifactModalProps {
  artifact: Artifact;
  cardTitle: string;
  onClose: () => void;
  onRegenerate: () => Promise<void>;
}

export function ArtifactModal({ artifact, cardTitle, onClose, onRegenerate }: ArtifactModalProps) {
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };

  const label = artifact.type === "demo-flow" ? "Demo Flow" : "Script";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--overlay-dark)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
        padding: "32px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--rule-strong)",
          borderRadius: "0",
          width: "100%",
          height: "100%",
          maxWidth: "1200px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "var(--font-sans)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            borderBottom: "1px solid var(--rule-faint)",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)", marginBottom: "4px" }}>
              {cardTitle}
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
              {label}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              style={{
                background: "var(--bg-surface)",
                color: "var(--text-secondary)",
                border: "1px solid var(--rule-faint)",
                borderRadius: "0",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: 500,
                fontFamily: "var(--font-sans)",
                cursor: regenerating ? "default" : "pointer",
                opacity: regenerating ? 0.5 : 1,
              }}
            >
              {regenerating ? "Regenerating..." : "Regenerate"}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "4px 8px",
                fontFamily: "var(--font-sans)",
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "32px 48px",
          }}
        >
          <div
            style={{
              maxWidth: "720px",
              margin: "0 auto",
              fontSize: "14px",
              fontWeight: 400,
              color: "var(--text-primary)",
              lineHeight: 1.8,
              fontFamily: "var(--font-sans)",
              whiteSpace: "pre-wrap",
            }}
          >
            {artifact.content || "No content yet."}
          </div>
        </div>
      </div>
    </div>
  );
}
