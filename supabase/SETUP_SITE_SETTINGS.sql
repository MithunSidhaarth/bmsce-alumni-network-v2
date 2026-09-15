-- ============================================================================
-- BMSCE Alumni Network — SITE SETTINGS (Careers on/off toggle) — run once
-- Paste into Supabase -> SQL Editor -> New query -> Run. Safe to re-run.
-- ============================================================================

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
