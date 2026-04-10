import { Fragment } from "react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export interface BreadcrumbItem {
  label: ReactNode;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        fontSize: "12px",
        fontWeight: 400,
        color: "var(--text-muted)",
        fontFamily: "var(--font-sans)",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const content = item.to && !isLast ? (
          <Link
            to={item.to}
            style={{
              color: "var(--text-muted)",
              textDecoration: "none",
            }}
          >
            {item.label}
          </Link>
        ) : (
          <span
            style={{
              color: isLast ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: isLast ? 600 : 400,
            }}
          >
            {item.label}
          </span>
        );
        return (
          <Fragment key={i}>
            {content}
            {!isLast && <span>/</span>}
          </Fragment>
        );
      })}
    </nav>
  );
}
