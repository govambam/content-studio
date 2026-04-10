// Per-tab client identifier used for Supabase Realtime echo suppression.
// Every mutation request sends this as the `x-client-id` header; the backend
// stamps it into `projects.updated_by_client` / `tickets.updated_by_client`
// and into `activity_events.meta.source`. When the realtime subscription
// delivers an event whose source matches this id, the hook ignores it — the
// local state already reflects the change.

// Older Safari (<15.4), jsdom, and SSR contexts don't expose
// `crypto.randomUUID`. Guard so we never throw at module init or per-call.
// The prefix is always applied so callers can tell apart ids coming from
// different call sites in logs and dashboards.
export function newPrefixedId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

// CLIENT_ID is persisted into DB rows (`updated_by_client`) and realtime
// echoes, so keep the historical bare-UUID shape to avoid interpretation
// churn on old events. The guarded branch mirrors `newPrefixedId` but
// without a prefix.
function makeClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export const CLIENT_ID: string = makeClientId();
