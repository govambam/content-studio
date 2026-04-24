import { useEffect, useMemo, useState } from "react";
import type { ContentStatus } from "@content-studio/shared";
import { CONTENT_STATUSES, STATUS_LABELS } from "@content-studio/shared";
import { useSlackIntegration } from "../hooks/useSlackIntegration";

interface SlackIntegrationModalProps {
  onClose: () => void;
}

// Operators can only toggle these two from the UI. Backlog and
// in_progress would be noisy; the product decision is to notify on
// review-ready and done transitions only.
const TOGGLEABLE_STATUSES: ContentStatus[] = ["in_review", "done"];

export function SlackIntegrationModal({ onClose }: SlackIntegrationModalProps) {
  const { summary, loading, save, remove } = useSlackIntegration();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channelName, setChannelName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [enabledStatuses, setEnabledStatuses] = useState<Set<ContentStatus>>(
    new Set(["in_review", "done"])
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Only seed the form from the fetched summary on first arrival.
  // Re-firing this effect after a save would overwrite any edits the
  // user has already made, so the `hydrated` flag keeps the form
  // stable once it's populated.
  useEffect(() => {
    if (!summary || hydrated) return;
    setChannelName(summary.channel_name);
    setEnabled(summary.enabled);
    setEnabledStatuses(new Set(summary.enabled_statuses));
    setHydrated(true);
  }, [summary, hydrated]);

  const toggleStatus = (status: ContentStatus) => {
    setEnabledStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const configured = summary?.configured ?? false;
  const canSave = useMemo(() => {
    if (submitting) return false;
    // The GET response redacts the stored webhook and the backend
    // requires webhook_url on every PUT, so the URL must be entered
    // on every save — even when updating only the other fields.
    if (!webhookUrl.trim()) return false;
    if (enabledStatuses.size === 0) return false;
    return true;
  }, [webhookUrl, enabledStatuses.size, submitting]);

  const handleSave = async () => {
    if (!canSave) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const res = await save({
      webhook_url: webhookUrl.trim(),
      channel_name: channelName.trim(),
      enabled,
      enabled_statuses: Array.from(enabledStatuses),
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSuccess("Saved. Slack notifications are live.");
    setWebhookUrl("");
  };

  const handleRemove = async () => {
    if (!configured) return;
    if (!window.confirm("Remove Slack integration? No more notifications will be posted.")) {
      return;
    }
    setSubmitting(true);
    const res = await remove();
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSuccess("Integration removed.");
    setWebhookUrl("");
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
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--rule-strong)",
          borderRadius: "0",
          padding: "24px",
          width: "520px",
          maxWidth: "92vw",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
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
          Slack Notifications
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-sans)",
            marginBottom: "20px",
            lineHeight: 1.45,
          }}
        >
          Post a rich message to Slack whenever a ticket moves to one of the
          selected statuses. Connect an{" "}
          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--text-primary)", textDecoration: "underline" }}
          >
            incoming webhook
          </a>{" "}
          from the Slack workspace you want to receive posts in.
        </div>

        <FormLabel>Webhook URL</FormLabel>
        <input
          type="url"
          value={webhookUrl}
          onChange={(e) => {
            setWebhookUrl(e.target.value);
            setError(null);
            setSuccess(null);
          }}
          placeholder="https://hooks.slack.com/services/…"
          autoFocus={!configured}
          style={inputStyle}
        />
        <FieldHint>
          Write-only. The URL is stored encrypted on the server and never
          displayed back, so re-enter it every time you save — even when
          updating only the settings below.
        </FieldHint>

        <FormLabel style={{ marginTop: "16px" }}>Channel (display only)</FormLabel>
        <input
          type="text"
          value={channelName}
          onChange={(e) => setChannelName(e.target.value)}
          placeholder="#content"
          style={inputStyle}
        />

        <FormLabel style={{ marginTop: "16px" }}>Notify on</FormLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {CONTENT_STATUSES.filter((s) => TOGGLEABLE_STATUSES.includes(s)).map(
            (status) => (
              <label
                key={status}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontFamily: "var(--font-sans)",
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={enabledStatuses.has(status)}
                  onChange={() => toggleStatus(status)}
                />
                Ticket moves to <strong>{STATUS_LABELS[status]}</strong>
              </label>
            )
          )}
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "16px",
            fontFamily: "var(--font-sans)",
            fontSize: "13px",
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Integration enabled
        </label>

        {error && (
          <div role="alert" style={alertStyle("error")}>
            {error}
          </div>
        )}
        {success && (
          <div role="status" style={alertStyle("success")}>
            {success}
          </div>
        )}

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          {configured && (
            <button
              onClick={handleRemove}
              disabled={submitting}
              style={destructiveButtonStyle(submitting)}
            >
              Remove
            </button>
          )}
          <button onClick={onClose} style={secondaryButtonStyle}>
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={primaryButtonStyle(!canSave)}
          >
            {submitting ? "Saving…" : loading ? "Loading…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "block",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: "var(--text-secondary)",
        marginBottom: "8px",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: "6px",
        fontSize: "11px",
        color: "var(--text-muted)",
        fontFamily: "var(--font-sans)",
        lineHeight: 1.45,
      }}
    >
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid var(--rule-faint)",
  borderRadius: "0",
  fontFamily: "var(--font-mono)",
  fontSize: "12px",
  background: "var(--bg-surface)",
  color: "var(--text-primary)",
  outline: "none",
};

function alertStyle(kind: "error" | "success"): React.CSSProperties {
  const base: React.CSSProperties = {
    marginTop: "16px",
    padding: "10px 12px",
    fontSize: "12px",
    fontWeight: 500,
    fontFamily: "var(--font-sans)",
    lineHeight: 1.45,
  };
  if (kind === "error") {
    return {
      ...base,
      border: "1px solid #B91C1C",
      background: "#FEF2F2",
      color: "#7F1D1D",
    };
  }
  return {
    ...base,
    border: "1px solid var(--rule-strong)",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
  };
}

const secondaryButtonStyle: React.CSSProperties = {
  background: "var(--bg-surface)",
  color: "var(--text-secondary)",
  border: "1px solid var(--rule-faint)",
  borderRadius: "0",
  padding: "8px 14px",
  fontSize: "12px",
  fontWeight: 700,
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
};

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    background: "var(--text-primary)",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "0",
    padding: "8px 16px",
    fontSize: "12px",
    fontWeight: 700,
    fontFamily: "var(--font-sans)",
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "default" : "pointer",
  };
}

function destructiveButtonStyle(submitting: boolean): React.CSSProperties {
  return {
    background: "transparent",
    color: "#7F1D1D",
    border: "1px solid #B91C1C",
    borderRadius: "0",
    padding: "8px 14px",
    fontSize: "12px",
    fontWeight: 700,
    fontFamily: "var(--font-sans)",
    opacity: submitting ? 0.5 : 1,
    cursor: submitting ? "default" : "pointer",
  };
}
