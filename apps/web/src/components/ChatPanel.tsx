import { useState } from "react";
import type { ChatMessage } from "@content-studio/shared";

interface ChatPanelProps {
  messages: ChatMessage[];
  projectName: string;
  onSendMessage: (content: string) => Promise<void>;
  sending: boolean;
  activeTab: string;
  scopeLabel?: string;
  quickActions?: Array<{ label: string; prompt: string }>;
}

export function ChatPanel({
  messages,
  projectName,
  onSendMessage,
  sending,
  scopeLabel = "scoped to this card",
  quickActions = [],
}: ChatPanelProps) {
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
        width: "var(--chat-panel-width)",
        borderLeft: "1px solid var(--rule-faint)",
        background: "var(--bg-surface)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--rule-faint)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#10B981",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--text-primary)",
            fontFamily: "var(--font-sans)",
          }}
        >
          Claude
        </span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 400,
            color: "var(--text-muted)",
            fontFamily: "var(--font-sans)",
          }}
        >
          · {scopeLabel}
        </span>
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              fontSize: "12px",
              fontWeight: 400,
              color: "var(--text-muted)",
              fontFamily: "var(--font-sans)",
            }}
          >
            Chat with Claude about this idea. It has full context of the
            &ldquo;{projectName}&rdquo; project.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%",
                padding: "10px 14px",
                borderRadius: "12px",
                background: msg.role === "user" ? "var(--text-primary)" : "#F1F5F9",
                color: msg.role === "user" ? "#FFFFFF" : "#334155",
                fontSize: "12px",
                lineHeight: 1.6,
                fontFamily: "var(--font-sans)",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.content}
            </div>
          ))
        )}
        {sending && (
          <div
            style={{
              alignSelf: "flex-start",
              maxWidth: "88%",
              padding: "10px 14px",
              borderRadius: "12px",
              background: "#F1F5F9",
              color: "var(--text-muted)",
              fontSize: "12px",
              fontFamily: "var(--font-sans)",
            }}
          >
            Thinking...
          </div>
        )}
      </div>

      {/* Input area */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--rule-faint)",
        }}
      >
        {/* Quick actions */}
        {quickActions.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              marginBottom: "8px",
            }}
          >
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => onSendMessage(action.prompt)}
                disabled={sending}
                style={{
                  padding: "4px 10px",
                  borderRadius: "12px",
                  border: "1px solid var(--rule-faint)",
                  background: "var(--bg-surface)",
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-sans)",
                  cursor: sending ? "default" : "pointer",
                  whiteSpace: "nowrap",
                  opacity: sending ? 0.5 : 1,
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Input + Send */}
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder="Ask Claude..."
            disabled={sending}
            style={{
              flex: 1,
              padding: "8px 12px",
              border: "1px solid var(--rule-faint)",
              borderRadius: "0",
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
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
              padding: "8px 16px",
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
    </div>
  );
}
