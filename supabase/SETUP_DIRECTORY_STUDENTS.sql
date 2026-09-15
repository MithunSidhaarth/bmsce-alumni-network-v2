-- ============================================================================
-- BMS Alumni Network — SHOW STUDENTS IN DIRECTORY (run once)
-- Paste into Supabase -> SQL Editor -> New query -> Run.
-- Safe to re-run. Does not change any verification/approval logic.
-- ============================================================================

-- ============================================================================
-- BMS Alumni Network — show verified STUDENTS in the Directory
-- Migration 0007 (run after 0001; independent of the others)
--
-- WHY: profiles_select only exposed verified ALUMNI:
--     ... or (verification_status = 'verified' and user_type = 'alumni')
-- so a verified student was invisible to everyone except themselves, an admin,
-- or someone connected via a mentorship request / job application. Filtering
-- the app query alone would not have worked — Postgres filtered them out first.
--
-- Added as a SEPARATE permissive policy: PostgreSQL ORs permissive SELECT
-- policies together, so this widens visibility without rewriting (or depending
-- on the ordering of) the policies from 0001/0004/0005.
--
-- Verification logic is untouched — students still only appear once their
-- verification_status is 'verified'.
-- ============================================================================

drop policy if exists profiles_select_verified_students on public.profiles;
create policy profiles_select_verified_students on public.profiles
  for select
  using (verification_status = 'verified' and user_type = 'student');
