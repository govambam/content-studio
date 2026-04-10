interface Artifact {
  id: string;
  type: string;
  status: string;
  content: string;
}

interface NextStepsProps {
  artifacts: Artifact[];
  onNavigate: (artifactType: string) => void;
  onGenerate: (artifactType: string) => void;
  generating: string | null;
}

export function NextSteps({ artifacts, onNavigate, onGenerate, generating }: NextStepsProps) {
  const demoFlow = artifacts.find((a) => a.type === "demo-flow");
  const script = artifacts.find((a) => a.type === "script");

  const steps = [
    {
      label: "Demo Flow",
      type: "demo-flow",
      artifact: demoFlow,
    },
    {
      label: "Script",
      type: "script",
      artifact: script,
    },
  ];

  return (
    <div style={{ marginTop: "24px" }}>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          color: "var(--text-secondary)",
          marginBottom: "8px",
          fontFamily: "var(--font-sans)",
        }}
      >
        Next Steps
      </div>

      {steps.map((step) => {
        const exists = !!step.artifact;
        const isGenerating = generating === step.type;

        return (
          <div
            key={step.type}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: "48px",
              borderBottom: "1px solid var(--rule-faint)",
              fontFamily: "var(--font-sans)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  border: exists ? "none" : "1.5px solid var(--text-muted)",
                  background: exists ? "#10B981" : "transparent",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {step.label}
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
            ) : exists ? (
              <button
                onClick={() => onNavigate(step.type)}
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--accent-blue)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={() => onGenerate(step.type)}
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Generate
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
