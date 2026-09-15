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
