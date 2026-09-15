-- ============================================================================
-- BMS Alumni Network — SECURITY: admin audit log, rate limiting, and
-- securing the legacy chapter_requests table.
-- Paste this ENTIRE file into Supabase -> SQL Editor -> New query -> Run.
-- Requires the core schema (SETUP_LIVE_DB.sql) and public.is_admin() to exist.
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Admin audit log
-- Captures sensitive admin actions (member verify/reject/unverify, posting
-- deletion, careers toggle). No UI yet — just the record. Admins read; the
-- acting user writes their own rows (admin_id must equal auth.uid()).
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id         bigint generated always as identity primary key,
  admin_id   uuid references public.profiles(id) on delete set null,
  action     text not null,            -- e.g. 'member.verify', 'posting.delete'
  target     text,                     -- id/description of the thing acted on
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

-- Only admins can read the log.
drop policy if exists admin_audit_log_select on public.admin_audit_log;
create policy admin_audit_log_select on public.admin_audit_log
  for select using (public.is_admin());

-- A signed-in user may only write rows attributed to themselves. (The server
-- actions insert here after their own authorization checks pass.)
drop policy if exists admin_audit_log_insert on public.admin_audit_log;
create policy admin_audit_log_insert on public.admin_audit_log
  for insert with check (admin_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2) Rate limiting (Postgres-backed — no new infrastructure)
-- Fixed-window counter. Only the SECURITY DEFINER function touches the table,
-- so clients have no direct access (RLS on, zero policies = deny all).
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket       text not null,          -- e.g. 'apply:<uid>'
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (bucket, window_start)
);

alter table public.rate_limits enable row level security;
-- (intentionally no policies — access is only via check_rate_limit below)

-- Returns TRUE if the action is allowed, FALSE if the bucket is over p_max for
-- the current window. Increments the counter as a side effect.
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

-- Optional housekeeping: prune windows older than a day. Run manually or via
-- pg_cron if you enable it:
--   delete from public.rate_limits where window_start < now() - interval '1 day';

-- ---------------------------------------------------------------------------
-- 3) Secure the legacy chapter_requests table (audit finding)
-- This table pre-dates these migrations (the old "Start a chapter" form wrote
-- to it via the anon client, which means it likely had RLS OFF). The form is
-- gone. Lock it down: RLS on, admin read only, no client writes.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'chapter_requests'
  ) then
    execute 'alter table public.chapter_requests enable row level security';
    execute 'drop policy if exists chapter_requests_admin_select on public.chapter_requests';
    execute 'create policy chapter_requests_admin_select on public.chapter_requests for select using (public.is_admin())';
    -- No insert/update/delete policies: nothing should write here anymore.
    raise notice 'chapter_requests secured (RLS on, admin read only).';
  else
    raise notice 'chapter_requests does not exist — nothing to secure.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Live RLS coverage check — run this to confirm every public table has RLS
-- enabled and see its policy count. Flag any row where rls_enabled = false.
-- ---------------------------------------------------------------------------
--   select c.relname as table_name,
--          c.relrowsecurity as rls_enabled,
--          (select count(*) from pg_policies p
--             where p.schemaname = 'public' and p.tablename = c.relname) as policies
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public' and c.relkind = 'r'
--   order by c.relrowsecurity asc, c.relname;
