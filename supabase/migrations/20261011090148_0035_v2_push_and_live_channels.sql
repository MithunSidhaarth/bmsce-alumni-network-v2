-- Push notifications. A browser registers its push endpoint here; anything
-- that tells a member something (a notification, a direct message) drops a
-- row in the outbox, and the app server collects the outbox with the server
-- secret and delivers it.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) between 20 and 200),
  auth_key text not null check (length(auth_key) between 8 and 100),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
-- A member can see their own devices. Writes go through the functions below.
create policy push_subscriptions_select on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());

create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  -- The same browser signing in as someone else hands its endpoint over.
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth_key)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth_key = excluded.auth_key;
end;
$$;

create or replace function public.push_unsubscribe(p_endpoint text)
returns void language sql security definer set search_path to 'public' as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

create table private.push_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  created_at timestamptz not null default now()
);
alter table private.push_outbox enable row level security;

create or replace function public.notifications_push()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if exists (select 1 from public.push_subscriptions s where s.user_id = new.user_id) then
    insert into private.push_outbox (user_id, title, body, link)
    values (new.user_id, new.title, new.body, new.link);
  end if;
  return new;
end;
$$;
create trigger notifications_push after insert on public.notifications
  for each row execute function public.notifications_push();

create or replace function public.dm_messages_push()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  other uuid;
  who text;
begin
  select case when t.user_a = new.sender_id then t.user_b else t.user_a end into other
  from public.dm_threads t where t.id = new.thread_id;
  if other is null or not exists (select 1 from public.push_subscriptions s where s.user_id = other) then
    return new;
  end if;
  select coalesce(full_name, 'A member') into who from public.profiles where id = new.sender_id;
  insert into private.push_outbox (user_id, title, body, link)
  values (other, who || ' sent you a message', left(new.body, 140), '/messages/' || new.thread_id::text);
  return new;
end;
$$;
create trigger dm_messages_push after insert on public.dm_messages
  for each row execute function public.dm_messages_push();

-- The app server (and only it: it must present the server secret) takes
-- what is waiting, with the devices to send it to. Anything a day old that
-- was never collected is dropped rather than delivered late.
create or replace function public.push_claim(p_secret text, p_limit integer default 50)
returns table (endpoint text, p256dh text, auth_key text, title text, body text, link text)
language plpgsql security definer set search_path to 'public' as $$
begin
  if not private.server_ok(p_secret) then raise exception 'Not authorized'; end if;
  delete from private.push_outbox o where o.created_at < now() - interval '1 day';
  return query
  with taken as (
    delete from private.push_outbox o
     where o.id in (
       select q.id from private.push_outbox q order by q.id
       limit greatest(1, least(coalesce(p_limit, 50), 200)) for update skip locked)
    returning o.user_id, o.title, o.body, o.link
  )
  select s.endpoint, s.p256dh, s.auth_key, t.title, t.body, t.link
  from taken t join public.push_subscriptions s on s.user_id = t.user_id;
end;
$$;

-- Devices the push service says are gone (uninstalled, permission withdrawn).
create or replace function public.push_prune(p_secret text, p_endpoints text[])
returns integer language plpgsql security definer set search_path to 'public' as $$
declare
  gone integer;
begin
  if not private.server_ok(p_secret) then raise exception 'Not authorized'; end if;
  delete from public.push_subscriptions s where s.endpoint = any(p_endpoints);
  get diagnostics gone = row_count;
  return gone;
end;
$$;

revoke all on function public.notifications_push() from public, anon, authenticated;
revoke all on function public.dm_messages_push() from public, anon, authenticated;
revoke all on function public.push_subscribe(text, text, text) from public, anon;
revoke all on function public.push_unsubscribe(text) from public, anon;
grant execute on function public.push_subscribe(text, text, text) to authenticated;
grant execute on function public.push_unsubscribe(text) to authenticated;
-- Called by the app server with the anon key plus the server secret.
grant execute on function public.push_claim(text, integer) to anon, authenticated;
grant execute on function public.push_prune(text, text[]) to anon, authenticated;

-- Live channels (who is online, who is typing) are private Realtime channels:
-- "online" is for verified members, "dm:<thread id>" only for the two people
-- in that conversation.
create or replace function public.realtime_topic_ok(p_topic text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select case
    when p_topic = 'online' then public.is_verified()
    when p_topic ~ '^dm:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.in_dm_thread(substring(p_topic from 4)::uuid)
    else false
  end;
$$;
revoke all on function public.realtime_topic_ok(text) from public, anon;
grant execute on function public.realtime_topic_ok(text) to authenticated;

create policy "members read live channels" on realtime.messages for select to authenticated
  using (public.realtime_topic_ok(realtime.topic()));
create policy "members write live channels" on realtime.messages for insert to authenticated
  with check (public.realtime_topic_ok(realtime.topic()));
