import { useState } from "react";
import { useFlags } from "launchdarkly-react-client-sdk";
import { InviteTeammateModal } from "./InviteTeammateModal";

export function InviteTeammateButton() {
  const flags = useFlags();
  const enabled = Boolean(flags["demoErrorTriggerButton"]);
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
        Invite Teammate
      </button>
      {open && <InviteTeammateModal onClose={() => setOpen(false)} />}
    </>
  );
}
