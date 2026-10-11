-- ============================================================================
-- BMSCE Alumni Network v2: core platform
-- Membership lifecycle, chapters, unified posts (feed + forum + chapter posts),
-- notifications and direct messages.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Private config (not exposed through the API)
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.app_config (
  key   text primary key,
  value text not null
);

-- Emails that become verified admins the moment they sign up. Edit this row
-- to change who bootstraps as admin; existing admins are managed in /admin.
insert into private.app_config (key, value)
values ('bootstrap_admin_emails', 'mithunsidhaartham@gmail.com')
on conflict (key) do nothing;

-- True when p_secret matches the server secret whose SHA-256 is stored in
-- private.app_config. Lets scheduled server routes call privileged functions
-- without the service-role key ever leaving Supabase.
create or replace function private.server_ok(p_secret text)
returns boolean language sql stable security definer set search_path = public, extensions
as $$
  select p_secret is not null and length(p_secret) >= 32 and exists (
    select 1 from private.app_config
    where key = 'server_secret_sha256'
      and value = encode(extensions.digest(p_secret, 'sha256'), 'hex')
  );
$$;

-- ---------------------------------------------------------------------------
-- Tables the app already used but that were never in a migration
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists linkedin_verified boolean not null default false;

create table if not exists public.campus_updates (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text,
  category     text not null,
  image_url    text,
  link_url     text,
  published_at timestamptz not null default now(),
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
alter table public.campus_updates enable row level security;
create policy campus_updates_select on public.campus_updates for select using (true);
create policy campus_updates_admin_write on public.campus_updates
  for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.volunteer_signups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(name) between 1 and 200),
  email      text not null check (length(email) between 3 and 320),
  batch      text,
  city       text,
  message    text check (message is null or length(message) <= 4000),
  created_at timestamptz not null default now()
);
alter table public.volunteer_signups enable row level security;
create policy volunteer_signups_insert on public.volunteer_signups for insert with check (true);
create policy volunteer_signups_select on public.volunteer_signups for select using (public.is_admin());
create policy volunteer_signups_delete on public.volunteer_signups for delete using (public.is_admin());

-- Phone numbers move out of profiles (readable by every member) into
-- member_contacts (owner, admins and accepted mentorship pairs only).
alter table public.member_contacts add column if not exists phone text;
alter table public.profiles drop column if exists phone;

-- ---------------------------------------------------------------------------
-- Profiles: lifecycle, suspension, skills, privacy, activity
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists passing_out_date date,
  add column if not exists lifecycle_hold boolean not null default false,
  add column if not exists lifecycle_note text,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text,
  add column if not exists skills text[] not null default '{}',
  add column if not exists interests text[] not null default '{}',
  add column if not exists privacy jsonb not null default
    '{"dm":"members","show_work":true,"show_location":true,"show_linkedin":true}'::jsonb,
  add column if not exists last_seen_at timestamptz;

create index if not exists profiles_lifecycle_idx
  on public.profiles (passing_out_date) where user_type = 'student';

-- Suspended accounts lose member and admin powers everywhere RLS checks them.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and suspended_at is null
  );
$$;

create or replace function public.is_verified()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and verification_status = 'verified' and suspended_at is null
  );
$$;

-- The network runs on India Standard Time: one fixed zone for every date rule.
create or replace function public.network_today()
returns date language sql stable
as $$ select (now() at time zone 'Asia/Kolkata')::date; $$;

create or replace function public.enforce_profile_guard()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only admins can change role';
    end if;
    if new.verification_status is distinct from old.verification_status then
      raise exception 'Only admins can change verification_status';
    end if;
    if new.rejection_reason is distinct from old.rejection_reason then
      raise exception 'Only admins can change rejection_reason';
    end if;
    if new.suspended_at is distinct from old.suspended_at
       or new.suspended_reason is distinct from old.suspended_reason then
      raise exception 'Only admins can suspend or restore accounts';
    end if;
    if new.lifecycle_hold is distinct from old.lifecycle_hold
       or new.lifecycle_note is distinct from old.lifecycle_note then
      raise exception 'Only admins can change lifecycle settings';
    end if;
    if new.linkedin_verified is distinct from old.linkedin_verified and new.linkedin_verified then
      if new.linkedin_url is null then
        raise exception 'Add a LinkedIn URL first';
      end if;
    end if;
    if new.user_type is distinct from old.user_type then
      if old.onboarded then
        raise exception 'Membership status changes automatically on your passing-out date. Ask an admin to correct it.';
      end if;
      -- A college-email student who picks "alumni" during onboarding still
      -- needs an admin to review them as an alum.
      if new.user_type = 'alumni' then
        new.verification_status := 'unverified';
        new.passing_out_date := null;
      end if;
    end if;
    if new.passing_out_date is distinct from old.passing_out_date and new.passing_out_date is not null then
      if new.user_type <> 'student' then
        raise exception 'Only students record a passing-out date';
      end if;
      if new.passing_out_date <= public.network_today() then
        raise exception 'Your passing-out date must be in the future. If you have already graduated, ask an admin to update your status.';
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- New accounts: college email => verified student; bootstrap emails => admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  em text := lower(coalesce(new.email, ''));
  is_college boolean := em like '%@bmsce.ac.in';
  is_boot boolean := exists (
    select 1 from private.app_config c
    where c.key = 'bootstrap_admin_emails'
      and em <> '' and em = any (string_to_array(replace(lower(c.value), ' ', ''), ','))
  );
begin
  insert into public.profiles (id, full_name, photo_url, user_type, verification_status, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    case when is_college then 'student' else 'alumni' end,
    case when is_college or is_boot then 'verified' else 'unverified' end,
    case when is_boot then 'admin' else 'member' end
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

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  actor_id   uuid references public.profiles(id) on delete set null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;
alter table public.notifications enable row level security;
create policy notifications_select on public.notifications for select using (user_id = auth.uid());
create policy notifications_update on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete using (user_id = auth.uid());
revoke insert on public.notifications from anon, authenticated;

create or replace function private.notify(
  p_user uuid, p_type text, p_actor uuid, p_title text, p_body text, p_link text
) returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_user is null or p_user = p_actor then return; end if;
  insert into public.notifications (user_id, type, actor_id, title, body, link)
  values (p_user, p_type, p_actor, p_title, left(p_body, 280), p_link);
end;
$$;

-- ---------------------------------------------------------------------------
-- Membership lifecycle (student -> alumni)
-- ---------------------------------------------------------------------------
create table if not exists public.membership_events (
  id               bigint generated always as identity primary key,
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  from_type        text,
  to_type          text,
  reason           text not null check (reason in (
    'auto_graduation', 'admin_override', 'date_correction', 'date_correction_revert', 'hold_changed'
  )),
  passing_out_date date,
  actor_id         uuid references public.profiles(id) on delete set null,
  note             text,
  created_at       timestamptz not null default now()
);
create index if not exists membership_events_profile_idx on public.membership_events (profile_id, created_at desc);
create index if not exists membership_events_created_idx on public.membership_events (created_at desc);
alter table public.membership_events enable row level security;
create policy membership_events_select on public.membership_events
  for select using (profile_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.membership_events from anon, authenticated;

create table if not exists public.job_runs (
  id          bigint generated always as identity primary key,
  job         text not null,
  ok          boolean not null,
  detail      jsonb not null default '{}'::jsonb,
  started_at  timestamptz not null default now(),
  finished_at timestamptz not null default now()
);
create index if not exists job_runs_job_idx on public.job_runs (job, started_at desc);
alter table public.job_runs enable row level security;
create policy job_runs_select on public.job_runs for select using (public.is_admin());
revoke insert, update, delete on public.job_runs from anon, authenticated;

-- Graduate one student. Returns true when a transition happened.
create or replace function private.graduate(p_profile uuid, p_reason text, p_actor uuid, p_note text)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  r public.profiles%rowtype;
begin
  select * into r from public.profiles where id = p_profile for update;
  if not found or r.user_type <> 'student' then return false; end if;
  update public.profiles
     set user_type = 'alumni',
         graduation_year = coalesce(graduation_year, extract(year from r.passing_out_date)::int)
   where id = p_profile;
  insert into public.membership_events (profile_id, from_type, to_type, reason, passing_out_date, actor_id, note)
  values (p_profile, 'student', 'alumni', p_reason, r.passing_out_date, p_actor, p_note);
  perform private.notify(
    p_profile, 'membership', null, 'You are now part of the alumni network',
    'Your membership moved from student to alumni. Your posts, messages and chapters are unchanged.',
    '/profile'
  );
  return true;
end;
$$;

-- The scheduled job. Safe to run any number of times: it only ever picks
-- students whose recorded date has been reached, and a graduated row is no
-- longer a student. Missing dates and held accounts are never touched.
create or replace function public.run_membership_lifecycle()
returns integer language plpgsql security definer set search_path = public
as $$
declare
  n integer := 0;
  r record;
  t0 timestamptz := clock_timestamp();
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  for r in
    select id from public.profiles
    where user_type = 'student'
      and passing_out_date is not null
      and passing_out_date <= public.network_today()
      and not lifecycle_hold
    order by passing_out_date
    for update skip locked
  loop
    if private.graduate(r.id, 'auto_graduation', null, null) then
      n := n + 1;
    end if;
  end loop;
  insert into public.job_runs (job, ok, detail, started_at, finished_at)
  values ('membership_lifecycle', true,
          jsonb_build_object('graduated', n, 'network_date', public.network_today(),
                             'trigger', case when auth.uid() is null then 'schedule' else 'manual' end),
          t0, clock_timestamp());
  return n;
exception when others then
  insert into public.job_runs (job, ok, detail, started_at, finished_at)
  values ('membership_lifecycle', false, jsonb_build_object('error', sqlerrm), t0, clock_timestamp());
  return -1;
end;
$$;
revoke execute on function public.run_membership_lifecycle() from anon;

-- Admin: correct a passing-out date.
-- Rule for already-processed transitions: if the member was graduated
-- automatically and the corrected date is still in the future, the automatic
-- transition is reversed (they become a student again and will graduate on the
-- new date). Transitions an admin made by hand are never reversed by a date.
create or replace function public.admin_set_passing_out_date(p_profile uuid, p_date date, p_note text)
returns text language plpgsql security definer set search_path = public
as $$
declare
  r public.profiles%rowtype;
  last_reason text;
  outcome text := 'date_updated';
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select * into r from public.profiles where id = p_profile for update;
  if not found then raise exception 'Member not found'; end if;
  if p_date is not null and (p_date < date '1946-01-01' or p_date > public.network_today() + 3650) then
    raise exception 'That date is outside the allowed range';
  end if;

  update public.profiles set passing_out_date = p_date where id = p_profile;
  insert into public.membership_events (profile_id, from_type, to_type, reason, passing_out_date, actor_id, note)
  values (p_profile, r.user_type, r.user_type, 'date_correction', p_date, auth.uid(), p_note);

  if r.user_type = 'alumni' and p_date is not null and p_date > public.network_today() then
    select reason into last_reason from public.membership_events
     where profile_id = p_profile and from_type is distinct from to_type
     order by created_at desc, id desc limit 1;
    if last_reason = 'auto_graduation' then
      update public.profiles set user_type = 'student' where id = p_profile;
      insert into public.membership_events (profile_id, from_type, to_type, reason, passing_out_date, actor_id, note)
      values (p_profile, 'alumni', 'student', 'date_correction_revert', p_date, auth.uid(), p_note);
      outcome := 'reverted_to_student';
    end if;
  elsif r.user_type = 'student' and p_date is not null and p_date <= public.network_today() and not r.lifecycle_hold then
    perform private.graduate(p_profile, 'auto_graduation', auth.uid(), coalesce(p_note, 'Date corrected to a past date'));
    outcome := 'graduated';
  end if;
  perform public.log_admin_action('membership.set_date', p_profile::text);
  return outcome;
end;
$$;

-- Admin: force a membership status, and/or hold a student back (postponed
-- graduation, backlog, year down). A held student is skipped by the job.
create or replace function public.admin_set_membership(p_profile uuid, p_type text, p_hold boolean, p_note text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  r public.profiles%rowtype;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_type not in ('student', 'alumni') then raise exception 'Bad membership type'; end if;
  select * into r from public.profiles where id = p_profile for update;
  if not found then raise exception 'Member not found'; end if;

  if r.user_type <> p_type then
    update public.profiles set user_type = p_type where id = p_profile;
    insert into public.membership_events (profile_id, from_type, to_type, reason, passing_out_date, actor_id, note)
    values (p_profile, r.user_type, p_type, 'admin_override', r.passing_out_date, auth.uid(), p_note);
  end if;
  if r.lifecycle_hold is distinct from coalesce(p_hold, false) then
    update public.profiles
       set lifecycle_hold = coalesce(p_hold, false), lifecycle_note = p_note
     where id = p_profile;
    insert into public.membership_events (profile_id, from_type, to_type, reason, passing_out_date, actor_id, note)
    values (p_profile, p_type, p_type, 'hold_changed', r.passing_out_date, auth.uid(),
            case when coalesce(p_hold, false) then 'Hold on: ' else 'Hold off: ' end || coalesce(p_note, ''));
  end if;
  perform public.log_admin_action('membership.override', p_profile::text);
end;
$$;

create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'membership-lifecycle';
-- Every 6 hours at :35 UTC. The 18:35 UTC run is 00:05 IST, so a member
-- graduates within minutes of their date arriving in India; the other three
-- runs are cheap, idempotent safety nets.
select cron.schedule('membership-lifecycle', '35 */6 * * *', $$select public.run_membership_lifecycle()$$);

-- ---------------------------------------------------------------------------
-- Chapters
-- ---------------------------------------------------------------------------
create table if not exists public.chapters (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name         text not null,
  region       text not null default 'Asia',
  country      text,
  city         text,
  description  text,
  cover_url    text,
  lng          double precision,
  lat          double precision,
  join_policy  text not null default 'open' check (join_policy in ('open', 'request')),
  whatsapp_url text,
  status       text not null default 'active' check (status in ('active', 'archived')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.chapters enable row level security;
create policy chapters_select on public.chapters for select using (status = 'active' or public.is_admin());
create policy chapters_admin_write on public.chapters
  for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.chapter_members (
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('member', 'lead')),
  status     text not null default 'active' check (status in ('active', 'pending')),
  created_at timestamptz not null default now(),
  primary key (chapter_id, profile_id)
);
create index if not exists chapter_members_profile_idx on public.chapter_members (profile_id);
alter table public.chapter_members enable row level security;

create or replace function public.is_chapter_member(p_chapter uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.chapter_members
    where chapter_id = p_chapter and profile_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.is_chapter_lead(p_chapter uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.chapter_members
    where chapter_id = p_chapter and profile_id = auth.uid() and status = 'active' and role = 'lead'
  );
$$;

create policy chapter_members_select on public.chapter_members
  for select using (
    profile_id = auth.uid() or public.is_admin()
    or (public.is_verified() and (status = 'active' or public.is_chapter_lead(chapter_id)))
  );
create policy chapter_members_delete on public.chapter_members
  for delete using (profile_id = auth.uid() or public.is_admin() or public.is_chapter_lead(chapter_id));
revoke insert, update on public.chapter_members from anon, authenticated;

create or replace function public.join_chapter(p_chapter uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare
  c public.chapters%rowtype;
  st text;
begin
  if not public.is_verified() then raise exception 'Your account needs to be verified first.'; end if;
  select * into c from public.chapters where id = p_chapter and status = 'active';
  if not found then raise exception 'Chapter not found'; end if;
  st := case when c.join_policy = 'open' then 'active' else 'pending' end;
  insert into public.chapter_members (chapter_id, profile_id, status)
  values (p_chapter, auth.uid(), st)
  on conflict (chapter_id, profile_id) do nothing;
  if st = 'pending' then
    perform private.notify(m.profile_id, 'chapter', auth.uid(), 'New request to join ' || c.name,
                           null, '/chapters/' || c.slug || '?tab=members')
    from public.chapter_members m
    where m.chapter_id = p_chapter and m.role = 'lead' and m.status = 'active';
  end if;
  select status into st from public.chapter_members where chapter_id = p_chapter and profile_id = auth.uid();
  return st;
end;
$$;

create or replace function public.review_chapter_member(p_chapter uuid, p_profile uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare
  c public.chapters%rowtype;
begin
  if not (public.is_admin() or public.is_chapter_lead(p_chapter)) then raise exception 'Not authorized'; end if;
  select * into c from public.chapters where id = p_chapter;
  if p_approve then
    update public.chapter_members set status = 'active'
     where chapter_id = p_chapter and profile_id = p_profile and status = 'pending';
    perform private.notify(p_profile, 'chapter', auth.uid(), 'You are in: ' || c.name,
                           'Your request to join was approved.', '/chapters/' || c.slug);
  else
    delete from public.chapter_members
     where chapter_id = p_chapter and profile_id = p_profile and status = 'pending';
  end if;
end;
$$;

-- Leadership is an admin decision, separate from site admin rights.
create or replace function public.admin_set_chapter_role(p_chapter uuid, p_profile uuid, p_role text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_role not in ('member', 'lead') then raise exception 'Bad role'; end if;
  insert into public.chapter_members (chapter_id, profile_id, role, status)
  values (p_chapter, p_profile, p_role, 'active')
  on conflict (chapter_id, profile_id) do update set role = excluded.role, status = 'active';
  perform public.log_admin_action('chapter.set_role:' || p_role, p_chapter::text || ':' || p_profile::text);
end;
$$;

alter table public.events add column if not exists chapter_id uuid references public.chapters(id) on delete set null;
alter table public.gallery_photos add column if not exists chapter_id uuid references public.chapters(id) on delete set null;
alter table public.gallery_photos add column if not exists event_id uuid references public.events(id) on delete set null;
create index if not exists events_chapter_idx on public.events (chapter_id, event_date);

-- ---------------------------------------------------------------------------
-- Posts: one content model for the home feed, the common forum and chapters.
--   kind = 'discussion', chapter_id null  -> the common forum
--   chapter_id set                        -> belongs to that chapter community
--   everything visible                    -> the home feed
-- ---------------------------------------------------------------------------
drop table if exists public.discussion_comment_likes;
drop table if exists public.discussion_likes;
drop table if exists public.discussion_comments;
drop table if exists public.discussion_posts;

create table if not exists public.posts (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid references public.profiles(id) on delete set null,
  kind             text not null default 'post'
                     check (kind in ('post', 'discussion', 'announcement', 'achievement', 'memory')),
  title            text check (title is null or length(title) <= 200),
  body             text not null check (length(body) between 1 and 10000),
  media            text[] not null default '{}' check (cardinality(media) <= 6),
  tags             text[] not null default '{}' check (cardinality(tags) <= 5),
  chapter_id       uuid references public.chapters(id) on delete cascade,
  event_id         uuid references public.events(id) on delete set null,
  is_pinned        boolean not null default false,
  pinned_at        timestamptz,
  is_hidden        boolean not null default false,
  comment_count    integer not null default 0,
  reaction_count   integer not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  fts              tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || body)
  ) stored
);
create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_activity_idx on public.posts (last_activity_at desc);
create index if not exists posts_kind_idx on public.posts (kind, created_at desc);
create index if not exists posts_chapter_idx on public.posts (chapter_id, created_at desc);
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);
create index if not exists posts_tags_idx on public.posts using gin (tags);
create index if not exists posts_fts_idx on public.posts using gin (fts);

create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  parent_id  uuid references public.post_comments(id) on delete cascade,
  body       text not null check (length(body) between 1 and 5000),
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

create table if not exists public.post_reactions (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null default 'like' check (kind in ('like', 'cheer', 'nostalgia', 'insight')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comment_reactions (
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.post_follows (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.posts             enable row level security;
alter table public.post_comments     enable row level security;
alter table public.post_reactions    enable row level security;
alter table public.comment_reactions enable row level security;
alter table public.post_follows      enable row level security;

create policy posts_select on public.posts
  for select using (
    public.is_admin()
    or (public.is_verified() and (not is_hidden or author_id = auth.uid()))
  );
create policy posts_insert on public.posts
  for insert with check (
    author_id = auth.uid() and public.is_verified()
    and (chapter_id is null or public.is_chapter_member(chapter_id) or public.is_admin())
  );
create policy posts_update on public.posts
  for update
  using (author_id = auth.uid() or public.is_admin()
         or (chapter_id is not null and public.is_chapter_lead(chapter_id)))
  with check (author_id = auth.uid() or public.is_admin()
         or (chapter_id is not null and public.is_chapter_lead(chapter_id)));
create policy posts_delete on public.posts
  for delete using (author_id = auth.uid() or public.is_admin());

create policy post_comments_select on public.post_comments
  for select using (
    public.is_admin() or (public.is_verified() and (not is_hidden or author_id = auth.uid()))
  );
create policy post_comments_insert on public.post_comments
  for insert with check (author_id = auth.uid() and public.is_verified());
create policy post_comments_update on public.post_comments
  for update using (public.is_admin()) with check (public.is_admin());
create policy post_comments_delete on public.post_comments
  for delete using (author_id = auth.uid() or public.is_admin());

create policy post_reactions_select on public.post_reactions
  for select using (public.is_verified() or public.is_admin());
create policy post_reactions_insert on public.post_reactions
  for insert with check (user_id = auth.uid() and public.is_verified());
create policy post_reactions_update on public.post_reactions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy post_reactions_delete on public.post_reactions
  for delete using (user_id = auth.uid());

create policy comment_reactions_select on public.comment_reactions
  for select using (public.is_verified() or public.is_admin());
create policy comment_reactions_insert on public.comment_reactions
  for insert with check (user_id = auth.uid() and public.is_verified());
create policy comment_reactions_delete on public.comment_reactions
  for delete using (user_id = auth.uid());

create policy post_follows_select on public.post_follows for select using (user_id = auth.uid());
create policy post_follows_insert on public.post_follows
  for insert with check (user_id = auth.uid() and public.is_verified());
create policy post_follows_delete on public.post_follows for delete using (user_id = auth.uid());

-- Only admins and chapter leads may pin, hide or publish announcements, no
-- matter what a client sends. Internal counter updates (made by the triggers
-- below) pass straight through.
create or replace function public.posts_guard()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  privileged boolean;
begin
  if pg_trigger_depth() > 1 or auth.uid() is null then
    return new;
  end if;
  privileged := public.is_admin()
    or (new.chapter_id is not null and public.is_chapter_lead(new.chapter_id));

  if tg_op = 'INSERT' then
    new.comment_count := 0;
    new.reaction_count := 0;
    new.is_hidden := false;
    new.created_at := now();
    new.last_activity_at := now();
    new.updated_at := null;
    if not privileged then
      if new.kind = 'announcement' then
        raise exception 'Only admins and chapter leads can post announcements';
      end if;
      new.is_pinned := false;
    end if;
    new.pinned_at := case when new.is_pinned then now() else null end;
    return new;
  end if;

  new.comment_count := old.comment_count;
  new.reaction_count := old.reaction_count;
  new.created_at := old.created_at;
  new.author_id := old.author_id;
  new.chapter_id := old.chapter_id;
  new.last_activity_at := old.last_activity_at;
  if not privileged then
    if new.is_pinned is distinct from old.is_pinned or new.is_hidden is distinct from old.is_hidden then
      raise exception 'Only admins and chapter leads can pin or hide posts';
    end if;
    if new.kind is distinct from old.kind and (new.kind = 'announcement' or old.kind = 'announcement') then
      raise exception 'Only admins and chapter leads can change announcements';
    end if;
  end if;
  if new.is_pinned is distinct from old.is_pinned then
    new.pinned_at := case when new.is_pinned then now() else null end;
  end if;
  if new.title is distinct from old.title or new.body is distinct from old.body then
    new.updated_at := now();
  end if;
  return new;
end;
$$;
create trigger posts_guard before insert or update on public.posts
  for each row execute function public.posts_guard();

create or replace function public.posts_after_insert()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.author_id is not null then
    insert into public.post_follows (post_id, user_id) values (new.id, new.author_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger posts_after_insert after insert on public.posts
  for each row execute function public.posts_after_insert();

create or replace function public.post_comments_sync()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  p public.posts%rowtype;
  who text;
begin
  if tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  update public.posts
     set comment_count = comment_count + 1, last_activity_at = now()
   where id = new.post_id
   returning * into p;
  select coalesce(full_name, 'A member') into who from public.profiles where id = new.author_id;
  perform private.notify(
    f.user_id, 'reply', new.author_id,
    who || ' replied' || case when p.title is not null then ' in "' || left(p.title, 80) || '"' else ' to a post you follow' end,
    new.body, '/community/' || new.post_id::text
  )
  from public.post_follows f where f.post_id = new.post_id;
  insert into public.post_follows (post_id, user_id) values (new.post_id, new.author_id)
  on conflict do nothing;
  return new;
end;
$$;
create trigger post_comments_sync after insert or delete on public.post_comments
  for each row execute function public.post_comments_sync();

create or replace function public.post_reactions_sync()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  p public.posts%rowtype;
  who text;
begin
  if tg_op = 'DELETE' then
    update public.posts set reaction_count = greatest(reaction_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  update public.posts set reaction_count = reaction_count + 1 where id = new.post_id returning * into p;
  select coalesce(full_name, 'A member') into who from public.profiles where id = new.user_id;
  perform private.notify(p.author_id, 'reaction', new.user_id, who || ' reacted to your post',
                         coalesce(p.title, p.body), '/community/' || new.post_id::text);
  return new;
end;
$$;
create trigger post_reactions_sync after insert or delete on public.post_reactions
  for each row execute function public.post_reactions_sync();

alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('posting', 'profile', 'mentor', 'post', 'comment', 'message'));

-- Post photos: public read, each member writes only inside their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;
create policy "post-media public read" on storage.objects for select using (bucket_id = 'post-media');
create policy "post-media owner write" on storage.objects
  for insert with check (bucket_id = 'post-media' and public.is_verified()
                         and (storage.foldername(name))[1] = auth.uid()::text);
create policy "post-media owner delete" on storage.objects
  for delete using (bucket_id = 'post-media'
                    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ---------------------------------------------------------------------------
-- Direct messages
-- ---------------------------------------------------------------------------
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
create policy user_blocks_select on public.user_blocks for select using (blocker_id = auth.uid());
create policy user_blocks_insert on public.user_blocks for insert with check (blocker_id = auth.uid());
create policy user_blocks_delete on public.user_blocks for delete using (blocker_id = auth.uid());

create table if not exists public.dm_threads (
  id              uuid primary key default gen_random_uuid(),
  user_a          uuid not null references public.profiles(id) on delete cascade,
  user_b          uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  last_preview    text,
  last_sender_id  uuid,
  created_at      timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index if not exists dm_threads_a_idx on public.dm_threads (user_a, last_message_at desc);
create index if not exists dm_threads_b_idx on public.dm_threads (user_b, last_message_at desc);

create table if not exists public.dm_messages (
  id         bigint generated always as identity primary key,
  thread_id  uuid not null references public.dm_threads(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (length(body) between 1 and 4000),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists dm_messages_thread_idx on public.dm_messages (thread_id, id desc);
create index if not exists dm_messages_unread_idx on public.dm_messages (thread_id) where read_at is null;

alter table public.dm_threads  enable row level security;
alter table public.dm_messages enable row level security;

create or replace function public.in_dm_thread(p_thread uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.dm_threads t
    where t.id = p_thread and auth.uid() in (t.user_a, t.user_b)
  );
$$;

create or replace function public.dm_blocked(p_thread uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.dm_threads t
    join public.user_blocks b
      on (b.blocker_id = t.user_a and b.blocked_id = t.user_b)
      or (b.blocker_id = t.user_b and b.blocked_id = t.user_a)
    where t.id = p_thread
  );
$$;

create policy dm_threads_select on public.dm_threads
  for select using (auth.uid() in (user_a, user_b));
revoke insert, update, delete on public.dm_threads from anon, authenticated;

create policy dm_messages_select on public.dm_messages
  for select using (public.in_dm_thread(thread_id));
create policy dm_messages_insert on public.dm_messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_verified()
    and public.in_dm_thread(thread_id)
    and not public.dm_blocked(thread_id)
  );
revoke update, delete on public.dm_messages from anon, authenticated;

-- Who may open a new conversation with p_target, honouring their privacy.
create or replace function public.can_dm(p_target uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null and p_target <> auth.uid()
    and public.is_verified()
    and exists (
      select 1 from public.profiles t
      where t.id = p_target and t.verification_status = 'verified' and t.suspended_at is null
        and (
          coalesce(t.privacy->>'dm', 'members') = 'members'
          or (t.privacy->>'dm' = 'chapters' and exists (
                select 1 from public.chapter_members a
                join public.chapter_members b on b.chapter_id = a.chapter_id
                where a.profile_id = auth.uid() and a.status = 'active'
                  and b.profile_id = t.id and b.status = 'active'))
          or public.is_admin()
        )
    )
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p_target)
         or (b.blocker_id = p_target and b.blocked_id = auth.uid())
    );
$$;

create or replace function public.start_dm(p_target uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  a uuid := least(auth.uid(), p_target);
  b uuid := greatest(auth.uid(), p_target);
  tid uuid;
begin
  if auth.uid() is null then raise exception 'You need to be signed in.'; end if;
  select id into tid from public.dm_threads where user_a = a and user_b = b;
  if tid is not null then return tid; end if;
  if not public.can_dm(p_target) then
    raise exception 'This member is not accepting messages from you.';
  end if;
  if not public.check_rate_limit('dm_start:' || auth.uid()::text, 20, 3600) then
    raise exception 'You are starting conversations too quickly. Try again later.';
  end if;
  insert into public.dm_threads (user_a, user_b) values (a, b)
  on conflict (user_a, user_b) do update set user_a = excluded.user_a
  returning id into tid;
  return tid;
end;
$$;
revoke execute on function public.start_dm(uuid) from anon;

create or replace function public.dm_messages_sync()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update public.dm_threads
     set last_message_at = new.created_at, last_preview = left(new.body, 140), last_sender_id = new.sender_id
   where id = new.thread_id;
  return new;
end;
$$;
create trigger dm_messages_sync after insert on public.dm_messages
  for each row execute function public.dm_messages_sync();

create or replace function public.mark_thread_read(p_thread uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.in_dm_thread(p_thread) then raise exception 'Not authorized'; end if;
  update public.dm_messages set read_at = now()
   where thread_id = p_thread and sender_id <> auth.uid() and read_at is null;
end;
$$;
revoke execute on function public.mark_thread_read(uuid) from anon;

-- Inbox in one round trip: the other person, last message, unread count.
create or replace function public.dm_inbox()
returns table (
  thread_id uuid, other_id uuid, other_name text, other_photo text, other_type text,
  last_message_at timestamptz, last_preview text, last_sender_id uuid, unread bigint, blocked boolean
) language sql stable security definer set search_path = public
as $$
  select t.id, o.id, o.full_name, o.photo_url, o.user_type,
         t.last_message_at, t.last_preview, t.last_sender_id,
         (select count(*) from public.dm_messages m
           where m.thread_id = t.id and m.sender_id <> auth.uid() and m.read_at is null),
         public.dm_blocked(t.id)
  from public.dm_threads t
  join public.profiles o on o.id = case when t.user_a = auth.uid() then t.user_b else t.user_a end
  where auth.uid() in (t.user_a, t.user_b) and t.last_message_at is not null
  order by t.last_message_at desc;
$$;
revoke execute on function public.dm_inbox() from anon;

create or replace function public.dm_unread_count()
returns bigint language sql stable security definer set search_path = public
as $$
  select count(*) from public.dm_messages m
  join public.dm_threads t on t.id = m.thread_id
  where auth.uid() in (t.user_a, t.user_b) and m.sender_id <> auth.uid() and m.read_at is null;
$$;
revoke execute on function public.dm_unread_count() from anon;

alter publication supabase_realtime add table public.dm_messages;
alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------------
-- Activity (for honest "active members" analytics)
-- ---------------------------------------------------------------------------
create table if not exists public.member_activity (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  day        date not null,
  primary key (profile_id, day)
);
create index if not exists member_activity_day_idx on public.member_activity (day);
alter table public.member_activity enable row level security;
create policy member_activity_select on public.member_activity for select using (public.is_admin());
revoke insert, update, delete on public.member_activity from anon, authenticated;

create or replace function public.touch_activity()
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.member_activity (profile_id, day)
  values (auth.uid(), public.network_today())
  on conflict do nothing;
  if found then
    update public.profiles set last_seen_at = now() where id = auth.uid();
  end if;
end;
$$;
revoke execute on function public.touch_activity() from anon;
