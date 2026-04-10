-- Fix for reorder_tickets: the previous body used `row_number() over ()`
-- with no ORDER BY, which is UB in Postgres — the planner is free to
-- assign row_number in any order, silently corrupting the sort_order
-- mapping. Replace the body with `unnest(...) WITH ORDINALITY` so the
-- ordering is derived from the array position itself.
--
-- The previous migration was already applied to the linked project with
-- the broken version, so this follow-up migration is required to update
-- remote. Local `supabase db reset` will apply both in order and end
-- with the correct body either way.

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

  update public.tickets as t
  set
    status = p_status,
    sort_order = (ord.ordinality - 1)::int,
    updated_by_client = p_client_id,
    updated_at = now()
  from unnest(p_ticket_ids) with ordinality as ord(id, ordinality)
  where t.id = ord.id
    and t.project_id = p_project_id;
end;
$$;
