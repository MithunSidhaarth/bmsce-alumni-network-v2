-- Asks and offers: two more kinds of post.
alter table public.posts drop constraint posts_kind_check;
alter table public.posts add constraint posts_kind_check
  check (kind = any (array['post','discussion','announcement','achievement','memory','ask','offer']));

-- Polls: the options and their running totals live on the post, so results
-- travel with it under the post's own access rules and individual votes stay
-- private. Mentions and the link preview are stored beside them.
alter table public.posts
  add column poll_options text[],
  add column poll_counts integer[],
  add column link_preview jsonb,
  add column mentions jsonb not null default '[]'::jsonb;
alter table public.post_comments
  add column mentions jsonb not null default '[]'::jsonb;

create table public.poll_votes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_index smallint not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.poll_votes enable row level security;

-- A member sees only their own vote. Totals come from posts.poll_counts.
create policy poll_votes_select on public.poll_votes for select to authenticated
  using (user_id = auth.uid());
create policy poll_votes_insert on public.poll_votes for insert to authenticated
  with check (
    user_id = auth.uid() and public.is_verified() and exists (
      select 1 from public.posts p
      where p.id = post_id and p.poll_options is not null
        and option_index >= 0 and option_index < cardinality(p.poll_options)));
create policy poll_votes_update on public.poll_votes for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid() and public.is_verified() and exists (
      select 1 from public.posts p
      where p.id = post_id and p.poll_options is not null
        and option_index >= 0 and option_index < cardinality(p.poll_options)));
create policy poll_votes_delete on public.poll_votes for delete to authenticated
  using (user_id = auth.uid());

create or replace function public.poll_votes_sync()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  target uuid;
begin
  if tg_op = 'DELETE' then target := old.post_id; else target := new.post_id; end if;
  update public.posts p
     set poll_counts = (
       select array_agg(coalesce(c.n, 0)::integer order by g.i)
       from generate_series(0, cardinality(p.poll_options) - 1) as g(i)
       left join (
         select v.option_index, count(*) as n from public.poll_votes v
         where v.post_id = target group by v.option_index
       ) c on c.option_index = g.i)
   where p.id = target and p.poll_options is not null;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger poll_votes_sync after insert or update or delete on public.poll_votes
  for each row execute function public.poll_votes_sync();

-- Mentions are sent as [{id}] and rewritten here from the profiles table, so
-- the stored names are always the real ones. Only people whose "@Name"
-- actually appears in the text are kept, ten at most.
create or replace function private.clean_mentions(p_mentions jsonb, p_text text)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', pr.id, 'name', pr.full_name)), '[]'::jsonb)
  from (
    select distinct e->>'id' as id
    from jsonb_array_elements(case when jsonb_typeof(p_mentions) = 'array' then p_mentions else '[]'::jsonb end) e
    where e->>'id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    limit 10
  ) x
  join public.profiles pr
    on pr.id = x.id::uuid and pr.verification_status = 'verified'
   and pr.suspended_at is null and pr.full_name is not null
  where position('@' || pr.full_name in coalesce(p_text, '')) > 0;
$$;

create or replace function private.notify_mentions(p_mentions jsonb, p_actor uuid, p_what text, p_body text, p_link text, p_skip_followers_of uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  who text;
begin
  if p_actor is null or p_mentions is null or jsonb_array_length(p_mentions) = 0 then return; end if;
  select coalesce(full_name, 'A member') into who from public.profiles where id = p_actor;
  perform private.notify((m->>'id')::uuid, 'mention', p_actor, who || ' mentioned you ' || p_what, p_body, p_link)
  from jsonb_array_elements(p_mentions) m
  where not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = (m->>'id')::uuid and b.blocked_id = p_actor)
    and (p_skip_followers_of is null or not exists (
      select 1 from public.post_follows f
      where f.post_id = p_skip_followers_of and f.user_id = (m->>'id')::uuid));
end;
$$;

create or replace function public.posts_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
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

    if new.poll_options is not null then
      if cardinality(new.poll_options) < 2 or cardinality(new.poll_options) > 4
         or exists (select 1 from unnest(new.poll_options) o where o is null or length(btrim(o)) = 0 or length(o) > 80) then
        raise exception 'A poll needs two to four options of up to 80 characters each';
      end if;
      new.poll_counts := array_fill(0, array[cardinality(new.poll_options)]);
    else
      new.poll_counts := null;
    end if;
    if new.link_preview is not null
       and (jsonb_typeof(new.link_preview) <> 'object' or length(new.link_preview::text) > 1500) then
      new.link_preview := null;
    end if;
    new.mentions := private.clean_mentions(new.mentions, coalesce(new.title, '') || ' ' || new.body);
    return new;
  end if;

  new.comment_count := old.comment_count;
  new.reaction_count := old.reaction_count;
  new.created_at := old.created_at;
  new.author_id := old.author_id;
  new.chapter_id := old.chapter_id;
  new.last_activity_at := old.last_activity_at;
  -- A poll, its totals, the preview and the mentions are fixed once posted.
  new.poll_options := old.poll_options;
  new.poll_counts := old.poll_counts;
  new.link_preview := old.link_preview;
  new.mentions := old.mentions;
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
$function$;

create or replace function public.posts_after_insert()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if new.author_id is not null then
    insert into public.post_follows (post_id, user_id) values (new.id, new.author_id)
    on conflict do nothing;
    perform private.notify_mentions(new.mentions, new.author_id, 'in a post', new.body, '/community/' || new.id::text, null);
  end if;
  return new;
end;
$function$;

create or replace function public.post_comments_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if pg_trigger_depth() > 1 or auth.uid() is null then return new; end if;
  new.mentions := private.clean_mentions(new.mentions, new.body);
  return new;
end;
$$;
create trigger post_comments_guard before insert on public.post_comments
  for each row execute function public.post_comments_guard();

create or replace function public.post_comments_sync()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
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
  -- People mentioned in the reply who do not already follow the conversation
  -- (followers are told about every reply just below).
  perform private.notify_mentions(new.mentions, new.author_id, 'in a reply', new.body, '/community/' || new.post_id::text, new.post_id);
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
$function$;

-- Trigger functions are not callable through the API.
revoke all on function public.poll_votes_sync() from public, anon, authenticated;
revoke all on function public.post_comments_guard() from public, anon, authenticated;
revoke all on function private.clean_mentions(jsonb, text) from public, anon, authenticated;
revoke all on function private.notify_mentions(jsonb, uuid, text, text, text, uuid) from public, anon, authenticated;
