import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { asyncWithLDProvider } from "launchdarkly-react-client-sdk";
import App from "./App";
import "./styles/tokens.css";
import "./styles/global.css";
// Import for the side-effect only: validateEnv runs at module init and
// throws if VITE_SUPABASE_* are missing so we never ship a build that
// silently has no realtime.
import "./lib/env";

// LaunchDarkly client-side ID is safe to commit (it's a public,
// client-side identifier scoped to a single LD environment). We still
// allow override via VITE_LD_CLIENT_ID for local dev / staging envs.
// The default below points at the Macroscope content-studio demo env.
const LD_CLIENT_ID =
  import.meta.env.VITE_LD_CLIENT_ID ?? "69deb82234109a0a96db7e42";

async function bootstrap() {
  const LDProvider = await asyncWithLDProvider({
    clientSideID: LD_CLIENT_ID,
    context: {
      kind: "user",
      key: "anonymous",
      anonymous: true,
    },
    // Avoid waiting on streaming connection before first render.
    timeout: 2,
  });

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <LDProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LDProvider>
    </StrictMode>
  );
}

void bootstrap();
