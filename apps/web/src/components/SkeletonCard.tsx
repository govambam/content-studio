export function SkeletonCard() {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: "var(--bg-surface)",
        border: "1px solid var(--rule-faint)",
        borderRadius: "0",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        animation: "skeleton-pulse 1.4s ease-in-out infinite",
      }}
    >
      {/* Title placeholder */}
      <div
        style={{
          height: "13px",
          width: "85%",
          background: "var(--bg-secondary)",
        }}
      />
      <div
        style={{
          height: "13px",
          width: "60%",
          background: "var(--bg-secondary)",
        }}
      />
      {/* Badge placeholder */}
      <div
        style={{
          height: "16px",
          width: "44px",
          background: "var(--bg-secondary)",
          borderRadius: "4px",
          marginTop: "2px",
        }}
      />
    </div>
  );
}
