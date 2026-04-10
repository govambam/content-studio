// Shared types, constants, and utilities for Content Studio

export type Stage = "unreviewed" | "considering" | "in_production" | "published";
export type ContentType = "short" | "long";

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
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
