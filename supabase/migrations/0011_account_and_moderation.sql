-- ============================================================================
-- BMS Alumni Network — self-serve account deletion + content reporting
-- Migration 0011 (run after 0001–0010)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Self-serve account deletion
--    A SECURITY DEFINER function runs as the table owner, so it can delete the
--    caller's auth.users row (which a normal client can't). That cascades to
--    profiles and every child table (member_contacts, mentorship_requests,
--    job_postings, job_applications, event_rsvps) via their ON DELETE CASCADE
--    foreign keys. events.created_by / social_posts.added_by are ON DELETE SET
--    NULL, so shared content stays but is de-attributed. True hard delete, no
--    service-role key required.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Content reports (moderation queue)
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('posting', 'profile', 'mentor')),
  target_id   uuid not null,
  reason      text,
  status      text not null default 'open'
                check (status in ('open', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

-- Any signed-in member can file a report as themselves.
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
  for insert
  with check (reporter_id = auth.uid());

-- Only admins can read or triage the queue.
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
  for select using (public.is_admin());

drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

grant select, insert, update on public.reports to authenticated;
