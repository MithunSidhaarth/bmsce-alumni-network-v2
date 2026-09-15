-- ============================================================================
-- BMS Alumni Network — close two gaps found in a security review:
--
-- 1. admin_audit_log_insert only checked `admin_id = auth.uid()`, not
--    `is_admin()` — any signed-in member could write arbitrary rows into the
--    audit log directly from the browser console (spam, or misleading
--    entries), since nothing checked they were actually an admin. Writes now
--    go only through a SECURITY DEFINER function that checks is_admin()
--    itself; the client-writable insert policy is removed entirely.
--
-- 2. delete_my_account() had no rate limit, so a compromised session (or a
--    buggy client retry loop) could call it repeatedly with no server-side
--    cooldown. Wrapped with the existing check_rate_limit() used elsewhere.
--
-- Migration 0022 (run after 0021).
-- ============================================================================

-- 1) Admin audit log: writes only via SECURITY DEFINER --------------------
drop policy if exists admin_audit_log_insert on public.admin_audit_log;

create or replace function public.log_admin_action(p_action text, p_target text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can write audit log entries';
  end if;
  insert into public.admin_audit_log (admin_id, action, target)
  values (auth.uid(), p_action, p_target);
end;
$$;

revoke execute on function public.log_admin_action(text, text) from anon;
grant execute on function public.log_admin_action(text, text) to authenticated;

-- 2) Rate-limit account deletion --------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  -- Cheap defense-in-depth against a compromised session or a buggy client
  -- retry loop hammering this — legitimate use is at most once, ever.
  if not public.check_rate_limit('delete_account:' || uid::text, 3, 3600) then
    raise exception 'Too many attempts — please wait a moment and try again.';
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;
