import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { track } from "../lib/analytics";

const PROJECT_RE = /^\/projects\/([^/]+)(?:\/tickets\/([^/]+))?/;

function parsePath(pathname: string): {
  projectId: string | null;
  ticketId: string | null;
} {
  const match = pathname.match(PROJECT_RE);
  if (!match) return { projectId: null, ticketId: null };
  return {
    projectId: match[1] ?? null,
    ticketId: match[2] ?? null,
  };
}

// Mounts inside <Routes> and emits a $pageview whenever `pathname`
// changes. Phase 3 this becomes the bridge to PostHog's $pageview
// event. No-op today.
//
// Reads projectId / ticketId from the pathname directly rather than
// `useParams`, because this component renders outside the matched
// route element and `useParams` there would return an empty object.
export function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    const { projectId, ticketId } = parsePath(location.pathname);
    track("$pageview", {
      path: location.pathname,
      project_id: projectId,
      ticket_id: ticketId,
    });
  }, [location.pathname]);

  return null;
}
