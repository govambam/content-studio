import { Link } from "react-router-dom";

// The Content Studio wordmark. Click navigates to Home. Used in the
// Sidebar on the Home view and standalone in the top-left corner of the
// Project and Ticket detail views (which have no sidebar).
export function Wordmark() {
  return (
    <Link
      to="/"
      style={{
        display: "inline-block",
        textDecoration: "none",
        lineHeight: 1.1,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "15px",
          fontWeight: 800,
          color: "var(--accent-blue)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        Content Studio
      </div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "11px",
          fontWeight: 400,
          color: "var(--text-secondary)",
          marginTop: "2px",
        }}
      >
        by Macroscope
      </div>
    </Link>
  );
}
