-- Lets an admin export the applied migration history (scripts/export-migrations.mjs),
-- so the repository always holds the schema that is actually deployed.
create or replace function public.admin_export_migrations()
returns table (version text, name text, sql text)
language sql stable security definer set search_path = public
as $$
  select m.version::text, m.name::text, array_to_string(m.statements, E'\n')
  from supabase_migrations.schema_migrations m
  where public.is_admin()
  order by m.version;
$$;
revoke execute on function public.admin_export_migrations() from anon, public;
grant execute on function public.admin_export_migrations() to authenticated;
