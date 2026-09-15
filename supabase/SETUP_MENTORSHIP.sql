-- ============================================================================
-- BMS Alumni Network — MENTORSHIP SETUP (run once)
-- Paste this ENTIRE file into Supabase -> SQL Editor -> New query -> Run.
-- Requires SETUP_LIVE_DB.sql to have been run first.
-- Safe to re-run.
-- ============================================================================

-- ============================================================================
-- BMS Alumni Network — mentorship: missing profile columns + visibility
-- Migration 0004 (run AFTER 0001)
--
-- What already exists (0001) and is REUSED, not duplicated:
--   profiles.is_mentor, mentor_expertise, mentor_industries,
--   mentor_availability, seeking_mentorship
--   mentorship_requests (id, mentee_id, mentor_id, message, status,
--                        created_at, updated_at) + its RLS policies
--
-- What this migration ADDS:
--   profiles.mentor_bio  — the mentor's short pitch
--   profiles.max_mentees — optional cap on concurrent mentees
--   shares_mentorship_with() + an extra profiles SELECT rule so a mentor and
--   mentee can see each other's profile (a student mentee is otherwise
--   invisible to the mentor, since students aren't verified alumni).
-- ============================================================================

alter table public.profiles add column if not exists mentor_bio text;
alter table public.profiles add column if not exists max_mentees int;

-- Can the current user see this other profile because they share a mentorship
-- request? SECURITY DEFINER so it bypasses RLS internally (no recursion).
create or replace function public.shares_mentorship_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mentorship_requests mr
    where (mr.mentor_id = auth.uid() and mr.mentee_id = other)
       or (mr.mentee_id = auth.uid() and mr.mentor_id = other)
  );
$$;

-- Replace the profiles SELECT policy to also allow mentor <-> mentee visibility.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select
  using (
    public.is_admin()
    or id = auth.uid()
    or (verification_status = 'verified' and user_type = 'alumni')
    or public.shares_mentorship_with(id)
  );

-- NOTE: mentorship_requests RLS from 0001 is already correct and unchanged:
--   select: mentee_id = auth.uid() or mentor_id = auth.uid() or is_admin()
--   insert: mentee_id = auth.uid()
--   update: mentor_id = auth.uid() or mentee_id = auth.uid() or is_admin()
-- And profiles UPDATE remains owner-or-admin, so the mentor opt-in fields
-- (is_mentor / mentor_expertise / mentor_bio / max_mentees) are writable only
-- by the profile's own owner (or an admin).
