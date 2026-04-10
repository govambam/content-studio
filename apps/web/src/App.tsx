import { Routes, Route } from "react-router-dom";
import { HomeView } from "./views/HomeView";
import { ProjectDetailView } from "./views/ProjectDetailView";
import { TicketDetailView } from "./views/TicketDetailView";
import { DataProvider } from "./context/DataContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

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
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/projects/:projectId" element={<ProjectDetailView />} />
            <Route
              path="/projects/:projectId/tickets/:ticketId"
              element={<TicketDetailView />}
            />
          </Routes>
        </DataProvider>
      </ErrorBoundary>
    </div>
  );
}

export default App;
