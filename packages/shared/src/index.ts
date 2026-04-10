// Shared types, constants, and utilities for Content Studio (Phase 2)

export type ContentStatus = "backlog" | "in_progress" | "in_review" | "done";

export const CONTENT_STATUSES: ContentStatus[] = [
  "backlog",
  "in_progress",
  "in_review",
  "done",
];

export const STATUS_LABELS: Record<ContentStatus, string> = {
  backlog: "Backlog",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

export type ActivityEventType =
  | "ticket_created"
  | "title_changed"
  | "description_changed"
  | "status_changed"
  | "comment_added"
  | "asset_uploaded"
  | "asset_deleted";

export interface Label {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ContentStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined / derived fields populated by the API:
  labels: Label[];
  ticket_counts: Record<ContentStatus, number>;
}

export interface Ticket {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: ContentStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  ticket_id: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface Comment {
  id: string;
  ticket_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityEvent {
  id: string;
  ticket_id: string;
  event_type: ActivityEventType;
  meta: Record<string, unknown>;
  created_at: string;
}

// Merged activity feed item: either an activity event or a comment, tagged
// with a `kind` discriminator. Produced by GET /api/tickets/:id/activity.
export type ActivityFeedItem =
  | ({ kind: "event" } & ActivityEvent)
  | ({ kind: "comment" } & Comment);

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
