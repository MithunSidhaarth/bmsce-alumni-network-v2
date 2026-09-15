-- ==================================================================
-- BMS Alumni Network — full schema (migrations 0001–0021, in order)
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run once on a fresh project. Generated 2026-09-15.
-- ==================================================================


-- ------------------------------------------------------------------
-- 0001_init.sql
-- ------------------------------------------------------------------

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


-- ------------------------------------------------------------------
-- 0002_email_and_student_verification.sql
-- ------------------------------------------------------------------

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


-- ------------------------------------------------------------------
-- 0003_social_posts.sql
-- ------------------------------------------------------------------

-- ============================================================================
-- BMS Alumni Network — social_posts (Instagram highlights feed)
-- Migration 0003 (run AFTER 0001)
--
-- Historical Instagram posts + admin-added posts. NOT related to the `events`
-- table — this is a display-only feed. Public read; only admins can write.
-- ============================================================================

create table if not exists public.social_posts (
  id             uuid primary key default gen_random_uuid(),
  post_id        text unique,        -- Instagram post id (null for manual adds)
  short_code     text,               -- Instagram short code
  caption        text,
  image_url      text,               -- re-hosted /instagram/<code>.jpg, or pasted URL
  video_url      text,               -- usually null (link out via permalink)
  post_type      text,               -- Image | Video | Sidecar | Manual
  posted_at      timestamptz,
  likes_count    int default 0,
  comments_count int default 0,
  permalink      text,               -- permanent instagram.com/p/... link
  hashtags       text[],
  added_by       uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists social_posts_posted_at_idx
  on public.social_posts (posted_at desc);

alter table public.social_posts enable row level security;

-- Public read (the feed shows on the Events page for everyone).
drop policy if exists social_posts_select on public.social_posts;
create policy social_posts_select on public.social_posts
  for select using (true);

-- Only admins can insert/update/delete.
drop policy if exists social_posts_admin_write on public.social_posts;
create policy social_posts_admin_write on public.social_posts
  for all
  using (public.is_admin())
  with check (public.is_admin());


-- ------------------------------------------------------------------
-- 0004_mentorship.sql
-- ------------------------------------------------------------------

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


-- ------------------------------------------------------------------
-- 0005_job_postings.sql
-- ------------------------------------------------------------------

-- ============================================================================
-- BMS Alumni Network — Careers: job/internship postings + applications
-- Migration 0005 (run AFTER 0001)
--
-- Nothing for careers existed before this migration.
-- Access model: any VERIFIED member (alumnus or student) may post and apply.
-- ============================================================================

create table if not exists public.job_postings (
  id                   uuid primary key default gen_random_uuid(),
  posted_by            uuid references public.profiles(id) on delete cascade,
  title                text not null,
  company              text not null,
  type                 text not null check (type in ('job', 'internship')),
  location             text,
  remote               boolean default false,
  description          text not null,
  responsibilities     text,
  skills_required      text[],
  experience_level     text,
  duration             text,
  stipend_or_salary    text,
  application_deadline date,
  external_link        text,
  created_at           timestamptz not null default now()
);

create table if not exists public.job_applications (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid references public.job_postings(id) on delete cascade,
  applicant_id uuid references public.profiles(id) on delete cascade,
  cover_note   text,
  status       text not null default 'submitted'
                 check (status in ('submitted', 'reviewed', 'accepted', 'rejected')),
  created_at   timestamptz not null default now(),
  unique (job_id, applicant_id)
);

create index if not exists job_postings_created_idx on public.job_postings (created_at desc);
create index if not exists job_postings_type_idx    on public.job_postings (type);
create index if not exists job_applications_job_idx on public.job_applications (job_id, status);
create index if not exists job_applications_app_idx on public.job_applications (applicant_id);

-- Does the current user own this posting? SECURITY DEFINER so the inner read
-- bypasses RLS (prevents recursion between the two tables' policies).
create or replace function public.owns_posting(job uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.job_postings jp
    where jp.id = job and jp.posted_by = auth.uid()
  );
$$;

alter table public.job_postings    enable row level security;
alter table public.job_applications enable row level security;

-- ---- job_postings ----------------------------------------------------------
-- Readable by any verified member (and admins). Not public/anonymous.
drop policy if exists job_postings_select on public.job_postings;
create policy job_postings_select on public.job_postings
  for select
  using (public.is_verified() or public.is_admin());

-- Only a verified member may post, and only as themselves.
drop policy if exists job_postings_insert on public.job_postings;
create policy job_postings_insert on public.job_postings
  for insert
  with check (posted_by = auth.uid() and public.is_verified());

-- Only the poster (or an admin) may edit/remove their posting.
drop policy if exists job_postings_update on public.job_postings;
create policy job_postings_update on public.job_postings
  for update
  using (posted_by = auth.uid() or public.is_admin())
  with check (posted_by = auth.uid() or public.is_admin());

drop policy if exists job_postings_delete on public.job_postings;
create policy job_postings_delete on public.job_postings
  for delete
  using (posted_by = auth.uid() or public.is_admin());

-- ---- job_applications ------------------------------------------------------
-- Visible only to the applicant, the posting's owner, and admins.
drop policy if exists job_applications_select on public.job_applications;
create policy job_applications_select on public.job_applications
  for select
  using (
    applicant_id = auth.uid()
    or public.owns_posting(job_id)
    or public.is_admin()
  );

-- A verified member applies as themselves (duplicates blocked by the unique key).
drop policy if exists job_applications_insert on public.job_applications;
create policy job_applications_insert on public.job_applications
  for insert
  with check (applicant_id = auth.uid() and public.is_verified());

-- Only the posting's owner (or admin) changes an application's status.
drop policy if exists job_applications_update on public.job_applications;
create policy job_applications_update on public.job_applications
  for update
  using (public.owns_posting(job_id) or public.is_admin())
  with check (public.owns_posting(job_id) or public.is_admin());

-- An applicant may withdraw their own application.
drop policy if exists job_applications_delete on public.job_applications;
create policy job_applications_delete on public.job_applications
  for delete
  using (applicant_id = auth.uid() or public.is_admin());

-- ---- profile visibility between poster and applicant -----------------------
-- A poster must be able to see who applied (an applicant may be a STUDENT, who
-- is otherwise invisible because they aren't a verified alumnus), and the
-- applicant should be able to see who posted.
create or replace function public.shares_application_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.job_applications ja
    join public.job_postings jp on jp.id = ja.job_id
    where (jp.posted_by = auth.uid() and ja.applicant_id = other)
       or (ja.applicant_id = auth.uid() and jp.posted_by = other)
  );
$$;

-- Added as a SEPARATE permissive policy: PostgreSQL ORs permissive SELECT
-- policies together, so this widens visibility without rewriting (or depending
-- on the ordering of) the policy defined in 0001/0004.
drop policy if exists profiles_select_applications on public.profiles;
create policy profiles_select_applications on public.profiles
  for select
  using (public.shares_application_with(id));


-- ------------------------------------------------------------------
-- 0006_posting_close.sql
-- ------------------------------------------------------------------

-- ============================================================================
-- BMS Alumni Network — soft-delete ("close") for job postings
-- Migration 0006 (run AFTER 0005)
--
-- WHY SOFT DELETE: job_applications.job_id references job_postings(id)
-- ON DELETE CASCADE, so a hard delete would silently destroy every
-- application attached to the posting — records belonging to other people.
-- Closing hides the posting from the careers board while preserving
-- application history, and can be undone.
--
-- No RLS changes needed: closing is an UPDATE, already covered by
-- job_postings_update (posted_by = auth.uid() or is_admin()).
-- ============================================================================

alter table public.job_postings
  add column if not exists closed_at timestamptz;

-- Open postings are the common listing query.
create index if not exists job_postings_open_idx
  on public.job_postings (closed_at, created_at desc);


-- ------------------------------------------------------------------
-- 0007_directory_students.sql
-- ------------------------------------------------------------------

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


-- ------------------------------------------------------------------
-- 0008_contact_hardening.sql
-- ------------------------------------------------------------------

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


-- ------------------------------------------------------------------
-- 0009_directory_search.sql
-- ------------------------------------------------------------------

-- ============================================================================
-- BMS Alumni Network — directory search/pagination performance
-- Migration 0009 (run after 0001–0008)
--
-- The directory now filters + paginates in Postgres instead of shipping every
-- member to the browser. These indexes make the equality filters and the
-- name/company search fast at scale, and directory_facets() supplies the
-- filter dropdown options without scanning the table on the client.
-- ============================================================================

-- Trigram search for the name/company "search" box (ILIKE '%q%').
create extension if not exists pg_trgm;

create index if not exists profiles_full_name_trgm
  on public.profiles using gin (full_name gin_trgm_ops);
create index if not exists profiles_company_trgm
  on public.profiles using gin (company gin_trgm_ops);

-- Equality-filter indexes.
create index if not exists profiles_branch_idx  on public.profiles (branch);
create index if not exists profiles_city_idx    on public.profiles (current_city);
create index if not exists profiles_company_idx on public.profiles (company);

-- Distinct filter values for the dropdowns, per user_type. SECURITY DEFINER so
-- it can read across the table; gated to signed-in callers (the directory is
-- members-only) and returns only non-PII facet lists.
create or replace function public.directory_facets(p_user_type text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return (
    select json_build_object(
      'years', (
        select coalesce(json_agg(y order by y desc), '[]'::json)
        from (select distinct graduation_year y from public.profiles
              where verification_status = 'verified' and user_type = p_user_type
                and graduation_year is not null) t
      ),
      'branches', (
        select coalesce(json_agg(b order by b), '[]'::json)
        from (select distinct branch b from public.profiles
              where verification_status = 'verified' and user_type = p_user_type
                and branch is not null) t
      ),
      'cities', (
        select coalesce(json_agg(c order by c), '[]'::json)
        from (select distinct current_city c from public.profiles
              where verification_status = 'verified' and user_type = p_user_type
                and current_city is not null) t
      ),
      'companies', (
        select coalesce(json_agg(co order by co), '[]'::json)
        from (select distinct company co from public.profiles
              where verification_status = 'verified' and user_type = p_user_type
                and company is not null) t
      )
    )
  );
end;
$$;

revoke execute on function public.directory_facets(text) from anon;
grant execute on function public.directory_facets(text) to authenticated;


-- ------------------------------------------------------------------
-- 0010_mentorship_cap_lock.sql
-- ------------------------------------------------------------------

-- ============================================================================
-- BMS Alumni Network — close the mentorship mentee-cap race condition
-- Migration 0010 (run after 0008)
--
-- The cap check added in 0008 counted accepted rows and then accepted — a
-- classic check-then-act. Under Postgres' default READ COMMITTED isolation,
-- two accepts for the SAME mentor running at once could both read count < cap
-- and both commit, pushing the mentor over their stated limit.
--
-- Fix: before counting, take a row lock on the mentor's profile
-- (SELECT ... FOR UPDATE). All accepts for a given mentor contend on that one
-- row, so they serialize: the second accept blocks until the first commits,
-- then re-counts against the now-committed state and is correctly rejected if
-- the cap is full. No global isolation change, no counter column to keep in
-- sync — just a lock scoped to the single resource being limited.
-- ============================================================================

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
      -- Lock the mentor's profile row. Concurrent accepts for the same mentor
      -- queue here instead of racing past the count below.
      select max_mentees into cap
      from public.profiles
      where id = old.mentor_id
      for update;

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

-- The trigger from 0008 already points at this function; replacing the function
-- body is enough.


-- ------------------------------------------------------------------
-- 0011_account_and_moderation.sql
-- ------------------------------------------------------------------

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


-- ------------------------------------------------------------------
-- 0012_applications_resume_phone.sql
-- ------------------------------------------------------------------

-- ============================================================================
-- BMS Alumni Network — richer job applications: phone, resume, name/email
-- Migration 0012 (run after 0005)
-- ============================================================================

-- Phone on the profile (new; not retroactively required for existing users).
alter table public.profiles add column if not exists phone text;

-- Application now captures a name/email/phone snapshot (the application name may
-- differ from the display name) plus the uploaded resume's storage path.
alter table public.job_applications add column if not exists resume_url text;
alter table public.job_applications add column if not exists applicant_name text;
alter table public.job_applications add column if not exists applicant_email text;
alter table public.job_applications add column if not exists applicant_phone text;

-- ---------------------------------------------------------------------------
-- Private "resumes" bucket. Not public: files are reached only via signed URLs
-- minted for someone RLS lets read. PDF-only, 5 MB cap enforced at the bucket.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['application/pdf'];

-- Files live under the applicant's uid: resumes/<uid>/<file>.pdf
-- Read: the owner, an admin, or the poster of a job this resume was submitted to.
drop policy if exists "resumes read own or poster" on storage.objects;
create policy "resumes read own or poster" on storage.objects
  for select
  using (
    bucket_id = 'resumes'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or exists (
        select 1
        from public.job_applications ja
        join public.job_postings jp on jp.id = ja.job_id
        where ja.resume_url = storage.objects.name
          and jp.posted_by = auth.uid()
      )
    )
  );

-- Write/replace/remove: owner only (into their own folder).
drop policy if exists "resumes owner write" on storage.objects;
create policy "resumes owner write" on storage.objects
  for insert
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "resumes owner update" on storage.objects;
create policy "resumes owner update" on storage.objects
  for update
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "resumes owner delete" on storage.objects;
create policy "resumes owner delete" on storage.objects
  for delete
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ------------------------------------------------------------------
-- 0013_site_settings.sql
-- ------------------------------------------------------------------

-- ============================================================================
-- BMSCE Alumni Network — admin-controlled site settings (Careers on/off)
-- Migration 0013
--
-- A single-row settings table. `careers_enabled` gates the whole Careers
-- section (jobs / internships / mentorship) site-wide. Default OFF. An admin
-- flips it from /admin — no deploy needed.
-- ============================================================================

create table if not exists public.site_settings (
  id              int primary key default 1,
  careers_enabled boolean not null default false,
  updated_at      timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

-- Ensure the single row exists.
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

alter table public.site_settings enable row level security;

-- Anyone can read the flag (the nav / homepage / gates need it, logged in or not).
drop policy if exists site_settings_select on public.site_settings;
create policy site_settings_select on public.site_settings
  for select using (true);

-- Only admins can change it.
drop policy if exists site_settings_write on public.site_settings;
create policy site_settings_write on public.site_settings
  for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;


-- ------------------------------------------------------------------
-- 0014_newsletters.sql
-- ------------------------------------------------------------------

-- ============================================================================
-- BMS Alumni Network — newsletters (PDF archive)
-- Migration 0014 (run AFTER 0001)
--
-- Replaces the old fake newsletter signup with an archive of past newsletter
-- PDFs. Admins upload a PDF and tag it with a year (and optional title); the
-- public Newsletter page lists them, most-recent year first. Public read;
-- only admins can write. PDFs live in the public `newsletters` storage bucket.
-- ============================================================================

create table if not exists public.newsletters (
  id           uuid primary key default gen_random_uuid(),
  year         int not null,
  title        text,                 -- optional, e.g. "Spring 2024 Edition"
  pdf_url      text not null,        -- public URL in the `newsletters` bucket
  uploaded_by  uuid references public.profiles(id) on delete set null,
  uploaded_at  timestamptz not null default now()
);

-- Sort key: newest year first, then most recently uploaded within a year.
create index if not exists newsletters_year_idx
  on public.newsletters (year desc, uploaded_at desc);

alter table public.newsletters enable row level security;

-- Public read (the archive is meant to be freely readable).
drop policy if exists newsletters_select on public.newsletters;
create policy newsletters_select on public.newsletters
  for select using (true);

-- Only admins can insert/update/delete.
drop policy if exists newsletters_admin_write on public.newsletters;
create policy newsletters_admin_write on public.newsletters
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Public "newsletters" bucket. Unlike resumes, newsletters are meant to be
-- freely readable, so the bucket is public. PDF-only, 20 MB cap at the bucket.
-- Writes are admin-only (enforced here and re-checked in the server action).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('newsletters', 'newsletters', true, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = true,
      file_size_limit = 20971520,
      allowed_mime_types = array['application/pdf'];

drop policy if exists "newsletters public read" on storage.objects;
create policy "newsletters public read" on storage.objects
  for select using (bucket_id = 'newsletters');

drop policy if exists "newsletters admin write" on storage.objects;
create policy "newsletters admin write" on storage.objects
  for insert
  with check (bucket_id = 'newsletters' and public.is_admin());

drop policy if exists "newsletters admin update" on storage.objects;
create policy "newsletters admin update" on storage.objects
  for update
  using (bucket_id = 'newsletters' and public.is_admin());

drop policy if exists "newsletters admin delete" on storage.objects;
create policy "newsletters admin delete" on storage.objects
  for delete
  using (bucket_id = 'newsletters' and public.is_admin());


-- ------------------------------------------------------------------
-- 0015_security_audit.sql
-- ------------------------------------------------------------------

-- ============================================================================
-- BMS Alumni Network — security: admin audit log, rate limiting, and securing
-- the legacy chapter_requests table.
-- Migration 0015 (run after 0014). Requires public.is_admin().
-- Runnable copy for the dashboard: supabase/SETUP_SECURITY_AUDIT.sql
-- ============================================================================

-- 1) Admin audit log ---------------------------------------------------------
create table if not exists public.admin_audit_log (
  id         bigint generated always as identity primary key,
  admin_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  target     text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists admin_audit_log_select on public.admin_audit_log;
create policy admin_audit_log_select on public.admin_audit_log
  for select using (public.is_admin());

drop policy if exists admin_audit_log_insert on public.admin_audit_log;
create policy admin_audit_log_insert on public.admin_audit_log
  for insert with check (admin_id = auth.uid());

-- 2) Rate limiting -----------------------------------------------------------
create table if not exists public.rate_limits (
  bucket       text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (bucket, window_start)
);

alter table public.rate_limits enable row level security;
-- no policies: access only via the SECURITY DEFINER function below

create or replace function public.check_rate_limit(
  p_bucket text,
  p_max int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  c int;
begin
  insert into public.rate_limits (bucket, window_start, count)
  values (p_bucket, w, 1)
  on conflict (bucket, window_start)
    do update set count = public.rate_limits.count + 1
  returning count into c;

  return c <= p_max;
end;
$$;

grant execute on function public.check_rate_limit(text, int, int)
  to authenticated, anon;

-- 3) Secure legacy chapter_requests -----------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'chapter_requests'
  ) then
    execute 'alter table public.chapter_requests enable row level security';
    execute 'drop policy if exists chapter_requests_admin_select on public.chapter_requests';
    execute 'create policy chapter_requests_admin_select on public.chapter_requests for select using (public.is_admin())';
  end if;
end $$;


-- ------------------------------------------------------------------
-- 0016_discussions.sql
-- ------------------------------------------------------------------

-- ============================================================================
-- BMS Alumni Network — discussions / community Q&A (verified-members only)
-- Migration 0016 (run after 0015). Requires is_verified() / is_admin().
-- Runnable copy for the dashboard: supabase/SETUP_DISCUSSIONS.sql
-- ============================================================================

create table if not exists public.discussion_posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid references public.profiles(id) on delete set null,
  title      text not null,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists discussion_posts_created_idx
  on public.discussion_posts (created_at desc);

create table if not exists public.discussion_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.discussion_posts(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists discussion_comments_post_idx
  on public.discussion_comments (post_id, created_at);

create table if not exists public.discussion_likes (
  post_id    uuid references public.discussion_posts(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists discussion_likes_post_idx
  on public.discussion_likes (post_id);

-- ----- RLS: verified members read all; author writes/edits/deletes own;
-- admins may delete anything (moderation). Unverified/anon get nothing. -------
alter table public.discussion_posts    enable row level security;
alter table public.discussion_comments enable row level security;
alter table public.discussion_likes    enable row level security;

-- posts
drop policy if exists discussion_posts_select on public.discussion_posts;
create policy discussion_posts_select on public.discussion_posts
  for select using (public.is_verified() or public.is_admin());

drop policy if exists discussion_posts_insert on public.discussion_posts;
create policy discussion_posts_insert on public.discussion_posts
  for insert with check (author_id = auth.uid() and public.is_verified());

drop policy if exists discussion_posts_update on public.discussion_posts;
create policy discussion_posts_update on public.discussion_posts
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists discussion_posts_delete on public.discussion_posts;
create policy discussion_posts_delete on public.discussion_posts
  for delete using (author_id = auth.uid() or public.is_admin());

-- comments
drop policy if exists discussion_comments_select on public.discussion_comments;
create policy discussion_comments_select on public.discussion_comments
  for select using (public.is_verified() or public.is_admin());

drop policy if exists discussion_comments_insert on public.discussion_comments;
create policy discussion_comments_insert on public.discussion_comments
  for insert with check (author_id = auth.uid() and public.is_verified());

drop policy if exists discussion_comments_update on public.discussion_comments;
create policy discussion_comments_update on public.discussion_comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists discussion_comments_delete on public.discussion_comments;
create policy discussion_comments_delete on public.discussion_comments
  for delete using (author_id = auth.uid() or public.is_admin());

-- likes
drop policy if exists discussion_likes_select on public.discussion_likes;
create policy discussion_likes_select on public.discussion_likes
  for select using (public.is_verified() or public.is_admin());

drop policy if exists discussion_likes_insert on public.discussion_likes;
create policy discussion_likes_insert on public.discussion_likes
  for insert with check (user_id = auth.uid() and public.is_verified());

drop policy if exists discussion_likes_delete on public.discussion_likes;
create policy discussion_likes_delete on public.discussion_likes
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.discussion_posts    to authenticated;
grant select, insert, update, delete on public.discussion_comments to authenticated;
grant select, insert, delete         on public.discussion_likes     to authenticated;

-- ----- Extend the existing reports moderation table to cover discussions -----
-- (reports already carries target_type + target_id; just widen the allowed set)
alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in (
    'posting', 'profile', 'mentor', 'discussion_post', 'discussion_comment'
  ));


-- ------------------------------------------------------------------
-- 0017_profile_fields.sql
-- ------------------------------------------------------------------

-- ============================================================================
-- BMS Alumni Network — directory industry/role, higher education, RSVP counts
-- Migration 0017 (run after 0016). Runnable copy: SETUP_PROFILE_FIELDS.sql
-- ============================================================================

-- 1) Industry on the profile. job_title already exists and is reused as the
--    "job role", so we only add industry here. Optional (nullable).
alter table public.profiles add column if not exists industry text;

-- 2) Higher education beyond the BMS degree — a member may have several.
create table if not exists public.education_entries (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  degree      text not null,          -- e.g. "MBA", "M.S. Computer Science"
  institution text not null,          -- e.g. "Stanford University"
  year        int,                    -- optional graduation year
  created_at  timestamptz not null default now()
);
create index if not exists education_entries_profile_idx
  on public.education_entries (profile_id);

alter table public.education_entries enable row level security;

-- Read: the owner, admins, or any verified member (so entries show on the
-- member's directory profile). Write: the owner only.
drop policy if exists education_select on public.education_entries;
create policy education_select on public.education_entries
  for select using (
    profile_id = auth.uid() or public.is_admin() or public.is_verified()
  );

drop policy if exists education_insert on public.education_entries;
create policy education_insert on public.education_entries
  for insert with check (profile_id = auth.uid());

drop policy if exists education_update on public.education_entries;
create policy education_update on public.education_entries
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists education_delete on public.education_entries;
create policy education_delete on public.education_entries
  for delete using (profile_id = auth.uid());

grant select, insert, update, delete on public.education_entries to authenticated;

-- 3) Directory facets — add industries + roles (distinct job_title) alongside
--    the existing years/branches/cities/companies, so the Directory can filter
--    by them against the real query.
create or replace function public.directory_facets(p_user_type text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return (
    select json_build_object(
      'years', (
        select coalesce(json_agg(y order by y desc), '[]'::json)
        from (select distinct graduation_year y from public.profiles
              where verification_status = 'verified' and user_type = p_user_type
                and graduation_year is not null) t
      ),
      'branches', (
        select coalesce(json_agg(b order by b), '[]'::json)
        from (select distinct branch b from public.profiles
              where verification_status = 'verified' and user_type = p_user_type
                and branch is not null) t
      ),
      'cities', (
        select coalesce(json_agg(c order by c), '[]'::json)
        from (select distinct current_city c from public.profiles
              where verification_status = 'verified' and user_type = p_user_type
                and current_city is not null) t
      ),
      'companies', (
        select coalesce(json_agg(co order by co), '[]'::json)
        from (select distinct company co from public.profiles
              where verification_status = 'verified' and user_type = p_user_type
                and company is not null) t
      ),
      'industries', (
        select coalesce(json_agg(ind order by ind), '[]'::json)
        from (select distinct industry ind from public.profiles
              where verification_status = 'verified' and user_type = p_user_type
                and industry is not null) t
      ),
      'roles', (
        select coalesce(json_agg(jt order by jt), '[]'::json)
        from (select distinct job_title jt from public.profiles
              where verification_status = 'verified' and user_type = p_user_type
                and job_title is not null) t
      )
    )
  );
end;
$$;

-- 4) Aggregate RSVP counts. event_rsvps' RLS only lets a member see their own
--    row, so this SECURITY DEFINER function returns going-counts per event for
--    the "N going" display (aggregate only — never who).
create or replace function public.event_going_counts()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_object_agg(event_id, cnt), '{}'::json)
  from (
    select event_id, count(*) cnt
    from public.event_rsvps
    where status = 'going'
    group by event_id
  ) t;
$$;

grant execute on function public.event_going_counts() to authenticated, anon;


-- ------------------------------------------------------------------
-- 0018_location_fields.sql
-- ------------------------------------------------------------------

-- ============================================================================
-- BMS Alumni Network — structured Country / State profile fields
-- Migration 0018 (run after 0017). Runnable copy: SETUP_LOCATION_FIELDS.sql
-- ============================================================================

-- Country/state on the profile, alongside current_city. Same visibility as
-- current_city (no RLS changes needed — not sensitive fields).
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists state text;


-- ------------------------------------------------------------------
-- 0019_event_location.sql
-- ------------------------------------------------------------------

-- ============================================================================
-- BMS Alumni Network — structured Country / State event fields
-- Migration 0019 (run after 0018). Runnable copy: SETUP_EVENT_LOCATION.sql
-- ============================================================================

-- Country/state on the event, alongside the free-text location line. Same
-- visibility as location (no RLS changes needed — not sensitive fields).
-- Structured for later distance-based sorting against a member's location.
alter table public.events add column if not exists country text;
alter table public.events add column if not exists state text;


-- ------------------------------------------------------------------
-- 0020_discussion_comment_likes.sql
-- ------------------------------------------------------------------

-- ============================================================================
-- BMS Alumni Network — likes on discussion COMMENTS (replies)
-- Migration 0020 (run after 0019). Runnable copy: SETUP_DISCUSSION_COMMENT_LIKES.sql
-- ============================================================================

create table if not exists public.discussion_comment_likes (
  comment_id uuid references public.discussion_comments(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index if not exists discussion_comment_likes_comment_idx
  on public.discussion_comment_likes (comment_id);

alter table public.discussion_comment_likes enable row level security;

drop policy if exists discussion_comment_likes_select on public.discussion_comment_likes;
create policy discussion_comment_likes_select on public.discussion_comment_likes
  for select using (public.is_verified() or public.is_admin());

drop policy if exists discussion_comment_likes_insert on public.discussion_comment_likes;
create policy discussion_comment_likes_insert on public.discussion_comment_likes
  for insert with check (user_id = auth.uid() and public.is_verified());

drop policy if exists discussion_comment_likes_delete on public.discussion_comment_likes;
create policy discussion_comment_likes_delete on public.discussion_comment_likes
  for delete using (user_id = auth.uid());

grant select, insert, delete on public.discussion_comment_likes to authenticated;


-- ------------------------------------------------------------------
-- 0021_gallery.sql
-- ------------------------------------------------------------------

-- ============================================================================
-- BMS Alumni Network — public photo gallery + public image storage bucket
-- Migration 0021 (run after 0020). Runnable copy: SETUP_GALLERY.sql
-- ============================================================================

-- ----- table + RLS -----
-- A public photo gallery. Admins upload photos (batch, from the admin
-- panel); everyone — including signed-out visitors — can view it. Each row
-- stores TWO derived images, both generated client-side on upload (see
-- src/app/admin/gallery/GalleryAdmin.tsx): a small thumbnail for the grid
-- and a larger "medium" web-optimized image for the lightbox. The raw
-- original the admin picked is never uploaded or stored.
create table if not exists public.gallery_photos (
  id            uuid primary key default gen_random_uuid(),
  image_url     text not null,        -- medium, web-optimized (lightbox)
  thumbnail_url text not null,        -- small, compressed (grid)
  caption       text,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  uploaded_at   timestamptz not null default now()
);

-- Pagination is always "newest first" — see the public gallery's .range() queries.
create index if not exists gallery_photos_uploaded_at_idx
  on public.gallery_photos (uploaded_at desc);

alter table public.gallery_photos enable row level security;

-- Read: everyone, including signed-out visitors (anon).
drop policy if exists gallery_photos_select on public.gallery_photos;
create policy gallery_photos_select on public.gallery_photos
  for select using (true);

-- Write: admins only.
drop policy if exists gallery_photos_insert on public.gallery_photos;
create policy gallery_photos_insert on public.gallery_photos
  for insert with check (public.is_admin());

drop policy if exists gallery_photos_delete on public.gallery_photos;
create policy gallery_photos_delete on public.gallery_photos
  for delete using (public.is_admin());

grant select on public.gallery_photos to anon, authenticated;
grant insert, delete on public.gallery_photos to authenticated;

-- ----- public image storage bucket -----
-- Public read (anyone can view gallery photos, no login needed); admin-only
-- write. Images only, 15 MB cap — generous, since the browser compresses
-- both derivatives before upload (typically well under 1 MB each); this cap
-- just guards against something unexpectedly large slipping through.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery-photos', 'gallery-photos', true, 15728640,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 15728640,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "gallery-photos public read" on storage.objects;
create policy "gallery-photos public read" on storage.objects
  for select using (bucket_id = 'gallery-photos');

drop policy if exists "gallery-photos admin write" on storage.objects;
create policy "gallery-photos admin write" on storage.objects
  for insert
  with check (bucket_id = 'gallery-photos' and public.is_admin());

drop policy if exists "gallery-photos admin update" on storage.objects;
create policy "gallery-photos admin update" on storage.objects
  for update
  using (bucket_id = 'gallery-photos' and public.is_admin());

drop policy if exists "gallery-photos admin delete" on storage.objects;
create policy "gallery-photos admin delete" on storage.objects
  for delete
  using (bucket_id = 'gallery-photos' and public.is_admin());

