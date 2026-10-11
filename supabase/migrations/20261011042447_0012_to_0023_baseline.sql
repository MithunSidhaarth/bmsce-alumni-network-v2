-- Net effect of repo migrations 0012..0023 on an empty database.

-- 0012
alter table public.profiles add column if not exists phone text;
alter table public.job_applications add column if not exists resume_url text;
alter table public.job_applications add column if not exists applicant_name text;
alter table public.job_applications add column if not exists applicant_email text;
alter table public.job_applications add column if not exists applicant_phone text;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = 5242880, allowed_mime_types = array['application/pdf'];
create policy "resumes read own or poster" on storage.objects
  for select
  using (
    bucket_id = 'resumes'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or exists (
        select 1
        from public.job_applications ja
        join public.job_postings jp on jp.id = ja.job_id
        where ja.resume_url = storage.objects.name
          and jp.posted_by = auth.uid()
      )
    )
  );
create policy "resumes owner write" on storage.objects
  for insert with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "resumes owner update" on storage.objects
  for update using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "resumes owner delete" on storage.objects
  for delete using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- 0013
create table if not exists public.site_settings (
  id              int primary key default 1,
  careers_enabled boolean not null default false,
  updated_at      timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;
alter table public.site_settings enable row level security;
create policy site_settings_select on public.site_settings for select using (true);
create policy site_settings_write on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;

-- 0014
create table if not exists public.newsletters (
  id           uuid primary key default gen_random_uuid(),
  year         int not null,
  title        text,
  pdf_url      text not null,
  uploaded_by  uuid references public.profiles(id) on delete set null,
  uploaded_at  timestamptz not null default now()
);
create index if not exists newsletters_year_idx on public.newsletters (year desc, uploaded_at desc);
alter table public.newsletters enable row level security;
create policy newsletters_select on public.newsletters for select using (true);
create policy newsletters_admin_write on public.newsletters
  for all using (public.is_admin()) with check (public.is_admin());
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('newsletters', 'newsletters', true, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = true, file_size_limit = 20971520, allowed_mime_types = array['application/pdf'];
create policy "newsletters public read" on storage.objects
  for select using (bucket_id = 'newsletters');
create policy "newsletters admin write" on storage.objects
  for insert with check (bucket_id = 'newsletters' and public.is_admin());
create policy "newsletters admin update" on storage.objects
  for update using (bucket_id = 'newsletters' and public.is_admin());
create policy "newsletters admin delete" on storage.objects
  for delete using (bucket_id = 'newsletters' and public.is_admin());

-- 0015 + 0022
create table if not exists public.admin_audit_log (
  id         bigint generated always as identity primary key,
  admin_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  target     text,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
alter table public.admin_audit_log enable row level security;
create policy admin_audit_log_select on public.admin_audit_log for select using (public.is_admin());
create table if not exists public.rate_limits (
  bucket       text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (bucket, window_start)
);
alter table public.rate_limits enable row level security;
create or replace function public.check_rate_limit(p_bucket text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
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
grant execute on function public.check_rate_limit(text, int, int) to authenticated, anon;
create or replace function public.log_admin_action(p_action text, p_target text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can write audit log entries';
  end if;
  insert into public.admin_audit_log (admin_id, action, target)
  values (auth.uid(), p_action, p_target);
end;
$$;
revoke execute on function public.log_admin_action(text, text) from anon;
grant execute on function public.log_admin_action(text, text) to authenticated;
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if not public.check_rate_limit('delete_account:' || uid::text, 3, 3600) then
    raise exception 'Too many attempts — please wait a moment and try again.';
  end if;
  delete from auth.users where id = uid;
end;
$$;
revoke execute on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;

-- 0016
create table if not exists public.discussion_posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid references public.profiles(id) on delete set null,
  title      text not null,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists discussion_posts_created_idx on public.discussion_posts (created_at desc);
create table if not exists public.discussion_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.discussion_posts(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists discussion_comments_post_idx on public.discussion_comments (post_id, created_at);
create table if not exists public.discussion_likes (
  post_id    uuid references public.discussion_posts(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists discussion_likes_post_idx on public.discussion_likes (post_id);
alter table public.discussion_posts    enable row level security;
alter table public.discussion_comments enable row level security;
alter table public.discussion_likes    enable row level security;
create policy discussion_posts_select on public.discussion_posts
  for select using (public.is_verified() or public.is_admin());
create policy discussion_posts_insert on public.discussion_posts
  for insert with check (author_id = auth.uid() and public.is_verified());
create policy discussion_posts_update on public.discussion_posts
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy discussion_posts_delete on public.discussion_posts
  for delete using (author_id = auth.uid() or public.is_admin());
create policy discussion_comments_select on public.discussion_comments
  for select using (public.is_verified() or public.is_admin());
create policy discussion_comments_insert on public.discussion_comments
  for insert with check (author_id = auth.uid() and public.is_verified());
create policy discussion_comments_update on public.discussion_comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy discussion_comments_delete on public.discussion_comments
  for delete using (author_id = auth.uid() or public.is_admin());
create policy discussion_likes_select on public.discussion_likes
  for select using (public.is_verified() or public.is_admin());
create policy discussion_likes_insert on public.discussion_likes
  for insert with check (user_id = auth.uid() and public.is_verified());
create policy discussion_likes_delete on public.discussion_likes
  for delete using (user_id = auth.uid());
grant select, insert, update, delete on public.discussion_posts    to authenticated;
grant select, insert, update, delete on public.discussion_comments to authenticated;
grant select, insert, delete         on public.discussion_likes     to authenticated;
alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('posting', 'profile', 'mentor', 'discussion_post', 'discussion_comment'));

-- 0017
alter table public.profiles add column if not exists industry text;
create table if not exists public.education_entries (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  degree      text not null,
  institution text not null,
  year        int,
  created_at  timestamptz not null default now()
);
create index if not exists education_entries_profile_idx on public.education_entries (profile_id);
alter table public.education_entries enable row level security;
create policy education_select on public.education_entries
  for select using (profile_id = auth.uid() or public.is_admin() or public.is_verified());
create policy education_insert on public.education_entries
  for insert with check (profile_id = auth.uid());
create policy education_update on public.education_entries
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy education_delete on public.education_entries
  for delete using (profile_id = auth.uid());
grant select, insert, update, delete on public.education_entries to authenticated;
create or replace function public.directory_facets(p_user_type text)
returns json language plpgsql stable security definer set search_path = public
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
create or replace function public.event_going_counts()
returns json language sql stable security definer set search_path = public
as $$
  select coalesce(json_object_agg(event_id, cnt), '{}'::json)
  from (select event_id, count(*) cnt from public.event_rsvps where status = 'going' group by event_id) t;
$$;
grant execute on function public.event_going_counts() to authenticated, anon;

-- 0018, 0019
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists state text;
alter table public.events add column if not exists country text;
alter table public.events add column if not exists state text;

-- 0020
create table if not exists public.discussion_comment_likes (
  comment_id uuid references public.discussion_comments(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index if not exists discussion_comment_likes_comment_idx on public.discussion_comment_likes (comment_id);
alter table public.discussion_comment_likes enable row level security;
create policy discussion_comment_likes_select on public.discussion_comment_likes
  for select using (public.is_verified() or public.is_admin());
create policy discussion_comment_likes_insert on public.discussion_comment_likes
  for insert with check (user_id = auth.uid() and public.is_verified());
create policy discussion_comment_likes_delete on public.discussion_comment_likes
  for delete using (user_id = auth.uid());
grant select, insert, delete on public.discussion_comment_likes to authenticated;

-- 0021
create table if not exists public.gallery_photos (
  id            uuid primary key default gen_random_uuid(),
  image_url     text not null,
  thumbnail_url text not null,
  caption       text,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  uploaded_at   timestamptz not null default now()
);
create index if not exists gallery_photos_uploaded_at_idx on public.gallery_photos (uploaded_at desc);
alter table public.gallery_photos enable row level security;
create policy gallery_photos_select on public.gallery_photos for select using (true);
create policy gallery_photos_insert on public.gallery_photos for insert with check (public.is_admin());
create policy gallery_photos_delete on public.gallery_photos for delete using (public.is_admin());
grant select on public.gallery_photos to anon, authenticated;
grant insert, delete on public.gallery_photos to authenticated;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery-photos', 'gallery-photos', true, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 15728640,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
create policy "gallery-photos public read" on storage.objects
  for select using (bucket_id = 'gallery-photos');
create policy "gallery-photos admin write" on storage.objects
  for insert with check (bucket_id = 'gallery-photos' and public.is_admin());
create policy "gallery-photos admin update" on storage.objects
  for update using (bucket_id = 'gallery-photos' and public.is_admin());
create policy "gallery-photos admin delete" on storage.objects
  for delete using (bucket_id = 'gallery-photos' and public.is_admin());

-- 0023
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'], file_size_limit = 5242880
where id = 'avatars';
