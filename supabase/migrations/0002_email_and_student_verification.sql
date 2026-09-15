-- ============================================================================
-- BMS Alumni Network — email sign-in + college-email student auto-verification
-- Migration 0002 (run AFTER 0001)
--
-- - Adds college_email / personal_email columns to profiles.
-- - Updates handle_new_user(): anyone signing up with an @bmsce.ac.in address
--   is treated as a verified STUDENT (receiving the magic link proves they own
--   a real BMS mailbox). Everyone else defaults to an unverified alum, subject
--   to admin review.
-- ============================================================================

alter table public.profiles add column if not exists college_email text;
alter table public.profiles add column if not exists personal_email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_college boolean := lower(coalesce(new.email, '')) like '%@bmsce.ac.in';
begin
  insert into public.profiles (
    id,
    full_name,
    photo_url,
    user_type,
    verification_status,
    college_email
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    case when is_college then 'student' else 'alumni' end,
    case when is_college then 'verified' else 'unverified' end,
    case when is_college then new.email else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- (trigger on_auth_user_created from 0001 already points at this function)
