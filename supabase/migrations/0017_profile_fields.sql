-- ============================================================================
-- BMS Alumni Network — directory industry/role, higher education, RSVP counts
-- Migration 0017 (run after 0016). Runnable copy: SETUP_PROFILE_FIELDS.sql
-- ============================================================================

-- 1) Industry on the profile. job_title already exists and is reused as the
--    "job role", so we only add industry here. Optional (nullable).
alter table public.profiles add column if not exists industry text;

-- 2) Higher education beyond the BMS degree — a member may have several.
create table if not exists public.education_entries (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  degree      text not null,          -- e.g. "MBA", "M.S. Computer Science"
  institution text not null,          -- e.g. "Stanford University"
  year        int,                    -- optional graduation year
  created_at  timestamptz not null default now()
);
create index if not exists education_entries_profile_idx
  on public.education_entries (profile_id);

alter table public.education_entries enable row level security;

-- Read: the owner, admins, or any verified member (so entries show on the
-- member's directory profile). Write: the owner only.
drop policy if exists education_select on public.education_entries;
create policy education_select on public.education_entries
  for select using (
    profile_id = auth.uid() or public.is_admin() or public.is_verified()
  );

drop policy if exists education_insert on public.education_entries;
create policy education_insert on public.education_entries
  for insert with check (profile_id = auth.uid());

drop policy if exists education_update on public.education_entries;
create policy education_update on public.education_entries
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists education_delete on public.education_entries;
create policy education_delete on public.education_entries
  for delete using (profile_id = auth.uid());

grant select, insert, update, delete on public.education_entries to authenticated;

-- 3) Directory facets — add industries + roles (distinct job_title) alongside
--    the existing years/branches/cities/companies, so the Directory can filter
--    by them against the real query.
create or replace function public.directory_facets(p_user_type text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return (
    select json_build_object(
      'years', (
        select coalesce(json_agg(y order by y desc), '[]'::json)
        from (select distinct graduation_year y from public.profiles
              where verification_status = 'verified' and user_type = p_user_type
                and graduation_year is not null) t
      ),
      'branches', (
        select coalesce(json_agg(b order by b), '[]'::json)
        from (select distinct branch b from public.profiles
              where verification_status = 'verified' and user_type = p_user_type
                and branch is not null) t
      ),
      'cities', (
        select coalesce(json_agg(c order by c), '[]'::json)
        from (select distinct current_city c from public.profiles
              where verification_status = 'verified' and user_type = p_user_type
                and current_city is not null) t
      ),
      'companies', (
        select coalesce(json_agg(co order by co), '[]'::json)
        from (select distinct company co from public.profiles
              where verification_status = 'verified' and user_type = p_user_type
                and company is not null) t
      ),
      'industries', (
        select coalesce(json_agg(ind order by ind), '[]'::json)
        from (select distinct industry ind from public.profiles
              where verification_status = 'verified' and user_type = p_user_type
                and industry is not null) t
      ),
      'roles', (
        select coalesce(json_agg(jt order by jt), '[]'::json)
        from (select distinct job_title jt from public.profiles
              where verification_status = 'verified' and user_type = p_user_type
                and job_title is not null) t
      )
    )
  );
end;
$$;

-- 4) Aggregate RSVP counts. event_rsvps' RLS only lets a member see their own
--    row, so this SECURITY DEFINER function returns going-counts per event for
--    the "N going" display (aggregate only — never who).
create or replace function public.event_going_counts()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_object_agg(event_id, cnt), '{}'::json)
  from (
    select event_id, count(*) cnt
    from public.event_rsvps
    where status = 'going'
    group by event_id
  ) t;
$$;

grant execute on function public.event_going_counts() to authenticated, anon;
