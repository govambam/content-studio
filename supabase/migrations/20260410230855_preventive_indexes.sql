-- Preventive composite indexes to keep the Kanban list paths cheap as
-- row counts grow. The Phase 2 data audit flagged both as safe to add
-- now so they're in place before real pagination lands.
--
-- `projects(status, sort_order)` covers the Home board's default order
-- (status filter, then sort order).
--
-- `tickets(project_id, status, sort_order)` covers the project detail
-- board's fetch + the status-grouped counts path in
-- `apps/api/src/routes/projects.ts` (`loadProjectById` + list counts).

create index if not exists projects_status_sort_order_idx
  on public.projects (status, sort_order);

create index if not exists tickets_project_status_sort_order_idx
  on public.tickets (project_id, status, sort_order);
