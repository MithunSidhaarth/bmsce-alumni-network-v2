-- ============================================================================
-- BMS Alumni Network — public photo gallery + public image storage bucket
-- Migration 0021 (run after 0020). Runnable copy: SETUP_GALLERY.sql
-- ============================================================================

-- ----- table + RLS -----
-- A public photo gallery. Admins upload photos (batch, from the admin
-- panel); everyone — including signed-out visitors — can view it. Each row
-- stores TWO derived images, both generated client-side on upload (see
-- src/app/admin/gallery/GalleryAdmin.tsx): a small thumbnail for the grid
-- and a larger "medium" web-optimized image for the lightbox. The raw
-- original the admin picked is never uploaded or stored.
create table if not exists public.gallery_photos (
  id            uuid primary key default gen_random_uuid(),
  image_url     text not null,        -- medium, web-optimized (lightbox)
  thumbnail_url text not null,        -- small, compressed (grid)
  caption       text,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  uploaded_at   timestamptz not null default now()
);

-- Pagination is always "newest first" — see the public gallery's .range() queries.
create index if not exists gallery_photos_uploaded_at_idx
  on public.gallery_photos (uploaded_at desc);

alter table public.gallery_photos enable row level security;

-- Read: everyone, including signed-out visitors (anon).
drop policy if exists gallery_photos_select on public.gallery_photos;
create policy gallery_photos_select on public.gallery_photos
  for select using (true);

-- Write: admins only.
drop policy if exists gallery_photos_insert on public.gallery_photos;
create policy gallery_photos_insert on public.gallery_photos
  for insert with check (public.is_admin());

drop policy if exists gallery_photos_delete on public.gallery_photos;
create policy gallery_photos_delete on public.gallery_photos
  for delete using (public.is_admin());

grant select on public.gallery_photos to anon, authenticated;
grant insert, delete on public.gallery_photos to authenticated;

-- ----- public image storage bucket -----
-- Public read (anyone can view gallery photos, no login needed); admin-only
-- write. Images only, 15 MB cap — generous, since the browser compresses
-- both derivatives before upload (typically well under 1 MB each); this cap
-- just guards against something unexpectedly large slipping through.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery-photos', 'gallery-photos', true, 15728640,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 15728640,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "gallery-photos public read" on storage.objects;
create policy "gallery-photos public read" on storage.objects
  for select using (bucket_id = 'gallery-photos');

drop policy if exists "gallery-photos admin write" on storage.objects;
create policy "gallery-photos admin write" on storage.objects
  for insert
  with check (bucket_id = 'gallery-photos' and public.is_admin());

drop policy if exists "gallery-photos admin update" on storage.objects;
create policy "gallery-photos admin update" on storage.objects
  for update
  using (bucket_id = 'gallery-photos' and public.is_admin());

drop policy if exists "gallery-photos admin delete" on storage.objects;
create policy "gallery-photos admin delete" on storage.objects
  for delete
  using (bucket_id = 'gallery-photos' and public.is_admin());
