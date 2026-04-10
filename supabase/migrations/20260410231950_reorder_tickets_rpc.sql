-- reorder_tickets RPC: atomic status + sort_order update for one column.
--
-- Replaces the N sequential PUTs the frontend currently issues per drop
-- (one per affected ticket) with a single round trip. The function
-- rewrites `status` and `sort_order` for every id in `p_ticket_ids`,
-- indexed by its position in the array, and stamps them all with the
-- caller's `p_client_id` so the realtime echo-suppression path still
-- works.
--
-- Scoping: the function is declared SECURITY INVOKER and restricted to
-- the service_role (the API process) for now. When Phase 3 lands per-
-- request Supabase clients, the GRANT can be broadened to authenticated
-- and the body can check `auth.uid()` against `project_members`.

create or replace function public.reorder_tickets(
  p_project_id uuid,
  p_status public.content_status,
  p_ticket_ids uuid[],
  p_client_id text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_ticket_ids is null or array_length(p_ticket_ids, 1) is null then
    return;
  end if;

  -- Use a single UPDATE ... FROM unnest(...) so every row in the column
  -- is rewritten in one statement. The row's new sort_order is its
  -- 0-indexed position in the provided array. We also constrain the
  -- update to the given project so a stray client cannot move tickets
  -- into a project they did not name.
  update public.tickets as t
  set
    status = p_status,
    sort_order = ord.pos,
    updated_by_client = p_client_id,
    updated_at = now()
  from (
    select
      id,
      (row_number() over () - 1)::int as pos
    from unnest(p_ticket_ids) as id
  ) as ord
  where t.id = ord.id
    and t.project_id = p_project_id;
end;
$$;

revoke all on function public.reorder_tickets(uuid, public.content_status, uuid[], text) from public;
grant execute on function public.reorder_tickets(uuid, public.content_status, uuid[], text) to service_role;
