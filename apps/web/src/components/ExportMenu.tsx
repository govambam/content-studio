import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";

type Format = "pdf" | "png";

interface ExportMenuProps {
  viewName: string;
  getTarget: () => HTMLElement | null;
}

const API_BASE = import.meta.env.VITE_API_URL || "/api";

function slugForFilename(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "view"
  );
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function captureTargetAsPngBase64(
  target: HTMLElement
): Promise<string> {
  const canvas = await html2canvas(target, {
    backgroundColor: "#FFFFFF",
    useCORS: true,
    scale: window.devicePixelRatio > 1 ? 2 : 1,
  });
  const dataUrl = canvas.toDataURL("image/png");
  const commaIdx = dataUrl.indexOf(",");
  return commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Release the object URL after the browser has kicked off the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ExportMenu({ viewName, getTarget }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Format | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (e.target instanceof Node && rootRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleExport = async (format: Format) => {
    setError(null);
    const target = getTarget();
    if (!target) {
      setError("Nothing to export yet.");
      return;
    }
    setBusy(format);
    setOpen(false);
    try {
      const imageData = await captureTargetAsPngBase64(target);
      const res = await fetch(`${API_BASE}/views/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData, viewName, format }),
      });
      if (!res.ok) {
        const contentType = res.headers.get("content-type") ?? "";
        const message = contentType.includes("application/json")
          ? ((await res.json()) as { error?: string }).error ?? res.statusText
          : res.statusText;
        throw new Error(message || `export failed (${res.status})`);
      }
      const blob = await res.blob();
      const filename = `content-studio-${slugForFilename(viewName)}-${todayIso()}.${
        format === "pdf" ? "pdf" : "png"
      }`;
      triggerDownload(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "export failed");
    } finally {
      setBusy(null);
    }
  };

  const buttonLabel = busy
    ? busy === "pdf"
      ? "Exporting PDF…"
      : "Exporting PNG…"
    : "Export";

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy !== null}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          background: "var(--bg-surface)",
          color: "var(--text-primary)",
          border: "1px solid var(--rule-strong)",
          borderRadius: "0",
          padding: "8px 16px",
          fontSize: "12px",
          fontWeight: 700,
          fontFamily: "var(--font-sans)",
          cursor: busy !== null ? "wait" : "pointer",
        }}
      >
        {buttonLabel}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: "160px",
            background: "var(--bg-surface)",
            border: "1px solid var(--rule-strong)",
            borderRadius: "0",
            padding: "4px",
            display: "flex",
            flexDirection: "column",
            zIndex: 10,
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport("pdf")}
            style={menuItemStyle}
          >
            Export as PDF
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport("png")}
            style={menuItemStyle}
          >
            Export as PNG
          </button>
        </div>
      )}
      {error && (
        <div
          role="alert"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: "200px",
            background: "var(--bg-surface)",
            border: "1px solid var(--rule-strong)",
            borderRadius: "0",
            padding: "8px 12px",
            fontSize: "11px",
            fontFamily: "var(--font-sans)",
            color: "var(--text-primary)",
            zIndex: 10,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--text-primary)",
  border: "none",
  borderRadius: "0",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: 700,
  fontFamily: "var(--font-sans)",
  textAlign: "left",
  cursor: "pointer",
};
