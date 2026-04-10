-- replace_project_labels RPC: atomic delete-then-insert of a project's
-- label set in a single transaction.
--
-- Replaces the two-step DELETE + INSERT in the PUT /api/projects/:id
-- route, which had to carry a snapshot/restore fallback because a
-- failed insert would leave the project unlabeled. Wrapping the two
-- writes in a plpgsql function gives us atomicity for free — any error
-- inside the function body rolls back both steps.

create or replace function public.replace_project_labels(
  p_project_id uuid,
  p_label_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.project_labels
  where project_id = p_project_id;

  if p_label_ids is not null and array_length(p_label_ids, 1) is not null then
    insert into public.project_labels (project_id, label_id)
    select p_project_id, id
    from unnest(p_label_ids) as id;
  end if;
end;
$$;

revoke all on function public.replace_project_labels(uuid, uuid[]) from public;
grant execute on function public.replace_project_labels(uuid, uuid[]) to service_role;
