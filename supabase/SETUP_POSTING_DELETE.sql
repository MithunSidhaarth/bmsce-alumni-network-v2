-- ============================================================================
-- BMS Alumni Network — POSTING DELETE/CLOSE (run once)
-- Paste into Supabase -> SQL Editor -> New query -> Run.
-- Requires SETUP_CAREERS.sql to have been run first. Safe to re-run.
-- ============================================================================

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
