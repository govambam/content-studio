import { useFlags } from "launchdarkly-react-client-sdk";
import { ENV } from "../lib/env";

/**
 * DemoErrorButton
 *
 * Gated by the LaunchDarkly flag `demo-error-trigger-button`. When the
 * flag is off (default) the button renders nothing. When the flag is on,
 * it shows a small button in the sidebar footer that POSTs to a backend
 * endpoint that intentionally throws — used to demo Sentry error capture
 * during a recorded video walkthrough.
 *
 * The endpoint itself (`/api/demo/trigger-error`) is created by a
 * sibling PR. This component only fires the request and logs the result.
 */
export function DemoErrorButton() {
  const flags = useFlags();
  const enabled = Boolean(flags["demoErrorTriggerButton"]);

  if (!enabled) return null;

  const handleClick = async () => {
    try {
      const res = await fetch(`${ENV.apiUrl}/demo/trigger-error`, {
        method: "POST",
      });
      // eslint-disable-next-line no-console
      console.log("[demo-error-trigger] response", res.status, res.statusText);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("[demo-error-trigger] fetch failed", err);
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: "block",
        width: "100%",
        padding: "8px",
        border: "1px solid var(--rule-strong)",
        borderRadius: "0",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: "pointer",
      }}
    >
      Trigger Demo Error
    </button>
  );
}
