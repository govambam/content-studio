import { useRef, useState } from "react";
import type { ContextFile } from "@content-studio/shared";

interface ContextPanelProps {
  files: ContextFile[];
  onUpload: (file: File, fileType: string) => Promise<unknown>;
  onDelete: (fileId: string) => Promise<boolean>;
  onClose: () => void;
}

const FILE_TYPE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  docs: { bg: "#DBEAFE", color: "#1E40AF", label: "DOC" },
  post: { bg: "#DCFCE7", color: "#166534", label: "POST" },
  ideas: { bg: "#FEF3C7", color: "#92400E", label: "IDEA" },
  other: { bg: "var(--bg-secondary)", color: "var(--text-secondary)", label: "FILE" },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ContextPanel({ files, onUpload, onDelete, onClose }: ContextPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("docs");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    await onUpload(file, selectedType);
    setUploading(false);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 19,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "var(--context-panel-width)",
          background: "var(--bg-surface)",
          borderLeft: "1px solid var(--rule-faint)",
          padding: "20px 24px",
          overflowY: "auto",
          zIndex: 20,
          fontFamily: "var(--font-sans)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase" as const,
              color: "var(--text-secondary)",
            }}
          >
            Context Files
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "16px",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            ×
          </button>
        </div>

        {/* Upload area */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid var(--rule-faint)",
                borderRadius: "0",
                fontFamily: "var(--font-sans)",
                fontSize: "12px",
                background: "var(--bg-surface)",
                outline: "none",
              }}
            >
              <option value="docs">Document</option>
              <option value="post">Post</option>
              <option value="ideas">Ideas</option>
              <option value="other">Other</option>
            </select>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                flex: 1,
                background: "var(--text-primary)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "0",
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                cursor: uploading ? "default" : "pointer",
                opacity: uploading ? 0.5 : 1,
              }}
            >
              {uploading ? "Uploading..." : "+ Upload file"}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>

        {/* File list */}
        {files.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              fontSize: "12px",
              fontWeight: 400,
              color: "var(--text-muted)",
            }}
          >
            No files uploaded. Add docs, posts, or ideas for Claude to reference.
          </div>
        ) : (
          files.map((file) => {
            const typeStyle = FILE_TYPE_STYLES[file.file_type] ?? FILE_TYPE_STYLES.other;
            return (
              <div
                key={file.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  border: "1px solid var(--rule-faint)",
                  borderRadius: "0",
                  marginBottom: "6px",
                }}
              >
                {/* File type icon */}
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    background: typeStyle.bg,
                    color: typeStyle.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    flexShrink: 0,
                  }}
                >
                  {typeStyle.label}
                </div>

                {/* File info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {file.name}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 400,
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {formatBytes(file.size_bytes)} · Added {formatDate(file.created_at)}
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => onDelete(file.id)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "14px",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: "4px",
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
