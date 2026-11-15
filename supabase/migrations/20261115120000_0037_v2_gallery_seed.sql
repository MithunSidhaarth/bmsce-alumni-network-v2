-- First gallery photos: 22 shots picked from the association's two Google
-- Drive folders (campus life in 2026, plus archive and Alumni Day photos).
-- The files ship with the site in public/gallery, so the URLs are relative.
-- uploaded_at sets the display order (newest first); the first row is the
-- gallery cover. Safe to re-run: rows that already exist are skipped.
insert into public.gallery_photos (image_url, thumbnail_url, caption, uploaded_at)
select v.image_url, v.thumbnail_url, v.caption, v.uploaded_at
from (values
  ('/gallery/festival-day-group.webp', '/gallery/festival-day-group-thumb.webp', 'Festival day celebrations on campus', timestamptz '2026-11-15 12:00:00+00' - interval '0 minutes'),
  ('/gallery/then-and-now-1946.webp', '/gallery/then-and-now-1946-thumb.webp', 'The 1946 college, held up against today''s campus', timestamptz '2026-11-15 12:00:00+00' - interval '1 minutes'),
  ('/gallery/festival-drummer.webp', '/gallery/festival-drummer-thumb.webp', 'Traditional drummers at the campus festival', timestamptz '2026-11-15 12:00:00+00' - interval '2 minutes'),
  ('/gallery/archive-on-the-steps.webp', '/gallery/archive-on-the-steps-thumb.webp', 'Students on the old college steps', timestamptz '2026-11-15 12:00:00+00' - interval '3 minutes'),
  ('/gallery/nirmaan-techathon-2026.webp', '/gallery/nirmaan-techathon-2026-thumb.webp', 'Cultural evening at Nirmaan Techathon 2026', timestamptz '2026-11-15 12:00:00+00' - interval '4 minutes'),
  ('/gallery/festival-singer.webp', '/gallery/festival-singer-thumb.webp', 'Live performance during festival celebrations', timestamptz '2026-11-15 12:00:00+00' - interval '5 minutes'),
  ('/gallery/badminton-doubles.webp', '/gallery/badminton-doubles-thumb.webp', 'Badminton doubles at the indoor courts', timestamptz '2026-11-15 12:00:00+00' - interval '6 minutes'),
  ('/gallery/archive-class-photo.webp', '/gallery/archive-class-photo-thumb.webp', 'An archival class photograph', timestamptz '2026-11-15 12:00:00+00' - interval '7 minutes'),
  ('/gallery/festival-friends.webp', '/gallery/festival-friends-thumb.webp', 'Friends in traditional attire on festival day', timestamptz '2026-11-15 12:00:00+00' - interval '8 minutes'),
  ('/gallery/volleyball-spike.webp', '/gallery/volleyball-spike-thumb.webp', 'Volleyball spike on the campus court', timestamptz '2026-11-15 12:00:00+00' - interval '9 minutes'),
  ('/gallery/speaker-at-the-lectern.webp', '/gallery/speaker-at-the-lectern-thumb.webp', 'A student presenting at a department event', timestamptz '2026-11-15 12:00:00+00' - interval '10 minutes'),
  ('/gallery/annual-alumni-day.webp', '/gallery/annual-alumni-day-thumb.webp', 'Annual Alumni Day', timestamptz '2026-11-15 12:00:00+00' - interval '11 minutes'),
  ('/gallery/evening-lamps.webp', '/gallery/evening-lamps-thumb.webp', 'Lamps lit for an evening celebration', timestamptz '2026-11-15 12:00:00+00' - interval '12 minutes'),
  ('/gallery/after-the-session.webp', '/gallery/after-the-session-thumb.webp', 'Students in conversation after a session', timestamptz '2026-11-15 12:00:00+00' - interval '13 minutes'),
  ('/gallery/campus-entrance.webp', '/gallery/campus-entrance-thumb.webp', 'The tree-lined drive to the BMSCE sign', timestamptz '2026-11-15 12:00:00+00' - interval '14 minutes'),
  ('/gallery/platinum-jubilee-block.webp', '/gallery/platinum-jubilee-block-thumb.webp', 'B S Narayan Platinum Jubilee Academic Block', timestamptz '2026-11-15 12:00:00+00' - interval '15 minutes'),
  ('/gallery/festival-crowd.webp', '/gallery/festival-crowd-thumb.webp', 'Capturing the festival from the crowd', timestamptz '2026-11-15 12:00:00+00' - interval '16 minutes'),
  ('/gallery/workshop-teamwork.webp', '/gallery/workshop-teamwork-thumb.webp', 'Students working together at a workshop', timestamptz '2026-11-15 12:00:00+00' - interval '17 minutes'),
  ('/gallery/badminton-smash.webp', '/gallery/badminton-smash-thumb.webp', 'A smash at the indoor badminton courts', timestamptz '2026-11-15 12:00:00+00' - interval '18 minutes'),
  ('/gallery/academic-block-sky.webp', '/gallery/academic-block-sky-thumb.webp', 'An academic block against the sky', timestamptz '2026-11-15 12:00:00+00' - interval '19 minutes'),
  ('/gallery/walk-to-class.webp', '/gallery/walk-to-class-thumb.webp', 'The walk to class', timestamptz '2026-11-15 12:00:00+00' - interval '20 minutes'),
  ('/gallery/classroom-presentation.webp', '/gallery/classroom-presentation-thumb.webp', 'A student addressing a classroom', timestamptz '2026-11-15 12:00:00+00' - interval '21 minutes')
) as v(image_url, thumbnail_url, caption, uploaded_at)
where not exists (select 1 from public.gallery_photos g where g.image_url = v.image_url);
