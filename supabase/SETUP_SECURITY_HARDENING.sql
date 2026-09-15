-- ============================================================================
-- BMS Alumni Network — SECURITY HARDENING (run once, AFTER the earlier setups)
-- Paste into Supabase -> SQL Editor -> New query -> Run.
-- Fixes the contact-info leak + mentorship authorization bugs.
-- Safe to re-run. Requires SETUP_LIVE_DB, SETUP_MENTORSHIP, SETUP_CAREERS,
-- and SETUP_DIRECTORY_STUDENTS to have been run first.
-- ============================================================================

-- ============================================================================
-- BMS Alumni Network — contact/PII hardening + mentorship authorization fixes
-- Migration 0008 (run AFTER 0001–0007)
--
-- Fixes found in the security review:
--
--   CRITICAL #1  Whole-row profile SELECT leaked personal_email / college_email
--                to anyone (even the anon key = the public internet), because
--                RLS is ROW level and those columns lived on `profiles`.
--   CRITICAL #2  A forged mentorship request unlocked an arbitrary user's row.
--   HIGH #3      A mentee could self-accept (PATCH status='accepted'), skipping
--                the mentor's decision and the mentee cap.
--
-- Strategy:
--   * Move the sensitive email columns OFF `profiles` into `member_contacts`,
--     whose RLS only exposes them to the owner, an admin, or an ACCEPTED
--     mentorship counterpart. Profile-metadata visibility (name/branch/etc.)
--     then stops being a PII leak.
--   * Require authentication to view other members' profiles at all.
--   * Only let mentorship requests target a real, active mentor.
--   * Enforce "only the mentor accepts" + the cap in a DB trigger, not app code.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. member_contacts: sensitive fields, strict RLS
-- ---------------------------------------------------------------------------
create table if not exists public.member_contacts (
  member_id      uuid primary key references public.profiles(id) on delete cascade,
  personal_email text,
  college_email  text,
  updated_at     timestamptz not null default now()
);

-- Copy existing values over before the columns are dropped from profiles.
insert into public.member_contacts (member_id, personal_email, college_email)
select id, personal_email, college_email
from public.profiles
where personal_email is not null or college_email is not null
on conflict (member_id) do update
  set personal_email = excluded.personal_email,
      college_email  = excluded.college_email;

alter table public.member_contacts enable row level security;

-- Only expose contact to: the owner, an admin, or someone in an ACCEPTED
-- mentorship with the owner. SECURITY DEFINER avoids RLS recursion.
create or replace function public.has_accepted_mentorship_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mentorship_requests mr
    where mr.status = 'accepted'
      and (
        (mr.mentor_id = auth.uid() and mr.mentee_id = other) or
        (mr.mentee_id = auth.uid() and mr.mentor_id = other)
      )
  );
$$;

drop policy if exists member_contacts_select on public.member_contacts;
create policy member_contacts_select on public.member_contacts
  for select
  using (
    member_id = auth.uid()
    or public.is_admin()
    or public.has_accepted_mentorship_with(member_id)
  );

-- Owner (or admin) may write their own contact row.
drop policy if exists member_contacts_write on public.member_contacts;
create policy member_contacts_write on public.member_contacts
  for all
  using (member_id = auth.uid() or public.is_admin())
  with check (member_id = auth.uid() or public.is_admin());

grant select, insert, update on public.member_contacts to authenticated;
revoke all on public.member_contacts from anon;

-- ---------------------------------------------------------------------------
-- 2. New-user trigger writes college_email into member_contacts (not profiles)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_college boolean := lower(coalesce(new.email, '')) like '%@bmsce.ac.in';
begin
  insert into public.profiles (id, full_name, photo_url, user_type, verification_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    case when is_college then 'student' else 'alumni' end,
    case when is_college then 'verified' else 'unverified' end
  )
  on conflict (id) do nothing;

  if is_college then
    insert into public.member_contacts (member_id, college_email)
    values (new.id, new.email)
    on conflict (member_id) do update set college_email = excluded.college_email;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Drop the sensitive columns from profiles (the actual leak surface)
-- ---------------------------------------------------------------------------
alter table public.profiles drop column if exists personal_email;
alter table public.profiles drop column if exists college_email;

-- ---------------------------------------------------------------------------
-- 4. Require authentication to view other members' profile metadata
--    (the app already gates the directory behind login; RLS didn't).
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select
  using (
    public.is_admin()
    or id = auth.uid()
    or (auth.uid() is not null
        and verification_status = 'verified' and user_type = 'alumni')
    or public.shares_mentorship_with(id)
  );

drop policy if exists profiles_select_verified_students on public.profiles;
create policy profiles_select_verified_students on public.profiles
  for select
  using (
    auth.uid() is not null
    and verification_status = 'verified'
    and user_type = 'student'
  );
-- (profiles_select_applications from 0005 stays as-is; it already implies auth.)

-- ---------------------------------------------------------------------------
-- 5. Mentorship: requests may only target a real active mentor (kills forging)
-- ---------------------------------------------------------------------------
create or replace function public.is_active_mentor(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = target
      and p.is_mentor
      and p.verification_status = 'verified'
      and p.user_type = 'alumni'
  );
$$;

drop policy if exists mentorship_insert on public.mentorship_requests;
create policy mentorship_insert on public.mentorship_requests
  for insert
  with check (mentee_id = auth.uid() and public.is_active_mentor(mentor_id));

-- ---------------------------------------------------------------------------
-- 6. Only the mentor accepts; enforce the cap — in the DB, not app code.
--    (The UPDATE policy still lets a mentee move pending -> declined to cancel.)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_mentorship_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap int;
  cnt int;
begin
  if new.status is distinct from old.status then
    if new.status = 'accepted'
       and not (auth.uid() = old.mentor_id or public.is_admin()) then
      raise exception 'Only the mentor can accept a mentorship request';
    end if;

    if new.status = 'accepted' then
      select max_mentees into cap from public.profiles where id = old.mentor_id;
      if cap is not null then
        select count(*) into cnt
        from public.mentorship_requests
        where mentor_id = old.mentor_id and status = 'accepted' and id <> old.id;
        if cnt >= cap then
          raise exception 'Mentor has reached their mentee limit';
        end if;
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists mentorship_transition_guard on public.mentorship_requests;
create trigger mentorship_transition_guard
  before update on public.mentorship_requests
  for each row execute function public.enforce_mentorship_transition();

-- ============================================================================
-- NOTE: shares_mentorship_with / shares_application_with still grant PROFILE
-- METADATA visibility for pending relationships — that's required so a mentor
-- can review a pending request and a poster can review an applicant. It is no
-- longer a PII leak because contact info now lives in member_contacts, gated to
-- accepted relationships only.
-- ============================================================================
