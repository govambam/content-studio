import { useState } from "react";
import type { ContentType } from "@content-studio/shared";

interface NewIdeaModalProps {
  onClose: () => void;
  onCreate: (data: { title: string; summary: string; content_type: ContentType }) => Promise<void>;
  onGenerate: () => Promise<void>;
}

export function NewIdeaModal({ onClose, onCreate, onGenerate }: NewIdeaModalProps) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [contentType, setContentType] = useState<ContentType>("short");
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onCreate({ title: title.trim(), summary: summary.trim(), content_type: contentType });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      await onGenerate();
      onClose();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "var(--overlay-dark)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--bg-surface)", border: "1px solid var(--rule-strong)", borderRadius: "0", padding: "24px", width: "480px", maxWidth: "90vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)", marginBottom: "24px", fontFamily: "var(--font-sans)" }}>
          New Idea
        </div>

        {/* Title input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Idea title..."
          autoFocus
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid var(--rule-faint)",
            borderRadius: "0",
            fontFamily: "var(--font-sans)",
            fontSize: "14px",
            fontWeight: 600,
            background: "var(--bg-surface)",
            outline: "none",
            marginBottom: "12px",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--rule-strong)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--rule-faint)")}
          onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) handleCreate(); }}
        />

        {/* Summary textarea */}
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Describe the idea (optional)..."
          style={{
            width: "100%",
            minHeight: "80px",
            padding: "10px 14px",
            border: "1px solid var(--rule-faint)",
            borderRadius: "0",
            fontFamily: "var(--font-sans)",
            fontSize: "13px",
            lineHeight: 1.5,
            background: "var(--bg-surface)",
            outline: "none",
            resize: "vertical" as const,
            marginBottom: "12px",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--rule-strong)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--rule-faint)")}
        />

        {/* Content type toggle */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {(["short", "long"] as ContentType[]).map((type) => (
            <button
              key={type}
              onClick={() => setContentType(type)}
              style={{
                padding: "6px 12px",
                border: `1px solid ${contentType === type ? "var(--rule-strong)" : "var(--rule-faint)"}`,
                borderRadius: "0",
                background: "transparent",
                fontSize: "12px",
                fontWeight: 500,
                color: contentType === type ? "var(--text-primary)" : "var(--text-secondary)",
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
              }}
            >
              {type === "short" ? "60-90s" : "5-10m"}
            </button>
          ))}
        </div>

        {/* Actions: Create */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0" }}>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || submitting}
            style={{
              background: "var(--text-primary)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "0",
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              cursor: !title.trim() || submitting ? "default" : "pointer",
              opacity: !title.trim() || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>

        {/* Divider with "or" */}
        <div style={{ display: "flex", alignItems: "center", margin: "16px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--rule-faint)" }} />
          <span style={{ padding: "0 12px", fontSize: "11px", fontWeight: 400, color: "var(--text-muted)", fontFamily: "var(--font-sans)", background: "var(--bg-surface)" }}>
            or
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--rule-faint)" }} />
        </div>

        {/* Generate with AI */}
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              background: "var(--bg-surface)",
              color: "var(--text-secondary)",
              border: "1px solid var(--rule-faint)",
              borderRadius: "0",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: 500,
              fontFamily: "var(--font-sans)",
              cursor: generating ? "default" : "pointer",
              opacity: generating ? 0.5 : 1,
            }}
          >
            {generating ? "Generating..." : "Generate ideas with AI"}
          </button>
        </div>
      </div>
    </div>
  );
}
