-- Phase 2: terminology flip + new hierarchy (labels → projects → tickets → assets)
--
-- This migration is destructive and not reversible in place. Before running:
--   supabase db dump --db-url "$SUPABASE_DB_URL" \
--     -f /tmp/phase2-pre-migration-$(date +%Y%m%d-%H%M%S).sql
-- If this migration fails partway through, restore from the dump.
--
-- The rename strategy is the two-statement path suggested in PHASE-2-PLAN.md §6.7.
-- Postgres foreign keys and RLS policies attach to tables by OID, so renaming a
-- referenced table is transparent to dependent objects. The old trigger/policy
-- names are dropped and recreated with new names so the post-migration state is
-- coherent.

begin;

-- ---------------------------------------------------------------------------
-- 0. Phase 1 cleanup (absorbed from the never-applied drop_ai_tables migration)
-- ---------------------------------------------------------------------------
-- The Phase 1 roadmap included a drop_ai_tables migration that was merged to
-- main but never applied to the remote DB. Its contents are folded in here so
-- Phase 2 can run against a Phase 1 DB in one shot. If drop_ai_tables is
-- later re-applied, it is a no-op because the tables and enums are already
-- gone.
--
-- Note: PostgreSQL does NOT support `IF EXISTS` on `ALTER PUBLICATION ... DROP
-- TABLE`, so each DROP TABLE below is unconditional. The tables are
-- guaranteed to be in the publication by the initial schema.

alter publication supabase_realtime drop table artifacts;
alter publication supabase_realtime drop table chat_messages;
alter publication supabase_realtime drop table worker_jobs;

-- Storage policies on the context-files bucket, then the bucket itself.
drop policy if exists "Authenticated users can upload context files" on storage.objects;
drop policy if exists "Authenticated users can read context files" on storage.objects;
drop policy if exists "Authenticated users can delete context files" on storage.objects;

delete from storage.objects where bucket_id = 'context-files';
delete from storage.buckets where id = 'context-files';

-- Drop the AI tables. Cascade cleans up indexes, triggers, policies, FKs.
drop table if exists worker_jobs cascade;
drop table if exists chat_messages cascade;
drop table if exists artifacts cascade;
drop table if exists context_files cascade;

-- `created_by` on cards (the Phase 1 ai-vs-user origin flag) goes away
-- before the card_creator enum can be dropped.
alter table cards drop column if exists created_by;

-- Drop the Phase 1 AI enums.
drop type if exists artifact_type;
drop type if exists artifact_status;
drop type if exists chat_role;
drop type if exists job_status;
drop type if exists card_creator;
drop type if exists file_type;

-- ---------------------------------------------------------------------------
-- 1. Clean slate for publication + policies + triggers on the to-be-renamed tables
-- ---------------------------------------------------------------------------

-- Cards was the only non-AI table in the publication after Phase 1. Drop it
-- so we have explicit control over publication membership after the rename.
alter publication supabase_realtime drop table cards;

-- Drop existing RLS policies by their literal Phase 1 names. They'll be
-- recreated at the end of the migration against the renamed tables.
drop policy if exists "Authenticated users have full access to projects" on projects;
drop policy if exists "Service role has full access to projects" on projects;
drop policy if exists "Authenticated users have full access to cards" on cards;
drop policy if exists "Service role has full access to cards" on cards;

-- Drop the Phase 1 updated_at triggers; we'll recreate them under the
-- Phase 2 names after the rename.
drop trigger if exists trg_projects_updated_at on projects;
drop trigger if exists trg_cards_updated_at on cards;

-- ---------------------------------------------------------------------------
-- 2. The two-statement rename
-- ---------------------------------------------------------------------------
-- Old `projects` (Macroscope feature areas) becomes `labels`.
-- Old `cards` (individual content ideas) becomes `projects`.
-- FK cards.project_id → projects(id) is by OID, so after both renames it
-- reads projects.project_id → labels(id) — semantically what we want, which
-- is exactly what we need to populate the project_labels join table.

alter table projects rename to labels;
alter table cards rename to projects;

-- Rename the FK column on the new `projects` so the join-table INSERT is
-- unambiguous about the source column.
alter table projects rename column project_id to label_id;

-- ---------------------------------------------------------------------------
-- 3. Reshape the `labels` table
-- ---------------------------------------------------------------------------

alter table labels drop column if exists slug;
alter table labels drop column if exists icon;
alter table labels drop column if exists created_by;

-- Name stays, color stays, created_at / updated_at stay.
-- Add a case-insensitive unique index on name per spec §4.1.
create unique index if not exists labels_name_lower_unique on labels (lower(name));

-- ---------------------------------------------------------------------------
-- 4. Reshape the `projects` table
-- ---------------------------------------------------------------------------

-- 4a. Rename summary → description.
alter table projects rename column summary to description;

-- 4b. New status enum.
create type content_status as enum ('backlog', 'in_progress', 'in_review', 'done');

-- 4c. Add new status column; backfill from old `stage`; drop `stage`.
alter table projects add column status content_status not null default 'backlog';

update projects set status = case stage
  when 'unreviewed' then 'backlog'::content_status
  when 'considering' then 'backlog'::content_status
  when 'in_production' then 'in_progress'::content_status
  when 'published' then 'done'::content_status
end;

alter table projects drop column stage;

-- 4d. Drop `content_type`.
alter table projects drop column content_type;

-- 4e. Add updated_by_client for realtime echo suppression.
alter table projects add column updated_by_client text;

-- 4f. Drop the now-unused Phase 1 enums.
drop type if exists stage;
drop type if exists content_type;

-- ---------------------------------------------------------------------------
-- 5. project_labels join table, backfilled from the old FK column
-- ---------------------------------------------------------------------------

create table project_labels (
  project_id uuid not null references projects(id) on delete cascade,
  label_id uuid not null references labels(id) on delete cascade,
  primary key (project_id, label_id)
);

create index idx_project_labels_label on project_labels(label_id);

-- Every Phase 1 card had exactly one parent project (now a label). Copy
-- those into the join.
insert into project_labels (project_id, label_id)
  select id, label_id from projects where label_id is not null;

-- Now that the join is populated, drop the old single-parent column. This
-- also drops the FK and any associated index automatically.
alter table projects drop column label_id;

-- ---------------------------------------------------------------------------
-- 6. Tickets
-- ---------------------------------------------------------------------------

create table tickets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  status content_status not null default 'backlog',
  sort_order integer not null default 0,
  updated_by_client text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tickets_project on tickets(project_id);
create index idx_tickets_project_status on tickets(project_id, status);

-- ---------------------------------------------------------------------------
-- 7. Assets
-- ---------------------------------------------------------------------------

create table assets (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  mime_type text not null default '',
  size_bytes integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_assets_ticket on assets(ticket_id);

-- ---------------------------------------------------------------------------
-- 8. Comments
-- ---------------------------------------------------------------------------

create table comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_comments_ticket on comments(ticket_id);

-- ---------------------------------------------------------------------------
-- 9. Activity events
-- ---------------------------------------------------------------------------

create type activity_event_type as enum (
  'ticket_created',
  'title_changed',
  'description_changed',
  'status_changed',
  'comment_added',
  'asset_uploaded',
  'asset_deleted'
);

create table activity_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  event_type activity_event_type not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_activity_events_ticket_created on activity_events(ticket_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 10. updated_at triggers
-- ---------------------------------------------------------------------------
-- The update_updated_at() function was created in the initial migration and
-- still exists; reuse it.

create trigger trg_labels_updated_at
  before update on labels
  for each row execute function update_updated_at();

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

create trigger trg_tickets_updated_at
  before update on tickets
  for each row execute function update_updated_at();

create trigger trg_comments_updated_at
  before update on comments
  for each row execute function update_updated_at();

-- ---------------------------------------------------------------------------
-- 11. RLS policies on all Phase 2 tables
-- ---------------------------------------------------------------------------

alter table labels enable row level security;
alter table projects enable row level security;
alter table project_labels enable row level security;
alter table tickets enable row level security;
alter table assets enable row level security;
alter table comments enable row level security;
alter table activity_events enable row level security;

create policy "Authenticated users have full access to labels"
  on labels for all to authenticated using (true) with check (true);
create policy "Service role has full access to labels"
  on labels for all to service_role using (true) with check (true);

create policy "Authenticated users have full access to projects"
  on projects for all to authenticated using (true) with check (true);
create policy "Service role has full access to projects"
  on projects for all to service_role using (true) with check (true);

create policy "Authenticated users have full access to project_labels"
  on project_labels for all to authenticated using (true) with check (true);
create policy "Service role has full access to project_labels"
  on project_labels for all to service_role using (true) with check (true);

create policy "Authenticated users have full access to tickets"
  on tickets for all to authenticated using (true) with check (true);
create policy "Service role has full access to tickets"
  on tickets for all to service_role using (true) with check (true);

create policy "Authenticated users have full access to assets"
  on assets for all to authenticated using (true) with check (true);
create policy "Service role has full access to assets"
  on assets for all to service_role using (true) with check (true);

create policy "Authenticated users have full access to comments"
  on comments for all to authenticated using (true) with check (true);
create policy "Service role has full access to comments"
  on comments for all to service_role using (true) with check (true);

create policy "Authenticated users have full access to activity_events"
  on activity_events for all to authenticated using (true) with check (true);
create policy "Service role has full access to activity_events"
  on activity_events for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 12. Realtime publication — all Phase 2 tables
-- ---------------------------------------------------------------------------
-- PHASE-2-PLAN.md §6.2: `labels` is added here even though PRODUCT-SPEC-V2.md
-- §6.5 omitted it. New labels from one tab should appear in the sidebar of
-- another tab without a reload.

alter publication supabase_realtime add table labels;
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table activity_events;
alter publication supabase_realtime add table assets;

commit;
