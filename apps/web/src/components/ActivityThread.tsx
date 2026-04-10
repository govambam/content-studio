import { useState } from "react";
import type { ChatMessage } from "@content-studio/shared";

interface ActivityThreadProps {
  messages: ChatMessage[];
  projectName: string;
  onSendMessage: (content: string) => Promise<void>;
  sending: boolean;
  quickActions: Array<{ label: string; prompt: string }>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ThreadEntry({ msg }: { msg: ChatMessage }) {
  if (msg.role === "system") {
    return (
      <div
        style={{
          padding: "8px 0",
          fontSize: "11px",
          fontWeight: 400,
          color: "var(--text-muted)",
          fontFamily: "var(--font-sans)",
          textAlign: "center",
        }}
      >
        {msg.content} · {timeAgo(msg.created_at)}
      </div>
    );
  }

  const isUser = msg.role === "user";
  const name = isUser ? "You" : "Claude";
  const avatarBg = isUser ? "var(--accent-blue)" : "var(--text-primary)";
  const avatarLabel = isUser ? "Y" : "C";

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        padding: "12px 0",
        borderBottom: "1px solid var(--rule-faint)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          background: avatarBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "11px",
          fontWeight: 700,
          color: "#FFFFFF",
          flexShrink: 0,
        }}
      >
        {avatarLabel}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
            {name}
          </span>
          <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-muted)" }}>
            {timeAgo(msg.created_at)}
          </span>
        </div>

        {/* Body */}
        <div
          style={{
            fontSize: "13px",
            fontWeight: 400,
            color: "var(--text-primary)",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {msg.content}
        </div>

        {/* Change notice */}
        {msg.change_summary && (
          <div
            style={{
              marginTop: "8px",
              background: "var(--bg-secondary)",
              borderLeft: "2px solid var(--rule-strong)",
              padding: "8px 12px",
              fontSize: "12px",
              fontWeight: 400,
              color: "var(--text-secondary)",
            }}
          >
            {msg.change_summary}
          </div>
        )}
      </div>
    </div>
  );
}

export function ActivityThread({
  messages,
  projectName,
  onSendMessage,
  sending,
  quickActions,
}: ActivityThreadProps) {
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput("");
    await onSendMessage(msg);
  };

  return (
    <div
      style={{
        marginTop: "24px",
        borderTop: "1px solid var(--rule-faint)",
        paddingTop: "24px",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Section header */}
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          color: "var(--text-secondary)",
          marginBottom: "16px",
        }}
      >
        Activity
      </div>

      {/* Thread entries */}
      {messages.length === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            fontSize: "12px",
            fontWeight: 400,
            color: "var(--text-muted)",
          }}
        >
          Start a conversation about this idea. Claude has full context of the
          &ldquo;{projectName}&rdquo; project.
        </div>
      ) : (
        messages.map((msg) => <ThreadEntry key={msg.id} msg={msg} />)
      )}

      {/* Thinking indicator */}
      {sending && (
        <div
          style={{
            padding: "12px 0",
            fontSize: "12px",
            color: "var(--text-muted)",
            fontStyle: "italic",
          }}
        >
          Claude is thinking...
        </div>
      )}

      {/* Quick action buttons */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "12px",
          marginBottom: "8px",
        }}
      >
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => onSendMessage(action.prompt)}
            disabled={sending}
            style={{
              padding: "6px 12px",
              border: "1px solid var(--rule-faint)",
              borderRadius: "0",
              background: "transparent",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
              cursor: sending ? "default" : "pointer",
              opacity: sending ? 0.5 : 1,
            }}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Leave a comment..."
          disabled={sending}
          style={{
            flex: 1,
            padding: "10px 14px",
            border: "1px solid var(--rule-faint)",
            borderRadius: "0",
            fontFamily: "var(--font-sans)",
            fontSize: "13px",
            background: "var(--bg-surface)",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--rule-strong)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--rule-faint)")}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            background: "var(--text-primary)",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "0",
            padding: "10px 16px",
            fontSize: "12px",
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
            cursor: !input.trim() || sending ? "default" : "pointer",
            opacity: !input.trim() || sending ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
