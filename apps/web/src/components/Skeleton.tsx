import type { CSSProperties } from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  style?: CSSProperties;
}

// A simple pulsing placeholder block. Uses the existing
// @keyframes skeleton-pulse declared in global.css.
export function Skeleton({ width, height = 14, style }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        background: "var(--bg-secondary)",
        animation: "skeleton-pulse 1.2s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export function SkeletonProjectCard() {
  return (
    <div
      style={{
        padding: "12px",
        background: "var(--bg-surface)",
        border: "1px solid var(--rule-faint)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <Skeleton height={14} width="70%" />
      <Skeleton height={10} width="90%" />
      <Skeleton height={10} width="60%" />
      <div style={{ display: "flex", gap: "4px" }}>
        <Skeleton height={18} width="60px" />
        <Skeleton height={18} width="70px" />
      </div>
    </div>
  );
}

export function SkeletonKanbanBoard() {
  return (
    <div
      style={{
        display: "flex",
        gap: "16px",
        flex: 1,
        padding: "var(--page-padding)",
        overflow: "hidden",
      }}
    >
      {[0, 1, 2, 3].map((col) => (
        <div
          key={col}
          style={{
            flex: 1,
            minWidth: "220px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ marginBottom: "12px", display: "flex", gap: "8px" }}>
            <Skeleton width="8px" height="8px" style={{ borderRadius: "50%" }} />
            <Skeleton height={12} width="90px" />
          </div>
          {[0, 1].map((i) => (
            <SkeletonProjectCard key={i} />
          ))}
        </div>
      ))}
    </div>
  );
}
