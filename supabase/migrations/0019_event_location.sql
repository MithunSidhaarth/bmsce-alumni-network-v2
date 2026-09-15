-- ============================================================================
-- BMS Alumni Network — structured Country / State event fields
-- Migration 0019 (run after 0018). Runnable copy: SETUP_EVENT_LOCATION.sql
-- ============================================================================

-- Country/state on the event, alongside the free-text location line. Same
-- visibility as location (no RLS changes needed — not sensitive fields).
-- Structured for later distance-based sorting against a member's location.
alter table public.events add column if not exists country text;
alter table public.events add column if not exists state text;
