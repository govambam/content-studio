// Re-export for backward compat. The actual implementation lives in the
// shared DataContext so projects are fetched once per session rather than
// on every view mount.
export { useProjects } from "../context/DataContext";
export type {
  CreateProjectInput,
  UpdateProjectInput,
} from "../context/DataContext";
