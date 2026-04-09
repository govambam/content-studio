// Shared types, constants, and utilities for Content Studio

export type Stage = "unreviewed" | "considering" | "in_production" | "published";
export type ContentType = "short" | "long";
export type ArtifactType = "demo-flow" | "script";
export type ArtifactStatus = "not-started" | "draft" | "complete";
export type FileType = "docs" | "post" | "ideas" | "other";
export type ChatRole = "user" | "assistant";
export type CardCreator = "ai" | "user";

export interface Project {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ContextFile {
  id: string;
  project_id: string;
  name: string;
  file_path: string;
  file_type: FileType;
  size_bytes: number;
  content_text: string;
  created_at: string;
  uploaded_by: string;
}

export interface Card {
  id: string;
  project_id: string;
  title: string;
  summary: string;
  stage: Stage;
  content_type: ContentType;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: CardCreator;
}

export interface Artifact {
  id: string;
  card_id: string;
  type: ArtifactType;
  title: string;
  content: string;
  status: ArtifactStatus;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  card_id: string;
  artifact_id: string | null;
  role: ChatRole;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user_id: string | null;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
