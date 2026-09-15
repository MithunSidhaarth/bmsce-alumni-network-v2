-- ============================================================================
-- BMS Alumni Network — MENTORSHIP CAP RACE FIX (run once)
-- Paste into Supabase -> SQL Editor -> New query -> Run. Safe to re-run.
-- Requires SETUP_SECURITY_HARDENING.sql (0008) to have been run first.
-- ============================================================================

-- ============================================================================
-- BMS Alumni Network — close the mentorship mentee-cap race condition
-- Migration 0010 (run after 0008)
--
-- The cap check added in 0008 counted accepted rows and then accepted — a
-- classic check-then-act. Under Postgres' default READ COMMITTED isolation,
-- two accepts for the SAME mentor running at once could both read count < cap
-- and both commit, pushing the mentor over their stated limit.
--
-- Fix: before counting, take a row lock on the mentor's profile
-- (SELECT ... FOR UPDATE). All accepts for a given mentor contend on that one
-- row, so they serialize: the second accept blocks until the first commits,
-- then re-counts against the now-committed state and is correctly rejected if
-- the cap is full. No global isolation change, no counter column to keep in
-- sync — just a lock scoped to the single resource being limited.
-- ============================================================================

create or replace function public.enforce_mentorship_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap int;
  cnt int;
begin
  if new.status is distinct from old.status then
    if new.status = 'accepted'
       and not (auth.uid() = old.mentor_id or public.is_admin()) then
      raise exception 'Only the mentor can accept a mentorship request';
    end if;

    if new.status = 'accepted' then
      -- Lock the mentor's profile row. Concurrent accepts for the same mentor
      -- queue here instead of racing past the count below.
      select max_mentees into cap
      from public.profiles
      where id = old.mentor_id
      for update;

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

-- The trigger from 0008 already points at this function; replacing the function
-- body is enough.
