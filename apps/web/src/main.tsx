import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/tokens.css";
import "./styles/global.css";
// Import for the side-effect only: validateEnv runs at module init and
// throws if VITE_SUPABASE_* are missing so we never ship a build that
// silently has no realtime.
import "./lib/env";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
