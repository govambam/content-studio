-- Slack ticket notifications
--
-- When a ticket moves to `in_review` or `done` the API posts a rich
-- Slack message to a configured incoming webhook. The config is a
-- single-row table: we don't have workspaces in this app, so there's
-- one Slack integration per deployment.
--
-- The `singleton` column + unique index + CHECK constraint enforce
-- "only one row" at the DB level: the CHECK blocks any direct INSERT
-- that would sneak in with `singleton = false`, and the unique index
-- catches a second row with `singleton = true`. The API always upserts
-- with the literal value `true`.
--
-- `enabled_statuses` lets operators pick which status transitions
-- trigger a post. Stored as a text[] of content_status literals so
-- it's easy to filter in the hot path without a join.
--
-- `slack_notification_posted` is added to the activity event enum so
-- the ticket's activity feed can show when a Slack post went out.

begin;

create table slack_integrations (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true check (singleton is true),
  webhook_url text not null,
  channel_name text not null default '',
  enabled boolean not null default true,
  enabled_statuses content_status[] not null default array['in_review', 'done']::content_status[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index slack_integrations_singleton_idx
  on slack_integrations (singleton);

create trigger trg_slack_integrations_updated_at
  before update on slack_integrations
  for each row execute function update_updated_at();

alter table slack_integrations enable row level security;

create policy "Authenticated users have full access to slack_integrations"
  on slack_integrations for all to authenticated using (true) with check (true);
create policy "Service role has full access to slack_integrations"
  on slack_integrations for all to service_role using (true) with check (true);

-- Extend the activity_event_type enum. Postgres requires this outside
-- of a function body; commit below will make it visible to the insert
-- path in the API.
alter type activity_event_type add value if not exists 'slack_notification_posted';

commit;
