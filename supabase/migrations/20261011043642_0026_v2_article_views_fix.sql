-- Counting a read must not take table-level locks or bump updated_at.
-- record_article_view sets a transaction-local flag; the touch trigger
-- lets that single update through untouched.
create or replace function public.articles_touch()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and current_setting('app.view_bump', true) = '1' then
    return new;
  end if;
  new.updated_at := now();
  new.reading_minutes := greatest(1, round(coalesce(array_length(regexp_split_to_array(trim(new.body_md), '\s+'), 1), 0) / 220.0)::int);
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

create or replace function public.record_article_view(p_slug text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  aid uuid;
begin
  select id into aid from public.articles where slug = p_slug and status = 'published';
  if aid is null then return; end if;
  perform set_config('app.view_bump', '1', true);
  update public.articles set view_count = view_count + 1 where id = aid;
  perform set_config('app.view_bump', '0', true);
  insert into public.article_views (article_id, day, views) values (aid, public.network_today(), 1)
  on conflict (article_id, day) do update set views = public.article_views.views + 1;
end;
$$;
grant execute on function public.record_article_view(text) to anon, authenticated;
