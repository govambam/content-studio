export function DocsButton() {
  return (
    <a
      href="https://docs-production-40b1.up.railway.app/docs/intro"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        width: "100%",
        padding: "8px",
        border: "1px solid var(--rule-strong)",
        borderRadius: "0",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: "pointer",
        textAlign: "center",
        textDecoration: "none",
        boxSizing: "border-box",
      }}
    >
      Docs
    </a>
  );
}
