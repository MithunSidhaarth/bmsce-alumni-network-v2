-- ============================================================================
-- BMS Alumni Network — ONE-TIME LIVE DATABASE SETUP
-- Paste this ENTIRE file into: Supabase dashboard -> SQL Editor -> New query
-- then click RUN. It creates profiles, events, event_rsvps,
-- mentorship_requests, all RLS policies, triggers, and the avatars bucket.
-- Safe to run more than once (guarded with IF NOT EXISTS / DROP IF EXISTS).
-- Does NOT touch your existing chapter_requests table.
-- ============================================================================

-- ----- part 1 of 2 : core schema, RLS, triggers, storage -----
-- ============================================================================
-- BMS Alumni Network — initial schema, RLS, triggers, storage
-- Migration 0001
--
-- Safe to run once on a fresh project. Paste into Supabase dashboard →
-- SQL Editor → Run. Everything is idempotent-ish (guarded with IF NOT EXISTS
-- / DROP ... IF EXISTS) so re-running is non-destructive to data.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- profiles: one row per auth user. Alumni and students share this table,
-- discriminated by user_type. Privilege-sensitive columns (role,
-- verification_status, rejection_reason) can only be changed by an admin —
-- enforced by the enforce_profile_guard() trigger below, not just RLS.
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  user_type           text not null default 'alumni'
                        check (user_type in ('alumni', 'student')),
  role                text not null default 'member'
                        check (role in ('member', 'admin')),
  verification_status text not null default 'unverified'
                        check (verification_status in ('unverified', 'verified', 'rejected')),
  rejection_reason    text,

  -- profile fields (shared; some only relevant to alumni)
  full_name           text,
  current_city        text,
  graduation_year     int,   -- alumni: year graduated; student: expected year
  branch              text,  -- academic branch / degree, e.g. "Computer Science"
  company             text,
  job_title           text,
  bio                 text,
  linkedin_url        text,
  photo_url           text,

  -- mentorship (alumni act as mentors; students/junior alumni seek mentorship)
  is_mentor           boolean not null default false,
  seeking_mentorship  boolean not null default false,
  mentor_expertise    text[],
  mentor_industries   text[],
  mentor_availability text,

  onboarded           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user. user_type splits alumni vs student. role/verification_status are admin-controlled.';

-- events: admin-authored, public to read.
create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  event_date      timestamptz not null,
  location        text,
  cover_image_url text,
  rsvp_url        text,   -- optional external RSVP; in-app RSVP via event_rsvps
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- event_rsvps: in-app RSVP. One row per (event, profile).
create table if not exists public.event_rsvps (
  event_id   uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'going'
              check (status in ('going', 'maybe', 'not_going')),
  created_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

-- mentorship_requests: mentee → mentor request/accept/decline flow.
-- mentee can be a student or a (verified) alum; mentor is a verified alum
-- who has toggled is_mentor.
create table if not exists public.mentorship_requests (
  id         uuid primary key default gen_random_uuid(),
  mentee_id  uuid not null references public.profiles(id) on delete cascade,
  mentor_id  uuid not null references public.profiles(id) on delete cascade,
  message    text,
  status     text not null default 'pending'
              check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mentee_not_mentor check (mentee_id <> mentor_id)
);

-- Helpful indexes
create index if not exists profiles_directory_idx
  on public.profiles (user_type, verification_status);
create index if not exists profiles_grad_year_idx on public.profiles (graduation_year);
create index if not exists events_date_idx on public.events (event_date);
create index if not exists mentorship_mentor_idx on public.mentorship_requests (mentor_id, status);
create index if not exists mentorship_mentee_idx on public.mentorship_requests (mentee_id, status);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid RLS recursion on profiles)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_verified()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and verification_status = 'verified'
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Auto-create a profiles row when a new auth user is created.
-- Pulls name + avatar from the OAuth provider metadata when available.
-- user_type defaults to 'alumni'; the onboarding UI can switch it to 'student'
-- (that column is NOT locked — only role/verification_status are).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, photo_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Guard: non-admins may not change privilege-sensitive columns on their profile.
create or replace function public.enforce_profile_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for service-role / SQL-editor calls (trusted server
  -- context) — those are allowed through so you can bootstrap the first admin.
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only admins can change role';
    end if;
    if new.verification_status is distinct from old.verification_status then
      raise exception 'Only admins can change verification_status';
    end if;
    if new.rejection_reason is distinct from old.rejection_reason then
      raise exception 'Only admins can change rejection_reason';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.enforce_profile_guard();

-- keep mentorship_requests.updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists mentorship_touch on public.mentorship_requests;
create trigger mentorship_touch
  before update on public.mentorship_requests
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.events              enable row level security;
alter table public.event_rsvps         enable row level security;
alter table public.mentorship_requests enable row level security;

-- ---- profiles --------------------------------------------------------------
-- Read: admins see all; you always see yourself; everyone (authenticated)
-- sees VERIFIED ALUMNI (this is what powers the Directory). Students and
-- unverified alumni are not exposed to other users.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select
  using (
    public.is_admin()
    or id = auth.uid()
    or (verification_status = 'verified' and user_type = 'alumni')
  );

-- Insert: a user may insert only their own row (the trigger normally does this,
-- but this is a safe fallback for client-side upserts).
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert
  with check (id = auth.uid());

-- Update: the owner or an admin. Column-level protection (role/
-- verification_status) is enforced by the profiles_guard trigger above.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- No delete policy: users can't delete profiles (only cascade from auth.users).

-- ---- events ----------------------------------------------------------------
-- Public read (anon + authenticated); writes admin-only.
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select using (true);

drop policy if exists events_admin_write on public.events;
create policy events_admin_write on public.events
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- event_rsvps -----------------------------------------------------------
-- You see/manage your own RSVP; admins see all. Only verified members may RSVP.
drop policy if exists rsvps_select on public.event_rsvps;
create policy rsvps_select on public.event_rsvps
  for select
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists rsvps_insert on public.event_rsvps;
create policy rsvps_insert on public.event_rsvps
  for insert
  with check (profile_id = auth.uid() and public.is_verified());

drop policy if exists rsvps_update on public.event_rsvps;
create policy rsvps_update on public.event_rsvps
  for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists rsvps_delete on public.event_rsvps;
create policy rsvps_delete on public.event_rsvps
  for delete
  using (profile_id = auth.uid() or public.is_admin());

-- ---- mentorship_requests ---------------------------------------------------
-- Visible only to the two parties + admins.
drop policy if exists mentorship_select on public.mentorship_requests;
create policy mentorship_select on public.mentorship_requests
  for select
  using (mentee_id = auth.uid() or mentor_id = auth.uid() or public.is_admin());

-- Mentee creates the request for themselves. Must be verified (verified alum
-- or, for students, verification_status is left 'unverified' — see note below).
drop policy if exists mentorship_insert on public.mentorship_requests;
create policy mentorship_insert on public.mentorship_requests
  for insert
  with check (mentee_id = auth.uid());

-- Mentor accepts/declines their own requests; mentee may cancel; admins too.
drop policy if exists mentorship_update on public.mentorship_requests;
create policy mentorship_update on public.mentorship_requests
  for update
  using (mentor_id = auth.uid() or mentee_id = auth.uid() or public.is_admin())
  with check (mentor_id = auth.uid() or mentee_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: avatars bucket (public read, users write to their own folder)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Files must live under a folder named after the user's uid: avatars/<uid>/...
drop policy if exists "avatars owner write" on storage.objects;
create policy "avatars owner write" on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- NOTE ON STUDENTS + MENTORSHIP:
-- Students do not go through alumni verification, so their
-- verification_status stays 'unverified'. They are still allowed to create
-- mentorship_requests (the insert policy only checks mentee_id = auth.uid()).
-- They are excluded from the Directory (profiles_select requires
-- verification_status='verified' AND user_type='alumni') and cannot RSVP to
-- events (rsvps_insert requires is_verified()). Adjust if you want students
-- to RSVP too.
-- ============================================================================

-- ----- part 2 of 2 : email columns + college-email student auto-verify -----
-- ============================================================================
-- BMS Alumni Network — email sign-in + college-email student auto-verification
-- Migration 0002 (run AFTER 0001)
--
-- - Adds college_email / personal_email columns to profiles.
-- - Updates handle_new_user(): anyone signing up with an @bmsce.ac.in address
--   is treated as a verified STUDENT (receiving the magic link proves they own
--   a real BMS mailbox). Everyone else defaults to an unverified alum, subject
--   to admin review.
-- ============================================================================

alter table public.profiles add column if not exists college_email text;
alter table public.profiles add column if not exists personal_email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_college boolean := lower(coalesce(new.email, '')) like '%@bmsce.ac.in';
begin
  insert into public.profiles (
    id,
    full_name,
    photo_url,
    user_type,
    verification_status,
    college_email
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    case when is_college then 'student' else 'alumni' end,
    case when is_college then 'verified' else 'unverified' end,
    case when is_college then new.email else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- (trigger on_auth_user_created from 0001 already points at this function)
