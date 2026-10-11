-- A sync that stored some posts but was cut short by an API error is
-- "partial", not "success".
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
    when n_fail > 0 or p_error is not null then 'partial'
    else 'success' end;

  insert into public.ig_sync_runs (trigger, status, fetched, new_count, updated_count, failed_count, attempts, error, started_at, finished_at)
  values (case when p_trigger in ('schedule', 'manual', 'retry') then p_trigger else 'manual' end,
          final_status, n_total, n_new, n_upd, n_fail, coalesce(p_attempts, 1),
          left(coalesce(p_error, first_err), 1000), t0, clock_timestamp());

  return jsonb_build_object('status', final_status, 'fetched', n_total, 'new', n_new,
                            'updated', n_upd, 'failed', n_fail, 'error', coalesce(p_error, first_err));
end;
$$;
