-- ============================================================================
-- BMS Alumni Network — structured Country / State profile fields
-- Paste this ENTIRE file into Supabase -> SQL Editor -> New query -> Run.
-- Requires the core schema (profiles table already exists).
-- Safe to re-run. New columns are optional, so existing accounts keep working
-- with them blank.
-- ============================================================================

-- Country/state on the profile, alongside current_city. Same visibility as
-- current_city (no RLS changes needed — not sensitive fields).
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists state text;
