import { Link, useParams } from "react-router-dom";

// Placeholder — the real Project detail view lands in PR #28.
export function ProjectDetailView() {
  const { projectId } = useParams();
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      <main
        style={{
          flex: 1,
          padding: "var(--page-padding)",
          fontFamily: "var(--font-sans)",
          color: "var(--text-secondary)",
        }}
      >
        <div style={{ fontSize: "12px", marginBottom: "12px" }}>
          <Link
            to="/"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            Home
          </Link>
          {" / "}
          <span style={{ color: "var(--text-primary)" }}>{projectId}</span>
        </div>
        <div style={{ fontSize: "14px" }}>
          Project detail view arrives in PR #28.
        </div>
      </main>
    </div>
  );
}
