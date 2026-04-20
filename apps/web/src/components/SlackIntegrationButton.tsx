import { useState } from "react";
import { useFlags } from "launchdarkly-react-client-sdk";
import { SlackIntegrationModal } from "./SlackIntegrationModal";

// Slack ticket notifications are gated behind a LaunchDarkly flag so
// rollout can be staged — consistent with how other demo features in
// this sidebar are introduced.
export function SlackIntegrationButton() {
  const flags = useFlags();
  const enabled = Boolean(flags["slackTicketNotifications"]);
  const [open, setOpen] = useState(false);

  if (!enabled) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
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
        Slack Notifications
      </button>
      {open && <SlackIntegrationModal onClose={() => setOpen(false)} />}
    </>
  );
}
