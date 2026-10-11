-- ============================================================================
-- BMSCE Alumni Network v2: noticeboard, Instagram sync, Blog & Insights,
-- newsletter digests, admin analytics.
-- ============================================================================

alter table public.site_settings
  add column if not exists ig_handle text not null default 'bmsce_alumni',
  add column if not exists ig_auto_publish boolean not null default true,
  add column if not exists notice_sources text[] not null default
    array['instagram', 'post', 'event', 'photo', 'manual'];

-- ---------------------------------------------------------------------------
-- Instagram imports
-- ---------------------------------------------------------------------------
alter table public.social_posts
  add column if not exists ig_media_id text unique,
  add column if not exists media_type text,
  add column if not exists thumbnail_url text,
  add column if not exists source text not null default 'seed' check (source in ('seed', 'api', 'manual')),
  add column if not exists is_hidden boolean not null default false,
  add column if not exists imported_at timestamptz not null default now(),
  add column if not exists media_refreshed_at timestamptz;
create index if not exists social_posts_short_code_idx on public.social_posts (short_code);

drop policy if exists social_posts_select on public.social_posts;
create policy social_posts_select on public.social_posts
  for select using (not is_hidden or public.is_admin());

create table if not exists public.ig_sync_runs (
  id            bigint generated always as identity primary key,
  trigger       text not null check (trigger in ('schedule', 'manual', 'retry')),
  status        text not null check (status in ('success', 'partial', 'failed', 'not_configured')),
  fetched       integer not null default 0,
  new_count     integer not null default 0,
  updated_count integer not null default 0,
  failed_count  integer not null default 0,
  attempts      integer not null default 1,
  error         text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz not null default now()
);
create index if not exists ig_sync_runs_started_idx on public.ig_sync_runs (started_at desc);

create table if not exists public.ig_sync_failures (
  id              bigint generated always as identity primary key,
  media_id        text not null unique,
  payload         jsonb not null,
  error           text not null,
  attempts        integer not null default 1,
  last_attempt_at timestamptz not null default now(),
  resolved_at     timestamptz
);

alter table public.ig_sync_runs     enable row level security;
alter table public.ig_sync_failures enable row level security;
create policy ig_sync_runs_select on public.ig_sync_runs for select using (public.is_admin());
create policy ig_sync_failures_select on public.ig_sync_failures for select using (public.is_admin());
revoke insert, update, delete on public.ig_sync_runs from anon, authenticated;
revoke insert, update, delete on public.ig_sync_failures from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Noticeboard: one curated list that points at real stored content.
-- ---------------------------------------------------------------------------
create table if not exists public.notice_items (
  id             uuid primary key default gen_random_uuid(),
  source         text not null check (source in ('instagram', 'post', 'event', 'photo', 'manual')),
  social_post_id uuid unique references public.social_posts(id) on delete cascade,
  post_id        uuid unique references public.posts(id) on delete cascade,
  event_id       uuid unique references public.events(id) on delete cascade,
  photo_id       uuid unique references public.gallery_photos(id) on delete cascade,
  title          text,
  body           text,
  image_url      text,
  link_url       text,
  status         text not null default 'published' check (status in ('published', 'pending', 'hidden')),
  -- auto: placed by a rule (new import, pinned post). admin: featured by hand.
  -- member: suggested by a member and waiting for review.
  origin         text not null default 'auto' check (origin in ('auto', 'admin', 'member')),
  is_pinned      boolean not null default false,
  sort_order     integer not null default 0,
  display_date   timestamptz not null default now(),
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  check (
    (source = 'instagram' and social_post_id is not null) or
    (source = 'post' and post_id is not null) or
    (source = 'event' and event_id is not null) or
    (source = 'photo' and photo_id is not null) or
    (source = 'manual' and (title is not null or body is not null or image_url is not null))
  )
);
create index if not exists notice_items_board_idx
  on public.notice_items (status, is_pinned desc, sort_order, display_date desc);
alter table public.notice_items enable row level security;
create policy notice_items_select on public.notice_items
  for select using (
    public.is_admin()
    or (status = 'published' and (source <> 'post' or public.is_verified()))
    or created_by = auth.uid()
  );
create policy notice_items_admin_write on public.notice_items
  for all using (public.is_admin()) with check (public.is_admin());

-- Pinned posts and announcements appear on the board by rule; unpinning or
-- hiding removes only the rule-placed card, never one an admin featured.
create or replace function public.posts_notice_sync()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not new.is_hidden and (new.is_pinned or new.kind = 'announcement') then
    insert into public.notice_items (source, post_id, origin, status, display_date, created_by)
    values ('post', new.id, 'auto', 'published', new.created_at, new.author_id)
    on conflict (post_id) do nothing;
  else
    delete from public.notice_items where post_id = new.id and origin = 'auto';
    if new.is_hidden then
      update public.notice_items set status = 'hidden' where post_id = new.id;
    end if;
  end if;
  return new;
end;
$$;
create trigger posts_notice_sync after insert or update of is_pinned, kind, is_hidden on public.posts
  for each row execute function public.posts_notice_sync();

-- A member offers one of their own posts for the board; an admin decides.
create or replace function public.suggest_for_noticeboard(p_post uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare
  st text;
begin
  if not exists (select 1 from public.posts where id = p_post and author_id = auth.uid() and not is_hidden) then
    raise exception 'You can only suggest your own posts.';
  end if;
  if not public.check_rate_limit('notice_suggest:' || auth.uid()::text, 5, 86400) then
    raise exception 'You have suggested a few posts already today. Try again tomorrow.';
  end if;
  insert into public.notice_items (source, post_id, origin, status, created_by)
  values ('post', p_post, 'member', 'pending', auth.uid())
  on conflict (post_id) do nothing;
  select status into st from public.notice_items where post_id = p_post;
  return st;
end;
$$;
revoke execute on function public.suggest_for_noticeboard(uuid) from anon;

-- The board, joined to its sources. Community posts are members-only, so a
-- signed-out visitor only ever receives Instagram, event, photo and manual cards.
create or replace function public.noticeboard_feed(p_limit integer default 60)
returns jsonb language sql stable security definer set search_path = public
as $$
  with allowed as (select notice_sources from public.site_settings where id = 1),
  member as (select (public.is_verified() or public.is_admin()) as ok)
  select coalesce(jsonb_agg(row order by pinned desc, sort_order, d desc), '[]'::jsonb)
  from (
    select n.is_pinned as pinned, n.sort_order, n.display_date as d,
      jsonb_build_object(
        'id', n.id, 'source', n.source, 'origin', n.origin, 'pinned', n.is_pinned,
        'date', n.display_date, 'title', n.title, 'body', n.body,
        'image', n.image_url, 'link', n.link_url,
        'instagram', case when sp.id is null then null else jsonb_build_object(
          'caption', sp.caption, 'image', coalesce(sp.thumbnail_url, sp.image_url),
          'permalink', sp.permalink, 'posted_at', sp.posted_at,
          'type', coalesce(sp.media_type, sp.post_type), 'source', sp.source) end,
        'post', case when p.id is null then null else jsonb_build_object(
          'id', p.id, 'kind', p.kind, 'title', p.title, 'body', p.body, 'media', p.media,
          'created_at', p.created_at, 'author_id', a.id, 'author', a.full_name, 'author_photo', a.photo_url,
          'chapter', c.name, 'chapter_slug', c.slug) end,
        'event', case when e.id is null then null else jsonb_build_object(
          'id', e.id, 'title', e.title, 'date', e.event_date, 'location', e.location,
          'image', e.cover_image_url) end,
        'photo', case when g.id is null then null else jsonb_build_object(
          'image', g.image_url, 'thumb', g.thumbnail_url, 'caption', g.caption) end
      ) as row
    from public.notice_items n
    left join public.social_posts sp on sp.id = n.social_post_id
    left join public.posts p on p.id = n.post_id
    left join public.profiles a on a.id = p.author_id
    left join public.chapters c on c.id = p.chapter_id
    left join public.events e on e.id = n.event_id
    left join public.gallery_photos g on g.id = n.photo_id
    cross join allowed cross join member
    where n.status = 'published'
      and n.source = any (allowed.notice_sources)
      and (n.source <> 'post' or member.ok)
      and (sp.id is null or not sp.is_hidden)
      and (p.id is null or not p.is_hidden)
    order by n.is_pinned desc, n.sort_order, n.display_date desc
    limit least(greatest(p_limit, 1), 120)
  ) t;
$$;
grant execute on function public.noticeboard_feed(integer) to anon, authenticated;

-- Upsert one Instagram media object. Matches on the stable media id first,
-- then on the shortcode so posts seeded before the API was connected are
-- updated in place instead of duplicated. Returns true when the row is new.
create or replace function private.ig_upsert(p_item jsonb, p_auto boolean)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  mid text := nullif(p_item->>'id', '');
  code text := nullif(p_item->>'shortcode', '');
  link text := nullif(p_item->>'permalink', '');
  mtype text := upper(coalesce(p_item->>'media_type', 'IMAGE'));
  img text := nullif(coalesce(p_item->>'media_url', p_item->>'thumbnail_url'), '');
  thumb text := nullif(coalesce(p_item->>'thumbnail_url', p_item->>'media_url'), '');
  ts timestamptz := (p_item->>'timestamp')::timestamptz;
  existing uuid;
  sid uuid;
begin
  if mid is null then raise exception 'Media object has no id'; end if;
  if link is null or link !~ '^https://(www\.)?instagram\.com/' then
    raise exception 'Media % has no valid Instagram permalink', mid;
  end if;
  if code is null then
    code := substring(link from 'instagram\.com/(?:p|reel|tv)/([^/?#]+)');
  end if;

  select id into existing from public.social_posts
   where ig_media_id = mid or post_id = mid or (code is not null and short_code = code)
   order by (ig_media_id = mid) desc nulls last limit 1;

  if existing is not null then
    update public.social_posts set
      ig_media_id = mid,
      caption = coalesce(p_item->>'caption', caption),
      permalink = link,
      media_type = mtype,
      posted_at = coalesce(ts, posted_at),
      -- Seeded rows keep their locally hosted thumbnail; API rows refresh
      -- their (expiring) CDN URLs on every sync.
      image_url = case when source = 'api' then coalesce(case when mtype = 'VIDEO' then thumb else img end, image_url) else image_url end,
      thumbnail_url = case when source = 'api' then coalesce(thumb, thumbnail_url) else thumbnail_url end,
      video_url = case when mtype = 'VIDEO' then coalesce(nullif(p_item->>'media_url', ''), video_url) else video_url end,
      likes_count = coalesce((p_item->>'like_count')::int, likes_count),
      comments_count = coalesce((p_item->>'comments_count')::int, comments_count),
      media_refreshed_at = now()
    where id = existing;
    return false;
  end if;

  insert into public.social_posts (
    post_id, ig_media_id, short_code, caption, image_url, thumbnail_url, video_url,
    post_type, media_type, posted_at, likes_count, comments_count, permalink, source, media_refreshed_at
  ) values (
    mid, mid, code, p_item->>'caption',
    case when mtype = 'VIDEO' then thumb else img end, thumb,
    case when mtype = 'VIDEO' then nullif(p_item->>'media_url', '') else null end,
    case mtype when 'VIDEO' then 'Video' when 'CAROUSEL_ALBUM' then 'Sidecar' else 'Image' end,
    mtype, ts, coalesce((p_item->>'like_count')::int, 0), coalesce((p_item->>'comments_count')::int, 0),
    link, 'api', now()
  ) returning id into sid;

  insert into public.notice_items (source, social_post_id, origin, status, display_date)
  values ('instagram', sid, 'auto', case when p_auto then 'published' else 'pending' end, coalesce(ts, now()))
  on conflict (social_post_id) do nothing;
  return true;
end;
$$;

-- Record one sync run. Called by the scheduled server route (server secret)
-- or by an admin (manual sync). Each media object is processed in its own
-- sub-transaction, so one bad record never blocks the rest.
create or replace function public.ig_ingest(
  p_secret text, p_trigger text, p_status text, p_items jsonb, p_error text, p_attempts integer
) returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  item jsonb;
  is_new boolean;
  auto boolean;
  n_new int := 0; n_upd int := 0; n_fail int := 0; n_total int := 0;
  t0 timestamptz := clock_timestamp();
  final_status text;
  first_err text;
begin
  if not (public.is_admin() or private.server_ok(p_secret)) then
    raise exception 'Not authorized';
  end if;
  select ig_auto_publish into auto from public.site_settings where id = 1;

  for item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    n_total := n_total + 1;
    begin
      is_new := private.ig_upsert(item, coalesce(auto, true));
      if is_new then n_new := n_new + 1; else n_upd := n_upd + 1; end if;
      update public.ig_sync_failures set resolved_at = now()
       where media_id = item->>'id' and resolved_at is null;
    exception when others then
      n_fail := n_fail + 1;
      first_err := coalesce(first_err, sqlerrm);
      insert into public.ig_sync_failures (media_id, payload, error)
      values (coalesce(nullif(item->>'id', ''), 'unknown-' || md5(item::text)), item, sqlerrm)
      on conflict (media_id) do update
        set payload = excluded.payload, error = excluded.error,
            attempts = public.ig_sync_failures.attempts + 1,
            last_attempt_at = now(), resolved_at = null;
    end;
  end loop;

  final_status := case
    when p_status in ('failed', 'not_configured') then p_status
    when n_fail > 0 and n_fail = n_total then 'failed'
    when n_fail > 0 then 'partial'
    else 'success' end;

  insert into public.ig_sync_runs (trigger, status, fetched, new_count, updated_count, failed_count, attempts, error, started_at, finished_at)
  values (case when p_trigger in ('schedule', 'manual', 'retry') then p_trigger else 'manual' end,
          final_status, n_total, n_new, n_upd, n_fail, coalesce(p_attempts, 1),
          left(coalesce(p_error, first_err), 1000), t0, clock_timestamp());

  return jsonb_build_object('status', final_status, 'fetched', n_total, 'new', n_new,
                            'updated', n_upd, 'failed', n_fail, 'error', coalesce(p_error, first_err));
end;
$$;

-- Admin: re-process the stored payloads of records that failed to import.
create or replace function public.ig_retry_failures()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  items jsonb;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select coalesce(jsonb_agg(payload), '[]'::jsonb) into items
  from public.ig_sync_failures where resolved_at is null;
  return public.ig_ingest(null, 'retry', null, items, null, 1);
end;
$$;
revoke execute on function public.ig_retry_failures() from anon;

-- ---------------------------------------------------------------------------
-- Blog & Insights
-- ---------------------------------------------------------------------------
create table if not exists public.articles (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           text not null check (length(title) between 3 and 180),
  excerpt         text check (excerpt is null or length(excerpt) <= 400),
  body_md         text not null default '',
  cover_url       text,
  category        text not null default 'Community',
  tags            text[] not null default '{}',
  author_id       uuid references public.profiles(id) on delete set null,
  author_name     text,
  author_title    text,
  status          text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_featured     boolean not null default false,
  published_at    timestamptz,
  reading_minutes integer not null default 1,
  view_count      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  fts             tsvector generated always as (
    to_tsvector('english', title || ' ' || coalesce(excerpt, '') || ' ' || body_md)
  ) stored
);
create index if not exists articles_published_idx on public.articles (status, published_at desc);
create index if not exists articles_category_idx on public.articles (category, published_at desc);
create index if not exists articles_fts_idx on public.articles using gin (fts);
alter table public.articles enable row level security;
create policy articles_select on public.articles
  for select using (status = 'published' or public.is_admin());
create policy articles_admin_write on public.articles
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.articles_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.reading_minutes := greatest(1, round(array_length(regexp_split_to_array(trim(new.body_md), '\s+'), 1) / 220.0)::int);
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if tg_op = 'UPDATE' then
    new.view_count := old.view_count;
  else
    new.view_count := 0;
  end if;
  return new;
end;
$$;
create trigger articles_touch before insert or update on public.articles
  for each row execute function public.articles_touch();

create table if not exists public.article_views (
  article_id uuid not null references public.articles(id) on delete cascade,
  day        date not null,
  views      integer not null default 0,
  primary key (article_id, day)
);
alter table public.article_views enable row level security;
create policy article_views_select on public.article_views for select using (public.is_admin());
revoke insert, update, delete on public.article_views from anon, authenticated;

create or replace function public.record_article_view(p_slug text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  aid uuid;
begin
  select id into aid from public.articles where slug = p_slug and status = 'published';
  if aid is null then return; end if;
  alter table public.articles disable trigger articles_touch;
  update public.articles set view_count = view_count + 1 where id = aid;
  alter table public.articles enable trigger articles_touch;
  insert into public.article_views (article_id, day, views) values (aid, public.network_today(), 1)
  on conflict (article_id, day) do update set views = public.article_views.views + 1;
end;
$$;
grant execute on function public.record_article_view(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "site-media public read" on storage.objects for select using (bucket_id = 'site-media');
create policy "site-media admin write" on storage.objects
  for insert with check (bucket_id = 'site-media' and public.is_admin());
create policy "site-media admin update" on storage.objects
  for update using (bucket_id = 'site-media' and public.is_admin());
create policy "site-media admin delete" on storage.objects
  for delete using (bucket_id = 'site-media' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Newsletter: subscribers, digests built from published articles, deliveries
-- ---------------------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text not null unique check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  profile_id        uuid references public.profiles(id) on delete set null,
  status            text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed', 'bounced')),
  consent_at        timestamptz not null default now(),
  consent_source    text not null default 'site',
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  unsubscribed_at   timestamptz,
  created_at        timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;
create policy newsletter_subscribers_select on public.newsletter_subscribers
  for select using (public.is_admin() or profile_id = auth.uid());
create policy newsletter_subscribers_admin_update on public.newsletter_subscribers
  for update using (public.is_admin()) with check (public.is_admin());
create policy newsletter_subscribers_admin_delete on public.newsletter_subscribers
  for delete using (public.is_admin());
revoke insert on public.newsletter_subscribers from anon, authenticated;

create or replace function public.newsletter_subscribe(p_email text, p_source text)
returns text language plpgsql security definer set search_path = public
as $$
declare
  em text := lower(trim(coalesce(p_email, '')));
begin
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(em) > 320 then
    raise exception 'Enter a valid email address.';
  end if;
  if not public.check_rate_limit('newsletter_subscribe:' || coalesce(auth.uid()::text, md5(em)), 5, 3600) then
    raise exception 'Too many attempts. Try again later.';
  end if;
  insert into public.newsletter_subscribers (email, profile_id, consent_source)
  values (em, auth.uid(), left(coalesce(p_source, 'site'), 40))
  on conflict (email) do update
    set status = 'subscribed', consent_at = now(), unsubscribed_at = null,
        consent_source = excluded.consent_source,
        profile_id = coalesce(public.newsletter_subscribers.profile_id, excluded.profile_id);
  return 'subscribed';
end;
$$;
grant execute on function public.newsletter_subscribe(text, text) to anon, authenticated;

create or replace function public.newsletter_unsubscribe(p_token uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  update public.newsletter_subscribers
     set status = 'unsubscribed', unsubscribed_at = now()
   where unsubscribe_token = p_token and status <> 'unsubscribed';
  return found or exists (select 1 from public.newsletter_subscribers where unsubscribe_token = p_token);
end;
$$;
grant execute on function public.newsletter_unsubscribe(uuid) to anon, authenticated;

create table if not exists public.newsletter_digests (
  id           uuid primary key default gen_random_uuid(),
  subject      text not null check (length(subject) between 3 and 200),
  preheader    text,
  intro        text,
  article_ids  uuid[] not null default '{}',
  status       text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at timestamptz,
  sent_at      timestamptz,
  recipients   integer not null default 0,
  delivered    integer not null default 0,
  failed       integer not null default 0,
  last_error   text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create table if not exists public.newsletter_deliveries (
  digest_id     uuid not null references public.newsletter_digests(id) on delete cascade,
  subscriber_id uuid not null references public.newsletter_subscribers(id) on delete cascade,
  status        text not null check (status in ('sent', 'failed')),
  provider_id   text,
  error         text,
  created_at    timestamptz not null default now(),
  primary key (digest_id, subscriber_id)
);
alter table public.newsletter_digests    enable row level security;
alter table public.newsletter_deliveries enable row level security;
create policy newsletter_digests_admin on public.newsletter_digests
  for all using (public.is_admin()) with check (public.is_admin());
create policy newsletter_deliveries_admin on public.newsletter_deliveries
  for select using (public.is_admin());
revoke insert, update, delete on public.newsletter_deliveries from anon, authenticated;

-- Claim a digest for sending and return everything the mailer needs.
-- Admin "send now", or the scheduled route (server secret) for due digests.
create or replace function public.digest_claim(p_secret text, p_digest uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  d public.newsletter_digests%rowtype;
begin
  if not (public.is_admin() or private.server_ok(p_secret)) then raise exception 'Not authorized'; end if;
  if p_digest is null then
    select * into d from public.newsletter_digests
     where status = 'scheduled' and scheduled_at <= now()
     order by scheduled_at limit 1 for update skip locked;
  else
    select * into d from public.newsletter_digests
     where id = p_digest and status in ('draft', 'scheduled', 'failed') for update;
  end if;
  if not found then return null; end if;
  update public.newsletter_digests set status = 'sending', last_error = null where id = d.id;
  return jsonb_build_object(
    'id', d.id, 'subject', d.subject, 'preheader', d.preheader, 'intro', d.intro,
    'articles', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'slug', a.slug, 'title', a.title, 'excerpt', a.excerpt, 'cover', a.cover_url,
        'category', a.category, 'author', a.author_name, 'minutes', a.reading_minutes
      ) order by array_position(d.article_ids, a.id)), '[]'::jsonb)
      from public.articles a where a.id = any (d.article_ids) and a.status = 'published'),
    'subscribers', (
      select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'email', s.email, 'token', s.unsubscribe_token)), '[]'::jsonb)
      from public.newsletter_subscribers s
      where s.status = 'subscribed'
        and not exists (select 1 from public.newsletter_deliveries x
                        where x.digest_id = d.id and x.subscriber_id = s.id and x.status = 'sent'))
  );
end;
$$;

create or replace function public.digest_finish(p_secret text, p_digest uuid, p_results jsonb, p_error text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  ok int; bad int;
begin
  if not (public.is_admin() or private.server_ok(p_secret)) then raise exception 'Not authorized'; end if;
  insert into public.newsletter_deliveries (digest_id, subscriber_id, status, provider_id, error)
  select p_digest, (r->>'id')::uuid, r->>'status', r->>'provider_id', left(r->>'error', 500)
  from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) r
  on conflict (digest_id, subscriber_id) do update
    set status = excluded.status, provider_id = excluded.provider_id, error = excluded.error, created_at = now();
  update public.newsletter_subscribers s set status = 'bounced'
   from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) r
   where s.id = (r->>'id')::uuid and r->>'bounced' = 'true';
  select count(*) filter (where status = 'sent'), count(*) filter (where status = 'failed')
    into ok, bad from public.newsletter_deliveries where digest_id = p_digest;
  update public.newsletter_digests
     set status = case when p_error is not null and ok = 0 then 'failed' else 'sent' end,
         sent_at = case when ok > 0 then now() else sent_at end,
         recipients = ok + bad, delivered = ok, failed = bad, last_error = left(p_error, 1000)
   where id = p_digest;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin analytics: every number is a live count, nothing is hard-coded.
-- ---------------------------------------------------------------------------
create or replace function public.admin_metrics(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  days int := least(greatest(coalesce(p_days, 30), 7), 365);
  today date := public.network_today();
  start_day date := today - (days - 1);
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return jsonb_build_object(
    'range_days', days,
    'members', (select jsonb_build_object(
        'total', count(*),
        'students', count(*) filter (where user_type = 'student'),
        'alumni', count(*) filter (where user_type = 'alumni'),
        'verified', count(*) filter (where verification_status = 'verified'),
        'pending', count(*) filter (where verification_status = 'unverified' and user_type = 'alumni'),
        'suspended', count(*) filter (where suspended_at is not null),
        'new_in_range', count(*) filter (where (created_at at time zone 'Asia/Kolkata')::date >= start_day),
        'students_without_date', count(*) filter (where user_type = 'student' and passing_out_date is null)
      ) from public.profiles),
    'active', jsonb_build_object(
        'today', (select count(distinct profile_id) from public.member_activity where day = today),
        'd7', (select count(distinct profile_id) from public.member_activity where day > today - 7),
        'd30', (select count(distinct profile_id) from public.member_activity where day > today - 30),
        'in_range', (select count(distinct profile_id) from public.member_activity where day >= start_day),
        'students_in_range', (select count(distinct a.profile_id) from public.member_activity a
            join public.profiles p on p.id = a.profile_id where a.day >= start_day and p.user_type = 'student'),
        'alumni_in_range', (select count(distinct a.profile_id) from public.member_activity a
            join public.profiles p on p.id = a.profile_id where a.day >= start_day and p.user_type = 'alumni')),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', g.day,
        'registrations', (select count(*) from public.profiles p where (p.created_at at time zone 'Asia/Kolkata')::date = g.day),
        'active', (select count(*) from public.member_activity a where a.day = g.day),
        'posts', (select count(*) from public.posts p where (p.created_at at time zone 'Asia/Kolkata')::date = g.day),
        'comments', (select count(*) from public.post_comments c where (c.created_at at time zone 'Asia/Kolkata')::date = g.day)
      ) order by g.day), '[]'::jsonb)
      from (select generate_series(start_day, today, interval '1 day')::date as day) g),
    'content', jsonb_build_object(
        'posts', (select count(*) from public.posts),
        'discussions', (select count(*) from public.posts where kind = 'discussion'),
        'comments', (select count(*) from public.post_comments),
        'posts_in_range', (select count(*) from public.posts where (created_at at time zone 'Asia/Kolkata')::date >= start_day),
        'comments_in_range', (select count(*) from public.post_comments where (created_at at time zone 'Asia/Kolkata')::date >= start_day),
        'open_reports', (select count(*) from public.reports where status = 'open'),
        'messages_in_range', (select count(*) from public.dm_messages where (created_at at time zone 'Asia/Kolkata')::date >= start_day)),
    'chapters', (
      select coalesce(jsonb_agg(x order by (x->>'members')::int desc, x->>'name'), '[]'::jsonb) from (
        select jsonb_build_object(
          'name', c.name, 'slug', c.slug,
          'members', (select count(*) from public.chapter_members m where m.chapter_id = c.id and m.status = 'active'),
          'pending', (select count(*) from public.chapter_members m where m.chapter_id = c.id and m.status = 'pending'),
          'posts', (select count(*) from public.posts p where p.chapter_id = c.id)
        ) as x from public.chapters c where c.status = 'active') t),
    'events', jsonb_build_object(
        'upcoming', (select count(*) from public.events where event_date >= now()),
        'rsvps_going', (select count(*) from public.event_rsvps where status = 'going'),
        'rsvps_in_range', (select count(*) from public.event_rsvps where (created_at at time zone 'Asia/Kolkata')::date >= start_day)),
    'blog', jsonb_build_object(
        'published', (select count(*) from public.articles where status = 'published'),
        'drafts', (select count(*) from public.articles where status = 'draft'),
        'views_in_range', (select coalesce(sum(views), 0) from public.article_views where day >= start_day),
        'top', (select coalesce(jsonb_agg(jsonb_build_object('title', title, 'slug', slug, 'views', view_count)), '[]'::jsonb)
                from (select title, slug, view_count from public.articles
                      where status = 'published' order by view_count desc limit 5) t)),
    'newsletter', jsonb_build_object(
        'subscribed', (select count(*) from public.newsletter_subscribers where status = 'subscribed'),
        'unsubscribed', (select count(*) from public.newsletter_subscribers where status = 'unsubscribed'),
        'bounced', (select count(*) from public.newsletter_subscribers where status = 'bounced'),
        'digests_sent', (select count(*) from public.newsletter_digests where status = 'sent'),
        'delivered', (select coalesce(sum(delivered), 0) from public.newsletter_digests),
        'failed', (select coalesce(sum(failed), 0) from public.newsletter_digests)),
    'instagram', jsonb_build_object(
        'imported', (select count(*) from public.social_posts where source = 'api'),
        'archive', (select count(*) from public.social_posts where source <> 'api'),
        'open_failures', (select count(*) from public.ig_sync_failures where resolved_at is null),
        'last_success', (select max(finished_at) from public.ig_sync_runs where status in ('success', 'partial')),
        'last_attempt', (select max(finished_at) from public.ig_sync_runs),
        'last_status', (select status from public.ig_sync_runs order by id desc limit 1)),
    'lifecycle', jsonb_build_object(
        'last_run', (select max(finished_at) from public.job_runs where job = 'membership_lifecycle'),
        'last_ok', (select ok from public.job_runs where job = 'membership_lifecycle' order by id desc limit 1),
        'graduated_in_range', (select count(*) from public.membership_events
            where reason = 'auto_graduation' and (created_at at time zone 'Asia/Kolkata')::date >= start_day),
        'due_next_30', (select count(*) from public.profiles
            where user_type = 'student' and passing_out_date between today and today + 30),
        'on_hold', (select count(*) from public.profiles where lifecycle_hold))
  );
end;
$$;
revoke execute on function public.admin_metrics(integer) from anon;
