-- ============================================================================
-- BMS Alumni Network — CAREERS SETUP (job postings + applications)
-- Paste this ENTIRE file into Supabase -> SQL Editor -> New query -> Run.
-- Requires SETUP_LIVE_DB.sql to have been run first. Safe to re-run.
-- Independent of SETUP_MENTORSHIP.sql (order does not matter).
-- ============================================================================

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
