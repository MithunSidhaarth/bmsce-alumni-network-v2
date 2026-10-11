-- Server secret (hash only), Instagram token storage, small read helpers.

-- SHA-256 of APP_SERVER_SECRET. Rotate by replacing this row and the env var.
insert into private.app_config (key, value)
values ('server_secret_sha256', 'c7c5a51422692ed922e90db86e9ac2f0c4acae44e79fcd09886a4a51735018e9')
on conflict (key) do update set value = excluded.value;

alter table public.site_settings alter column ig_handle set default 'bmscealumni';
update public.site_settings set ig_handle = 'bmscealumni' where id = 1;

-- Member counts per chapter in one call (verified members only).
create or replace function public.chapter_member_counts()
returns jsonb language sql stable security definer set search_path = public
as $$
  select case when public.is_verified() or public.is_admin() then
    coalesce((select jsonb_object_agg(chapter_id, n) from (
      select chapter_id, count(*) as n from public.chapter_members
      where status = 'active' group by chapter_id) t), '{}'::jsonb)
  else '{}'::jsonb end;
$$;
revoke execute on function public.chapter_member_counts() from anon;

-- Instagram access token. Kept in the private schema so it is never readable
-- through the API: only the server (with the server secret) can fetch it,
-- and admins can replace it or see whether one exists and when it expires.
create or replace function public.ig_token_get(p_secret text)
returns text language plpgsql stable security definer set search_path = public
as $$
begin
  if not private.server_ok(p_secret) then raise exception 'Not authorized'; end if;
  return (select value from private.app_config where key = 'ig_access_token');
end;
$$;

create or replace function public.ig_token_set(p_secret text, p_token text, p_expires_at timestamptz)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not (public.is_admin() or private.server_ok(p_secret)) then raise exception 'Not authorized'; end if;
  if p_token is null or length(trim(p_token)) < 20 then
    delete from private.app_config where key in ('ig_access_token', 'ig_token_expires_at');
  else
    insert into private.app_config (key, value) values ('ig_access_token', trim(p_token))
    on conflict (key) do update set value = excluded.value;
    insert into private.app_config (key, value)
    values ('ig_token_expires_at', coalesce(p_expires_at::text, ''))
    on conflict (key) do update set value = excluded.value;
  end if;
  if public.is_admin() then
    perform public.log_admin_action('instagram.token_' || case when p_token is null then 'removed' else 'updated' end, null);
  end if;
end;
$$;

create or replace function public.ig_connection()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return jsonb_build_object(
    'has_stored_token', exists (select 1 from private.app_config where key = 'ig_access_token'),
    'expires_at', (select nullif(value, '') from private.app_config where key = 'ig_token_expires_at'),
    'server_secret_set', exists (select 1 from private.app_config where key = 'server_secret_sha256')
  );
end;
$$;
revoke execute on function public.ig_connection() from anon;

-- Students whose record cannot be graduated automatically and needs a human.
create or replace function public.lifecycle_needs_review()
returns table (id uuid, full_name text, graduation_year int, passing_out_date date, lifecycle_hold boolean, reason text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.full_name, p.graduation_year, p.passing_out_date, p.lifecycle_hold,
    case
      when p.lifecycle_hold then 'On hold'
      when p.passing_out_date is null and p.graduation_year is null then 'No passing-out date'
      when p.passing_out_date is null and p.graduation_year < extract(year from public.network_today())::int
        then 'Only a graduation year on file, and it has passed'
      when p.passing_out_date is null then 'Only a graduation year on file: exact date needed'
    end
  from public.profiles p
  where public.is_admin() and p.user_type = 'student'
    and (p.passing_out_date is null or p.lifecycle_hold)
  order by p.graduation_year nulls first, p.full_name;
$$;
revoke execute on function public.lifecycle_needs_review() from anon;
