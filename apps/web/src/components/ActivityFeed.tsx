import { useState } from "react";
import type {
  ActivityEvent,
  ActivityFeedItem,
  Comment,
  ContentStatus,
} from "@content-studio/shared";
import { STATUS_LABELS } from "@content-studio/shared";
import { Markdown } from "./Markdown";

interface ActivityFeedProps {
  items: ActivityFeedItem[];
  onAddComment: (body: string) => Promise<{ error: string | null }>;
  onEditComment: (
    id: string,
    body: string
  ) => Promise<{ error: string | null }>;
  onDeleteComment: (id: string) => Promise<{ error: string | null }>;
}

export function ActivityFeed({
  items,
  onAddComment,
  onEditComment,
  onDeleteComment,
}: ActivityFeedProps) {
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await onAddComment(trimmed);
      if (!res.error) {
        setDraft("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {items.length === 0 && (
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-sans)",
            }}
          >
            No activity yet.
          </div>
        )}
        {items.map((item) =>
          item.kind === "event" ? (
            <EventRow key={`e-${item.id}`} event={item} />
          ) : (
            <CommentRow
              key={`c-${item.id}`}
              comment={item}
              onEdit={onEditComment}
              onDelete={onDeleteComment}
            />
          )
        )}
      </div>

      <div
        style={{
          marginTop: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment… (markdown supported)"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid var(--rule-faint)",
            borderRadius: "0",
            fontFamily: "var(--font-sans)",
            fontSize: "13px",
            color: "var(--text-primary)",
            background: "var(--bg-surface)",
            outline: "none",
            resize: "vertical",
            lineHeight: 1.5,
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--rule-strong)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--rule-faint)")}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleSubmit}
            disabled={!draft.trim() || submitting}
            style={{
              background: "var(--text-primary)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "0",
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 700,
              fontFamily: "var(--font-sans)",
              cursor:
                !draft.trim() || submitting ? "default" : "pointer",
              opacity: !draft.trim() || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? "Posting…" : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface EventRowProps {
  event: ActivityEvent & { kind: "event" };
}

function EventRow({ event }: EventRowProps) {
  const message = formatEvent(event);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "8px",
        padding: "6px 0",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: "var(--text-muted)",
          flexShrink: 0,
          transform: "translateY(1px)",
        }}
      />
      <div
        style={{
          fontSize: "12px",
          fontWeight: 400,
          color: "var(--text-muted)",
          flex: 1,
        }}
      >
        {message}
      </div>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 400,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {formatDate(event.created_at)}
      </div>
    </div>
  );
}

interface CommentRowProps {
  comment: Comment & { kind: "comment" };
  onEdit: (id: string, body: string) => Promise<{ error: string | null }>;
  onDelete: (id: string) => Promise<{ error: string | null }>;
}

function CommentRow({ comment, onEdit, onDelete }: CommentRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [hovered, setHovered] = useState(false);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === comment.body) {
      setEditing(false);
      return;
    }
    await onEdit(comment.id, trimmed);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this comment?")) return;
    const res = await onDelete(comment.id);
    if (res.error) {
      window.alert(`Could not delete comment: ${res.error}`);
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "12px",
        background: "var(--bg-surface)",
        border: "1px solid var(--rule-faint)",
        borderRadius: "0",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--text-muted)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Comment
        </div>
        <div
          style={{
            fontSize: "10px",
            fontWeight: 400,
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {formatDate(comment.created_at)}
          {comment.updated_at !== comment.created_at && " (edited)"}
        </div>
        <div style={{ flex: 1 }} />
        {hovered && !editing && (
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              onClick={() => {
                setDraft(comment.body);
                setEditing(true);
              }}
              style={{
                background: "transparent",
                border: "1px solid var(--rule-faint)",
                borderRadius: "0",
                padding: "2px 8px",
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-sans)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                cursor: "pointer",
              }}
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              style={{
                background: "transparent",
                border: "1px solid var(--rule-faint)",
                borderRadius: "0",
                padding: "2px 8px",
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-sans)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                void handleSave();
              }
            }}
            rows={3}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid var(--rule-strong)",
              borderRadius: "0",
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              color: "var(--text-primary)",
              background: "var(--bg-surface)",
              outline: "none",
              resize: "vertical",
              lineHeight: 1.5,
            }}
          />
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              onClick={() => setEditing(false)}
              style={{
                background: "var(--bg-surface)",
                color: "var(--text-secondary)",
                border: "1px solid var(--rule-faint)",
                borderRadius: "0",
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: 700,
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!draft.trim()}
              style={{
                background: "var(--text-primary)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "0",
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: 700,
                fontFamily: "var(--font-sans)",
                cursor: !draft.trim() ? "default" : "pointer",
                opacity: !draft.trim() ? 0.5 : 1,
              }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <Markdown body={comment.body} />
      )}
    </div>
  );
}

function formatEvent(event: ActivityEvent): string {
  switch (event.event_type) {
    case "ticket_created":
      return "Ticket created";
    case "title_changed": {
      const to = (event.meta?.to as string | undefined) ?? "";
      return `Title changed to "${to}"`;
    }
    case "description_changed":
      return "Description edited";
    case "status_changed": {
      const from = event.meta?.from as ContentStatus | undefined;
      const to = event.meta?.to as ContentStatus | undefined;
      const fromLabel = from ? STATUS_LABELS[from] : "?";
      const toLabel = to ? STATUS_LABELS[to] : "?";
      return `Status changed from ${fromLabel} to ${toLabel}`;
    }
    case "comment_added":
      return "Comment added";
    case "asset_uploaded": {
      const filename = (event.meta?.filename as string | undefined) ?? "file";
      return `Asset "${filename}" uploaded`;
    }
    case "asset_deleted": {
      const filename = (event.meta?.filename as string | undefined) ?? "file";
      return `Asset "${filename}" deleted`;
    }
    default:
      return event.event_type;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
