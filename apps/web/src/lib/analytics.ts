// Analytics seam. No-op in prod today; Phase 3 swaps the body of
// `track` for a PostHog `capture` call and this file stays the one
// place the whole app imports. Call sites are enumerated in
// research/performance-audit-2026-04/observability-readiness.md §O-5.
//
// The shape matches PostHog's `capture(event, properties)` signature
// on purpose so the replacement PR is a one-file diff.

import { logger } from "./logger";

export type AnalyticsProps = Record<string, unknown>;

// Optional identity hook. Today there is no auth, so `user_id` is
// null. When Phase 3 adds Supabase Auth, `DataProvider` will call
// `identify(userId, traits)` once and `reset()` on sign-out.
let currentUserId: string | null = null;
let currentTraits: AnalyticsProps = {};

export function identify(userId: string, traits: AnalyticsProps = {}): void {
  currentUserId = userId;
  currentTraits = traits;
  logger.debug("analytics_identify", { userId, traits });
}

export function reset(): void {
  currentUserId = null;
  currentTraits = {};
  logger.debug("analytics_reset");
}

// Primary emit. Dev logs through the logger shim so devtools shows
// the event; prod is a no-op until the Phase 3 swap-out. Keep the
// signature compatible with posthog.capture.
export function track(event: string, props: AnalyticsProps = {}): void {
  const enriched: AnalyticsProps = {
    ...props,
    ...(currentUserId ? { user_id: currentUserId } : {}),
    ...(Object.keys(currentTraits).length > 0
      ? { _traits: currentTraits }
      : {}),
  };
  logger.debug(`track ${event}`, enriched);
  // Intentional no-op in prod. Phase 3:
  //   posthog.capture(event, enriched);
}
