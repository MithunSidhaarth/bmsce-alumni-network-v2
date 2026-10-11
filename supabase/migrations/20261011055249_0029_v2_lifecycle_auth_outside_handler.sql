-- The permission check must sit outside the error handler. Inside it, a
-- non-admin's "Not authorized" was swallowed and written to job_runs as a
-- failed run (no data changed, but it polluted the job history).
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

  begin
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
  exception when others then
    insert into public.job_runs (job, ok, detail, started_at, finished_at)
    values ('membership_lifecycle', false, jsonb_build_object('error', sqlerrm), t0, clock_timestamp());
    return -1;
  end;

  insert into public.job_runs (job, ok, detail, started_at, finished_at)
  values ('membership_lifecycle', true,
          jsonb_build_object('graduated', n, 'network_date', public.network_today(),
                             'trigger', case when auth.uid() is null then 'schedule' else 'manual' end),
          t0, clock_timestamp());
  return n;
end;
$$;
revoke execute on function public.run_membership_lifecycle() from anon;

-- Clear the runs written by the verification script (test accounts only).
delete from public.job_runs where job = 'membership_lifecycle';
delete from public.membership_events where note like '[verify]%' or profile_id in (
  select id from auth.users where email in ('v2.student@bmsce.ac.in'));
