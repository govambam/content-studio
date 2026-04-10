import { useEffect, useRef, useState } from "react";
import { Markdown } from "./Markdown";
import { logger } from "../lib/logger";

interface MarkdownEditorProps {
  initialValue: string;
  placeholder?: string;
  onSave: (value: string) => Promise<void> | void;
  onCancel?: () => void;
  // Autosave delay while the user is typing. Flushed on blur regardless.
  autosaveDelayMs?: number;
}

// Click-to-edit markdown field with a Preview toggle. Autosaves on blur
// and after a debounce while typing. Esc cancels.
export function MarkdownEditor({
  initialValue,
  placeholder,
  onSave,
  onCancel,
  autosaveDelayMs = 800,
}: MarkdownEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedValueRef = useRef(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!preview) textareaRef.current?.focus();
  }, [preview]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // `savedValueRef` is only updated AFTER the save resolves. A save that
  // rejects must not leave the ref ahead of what the server actually has,
  // otherwise subsequent calls would skip retrying.
  const flush = async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const pending = value;
    if (pending === savedValueRef.current) return;
    try {
      await onSave(pending);
      savedValueRef.current = pending;
    } catch (err) {
      logger.error("markdown_autosave_failed", {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const scheduleSave = (next: string) => {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (next === savedValueRef.current) return;
      try {
        await onSave(next);
        savedValueRef.current = next;
      } catch (err) {
        console.error("markdown autosave failed", err);
      }
    }, autosaveDelayMs);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <button
          type="button"
          onClick={() => setPreview(false)}
          style={{
            padding: "4px 8px",
            background: !preview ? "var(--bg-secondary)" : "transparent",
            border: "1px solid var(--rule-faint)",
            borderRadius: "0",
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--text-primary)",
            fontFamily: "var(--font-sans)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            cursor: "pointer",
          }}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => {
            // Flush autosave before showing the preview so what you see
            // is what you saved.
            void flush();
            setPreview(true);
          }}
          style={{
            padding: "4px 8px",
            background: preview ? "var(--bg-secondary)" : "transparent",
            border: "1px solid var(--rule-faint)",
            borderRadius: "0",
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--text-primary)",
            fontFamily: "var(--font-sans)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            cursor: "pointer",
          }}
        >
          Preview
        </button>
      </div>
      {preview ? (
        <div
          style={{
            minHeight: "120px",
            padding: "12px",
            border: "1px solid var(--rule-faint)",
            background: "var(--bg-surface)",
          }}
        >
          {value.trim() ? (
            <Markdown body={value} />
          ) : (
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Nothing to preview.
            </div>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => scheduleSave(e.target.value)}
          onBlur={() => void flush()}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              setValue(savedValueRef.current);
              onCancel?.();
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              void flush();
            }
          }}
          placeholder={placeholder}
          rows={8}
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid var(--rule-strong)",
            borderRadius: "0",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--text-primary)",
            background: "var(--bg-surface)",
            outline: "none",
            resize: "vertical",
            lineHeight: 1.5,
          }}
        />
      )}
    </div>
  );
}
