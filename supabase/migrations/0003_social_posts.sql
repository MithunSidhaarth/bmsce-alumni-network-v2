-- ============================================================================
-- BMS Alumni Network — social_posts (Instagram highlights feed)
-- Migration 0003 (run AFTER 0001)
--
-- Historical Instagram posts + admin-added posts. NOT related to the `events`
-- table — this is a display-only feed. Public read; only admins can write.
-- ============================================================================

create table if not exists public.social_posts (
  id             uuid primary key default gen_random_uuid(),
  post_id        text unique,        -- Instagram post id (null for manual adds)
  short_code     text,               -- Instagram short code
  caption        text,
  image_url      text,               -- re-hosted /instagram/<code>.jpg, or pasted URL
  video_url      text,               -- usually null (link out via permalink)
  post_type      text,               -- Image | Video | Sidecar | Manual
  posted_at      timestamptz,
  likes_count    int default 0,
  comments_count int default 0,
  permalink      text,               -- permanent instagram.com/p/... link
  hashtags       text[],
  added_by       uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists social_posts_posted_at_idx
  on public.social_posts (posted_at desc);

alter table public.social_posts enable row level security;

-- Public read (the feed shows on the Events page for everyone).
drop policy if exists social_posts_select on public.social_posts;
create policy social_posts_select on public.social_posts
  for select using (true);

-- Only admins can insert/update/delete.
drop policy if exists social_posts_admin_write on public.social_posts;
create policy social_posts_admin_write on public.social_posts
  for all
  using (public.is_admin())
  with check (public.is_admin());
