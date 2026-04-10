// Feature flag seam. Returns the default value today. In dev you can
// override a flag by writing to `localStorage.setItem("flag:<key>",
// "true" | "false")`. Phase 3 replaces the body of `useFlag` with a
// LaunchDarkly SDK read and mounts a `<FlagsProvider>` at the app root.
//
// Intentionally a hook (not a plain function) so the Phase 3 swap can
// subscribe to flag updates and re-render consumers without touching
// call sites.

import { useSyncExternalStore } from "react";

const LS_PREFIX = "flag:";

function getStoredFlag(key: string): boolean | null {
  try {
    const raw = window.localStorage.getItem(`${LS_PREFIX}${key}`);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  } catch {
    return null;
  }
}

// localStorage doesn't push change events across same-tab writes, so
// subscribe to the `storage` event (cross-tab) plus a no-op unsubscribe.
// Phase 3 LaunchDarkly will provide a real subscription.
function subscribe(onStoreChange: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key && e.key.startsWith(LS_PREFIX)) onStoreChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function useFlag(key: string, defaultValue: boolean): boolean {
  const snapshot = () => getStoredFlag(key) ?? defaultValue;
  // useSyncExternalStore gives a stable subscribe/getSnapshot pair so
  // the Phase 3 provider can drop in without touching callers.
  return useSyncExternalStore(subscribe, snapshot, () => defaultValue);
}

// Imperative read for non-React call sites (server-worker stubs, etc).
export function getFlag(key: string, defaultValue: boolean): boolean {
  return getStoredFlag(key) ?? defaultValue;
}
