-- ============================================================================
-- BMS Alumni Network — likes on discussion COMMENTS (replies)
-- Migration 0020 (run after 0019). Runnable copy: SETUP_DISCUSSION_COMMENT_LIKES.sql
-- ============================================================================

create table if not exists public.discussion_comment_likes (
  comment_id uuid references public.discussion_comments(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index if not exists discussion_comment_likes_comment_idx
  on public.discussion_comment_likes (comment_id);

alter table public.discussion_comment_likes enable row level security;

drop policy if exists discussion_comment_likes_select on public.discussion_comment_likes;
create policy discussion_comment_likes_select on public.discussion_comment_likes
  for select using (public.is_verified() or public.is_admin());

drop policy if exists discussion_comment_likes_insert on public.discussion_comment_likes;
create policy discussion_comment_likes_insert on public.discussion_comment_likes
  for insert with check (user_id = auth.uid() and public.is_verified());

drop policy if exists discussion_comment_likes_delete on public.discussion_comment_likes;
create policy discussion_comment_likes_delete on public.discussion_comment_likes
  for delete using (user_id = auth.uid());

grant select, insert, delete on public.discussion_comment_likes to authenticated;
