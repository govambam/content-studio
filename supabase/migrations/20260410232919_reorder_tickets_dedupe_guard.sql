-- Harden reorder_tickets against duplicate ticket ids in the input
-- array. The zod schema on the API side already rejects duplicates, but
-- the SQL body is also the Phase-3 callable surface, so defend it
-- independently: raise a clear exception instead of silently picking a
-- winner when the planner joins a duplicated id against the same row
-- twice.

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
declare
  v_count int;
  v_distinct int;
begin
  if p_ticket_ids is null or array_length(p_ticket_ids, 1) is null then
    return;
  end if;

  v_count := array_length(p_ticket_ids, 1);
  select count(distinct id) into v_distinct
  from unnest(p_ticket_ids) as id;

  if v_distinct <> v_count then
    raise exception 'reorder_tickets: p_ticket_ids contains duplicate ids'
      using errcode = '22023';
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
