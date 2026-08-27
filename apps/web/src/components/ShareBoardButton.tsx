import { track } from "../lib/analytics";

export function ShareBoardButton() {
  return (
    <a
      href="https://content-studio-docs.vercel.app/docs/sharing"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("board_shared", { source: "sidebar" })}
      style={{
        display: "block",
        width: "100%",
        padding: "var(--space-sm)",
        border: "1px solid var(--rule-strong)",
        borderRadius: "0",
        background: "#1E3AFF",
        color: "var(--bg-surface)",
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
      Share Board
    </a>
  );
}
