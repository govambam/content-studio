import { Routes, Route } from "react-router-dom";
import { HomeView } from "./views/HomeView";
import { ProjectDetailView } from "./views/ProjectDetailView";
import { TicketDetailView } from "./views/TicketDetailView";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeView />} />
      <Route path="/projects/:projectId" element={<ProjectDetailView />} />
      <Route
        path="/projects/:projectId/tickets/:ticketId"
        element={<TicketDetailView />}
      />
    </Routes>
  );
}

export default App;
