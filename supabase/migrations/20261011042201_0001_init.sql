create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  user_type           text not null default 'alumni' check (user_type in ('alumni', 'student')),
  role                text not null default 'member' check (role in ('member', 'admin')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'verified', 'rejected')),
  rejection_reason    text,
  full_name           text,
  current_city        text,
  graduation_year     int,
  branch              text,
  company             text,
  job_title           text,
  bio                 text,
  linkedin_url        text,
  photo_url           text,
  is_mentor           boolean not null default false,
  seeking_mentorship  boolean not null default false,
  mentor_expertise    text[],
  mentor_industries   text[],
  mentor_availability text,
  onboarded           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
comment on table public.profiles is
  'One row per auth user. user_type splits alumni vs student. role/verification_status are admin-controlled.';

create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  event_date      timestamptz not null,
  location        text,
  cover_image_url text,
  rsvp_url        text,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists public.event_rsvps (
  event_id   uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'going' check (status in ('going', 'maybe', 'not_going')),
  created_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

create table if not exists public.mentorship_requests (
  id         uuid primary key default gen_random_uuid(),
  mentee_id  uuid not null references public.profiles(id) on delete cascade,
  mentor_id  uuid not null references public.profiles(id) on delete cascade,
  message    text,
  status     text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mentee_not_mentor check (mentee_id <> mentor_id)
);

create index if not exists profiles_directory_idx on public.profiles (user_type, verification_status);
create index if not exists profiles_grad_year_idx on public.profiles (graduation_year);
create index if not exists events_date_idx on public.events (event_date);
create index if not exists mentorship_mentor_idx on public.mentorship_requests (mentor_id, status);
create index if not exists mentorship_mentee_idx on public.mentorship_requests (mentee_id, status);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_verified()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and verification_status = 'verified');
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, photo_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.enforce_profile_guard();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists mentorship_touch on public.mentorship_requests;
create trigger mentorship_touch
  before update on public.mentorship_requests
  for each row execute function public.touch_updated_at();

alter table public.profiles            enable row level security;
alter table public.events              enable row level security;
alter table public.event_rsvps         enable row level security;
alter table public.mentorship_requests enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select
  using (public.is_admin() or id = auth.uid() or (verification_status = 'verified' and user_type = 'alumni'));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists events_select on public.events;
create policy events_select on public.events for select using (true);

drop policy if exists events_admin_write on public.events;
create policy events_admin_write on public.events
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists rsvps_select on public.event_rsvps;
create policy rsvps_select on public.event_rsvps
  for select using (profile_id = auth.uid() or public.is_admin());

drop policy if exists rsvps_insert on public.event_rsvps;
create policy rsvps_insert on public.event_rsvps
  for insert with check (profile_id = auth.uid() and public.is_verified());

drop policy if exists rsvps_update on public.event_rsvps;
create policy rsvps_update on public.event_rsvps
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists rsvps_delete on public.event_rsvps;
create policy rsvps_delete on public.event_rsvps
  for delete using (profile_id = auth.uid() or public.is_admin());

drop policy if exists mentorship_select on public.mentorship_requests;
create policy mentorship_select on public.mentorship_requests
  for select using (mentee_id = auth.uid() or mentor_id = auth.uid() or public.is_admin());

drop policy if exists mentorship_insert on public.mentorship_requests;
create policy mentorship_insert on public.mentorship_requests
  for insert with check (mentee_id = auth.uid());

drop policy if exists mentorship_update on public.mentorship_requests;
create policy mentorship_update on public.mentorship_requests
  for update
  using (mentor_id = auth.uid() or mentee_id = auth.uid() or public.is_admin())
  with check (mentor_id = auth.uid() or mentee_id = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars owner write" on storage.objects;
create policy "avatars owner write" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
