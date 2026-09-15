-- ============================================================================
-- BMS Alumni Network — structured Country / State event fields
-- Paste this ENTIRE file into Supabase -> SQL Editor -> New query -> Run.
-- Requires the core schema (events table already exists).
-- Safe to re-run. New columns are optional, so existing events keep working
-- with them blank.
-- ============================================================================

-- Country/state on the event, alongside the free-text location line. Same
-- visibility as location (no RLS changes needed — not sensitive fields).
-- Structured for later distance-based sorting against a member's location.
alter table public.events add column if not exists country text;
alter table public.events add column if not exists state text;
