-- Content Studio — Initial Schema (Phase 1 MVP)
-- Tables: projects, context_files, cards, artifacts, chat_messages, worker_jobs

-- Custom enum types
create type stage as enum ('unreviewed', 'considering', 'in_production', 'published');
create type content_type as enum ('short', 'long');
create type artifact_type as enum ('demo-flow', 'script');
create type artifact_status as enum ('not-started', 'draft', 'complete');
create type file_type as enum ('docs', 'post', 'ideas', 'other');
create type chat_role as enum ('user', 'assistant');
create type card_creator as enum ('ai', 'user');
create type job_status as enum ('pending', 'running', 'completed', 'failed');

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text not null default '',
  color text not null default '#1E3AFF',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- Context files
create table context_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  file_path text not null,
  file_type file_type not null default 'other',
  size_bytes integer not null default 0,
  content_text text not null default '',
  created_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id)
);

create index idx_context_files_project on context_files(project_id);

-- Cards (ideas)
create table cards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  summary text not null default '',
  stage stage not null default 'unreviewed',
  content_type content_type not null default 'short',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by card_creator not null default 'user'
);

create index idx_cards_project on cards(project_id);
create index idx_cards_project_stage on cards(project_id, stage);

-- Artifacts (demo flows, scripts)
create table artifacts (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id) on delete cascade,
  type artifact_type not null,
  title text not null default '',
  content text not null default '',
  status artifact_status not null default 'not-started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_artifacts_card on artifacts(card_id);

-- Chat messages
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id) on delete cascade,
  artifact_id uuid references artifacts(id) on delete set null,
  role chat_role not null,
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id)
);

create index idx_chat_messages_card on chat_messages(card_id);
create index idx_chat_messages_card_created on chat_messages(card_id, created_at);

-- Worker jobs (for tracking Claude task status and failures)
create table worker_jobs (
  id uuid primary key default gen_random_uuid(),
  task_type text not null,
  payload jsonb not null default '{}',
  status job_status not null default 'pending',
  result jsonb,
  error text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_worker_jobs_status on worker_jobs(status);

-- Updated_at triggers
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

create trigger trg_cards_updated_at
  before update on cards
  for each row execute function update_updated_at();

create trigger trg_artifacts_updated_at
  before update on artifacts
  for each row execute function update_updated_at();

create trigger trg_worker_jobs_updated_at
  before update on worker_jobs
  for each row execute function update_updated_at();

-- Enable Realtime for tables the frontend subscribes to
alter publication supabase_realtime add table cards;
alter publication supabase_realtime add table artifacts;
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table worker_jobs;

-- Row Level Security (permissive for now — small trusted team)
alter table projects enable row level security;
alter table context_files enable row level security;
alter table cards enable row level security;
alter table artifacts enable row level security;
alter table chat_messages enable row level security;
alter table worker_jobs enable row level security;

-- Allow authenticated users full access to all tables
create policy "Authenticated users have full access to projects"
  on projects for all to authenticated using (true) with check (true);

create policy "Authenticated users have full access to context_files"
  on context_files for all to authenticated using (true) with check (true);

create policy "Authenticated users have full access to cards"
  on cards for all to authenticated using (true) with check (true);

create policy "Authenticated users have full access to artifacts"
  on artifacts for all to authenticated using (true) with check (true);

create policy "Authenticated users have full access to chat_messages"
  on chat_messages for all to authenticated using (true) with check (true);

create policy "Authenticated users have full access to worker_jobs"
  on worker_jobs for all to authenticated using (true) with check (true);

-- Service role access (for backend/worker using service_role key)
create policy "Service role has full access to projects"
  on projects for all to service_role using (true) with check (true);

create policy "Service role has full access to context_files"
  on context_files for all to service_role using (true) with check (true);

create policy "Service role has full access to cards"
  on cards for all to service_role using (true) with check (true);

create policy "Service role has full access to artifacts"
  on artifacts for all to service_role using (true) with check (true);

create policy "Service role has full access to chat_messages"
  on chat_messages for all to service_role using (true) with check (true);

create policy "Service role has full access to worker_jobs"
  on worker_jobs for all to service_role using (true) with check (true);

-- Storage bucket for context files
insert into storage.buckets (id, name, public)
values ('context-files', 'context-files', false);

create policy "Authenticated users can upload context files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'context-files');

create policy "Authenticated users can read context files"
  on storage.objects for select to authenticated
  using (bucket_id = 'context-files');

create policy "Authenticated users can delete context files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'context-files');
