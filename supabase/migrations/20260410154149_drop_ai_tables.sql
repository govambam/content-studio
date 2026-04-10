-- Phase 1 server-side rip-out: drop all AI-related tables, enums, storage, and the
-- card origin flag. After this migration only `projects` and `cards` remain, and the
-- only enum left is `stage` / `content_type`.

-- Remove dropped tables from the realtime publication before dropping them.
alter publication supabase_realtime drop table if exists artifacts;
alter publication supabase_realtime drop table if exists chat_messages;
alter publication supabase_realtime drop table if exists worker_jobs;

-- Drop storage policies on the context-files bucket, then delete the bucket.
drop policy if exists "Authenticated users can upload context files" on storage.objects;
drop policy if exists "Authenticated users can read context files" on storage.objects;
drop policy if exists "Authenticated users can delete context files" on storage.objects;

delete from storage.objects where bucket_id = 'context-files';
delete from storage.buckets where id = 'context-files';

-- Drop AI tables (cascade cleans up indexes, triggers, policies, and foreign keys).
drop table if exists worker_jobs cascade;
drop table if exists chat_messages cascade;
drop table if exists artifacts cascade;
drop table if exists context_files cascade;

-- `created_by` on cards only existed to flag ai-vs-user origin. Drop the column
-- before dropping the enum that backs it.
alter table cards drop column if exists created_by;

-- Drop enums that are no longer referenced by any table.
drop type if exists artifact_type;
drop type if exists artifact_status;
drop type if exists chat_role;
drop type if exists job_status;
drop type if exists card_creator;
drop type if exists file_type;
