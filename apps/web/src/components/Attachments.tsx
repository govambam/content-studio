import { useState, useRef } from "react";
import type { ContextFile } from "@content-studio/shared";

interface AttachmentsProps {
  files: ContextFile[];
  onUpload: (file: File, fileType: string) => Promise<unknown>;
  onDelete: (fileId: string) => Promise<boolean>;
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
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function Attachments({ files, onUpload, onDelete }: AttachmentsProps) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await onUpload(file, "docs");
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{ marginTop: "16px", fontFamily: "var(--font-sans)" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--text-primary)",
          fontFamily: "var(--font-sans)",
          marginBottom: "8px",
          display: "block",
        }}
      >
        {expanded ? "▾" : "▸"} Attachments ({files.length} files)
      </button>

      {expanded && (
        <div>
          {files.map((file) => {
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
                  marginBottom: "-1px",
                }}
              >
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 400, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {formatBytes(file.size_bytes)} · Added {formatDate(file.created_at)}
                  </div>
                </div>
                <button
                  onClick={() => onDelete(file.id)}
                  style={{ background: "none", border: "none", fontSize: "14px", color: "var(--text-muted)", cursor: "pointer", padding: "4px", flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            );
          })}

          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px dashed var(--rule-faint)",
              borderRadius: "0",
              background: "transparent",
              fontSize: "12px",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
              cursor: uploading ? "default" : "pointer",
              marginTop: "-1px",
            }}
          >
            {uploading ? "Uploading..." : "+ Upload file"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>
      )}
    </div>
  );
}
