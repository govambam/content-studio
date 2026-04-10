import { useState } from "react";

interface Artifact {
  id: string;
  type: string;
  status: string;
  content: string;
}

interface SubItemsProps {
  artifacts: Artifact[];
  onNavigate: (artifactType: string) => void;
  onGenerate: (artifactType: string) => void;
  generating: string | null;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "complete") {
    return (
      <span style={{ fontSize: "14px", color: "#10B981", lineHeight: 1 }}>●</span>
    );
  }
  if (status === "draft") {
    return (
      <span style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1 }}>◐</span>
    );
  }
  return (
    <span
      style={{
        display: "inline-block",
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        border: "1.5px solid var(--text-muted)",
        background: "transparent",
      }}
    />
  );
}

export function SubItems({ artifacts, onNavigate, onGenerate, generating }: SubItemsProps) {
  const [expanded, setExpanded] = useState(true);

  const demoFlow = artifacts.find((a) => a.type === "demo-flow");
  const script = artifacts.find((a) => a.type === "script");

  const items = [
    { label: "Demo Flow", type: "demo-flow", artifact: demoFlow },
    { label: "Script", type: "script", artifact: script },
  ];

  const completedCount = items.filter((i) => i.artifact?.status === "complete").length;

  return (
    <div style={{ marginTop: "24px", fontFamily: "var(--font-sans)" }}>
      {/* Section header */}
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
        {expanded ? "▾" : "▸"} Sub-items {completedCount}/{items.length}
      </button>

      {expanded && (
        <div>
          {items.map((item) => {
            const exists = !!item.artifact;
            const isGenerating = generating === item.type;

            return (
              <div
                key={item.type}
                onClick={() => exists && onNavigate(item.type)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  border: "1px solid var(--rule-faint)",
                  marginBottom: "-1px",
                  cursor: exists ? "pointer" : "default",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <StatusIcon status={item.artifact?.status ?? "not-started"} />
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    {item.label}
                  </span>
                </div>

                {isGenerating ? (
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 400,
                      color: "var(--text-muted)",
                      fontStyle: "italic",
                    }}
                  >
                    Generating...
                  </span>
                ) : !exists ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerate(item.type);
                    }}
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                      background: "none",
                      border: "none",
                      padding: "4px 8px",
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    Generate
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
