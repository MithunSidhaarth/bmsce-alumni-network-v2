-- ============================================================================
-- BMS Alumni Network — NEWSLETTERS: table + public PDF storage bucket
-- Paste this ENTIRE file into Supabase -> SQL Editor -> New query -> Run.
-- Requires the core schema (SETUP_LIVE_DB.sql) to have been run first.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT / DROP POLICY IF EXISTS).
-- ============================================================================

-- ----- table + RLS -----
-- Replaces the old fake newsletter signup with an archive of past newsletter
-- PDFs. Admins upload a PDF and tag it with a year (and optional title); the
-- public Newsletter page lists them, most-recent year first. Public read;
-- only admins can write.

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

-- ----- public PDF storage bucket -----
-- Unlike resumes, newsletters are meant to be freely readable, so the bucket
-- is public. PDF-only, 20 MB cap at the bucket. Writes are admin-only.
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
