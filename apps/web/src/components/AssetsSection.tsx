import { useEffect, useRef, useState } from "react";
import type { Asset } from "@content-studio/shared";
import { Markdown } from "./Markdown";

interface AssetsSectionProps {
  assets: Asset[];
  onUpload: (file: File) => Promise<{ error: string | null }>;
  onDelete: (id: string) => Promise<{ error: string | null }>;
  getDownloadUrl: (
    id: string
  ) => Promise<{ url: string | null; error: string | null }>;
}

export function AssetsSection({
  assets,
  onUpload,
  onDelete,
  getDownloadUrl,
}: AssetsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewing, setPreviewing] = useState<Asset | null>(null);
  const [previewContent, setPreviewContent] = useState<
    | { kind: "markdown"; body: string }
    | { kind: "image"; url: string }
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | null
  >(null);
  // Tracks the asset id of the most recently requested preview so we can
  // discard slower responses when the user clicks a second asset.
  const previewRequestRef = useRef<string | null>(null);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        setDragActive(true);
      }
    };
    const handleDragLeave = (e: DragEvent) => {
      if ((e.target as Node)?.nodeName === "HTML") {
        setDragActive(false);
      }
    };
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
    };
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const res = await onUpload(file);
        if (res.error) {
          window.alert(`Upload failed: ${res.error}`);
          break;
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAssetClick = async (asset: Asset) => {
    previewRequestRef.current = asset.id;
    setPreviewing(asset);
    setPreviewContent({ kind: "loading" });
    const urlRes = await getDownloadUrl(asset.id);
    // If the user clicked a different asset while this request was in
    // flight, drop the response — a newer request has taken over.
    if (previewRequestRef.current !== asset.id) return;
    if (urlRes.error || !urlRes.url) {
      setPreviewContent({
        kind: "error",
        message: urlRes.error ?? "could not fetch url",
      });
      return;
    }
    // Normalize mime_type — the DB column defaults to empty string but
    // older rows or external writes could still leave it nullish.
    const mime = asset.mime_type ?? "";
    if (mime === "text/markdown") {
      try {
        const res = await fetch(urlRes.url);
        const text = await res.text();
        if (previewRequestRef.current !== asset.id) return;
        setPreviewContent({ kind: "markdown", body: text });
      } catch (err) {
        if (previewRequestRef.current !== asset.id) return;
        setPreviewContent({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    } else if (mime.startsWith("image/")) {
      setPreviewContent({ kind: "image", url: urlRes.url });
    } else {
      // Not previewable — just trigger download.
      previewRequestRef.current = null;
      setPreviewing(null);
      setPreviewContent(null);
      window.open(urlRes.url, "_blank");
    }
  };

  const handleDownload = async (asset: Asset) => {
    const urlRes = await getDownloadUrl(asset.id);
    if (urlRes.error || !urlRes.url) {
      window.alert(`Download failed: ${urlRes.error ?? "unknown error"}`);
      return;
    }
    const a = document.createElement("a");
    a.href = urlRes.url;
    a.download = asset.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = async (asset: Asset) => {
    if (!window.confirm(`Delete "${asset.filename}"?`)) return;
    const res = await onDelete(asset.id);
    if (res.error) {
      window.alert(`Delete failed: ${res.error}`);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragActive(false);
      }}
      onDrop={async (e) => {
        e.preventDefault();
        setDragActive(false);
        await handleFiles(e.dataTransfer.files);
      }}
      style={{
        position: "relative",
        padding: dragActive ? "12px" : "0",
        border: dragActive ? "2px dashed var(--rule-strong)" : "none",
        background: dragActive ? "var(--bg-secondary)" : "transparent",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--text-muted)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {assets.length} {assets.length === 1 ? "file" : "files"}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            void handleFiles(e.target.files);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--rule-faint)",
            borderRadius: "0",
            padding: "6px 12px",
            fontSize: "11px",
            fontWeight: 700,
            fontFamily: "var(--font-sans)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            cursor: uploading ? "default" : "pointer",
            opacity: uploading ? 0.5 : 1,
          }}
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>

      {assets.length === 0 && (
        <div
          style={{
            padding: "16px 12px",
            fontSize: "12px",
            color: "var(--text-muted)",
            fontFamily: "var(--font-sans)",
            border: "1px dashed var(--rule-faint)",
            textAlign: "center",
          }}
        >
          No assets attached. Upload files or drag them onto this area.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {assets.map((asset) => (
          <div
            key={asset.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "8px 12px",
              background: "var(--bg-surface)",
              border: "1px solid var(--rule-faint)",
              fontFamily: "var(--font-sans)",
            }}
          >
            <div
              onClick={() => handleAssetClick(asset)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                cursor: "pointer",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {assetIcon(asset.mime_type)} {asset.filename}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 400,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {formatBytes(asset.size_bytes)} ·{" "}
                {asset.mime_type || "unknown"}
              </div>
            </div>
            <button
              onClick={() => handleDownload(asset)}
              style={rowButtonStyle}
            >
              Download
            </button>
            <button
              onClick={() => handleDelete(asset)}
              style={rowButtonStyle}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {previewing && (
        <AssetPreviewModal
          asset={previewing}
          content={previewContent}
          onClose={() => {
            previewRequestRef.current = null;
            setPreviewing(null);
            setPreviewContent(null);
          }}
        />
      )}
    </div>
  );
}

const rowButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--rule-faint)",
  borderRadius: "0",
  padding: "4px 8px",
  fontSize: "10px",
  fontWeight: 700,
  color: "var(--text-secondary)",
  fontFamily: "var(--font-sans)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  cursor: "pointer",
};

interface AssetPreviewModalProps {
  asset: Asset;
  content:
    | { kind: "markdown"; body: string }
    | { kind: "image"; url: string }
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | null;
  onClose: () => void;
}

function AssetPreviewModal({ asset, content, onClose }: AssetPreviewModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--overlay-dark)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--rule-strong)",
          borderRadius: "0",
          width: "800px",
          maxWidth: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--font-sans)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid var(--rule-faint)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {asset.filename}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid var(--rule-faint)",
              borderRadius: "0",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
        <div style={{ padding: "16px", overflow: "auto", flex: 1 }}>
          {content?.kind === "loading" && (
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Loading…
            </div>
          )}
          {content?.kind === "error" && (
            <div style={{ fontSize: "12px", color: "var(--text-primary)" }}>
              {content.message}
            </div>
          )}
          {content?.kind === "markdown" && <Markdown body={content.body} />}
          {content?.kind === "image" && (
            <img
              src={content.url}
              alt={asset.filename}
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                display: "block",
                margin: "0 auto",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function assetIcon(mime: string | null | undefined): string {
  const m = mime ?? "";
  if (m.startsWith("image/")) return "[img]";
  if (m === "text/markdown") return "[md]";
  if (m === "application/pdf") return "[pdf]";
  if (m.startsWith("video/")) return "[vid]";
  if (m.startsWith("audio/")) return "[aud]";
  return "[file]";
}
