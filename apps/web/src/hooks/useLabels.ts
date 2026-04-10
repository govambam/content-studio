// Re-export for backward compat. The actual implementation lives in the
// shared DataContext so labels are fetched once per session rather than
// on every view mount.
export { useLabels } from "../context/DataContext";
