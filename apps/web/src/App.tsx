import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { RouteTracker } from "./components/RouteTracker";

// Route-level code splitting. Each view gets its own chunk so Home no
// longer pulls react-markdown, the MarkdownEditor, or dnd-kit's Ticket
// Detail paths on first paint. Home remains the largest chunk because
// the Kanban live there, but the Ticket Detail chunk (markdown +
// autosave + activity feed) is now deferred until the user navigates
// into a ticket.
const HomeView = lazy(() =>
  import("./views/HomeView").then((m) => ({ default: m.HomeView }))
);
const ProjectDetailView = lazy(() =>
  import("./views/ProjectDetailView").then((m) => ({
    default: m.ProjectDetailView,
  }))
);
const TicketDetailView = lazy(() =>
  import("./views/TicketDetailView").then((m) => ({
    default: m.TicketDetailView,
  }))
);

// Minimal loading affordance rendered between route transitions. Uses
// design-system tokens so it doesn't flash a mismatched chrome while a
// chunk is still in flight.
function RouteFallback() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
        fontFamily: "var(--font-sans)",
        fontSize: "12px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
      }}
    >
      Loading…
    </div>
  );
}

// The outer black frame wraps the entire app shell (sidebar + main).
// This is the "container" framing from v3 of the brutalist refinement —
// the single 1 px black rule at the edges reads as a complete container
// and prevents the ladder of internal rules from looking like stray lines.
// Each view should size its own content with `height: 100%` inside this
// wrapper rather than re-declaring `100vh` and escaping the border.
function App() {
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        boxSizing: "border-box",
        border: "1px solid var(--rule-strong)",
        background: "var(--bg-primary)",
        overflow: "hidden",
      }}
    >
      <ErrorBoundary>
        <DataProvider>
          <Suspense fallback={<RouteFallback />}>
            <RouteTracker />
            <Routes>
              <Route path="/" element={<HomeView />} />
              <Route
                path="/projects/:projectId"
                element={<ProjectDetailView />}
              />
              <Route
                path="/projects/:projectId/tickets/:ticketId"
                element={<TicketDetailView />}
              />
            </Routes>
          </Suspense>
        </DataProvider>
      </ErrorBoundary>
    </div>
  );
}

export default App;
