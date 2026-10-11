-- Net effect of repo migrations 0002..0011 on an empty database.

-- 0003 social_posts
create table if not exists public.social_posts (
  id             uuid primary key default gen_random_uuid(),
  post_id        text unique,
  short_code     text,
  caption        text,
  image_url      text,
  video_url      text,
  post_type      text,
  posted_at      timestamptz,
  likes_count    int default 0,
  comments_count int default 0,
  permalink      text,
  hashtags       text[],
  added_by       uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists social_posts_posted_at_idx on public.social_posts (posted_at desc);
alter table public.social_posts enable row level security;
create policy social_posts_select on public.social_posts for select using (true);
create policy social_posts_admin_write on public.social_posts
  for all using (public.is_admin()) with check (public.is_admin());

-- 0004 mentorship
alter table public.profiles add column if not exists mentor_bio text;
alter table public.profiles add column if not exists max_mentees int;
create or replace function public.shares_mentorship_with(other uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.mentorship_requests mr
    where (mr.mentor_id = auth.uid() and mr.mentee_id = other)
       or (mr.mentee_id = auth.uid() and mr.mentor_id = other)
  );
$$;

-- 0005 job postings
create table if not exists public.job_postings (
  id                   uuid primary key default gen_random_uuid(),
  posted_by            uuid references public.profiles(id) on delete cascade,
  title                text not null,
  company              text not null,
  type                 text not null check (type in ('job', 'internship')),
  location             text,
  remote               boolean default false,
  description          text not null,
  responsibilities     text,
  skills_required      text[],
  experience_level     text,
  duration             text,
  stipend_or_salary    text,
  application_deadline date,
  external_link        text,
  created_at           timestamptz not null default now()
);
create table if not exists public.job_applications (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid references public.job_postings(id) on delete cascade,
  applicant_id uuid references public.profiles(id) on delete cascade,
  cover_note   text,
  status       text not null default 'submitted'
                 check (status in ('submitted', 'reviewed', 'accepted', 'rejected')),
  created_at   timestamptz not null default now(),
  unique (job_id, applicant_id)
);
create index if not exists job_postings_created_idx on public.job_postings (created_at desc);
create index if not exists job_postings_type_idx    on public.job_postings (type);
create index if not exists job_applications_job_idx on public.job_applications (job_id, status);
create index if not exists job_applications_app_idx on public.job_applications (applicant_id);
create or replace function public.owns_posting(job uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.job_postings jp where jp.id = job and jp.posted_by = auth.uid());
$$;
alter table public.job_postings    enable row level security;
alter table public.job_applications enable row level security;
create policy job_postings_select on public.job_postings
  for select using (public.is_verified() or public.is_admin());
create policy job_postings_insert on public.job_postings
  for insert with check (posted_by = auth.uid() and public.is_verified());
create policy job_postings_update on public.job_postings
  for update using (posted_by = auth.uid() or public.is_admin())
  with check (posted_by = auth.uid() or public.is_admin());
create policy job_postings_delete on public.job_postings
  for delete using (posted_by = auth.uid() or public.is_admin());
create policy job_applications_select on public.job_applications
  for select using (applicant_id = auth.uid() or public.owns_posting(job_id) or public.is_admin());
create policy job_applications_insert on public.job_applications
  for insert with check (applicant_id = auth.uid() and public.is_verified());
create policy job_applications_update on public.job_applications
  for update using (public.owns_posting(job_id) or public.is_admin())
  with check (public.owns_posting(job_id) or public.is_admin());
create policy job_applications_delete on public.job_applications
  for delete using (applicant_id = auth.uid() or public.is_admin());
create or replace function public.shares_application_with(other uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.job_applications ja
    join public.job_postings jp on jp.id = ja.job_id
    where (jp.posted_by = auth.uid() and ja.applicant_id = other)
       or (ja.applicant_id = auth.uid() and jp.posted_by = other)
  );
$$;
create policy profiles_select_applications on public.profiles
  for select using (public.shares_application_with(id));

-- 0006
alter table public.job_postings add column if not exists closed_at timestamptz;
create index if not exists job_postings_open_idx on public.job_postings (closed_at, created_at desc);

-- 0008 contact hardening
create table if not exists public.member_contacts (
  member_id      uuid primary key references public.profiles(id) on delete cascade,
  personal_email text,
  college_email  text,
  updated_at     timestamptz not null default now()
);
alter table public.member_contacts enable row level security;
create or replace function public.has_accepted_mentorship_with(other uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.mentorship_requests mr
    where mr.status = 'accepted'
      and ((mr.mentor_id = auth.uid() and mr.mentee_id = other) or
           (mr.mentee_id = auth.uid() and mr.mentor_id = other))
  );
$$;
create policy member_contacts_select on public.member_contacts
  for select using (member_id = auth.uid() or public.is_admin() or public.has_accepted_mentorship_with(member_id));
create policy member_contacts_write on public.member_contacts
  for all using (member_id = auth.uid() or public.is_admin())
  with check (member_id = auth.uid() or public.is_admin());
grant select, insert, update on public.member_contacts to authenticated;
revoke all on public.member_contacts from anon;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  is_college boolean := lower(coalesce(new.email, '')) like '%@bmsce.ac.in';
begin
  insert into public.profiles (id, full_name, photo_url, user_type, verification_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    case when is_college then 'student' else 'alumni' end,
    case when is_college then 'verified' else 'unverified' end
  )
  on conflict (id) do nothing;
  if is_college then
    insert into public.member_contacts (member_id, college_email)
    values (new.id, new.email)
    on conflict (member_id) do update set college_email = excluded.college_email;
  end if;
  return new;
end;
$$;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select
  using (
    public.is_admin()
    or id = auth.uid()
    or (auth.uid() is not null and verification_status = 'verified' and user_type = 'alumni')
    or public.shares_mentorship_with(id)
  );
create policy profiles_select_verified_students on public.profiles
  for select
  using (auth.uid() is not null and verification_status = 'verified' and user_type = 'student');

create or replace function public.is_active_mentor(target uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = target and p.is_mentor and p.verification_status = 'verified' and p.user_type = 'alumni'
  );
$$;
drop policy if exists mentorship_insert on public.mentorship_requests;
create policy mentorship_insert on public.mentorship_requests
  for insert with check (mentee_id = auth.uid() and public.is_active_mentor(mentor_id));

-- 0008 + 0010 (row lock on the cap check)
create or replace function public.enforce_mentorship_transition()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  cap int;
  cnt int;
begin
  if new.status is distinct from old.status then
    if new.status = 'accepted' and not (auth.uid() = old.mentor_id or public.is_admin()) then
      raise exception 'Only the mentor can accept a mentorship request';
    end if;
    if new.status = 'accepted' then
      select max_mentees into cap from public.profiles where id = old.mentor_id for update;
      if cap is not null then
        select count(*) into cnt
        from public.mentorship_requests
        where mentor_id = old.mentor_id and status = 'accepted' and id <> old.id;
        if cnt >= cap then
          raise exception 'Mentor has reached their mentee limit';
        end if;
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists mentorship_transition_guard on public.mentorship_requests;
create trigger mentorship_transition_guard
  before update on public.mentorship_requests
  for each row execute function public.enforce_mentorship_transition();

-- 0009 directory search
create extension if not exists pg_trgm;
create index if not exists profiles_full_name_trgm on public.profiles using gin (full_name gin_trgm_ops);
create index if not exists profiles_company_trgm on public.profiles using gin (company gin_trgm_ops);
create index if not exists profiles_branch_idx  on public.profiles (branch);
create index if not exists profiles_city_idx    on public.profiles (current_city);
create index if not exists profiles_company_idx on public.profiles (company);
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
      )
    )
  );
end;
$$;
revoke execute on function public.directory_facets(text) from anon;
grant execute on function public.directory_facets(text) to authenticated;

-- 0011 account + moderation
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  delete from auth.users where id = uid;
end;
$$;
revoke execute on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('posting', 'profile', 'mentor')),
  target_id   uuid not null,
  reason      text,
  status      text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;
create policy reports_insert on public.reports for insert with check (reporter_id = auth.uid());
create policy reports_select on public.reports for select using (public.is_admin());
create policy reports_update on public.reports
  for update using (public.is_admin()) with check (public.is_admin());
grant select, insert, update on public.reports to authenticated;
