import { useRef, useState } from "react";
import type { ContextFile } from "@content-studio/shared";

interface ContextModalProps {
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
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ContextModal({ files, onUpload, onDelete, onClose }: ContextModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("docs");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file, selectedType);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "var(--overlay-dark)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--bg-surface)", border: "1px solid var(--rule-strong)", borderRadius: "0", padding: "24px", width: "480px", maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>
            Project Context
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "16px", color: "var(--text-secondary)", cursor: "pointer", padding: "4px" }}>
            ×
          </button>
        </div>

        <div style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-secondary)", marginBottom: "16px", fontFamily: "var(--font-sans)" }}>
          Upload docs, posts, and reference materials. Claude uses these as context when generating ideas and content.
        </div>

        {/* Upload area */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid var(--rule-faint)", borderRadius: "0", fontFamily: "var(--font-sans)", fontSize: "12px", background: "var(--bg-surface)", outline: "none" }}
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
              flex: 1, background: "var(--text-primary)", color: "#FFFFFF", border: "none", borderRadius: "0",
              padding: "8px 16px", fontSize: "12px", fontWeight: 600, fontFamily: "var(--font-sans)",
              cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.5 : 1,
            }}
          >
            {uploading ? "Uploading..." : "+ Upload file"}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept=".md,.txt,.pdf,.doc,.docx" onChange={handleFileSelect} style={{ display: "none" }} />

        {/* File list */}
        {files.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center", fontSize: "12px", fontWeight: 400, color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            No files uploaded yet.
          </div>
        ) : (
          files.map((file) => {
            const typeStyle = FILE_TYPE_STYLES[file.file_type] ?? FILE_TYPE_STYLES.other;
            return (
              <div key={file.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", border: "1px solid var(--rule-faint)", marginBottom: "-1px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: typeStyle.bg, color: typeStyle.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0 }}>
                  {typeStyle.label}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                  <div style={{ fontSize: "11px", fontWeight: 400, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{formatBytes(file.size_bytes)} · Added {formatDate(file.created_at)}</div>
                </div>
                <button onClick={() => onDelete(file.id)} style={{ background: "none", border: "none", fontSize: "14px", color: "var(--text-muted)", cursor: "pointer", padding: "4px", flexShrink: 0 }}>×</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
