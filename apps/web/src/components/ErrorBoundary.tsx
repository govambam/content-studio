import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "../lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

// Root-level React error boundary. Keeps a single mount point for Phase 3
// Sentry integration — swapping the class for `Sentry.ErrorBoundary` is a
// one-file change that preserves the fallback layout below.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error("react_error_boundary_caught", {
      message: error.message,
      componentStack: info.componentStack,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            height: "100vh",
            width: "100vw",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "var(--bg-primary)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <div
            style={{
              maxWidth: "480px",
              border: "1px solid var(--rule-strong)",
              background: "var(--bg-surface)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--text-muted)",
              }}
            >
              Something broke
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              Content Studio hit an unexpected error.
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              Reloading usually fixes it. If it keeps happening, check the
              browser console and let the team know.
            </div>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                alignSelf: "flex-start",
                padding: "8px 16px",
                background: "var(--text-primary)",
                color: "var(--bg-surface)",
                border: "1px solid var(--text-primary)",
                borderRadius: 0,
                fontFamily: "var(--font-sans)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
