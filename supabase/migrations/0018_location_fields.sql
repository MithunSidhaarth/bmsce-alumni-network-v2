-- ============================================================================
-- BMS Alumni Network — structured Country / State profile fields
-- Migration 0018 (run after 0017). Runnable copy: SETUP_LOCATION_FIELDS.sql
-- ============================================================================

-- Country/state on the profile, alongside current_city. Same visibility as
-- current_city (no RLS changes needed — not sensitive fields).
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists state text;
