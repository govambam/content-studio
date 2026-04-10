import { Link, useParams } from "react-router-dom";

// Placeholder — the real Ticket detail view lands in PR #29.
export function TicketDetailView() {
  const { projectId, ticketId } = useParams();
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
          <Link
            to={`/projects/${projectId}`}
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            {projectId}
          </Link>
          {" / "}
          <span style={{ color: "var(--text-primary)" }}>{ticketId}</span>
        </div>
        <div style={{ fontSize: "14px" }}>
          Ticket detail view arrives in PR #29.
        </div>
      </main>
    </div>
  );
}
