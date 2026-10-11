-- Event reminders: everyone who said they are going is told once, in the day
-- before the event. Runs hourly from pg_cron.
alter table public.event_rsvps add column reminded_at timestamptz;

create or replace function public.run_event_reminders()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare
  sent integer;
begin
  with due as (
    update public.event_rsvps r
       set reminded_at = now()
      from public.events e
     where e.id = r.event_id and r.status = 'going' and r.reminded_at is null
       and e.event_date > now() and e.event_date <= now() + interval '24 hours'
    returning r.profile_id, e.id as event_id, e.title, e.event_date, e.location
  ), told as (
    insert into public.notifications (user_id, type, title, body, link)
    select d.profile_id, 'event', 'Coming up: ' || left(d.title, 120),
           to_char(d.event_date at time zone 'Asia/Kolkata', 'Dy DD Mon, HH12:MI AM') || ' IST'
             || coalesce(' · ' || d.location, ''),
           '/events/' || d.event_id::text
    from due d
    returning 1
  )
  select count(*) into sent from told;
  return sent;
end;
$$;
revoke all on function public.run_event_reminders() from public, anon, authenticated;
select cron.schedule('event-reminders', '5 * * * *', 'select public.run_event_reminders()');

-- The roll number printed on a college ID card. Optional; shown to members.
alter table public.profiles add column usn text
  check (usn is null or usn ~ '^[0-9A-Z]{6,12}$');

-- People you may know: members who share a batch, branch, city or company
-- with the caller. Honours each person's privacy switches and blocks in both
-- directions, and leaves out people the caller already talks to.
create or replace function public.people_you_may_know(p_limit integer default 6)
returns table (
  id uuid, full_name text, photo_url text, user_type text, graduation_year integer,
  branch text, current_city text, company text, job_title text, reasons text[])
language sql stable security definer set search_path to 'public' as $$
  with me as (
    select * from public.profiles where id = auth.uid() and public.is_verified()
  ), scored as (
    select p.id, p.full_name, p.photo_url, p.user_type, p.graduation_year, p.branch,
           p.current_city, p.company, p.job_title, p.last_seen_at,
           coalesce((p.privacy->>'show_location')::boolean, true) as show_location,
           coalesce((p.privacy->>'show_work')::boolean, true) as show_work,
           (p.graduation_year is not null and p.graduation_year = me.graduation_year) as same_batch,
           (p.branch is not null and p.branch = me.branch) as same_branch,
           (p.current_city is not null and me.current_city is not null
             and lower(btrim(p.current_city)) = lower(btrim(me.current_city))
             and coalesce((p.privacy->>'show_location')::boolean, true)) as same_city,
           (p.company is not null and me.company is not null
             and lower(btrim(p.company)) = lower(btrim(me.company))
             and coalesce((p.privacy->>'show_work')::boolean, true)) as same_company
    from public.profiles p cross join me
    where p.id <> me.id and p.onboarded and p.verification_status = 'verified'
      and p.suspended_at is null and p.full_name is not null
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = me.id and b.blocked_id = p.id)
           or (b.blocker_id = p.id and b.blocked_id = me.id))
      and not exists (
        select 1 from public.dm_threads t
        where t.last_message_at is not null
          and ((t.user_a = me.id and t.user_b = p.id) or (t.user_a = p.id and t.user_b = me.id)))
  )
  select s.id, s.full_name, s.photo_url, s.user_type, s.graduation_year, s.branch,
         case when s.show_location then s.current_city end,
         case when s.show_work then s.company end,
         case when s.show_work then s.job_title end,
         array_remove(array[
           case when s.same_batch then 'Same batch' end,
           case when s.same_company then 'Same company' end,
           case when s.same_branch then 'Same branch' end,
           case when s.same_city then 'Same city' end], null)
  from scored s
  where s.same_batch or s.same_branch or s.same_city or s.same_company
  order by (s.same_batch::int * 3 + s.same_company::int * 3 + s.same_branch::int * 2 + s.same_city::int * 2) desc,
           s.last_seen_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 6), 12));
$$;
revoke all on function public.people_you_may_know(integer) from public, anon;
grant execute on function public.people_you_may_know(integer) to authenticated;
