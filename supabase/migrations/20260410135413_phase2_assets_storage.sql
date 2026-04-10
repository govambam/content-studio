-- Phase 2: Supabase Storage bucket for ticket attachments.
--
-- This migration is additive and safe to roll forward. The bucket is
-- private; downloads go through signed URLs issued by the API.

insert into storage.buckets (id, name, public)
values ('assets', 'assets', false)
on conflict (id) do nothing;

create policy "Authenticated users can upload assets"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'assets');

create policy "Authenticated users can read assets"
  on storage.objects for select to authenticated
  using (bucket_id = 'assets');

create policy "Authenticated users can delete assets"
  on storage.objects for delete to authenticated
  using (bucket_id = 'assets');

create policy "Service role can upload assets"
  on storage.objects for insert to service_role
  with check (bucket_id = 'assets');

create policy "Service role can read assets"
  on storage.objects for select to service_role
  using (bucket_id = 'assets');

create policy "Service role can delete assets"
  on storage.objects for delete to service_role
  using (bucket_id = 'assets');
