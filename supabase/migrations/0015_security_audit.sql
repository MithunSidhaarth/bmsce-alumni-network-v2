-- ============================================================================
-- BMS Alumni Network — security: admin audit log, rate limiting, and securing
-- the legacy chapter_requests table.
-- Migration 0015 (run after 0014). Requires public.is_admin().
-- Runnable copy for the dashboard: supabase/SETUP_SECURITY_AUDIT.sql
-- ============================================================================

-- 1) Admin audit log ---------------------------------------------------------
create table if not exists public.admin_audit_log (
  id         bigint generated always as identity primary key,
  admin_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  target     text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists admin_audit_log_select on public.admin_audit_log;
create policy admin_audit_log_select on public.admin_audit_log
  for select using (public.is_admin());

drop policy if exists admin_audit_log_insert on public.admin_audit_log;
create policy admin_audit_log_insert on public.admin_audit_log
  for insert with check (admin_id = auth.uid());

-- 2) Rate limiting -----------------------------------------------------------
create table if not exists public.rate_limits (
  bucket       text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (bucket, window_start)
);

alter table public.rate_limits enable row level security;
-- no policies: access only via the SECURITY DEFINER function below

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

-- 3) Secure legacy chapter_requests -----------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'chapter_requests'
  ) then
    execute 'alter table public.chapter_requests enable row level security';
    execute 'drop policy if exists chapter_requests_admin_select on public.chapter_requests';
    execute 'create policy chapter_requests_admin_select on public.chapter_requests for select using (public.is_admin())';
  end if;
end $$;
