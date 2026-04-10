interface BreadcrumbSegment {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  segments: BreadcrumbSegment[];
}

export function Breadcrumbs({ segments }: BreadcrumbsProps) {
  return (
    <div
      style={{
        padding: "0 0 12px 0",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontFamily: "var(--font-sans)",
      }}
    >
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {i > 0 && (
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>&gt;</span>
            )}
            {isLast ? (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                {segment.label}
              </span>
            ) : (
              <button
                onClick={segment.onClick}
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {segment.label}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}
