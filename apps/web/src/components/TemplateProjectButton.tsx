interface TemplateProjectButtonProps {
  onClick: () => void;
}

export function TemplateProjectButton({ onClick }: TemplateProjectButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "#1E3AFF",
        color: "var(--bg-surface)",
        border: "none",
        borderRadius: "0",
        padding: "var(--space-sm) var(--space-md)",
        fontSize: "12px",
        fontWeight: 700,
        fontFamily: "var(--font-sans)",
        cursor: "pointer",
      }}
    >
      + From Template
    </button>
  );
}
