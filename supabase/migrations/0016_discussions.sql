-- ============================================================================
-- BMS Alumni Network — discussions / community Q&A (verified-members only)
-- Migration 0016 (run after 0015). Requires is_verified() / is_admin().
-- Runnable copy for the dashboard: supabase/SETUP_DISCUSSIONS.sql
-- ============================================================================

create table if not exists public.discussion_posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid references public.profiles(id) on delete set null,
  title      text not null,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists discussion_posts_created_idx
  on public.discussion_posts (created_at desc);

create table if not exists public.discussion_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.discussion_posts(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists discussion_comments_post_idx
  on public.discussion_comments (post_id, created_at);

create table if not exists public.discussion_likes (
  post_id    uuid references public.discussion_posts(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists discussion_likes_post_idx
  on public.discussion_likes (post_id);

-- ----- RLS: verified members read all; author writes/edits/deletes own;
-- admins may delete anything (moderation). Unverified/anon get nothing. -------
alter table public.discussion_posts    enable row level security;
alter table public.discussion_comments enable row level security;
alter table public.discussion_likes    enable row level security;

-- posts
drop policy if exists discussion_posts_select on public.discussion_posts;
create policy discussion_posts_select on public.discussion_posts
  for select using (public.is_verified() or public.is_admin());

drop policy if exists discussion_posts_insert on public.discussion_posts;
create policy discussion_posts_insert on public.discussion_posts
  for insert with check (author_id = auth.uid() and public.is_verified());

drop policy if exists discussion_posts_update on public.discussion_posts;
create policy discussion_posts_update on public.discussion_posts
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists discussion_posts_delete on public.discussion_posts;
create policy discussion_posts_delete on public.discussion_posts
  for delete using (author_id = auth.uid() or public.is_admin());

-- comments
drop policy if exists discussion_comments_select on public.discussion_comments;
create policy discussion_comments_select on public.discussion_comments
  for select using (public.is_verified() or public.is_admin());

drop policy if exists discussion_comments_insert on public.discussion_comments;
create policy discussion_comments_insert on public.discussion_comments
  for insert with check (author_id = auth.uid() and public.is_verified());

drop policy if exists discussion_comments_update on public.discussion_comments;
create policy discussion_comments_update on public.discussion_comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists discussion_comments_delete on public.discussion_comments;
create policy discussion_comments_delete on public.discussion_comments
  for delete using (author_id = auth.uid() or public.is_admin());

-- likes
drop policy if exists discussion_likes_select on public.discussion_likes;
create policy discussion_likes_select on public.discussion_likes
  for select using (public.is_verified() or public.is_admin());

drop policy if exists discussion_likes_insert on public.discussion_likes;
create policy discussion_likes_insert on public.discussion_likes
  for insert with check (user_id = auth.uid() and public.is_verified());

drop policy if exists discussion_likes_delete on public.discussion_likes;
create policy discussion_likes_delete on public.discussion_likes
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.discussion_posts    to authenticated;
grant select, insert, update, delete on public.discussion_comments to authenticated;
grant select, insert, delete         on public.discussion_likes     to authenticated;

-- ----- Extend the existing reports moderation table to cover discussions -----
-- (reports already carries target_type + target_id; just widen the allowed set)
alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in (
    'posting', 'profile', 'mentor', 'discussion_post', 'discussion_comment'
  ));
