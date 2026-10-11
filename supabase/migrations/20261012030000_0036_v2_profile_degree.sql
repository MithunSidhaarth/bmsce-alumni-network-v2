-- A member's BMSCE degree, so a name can be written the way the brand guide
-- asks: A. Rao (BE ECE '04). Optional; empty for everyone until they choose.
alter table public.profiles
  add column degree text
  check (
    degree is null
    or degree in ('BE','BArch','BTech','ME','MTech','MBA','MCA','MSc','PhD')
  );
