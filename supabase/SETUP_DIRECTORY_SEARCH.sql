-- ============================================================================
-- BMS Alumni Network — DIRECTORY SEARCH & PAGINATION (run once)
-- Paste into Supabase -> SQL Editor -> New query -> Run. Safe to re-run.
-- Enables fast filtering + the filter dropdowns. The directory still works
-- without it (search + pagination), just without the dropdown options.
-- ============================================================================

-- ============================================================================
-- BMS Alumni Network — directory search/pagination performance
-- Migration 0009 (run after 0001–0008)
--
-- The directory now filters + paginates in Postgres instead of shipping every
-- member to the browser. These indexes make the equality filters and the
-- name/company search fast at scale, and directory_facets() supplies the
-- filter dropdown options without scanning the table on the client.
-- ============================================================================

-- Trigram search for the name/company "search" box (ILIKE '%q%').
create extension if not exists pg_trgm;

create index if not exists profiles_full_name_trgm
  on public.profiles using gin (full_name gin_trgm_ops);
create index if not exists profiles_company_trgm
  on public.profiles using gin (company gin_trgm_ops);

-- Equality-filter indexes.
create index if not exists profiles_branch_idx  on public.profiles (branch);
create index if not exists profiles_city_idx    on public.profiles (current_city);
create index if not exists profiles_company_idx on public.profiles (company);

-- Distinct filter values for the dropdowns, per user_type. SECURITY DEFINER so
-- it can read across the table; gated to signed-in callers (the directory is
-- members-only) and returns only non-PII facet lists.
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
      )
    )
  );
end;
$$;

revoke execute on function public.directory_facets(text) from anon;
grant execute on function public.directory_facets(text) to authenticated;
