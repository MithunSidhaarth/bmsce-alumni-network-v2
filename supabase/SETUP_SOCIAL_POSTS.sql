-- ============================================================================
-- BMS Alumni Network — SOCIAL POSTS: table + 168 Instagram rows
-- Paste this ENTIRE file into Supabase -> SQL Editor -> New query -> Run.
-- Requires the core schema (SETUP_LIVE_DB.sql) to have been run first.
-- Safe to re-run (ON CONFLICT DO NOTHING).
-- ============================================================================

-- ----- table + RLS -----
-- ============================================================================
-- BMS Alumni Network — social_posts (Instagram highlights feed)
-- Migration 0003 (run AFTER 0001)
--
-- Historical Instagram posts + admin-added posts. NOT related to the `events`
-- table — this is a display-only feed. Public read; only admins can write.
-- ============================================================================

create table if not exists public.social_posts (
  id             uuid primary key default gen_random_uuid(),
  post_id        text unique,        -- Instagram post id (null for manual adds)
  short_code     text,               -- Instagram short code
  caption        text,
  image_url      text,               -- re-hosted /instagram/<code>.jpg, or pasted URL
  video_url      text,               -- usually null (link out via permalink)
  post_type      text,               -- Image | Video | Sidecar | Manual
  posted_at      timestamptz,
  likes_count    int default 0,
  comments_count int default 0,
  permalink      text,               -- permanent instagram.com/p/... link
  hashtags       text[],
  added_by       uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists social_posts_posted_at_idx
  on public.social_posts (posted_at desc);

alter table public.social_posts enable row level security;

-- Public read (the feed shows on the Events page for everyone).
drop policy if exists social_posts_select on public.social_posts;
create policy social_posts_select on public.social_posts
  for select using (true);

-- Only admins can insert/update/delete.
drop policy if exists social_posts_admin_write on public.social_posts;
create policy social_posts_admin_write on public.social_posts
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----- 168 historical rows (images re-hosted at /instagram/<code>.jpg) -----
insert into public.social_posts (post_id, short_code, caption, image_url, video_url, post_type, posted_at, likes_count, comments_count, permalink, hashtags)
values
  ('3256007074465594891', 'C0vqS7jrj4L', 'Timeless connections, endless memories – Unveiling the nostalgia with BMSCE Alumni. ️ 
.
.
.
#bms #throwback #alumni #homecoming #engineering #basavanagudi', '/instagram/C0vqS7jrj4L.jpg', null, 'Video', '2023-12-12T07:34:07.000Z', 7266, 4, 'https://www.instagram.com/p/C0vqS7jrj4L/', array['bms','throwback','alumni','homecoming','engineering','basavanagudi']::text[]),
  ('3180881431711188853', 'Cwkws8hyAd1', 'Honoring the Legacy of a Visionary 

Picture 1 - Meet Mr. C.R. Sathya, a distinguished alumnus of BMS College of Engineering, whose journey was intertwined with the great Dr. Abdul Kalam''s mission. He was more than just a man carrying the first Rocket nose; he symbolized the spirit of innovation and dedication that propels humanity forward. 

Picture 2 - A heartwarming memory of a shared meal with Dr APJ Abdul Kalam, cherished by the Sathya family. Their close bond, built over years of working together, led to a unique lunch invitation on a chance flight meeting. Dr Kalam''s warm visit, appreciation of homemade mango pickles, and shared moments are a testament to their enduring connection. Despite his passing, the impact of Dr Kalam''s presence remains profound in the author''s husband, who shared both professional and personal moments with him. ✨

Picture 3 - Resting among the stars now, he has joined the cosmos he helped explore. We remember his invaluable contribution with profound respect and heartfelt gratitude. 

Picture 4 - 72-year-old C.R. Sathya, a former Scientist from the Thumba Equatorial Rocket Launching Station, reminisced about a vintage photograph, recalling, "The date remains etched in my memory - it was the 2nd of February 1968, and we were preparing the French Centaure rocket for a VIP launch at Thumba. ✨

.

.

.

#Pioneer #Legacy #Innovation', '/instagram/Cwkws8hyAd1.jpg', null, 'Sidecar', '2023-08-30T15:50:37.000Z', 911, 0, 'https://www.instagram.com/p/Cwkws8hyAd1/', array['Pioneer','Legacy','Innovation']::text[]),
  ('3001745342587995773', 'CmoV3wzJAZ9', 'Right from 1946, to 2022, a lot has seemed to change.

From the architecture to the number of branches, from the quality of education to the faculty, BMSCE has gone through 75 years of evolution that has led to what it is today!
.
.
.
.
#bmsce #bms #utsav #phaseshift #photooftheday #photography #college #memories #reunioun #flashback #engineering #engineer #vtu #bengaluru #bangalore #trending #alumni #alumninetwork #75years #platinumjubilee', '/instagram/CmoV3wzJAZ9.jpg', null, 'Image', '2022-12-26T11:59:11.000Z', 1714, 9, 'https://www.instagram.com/p/CmoV3wzJAZ9/', array['bmsce','bms','utsav','phaseshift','photooftheday','photography','college','memories','reunioun','flashback','engineering','engineer','vtu','bengaluru','bangalore','trending','alumni','alumninetwork','75years','platinumjubilee']::text[]),
  ('3916583700158602819', 'DZagB_VCd5D', 'Great insights on navigating the 2026 job market from Yash Kesharwani, Investment Banker at Goldman Sachs  Thank you for taking the time to come back to BMSCE and inspire the next generation. Truly valuable session!', '/instagram/DZagB_VCd5D.jpg', null, 'Sidecar', '2026-06-10T17:39:42.000Z', 169, 0, 'https://www.instagram.com/p/DZagB_VCd5D/', null),
  ('3913430150739783187', 'DZPS_zkJe4T', ' WHAT MATTERS IN THE 2026 JOB MARKET?

Join Yash Kesharwani, BMSCE alumnus and Investment Banker at Goldman Sachs, for an engaging session on industry trends, in-demand skills, and how students can prepare for the opportunities of tomorrow.

 Attendance provided.

Register now and stay ahead of the curve! 

#BMSCE #BMSCEAlumniNetwork #CareerTalk #JobMarket2026 #Placements', '/instagram/DZPS_zkJe4T.jpg', null, 'Image', '2026-06-06T09:14:43.000Z', 42, 1, 'https://www.instagram.com/p/DZPS_zkJe4T/', array['BMSCE','BMSCEAlumniNetwork','CareerTalk','JobMarket2026','Placements']::text[]),
  ('3901349795600071665', 'DYkYPgHSPvx', 'We look forward to seeing you all this Saturday! There is a rain forecast, but we hope that might change. Rain or shine, we will be hosting the potluck and might move it to an indoor space - we will take the call and announce any changes a day before the event.

Please RSVP here - https://forms.gle/gn19NEDFaKikjEhK7

You may also include what you would be bringing to the potluck.', '/instagram/DYkYPgHSPvx.jpg', null, 'Image', '2026-05-20T17:13:11.000Z', 41, 0, 'https://www.instagram.com/p/DYkYPgHSPvx/', null),
  ('3899770241857095126', 'DYexF-DiAXW', 'Gangadhar Sulkunte is a technology leader, entrepreneur, and proud BMS alumnus with over 25 years of experience in product engineering, healthcare technology, and cybersecurity. Currently the CTO of iCrimeFighter, he has also founded and led multiple startups focused on innovation and real-world impact.

In the seminar “Engineering Your Future: The Seen and the Unseen”, he will share insights on career growth, innovation, and the opportunities and challenges engineers face beyond academics.', '/instagram/DYexF-DiAXW.jpg', null, 'Image', '2026-05-18T12:55:01.000Z', 21, 0, 'https://www.instagram.com/p/DYexF-DiAXW/', null),
  ('3894403834000786475', 'DYLs6dRiUQr', 'Sunil Rao just made MD at Roblox India 

Massive milestone for the BMS legacy and a huge inspiration for every student dreaming big', '/instagram/DYLs6dRiUQr.jpg', null, 'Image', '2026-05-11T03:13:58.000Z', 222, 1, 'https://www.instagram.com/p/DYLs6dRiUQr/', null),
  ('3890160671385954384', 'DX8oIUJJ6hQ', 'Most VC applications don’t get rejected, they just get ignored.

With the volume today, cold outreach rarely works. Warm intros make all the difference.

At the BMS Alumni Network, we’re changing that. We connect you directly with VCs, angels, and operators who’ve actually built and invested. More importantly, you don’t just pitch, you get honest, unfiltered feedback from people who’ve been in the game.

If you’re serious about building, this is the room you want to be in. Send us a DM.', '/instagram/DX8oIUJJ6hQ.jpg', null, 'Image', '2026-05-05T06:42:33.000Z', 75, 0, 'https://www.instagram.com/p/DX8oIUJJ6hQ/', null),
  ('3890086014838343619', 'DX8XJ60J4fD', 'What you leave college with isn’t just a degree. It’s your network.

In a tight job market, referrals and real connections matter more than ever, and your alumni network is where that starts. We’re building a team that actually connects students to alumni through mentorship, events, and real opportunities.

We’re recruiting for Junior Core. 6 spots. This isn’t for someone who won’t deliver on time or has an issue showing up on a Saturday night. If you want to build something that outlasts college, apply. You have until 8th May.
Send your work and a video about yourself to siddhantsawhney.cs23@bmsce.ac.in', '/instagram/DX8XJ60J4fD.jpg', null, 'Image', '2026-05-05T04:13:57.000Z', 64, 0, 'https://www.instagram.com/p/DX8XJ60J4fD/', null),
  ('3885750457893217632', 'DXs9XQwiWVg', 'Spring Happy Hour – New York Meet ‑ Up Success! 
What an incredible evening of reconnection and celebration! Our alumni at NY chapter came together to share stories, laughter and new opportunities making this spring gathering truly memorable.
A heartfelt thankyou to everyone who joined and made the event a success. 
Here’s to more meet‑ups, stronger bonds and continued BMSCE alumni pride! 

@bmsce.official 

#B. M. S. College of Engineering
#BMSCEAlumni 
#SpringHappyHour 
#NewYorkMeetUp 
#TogetherWeThrive', '/instagram/DXs9XQwiWVg.jpg', null, 'Image', '2026-04-29T04:39:33.000Z', 393, 0, 'https://www.instagram.com/p/DXs9XQwiWVg/', array['B.','BMSCEAlumni','SpringHappyHour','NewYorkMeetUp','TogetherWeThrive']::text[]),
  ('3885343188357555876', 'DXrgwtciSak', 'From India’s Silicon Valley to the real Silicon Valley ➡️
Same roots, bigger stories, one global fam', '/instagram/DXrgwtciSak.jpg', null, 'Sidecar', '2026-04-28T15:10:22.000Z', 894, 2, 'https://www.instagram.com/p/DXrgwtciSak/', null),
  ('3875792469606631574', 'DXJlLdeCYiW', ' BMSCE NY – Spring Happy Hour Meet Up! 

Hello BMSCE NY Community! 

Spring is here, and it’s the perfect time to reconnect! We warmly invite you to join us for an evening of great conversations, good vibes, and familiar faces.

 Venue: The Monarch Rooftop Bar
71 W 35th St, New York, NY
(35th St & 6th Ave | Inside Courtyard Marriott)
 Date: Monday, April 20, 2026 (please notice the date change) 
 Time: 6:00 PM onwards

 Register here: https://docs.google.com/forms/u/0/d/1A7dZ9veQDKf2zvLP562AX8y-dWqqXsGZCL0MGgyF2CE/viewform

Come celebrate the season with your BMSCE family! See you there ✨', '/instagram/DXJlLdeCYiW.jpg', null, 'Image', '2026-04-15T10:54:50.000Z', 69, 1, 'https://www.instagram.com/p/DXJlLdeCYiW/', null),
  ('3818683330188151386', 'DT-sEGtkgpa', 'Winter storm energy, but we’re still outside 
Alumni happy hour this Wednesday, Jan 28 at The Rag Trader, Midtown.

Familiar faces, new conversations, good drinks.
You know the drill.

RSVP link in bio', '/instagram/DT-sEGtkgpa.jpg', null, 'Image', '2026-01-26T15:49:08.000Z', 22, 0, 'https://www.instagram.com/p/DT-sEGtkgpa/', null),
  ('3814880024181532071', 'DTxLSt-EuWn', 'From campus corridors to the national startup stage.

Shubham Singh, our alumnus, founder of Craste, featured on Bharat Ke Super Founders on Amazon MX Player.

Craste is tackling two massive problems at once by turning agricultural waste into sustainable materials, proving that innovation and impact can go hand in hand.

Stories like these remind us what the BMSCE alumni network is capable of when engineering meets purpose.

Here’s to building bold ideas, solving real problems, and representing BMSCE on every big stage 

#BMSCE #ProudAlumni #StartupIndia #Sustainability #innovation', '/instagram/DTxLSt-EuWn.jpg', null, 'Image', '2026-01-21T09:52:39.000Z', 129, 4, 'https://www.instagram.com/p/DTxLSt-EuWn/', array['BMSCE','ProudAlumni','StartupIndia','Sustainability','innovation']::text[]),
  ('3811949645330026297', 'DTmxAF_ko85', 'We spoke to our alumnus Ajay, who later went on to IIM Kozhikode, about the role communication played in his journey. Listen and learn from his experience to be the best version of yourself 

#alumni #career #growth #communication', '/instagram/DTmxAF_ko85.jpg', null, 'Video', '2026-01-17T08:51:28.000Z', 439, 2, 'https://www.instagram.com/p/DTmxAF_ko85/', array['alumni','career','growth','communication']::text[]),
  ('3810501758586895373', 'DThnykYkrwN', 'A common dilemma we all face after graduation is choosing between a master’s or a job. Listen to our alumnus Dev break it down with a simple framework that makes the decision easier. Hope this helps! 

#masters #job #career #alumni #graduation', '/instagram/DThnykYkrwN.jpg', null, 'Video', '2026-01-15T08:55:19.000Z', 1147, 13, 'https://www.instagram.com/p/DThnykYkrwN/', array['masters','job','career','alumni','graduation']::text[]),
  ('3801823617362301290', 'DTCym_jkhFq', 'Some places stay with you long after you leave them ✨

On 20 December, BMSCE welcomed its alumni back to where it all began.

Memories revisited, journeys shared, and bonds strengthened 

A day filled with gratitude, pride, and the feeling of coming home 

#alumni #alumniday #bmsce #reunion', '/instagram/DTCym_jkhFq.jpg', null, 'Video', '2026-01-03T09:33:51.000Z', 724, 2, 'https://www.instagram.com/p/DTCym_jkhFq/', array['alumni','alumniday','bmsce','reunion']::text[]),
  ('3788545873244884194', 'DSTnmYuCIzi', 'A day of nostalgia, team spirit  and unforgettable moments with the alumni

@bmsce.official 

Video credits to @nish._.zone

#alumni #sports meet
#networking 
#BMSCEAlumni 
#Alumninetwork', '/instagram/DSTnmYuCIzi.jpg', null, 'Video', '2025-12-16T01:52:53.000Z', 340, 0, 'https://www.instagram.com/p/DSTnmYuCIzi/', array['alumni','sports','networking','BMSCEAlumni','Alumninetwork']::text[]),
  ('3782772991756249750', 'DR_G_53kqqW', 'Sports Day on 7 Dec brought the alumni together
Strong participation across every event
A day that highlighted the spirit of our community 

#alumni #alumnimeet #sports #sportsday #reunion', '/instagram/DR_G_53kqqW.jpg', null, 'Sidecar', '2025-12-08T02:41:42.000Z', 376, 1, 'https://www.instagram.com/p/DR_G_53kqqW/', array['alumni','alumnimeet','sports','sportsday','reunion']::text[]),
  ('3768332271746192537', 'DRLzjxVEpSZ', 'It’s time to bring the spirit, energy, and nostalgia back to the field! ⚡️
Calling all alumni for a day filled with friendly competition, celebration, and camaraderie as we relive the BMSCE legacy.

️ Date: 07.12.2025
 Time: 8:30 AM onwards
 Venue: BMSCE Indoor Stadium
.
.
#sports #sportsday2025‍♂️ #basavanagudi #alumni #bmsce #bmscesports', '/instagram/DRLzjxVEpSZ.jpg', null, 'Image', '2025-11-18T04:30:00.000Z', 24, 2, 'https://www.instagram.com/p/DRLzjxVEpSZ/', array['sports','sportsday2025‍♂️','basavanagudi','alumni','bmsce','bmscesports']::text[]),
  ('3759696853593128486', 'DQtIF5dkn4m', ' Annual Alumni Day – Homecoming 2025
Reconnect, Relive and Rekindle – Together Again at Homecoming!

This is a celebratory event scheduled for Saturday, December 20, 2025, where alumni of BMSCE are invited to reconnect, relive and rekindle their college memories. 

Alumni are encouraged to register via link: bit.ly/bmscealumniday25 
and share the invitation with batchmates.

@bmscealumni 

#BMSCEAlumni
#Homecoming2025
#BackToBMS #AlumniDayVibes
#BMSCEHomecoming
#AlumniDayVibes
#OnceABMSianAlwaysABMSian
#BMSCEReunion2025
#CampusCalling
#ReigniteTheSpirit
#TogetherAgainAtBMSCE
#BMSCEForever
#NammaBMSCE', '/instagram/DQtIF5dkn4m.jpg', null, 'Image', '2025-11-06T06:33:32.000Z', 69, 0, 'https://www.instagram.com/p/DQtIF5dkn4m/', array['BMSCEAlumni','Homecoming2025','BackToBMS','AlumniDayVibes','BMSCEHomecoming','OnceABMSianAlwaysABMSian','BMSCEReunion2025','CampusCalling','ReigniteTheSpirit','TogetherAgainAtBMSCE','BMSCEForever','NammaBMSCE']::text[]),
  ('3743690057778477925', 'DP0QkXLDDtl', 'We’re bringing the BMSCE family back together for Alumni Day 2025. 
It’s time to return to the place of our shared stories, where ambitions took flight.
Join us for a day of heartfelt reunions, the reliving of timeless memories, and a celebration of the enduring pride of BMSCE. 

️ Date: 20.12.2025
 Time: 10 AM to 7 PM
 Venue: BMSCE Campus
.
.
#alumni #alumniday #basavanagudi #bulltempleroad', '/instagram/DP0QkXLDDtl.jpg', null, 'Image', '2025-10-15T04:30:00.000Z', 28, 0, 'https://www.instagram.com/p/DP0QkXLDDtl/', array['alumni','alumniday','basavanagudi','bulltempleroad']::text[]),
  ('3734297651296002607', 'DPS4-2_EuIv', ' BMSCE is going global! ✈️

Our Principal & delegation are visiting the USA to strengthen international ties  and host special alumni meets in:

 Bay Area – Nov 15 (Saturday)
 Dallas – Nov 16 (Sunday)
 New York – Nov 22 (Saturday)

✨ Reconnect with BMSCEans, meet the delegation, and be part of our global journey.

 Register now: [link in bio]

#alumni #alumnimeet #global #sanfrancisco #dallas #new', '/instagram/DPS4-2_EuIv.jpg', null, 'Image', '2025-10-02T05:29:51.000Z', 58, 0, 'https://www.instagram.com/p/DPS4-2_EuIv/', array['alumni','alumnimeet','global','sanfrancisco','dallas','new']::text[]),
  ('3731564961769610855', 'DPJLo_ikl5n', 'From classrooms to Chicago streets, the bond stays undefeated 

#alumni #alumnimeet #chicago', '/instagram/DPJLo_ikl5n.jpg', null, 'Sidecar', '2025-09-28T11:00:29.000Z', 460, 0, 'https://www.instagram.com/p/DPJLo_ikl5n/', array['alumni','alumnimeet','chicago']::text[]),
  ('3727622624148388988', 'DO7LQbhEvx8', 'From Basavanagudi to Seattle—BMSCE bonds never fade.
Alumni from 1981 to 2021 came together in the Emerald City to relive old stories, share new journeys, and celebrate the spirit of BMSCE.
Seattle’s crisp breeze, soulful conversations, and unstoppable laughter made this reunion unforgettable.
Once a BMSite, always a BMSite.
#BMSCEAlumniMeet #SeattleReunion2025 #GlobalBMSites #BMSCEForever #AlumniAcrossDecades #BMSCESeattleVibes #EngineeringMemories #BasavanagudiToTheWorld #ReelItFeelIt #LegacyInMotion #BMSCEConnect #AlumniReel #SeattleStories #BMSCEGlobalFamily #NammaBMSCE
#random #viral #trending #instagood #reels #reelitfeelit #bmsce', '/instagram/DO7LQbhEvx8.jpg', null, 'Video', '2025-09-23T00:39:00.000Z', 2020, 11, 'https://www.instagram.com/p/DO7LQbhEvx8/', array['BMSCEAlumniMeet','SeattleReunion2025','GlobalBMSites','BMSCEForever','AlumniAcrossDecades','BMSCESeattleVibes','EngineeringMemories','BasavanagudiToTheWorld','ReelItFeelIt','LegacyInMotion','BMSCEConnect','AlumniReel','SeattleStories','BMSCEGlobalFamily','NammaBMSCE','random','viral','trending','instagood','reels','reelitfeelit','bmsce']::text[]),
  ('3727017153154703911', 'DO5BlqtkuIn', 'Reunited miles away in Seattle, but it felt just like yesterday ✨

#alumni #alumnimeet #reunion #seattle', '/instagram/DO5BlqtkuIn.jpg', null, 'Sidecar', '2025-09-22T04:24:48.000Z', 431, 0, 'https://www.instagram.com/p/DO5BlqtkuIn/', array['alumni','alumnimeet','reunion','seattle']::text[]),
  ('3721254938124414030', 'DOkjaZxkuxO', '☀️ Wrapping up summer the NYC way - laughter, friends & Central Park vibes.

#alumni #alumnimeet #summer #centralparknyc #nyc', '/instagram/DOkjaZxkuxO.jpg', null, 'Sidecar', '2025-09-14T05:36:19.000Z', 262, 0, 'https://www.instagram.com/p/DOkjaZxkuxO/', array['alumni','alumnimeet','summer','centralparknyc','nyc']::text[]),
  ('3717892335264237822', 'DOYm2F0koj-', 'To celebrate the end of summer in NYC  we’re hosting a New York Picnic 

 Sheep’s Meadow, Central Park
 Saturday, Sept 13th
 1:00 PM onwards

Come join us for an afternoon of reconnecting, good vibes, and fun with fellow alumni! 

RSVP Link in Bio!', '/instagram/DOYm2F0koj-.jpg', null, 'Image', '2025-09-09T14:15:25.000Z', 19, 1, 'https://www.instagram.com/p/DOYm2F0koj-/', null),
  ('3711390044252151690', 'DOBgZTakh-K', 'Caps were thrown, hearts were full, and a chapter closed. What remains are the memories, the friendships, and the fire to keep moving forward.  
#alumni #bmsce #graduation #graduationday #classof2025', '/instagram/DOBgZTakh-K.jpg', null, 'Video', '2025-08-31T14:58:31.000Z', 861, 2, 'https://www.instagram.com/p/DOBgZTakh-K/', array['alumni','bmsce','graduation','graduationday','classof2025']::text[]),
  ('3699789049415582097', 'DNYSonCS8GR', 'At the Singapore alumni meet , alumni shared memories of their BMS days , discussed how the world is changing , and explored ways the alumni network can support and guide students ', '/instagram/DNYSonCS8GR.jpg', null, 'Sidecar', '2025-08-15T14:47:25.000Z', 331, 0, 'https://www.instagram.com/p/DNYSonCS8GR/', null),
  ('3699478496427953593', 'DNXMBeByM25', '✨ Celebrating the colors, culture, and unity that make India truly incredible. Here’s to freedom, progress, and the spirit that binds us together.
Happy Independence Day! 

#indepenceday #bmsce #alumni', '/instagram/DNXMBeByM25.jpg', null, 'Image', '2025-08-15T04:30:00.000Z', 82, 1, 'https://www.instagram.com/p/DNXMBeByM25/', array['indepenceday','bmsce','alumni']::text[]),
  ('3696930191567331153', 'DNOImwLyZ9R', 'Unforgettable moments with the BMSCE family in Toronto! ✨ From Bangalore to James Park, celebrating our journey, laughter, and lasting bonds. Grateful for every friendship that began at BMSCE and continues to thrive across borders!

#alumni #toronto #bmsce #alumnimeet', '/instagram/DNOImwLyZ9R.jpg', null, 'Image', '2025-08-11T16:07:23.000Z', 80, 1, 'https://www.instagram.com/p/DNOImwLyZ9R/', array['alumni','toronto','bmsce','alumnimeet']::text[]),
  ('3696895472586826442', 'DNOAthnSaLK', 'Join us for the Singapore Alumni Meet! 
Reconnect, reminisce, and make new memories with fellow alumni over great food and conversations. We’re meeting on 15th August at 7:00 PM at Riverwalk Tandoor. Don’t miss this chance to catch up and expand your network in a warm, familiar setting. See you there!

#singapore #alumni #alumnimeet #bmsce', '/instagram/DNOAthnSaLK.jpg', null, 'Image', '2025-08-11T14:58:24.000Z', 25, 0, 'https://www.instagram.com/p/DNOAthnSaLK/', array['singapore','alumni','alumnimeet','bmsce']::text[]),
  ('3668320649686433317', 'DLofjH-yj4l', '25 years later, and the bonds still feel like yesterday. 120+ hearts, one unforgettable reunion. 

#alumni #bmsce #meetup #alumnimeet #bangalore', '/instagram/DLofjH-yj4l.jpg', null, 'Video', '2025-07-03T04:47:48.000Z', 497, 0, 'https://www.instagram.com/p/DLofjH-yj4l/', array['alumni','bmsce','meetup','alumnimeet','bangalore']::text[]),
  ('3664065357326941717', 'DLZYAeJSX4V', '‍♀️ Yoga Day celebration by @varshasutrave  Founder of Swarat Wellness and BMSCE Alumna, was more than a session—it was a pause, a breath, and a gentle return to balance.
From mindful movements to intentional stillness, participants explored the depth beyond postures—embracing breathwork, presence, and a collective sense of calm.
Grateful to everyone who joined us for this refreshing and grounding experience.

@bmsce.official 

#YogaDay #MindfulLeadership #BMSCEAlumni #WellnessByDesign #yogawithvarsha', '/instagram/DLZYAeJSX4V.jpg', null, 'Image', '2025-06-27T07:50:49.000Z', 40, 0, 'https://www.instagram.com/p/DLZYAeJSX4V/', array['YogaDay','MindfulLeadership','BMSCEAlumni','WellnessByDesign','yogawithvarsha']::text[]),
  ('3659081760291464285', 'DLHq3luSKRd', ' Embrace Peace and Balance this International Yoga Day ‍♀️✨ Join us as we salute the sun, steady our breath, and awaken our spirit by the sea   22 June 2025 |  7:00 AM With @varshasutrave Founder of Swarat Wellness & BMSCE Alumna (Medical Electronics, 2008) 

Register now via the QR code

Let the waves guide your mind and the pose ground your soul. 

@bmsce.official 
@wie_ieeebangalore 

#WIEIndiaCouncil

#InternationalYogaDay #BMSCEWellness #AlumniInspire #MindBodyBalance #YogaWithVarsha', '/instagram/DLHq3luSKRd.jpg', null, 'Image', '2025-06-20T10:49:18.000Z', 43, 0, 'https://www.instagram.com/p/DLHq3luSKRd/', array['WIEIndiaCouncil','InternationalYogaDay','BMSCEWellness','AlumniInspire','MindBodyBalance','YogaWithVarsha']::text[]),
  ('3653268937334766114', 'DKzBL4ezroi', 'Senior Fellow Initiatives Week is here! ✨

 Kicking things off with an important focus on menstrual health and sustainability. This initiative is breaking barriers by promoting awareness and eco-friendly solutions for menstrual health.

 Explore the full impact in our latest report!

Discover more in the full report. https://bit.ly/MeltonFoundationImpact2024 
 
 #MenstrualHealth #Sustainability #SFInitiativesWeek #Empowerment', '/instagram/DKzBL4ezroi.jpg', null, 'Image', '2025-06-12T10:20:21.000Z', 21, 0, 'https://www.instagram.com/p/DKzBL4ezroi/', array['MenstrualHealth','Sustainability','SFInitiativesWeek','Empowerment']::text[]),
  ('3651606938368177872', 'DKtHSnUyXbQ', '✨ Glimpses from the first-ever BMSCE CXO Alumni Dinner in San Francisco! 
We brought together an inspiring group of BMSCE alumni this May — from a former Vice Mayor of Sunnyvale, to a professor at MIT, CXOs, exited founders, Fortune 500 leaders, and more 

It was a night of stories, laughter, vision, and shared pride in how far the BMSCE community has come. 

#bmscealumninetwork #globalconnect #mit #sunnyvale #sanfransisco #networkingdinner #bangalore #bayarea', '/instagram/DKtHSnUyXbQ.jpg', null, 'Sidecar', '2025-06-10T03:18:10.000Z', 821, 1, 'https://www.instagram.com/p/DKtHSnUyXbQ/', array['bmscealumninetwork','globalconnect','mit','sunnyvale','sanfransisco','networkingdinner','bangalore','bayarea']::text[]),
  ('3639352517370346869', 'DKBk9UaSH11', ' From Tom Cruise-level risks to Warren Buffett-style wisdom, Karthik Shenoi turned the world of finance into a thrill ride of insights and aha moments. Money, mindsets, and mastering your finances—all packed into one unforgettable session.

A full house, big laughs, real talk, and plenty of “why didn’t they teach us this in school?” moments 
Finance just got a serious glow-up. 

#finance #investing #warrenbuffet #alumni #bmscealumni', '/instagram/DKBk9UaSH11.jpg', null, 'Video', '2025-05-24T05:30:00.000Z', 367, 1, 'https://www.instagram.com/p/DKBk9UaSH11/', array['finance','investing','warrenbuffet','alumni','bmscealumni']::text[]),
  ('3638009482321623397', 'DJ8zlljSHll', 'Down the memory lane✨

BMSCE has grown, but the spirit remains the same. This campus has seen generations dream big, laugh hard, and build futures brick by brick.

To the alumni who laid the first stones and the students carrying the legacy forward, here’s to timeless classrooms, lifelong friendships, and memories that never fade. ❤️

#campuschronicles #campusdiaries #alumni #studentlife #throwbackk', '/instagram/DJ8zlljSHll.jpg', null, 'Image', '2025-05-22T09:02:27.000Z', 643, 0, 'https://www.instagram.com/p/DJ8zlljSHll/', array['campuschronicles','campusdiaries','alumni','studentlife','throwbackk']::text[]),
  ('3637308031735773081', 'DJ6UGIySTeZ', ' Money Matters: Smart Finance for a Better Future
Join us for a talk on Financial Literacy with Karthik Shenoi, BMS alum & finance expert 
️ Friday, 23rd |  2:00 – 3:00 PM
Audi 2
Smart money tips for students who want to actually adult right 
️ Registration Link in Bio

 Attendance certificate will be provided!

#moneymatters #personalfinances #investing #alumni #bmscealumni', '/instagram/DJ6UGIySTeZ.jpg', null, 'Image', '2025-05-21T09:48:48.000Z', 53, 0, 'https://www.instagram.com/p/DJ6UGIySTeZ/', array['moneymatters','personalfinances','investing','alumni','bmscealumni']::text[]),
  ('3636130847486934821', 'DJ2Ib2hTH8l', 'Startups, steps, and shared stories  — our May 17 SF Alumni Hike at San Antonio Park brought together founders, builders, and big dreamers who swapped boardrooms for birdsong (just for a bit). 

Between VC gossip, AI debates, and accidental cardio, it was a reminder that the best connections often happen off Zoom and on trail. Here’s to more alumni meetups where the ideas flow as freely as the sweat ✨ 

#alumni #sanfrancisco #hike #alumnimeet #bmsce #bmscealumni', '/instagram/DJ2Ib2hTH8l.jpg', null, 'Sidecar', '2025-05-19T18:49:56.000Z', 186, 0, 'https://www.instagram.com/p/DJ2Ib2hTH8l/', array['alumni','sanfrancisco','hike','alumnimeet','bmsce','bmscealumni']::text[]),
  ('3625898546442131641', 'DJRx4RkSdi5', 'Hey BMSCE fam in the Bay Area!
We’re hosting a scenic hike + alumni catch-up on May 17th at 8 AM—and we’d love to see you there!

Location: Rancho San Antonio County Park & Open Space Preserve
https://g.co/kgs/Ue7ugx4

It’s not just a walk in the woods—it’s a walk down memory lane.
No WiFi, but we promise stronger connections.
Think offsite vibes—just without the KPIs, and with way better stories!

Spots are limited—RSVP here: https://bit.ly/bms-sf ✍️

Let’s make new memories while reliving the old ones!

#bmsce #bmscealumni #bmscealumninetwork #california #sanfrancisco #trek #ranchosanantonio #networking #alumni', '/instagram/DJRx4RkSdi5.jpg', null, 'Image', '2025-05-05T16:00:00.000Z', 26, 0, 'https://www.instagram.com/p/DJRx4RkSdi5/', array['bmsce','bmscealumni','bmscealumninetwork','california','sanfrancisco','trek','ranchosanantonio','networking','alumni']::text[]),
  ('3623434088629234200', 'DJJBhsXyWoY', ' Batch of 2000 – 25-Year Reunion! 
Time flies, but memories last forever! It''s been 25 incredible years since we walked the halls together, and now it’s time to relive the nostalgia, rekindle friendships, and celebrate our journey.
 Date: 28 June 2025
 Venue: BMSCE
⏰ Time: 10:00 AM
 Theme: Silver Jubilee Soirée
Let’s reconnect, reminisce, and make new memories that last a lifetime! Spread the word and register soon!
Link in bio!!

#batchof2000 #25YearReunion #OldFriendsNewMemories #TogetherAgain
@bmsce.official', '/instagram/DJJBhsXyWoY.jpg', null, 'Image', '2025-05-02T06:23:45.000Z', 198, 2, 'https://www.instagram.com/p/DJJBhsXyWoY/', array['batchof2000','25YearReunion','OldFriendsNewMemories','TogetherAgain']::text[]),
  ('3619028648223022972', 'DI5X2GRS598', 'A proud milestone for our graduating students as they embark on their professional journeys. On April 5th, we welcomed the newest members to the ever-growing BMSCE Alumni Network. Congratulations to the graduating batch on this remarkable achievement! ✨
.
.
.
#alumni #bmsce #bangalore #basavanagudi #connection #memories #graduation', '/instagram/DI5X2GRS598.jpg', null, 'Sidecar', '2025-04-26T04:30:00.000Z', 554, 0, 'https://www.instagram.com/p/DI5X2GRS598/', array['alumni','bmsce','bangalore','basavanagudi','connection','memories','graduation']::text[]),
  ('3616496272204664264', 'DIwYDLUSI3I', 'BMSCE Alumni in SF—let’s take this offline!

Join us for a scenic hike + IRL catch-up on May 17, 8 AM at Rancho San Antonio County Park & Open Space Preserve ⛰️
(650) 691-1200

No WiFi, but we promise stronger connections.
It’s like a team offsite—just with better stories, no KPIs, and maybe a squirrel or two.

Limited spots—RSVP before it 404s!
Link in bio', '/instagram/DIwYDLUSI3I.jpg', null, 'Image', '2025-04-22T16:39:33.000Z', 21, 0, 'https://www.instagram.com/p/DIwYDLUSI3I/', null),
  ('3598010151336411944', 'DHusytoqAMo', 'Old friends, new memories! BMSCE alumni in London came together at Doggett’s Coat and Badge on 22.03.2025 for an evening of laughter, nostalgia, and great conversations. Here’s to friendships that stand the test of time! 
.
.
#bmscealumninetwork #londonmeetup #foreverconnected #bmscealumni #london #foryou', '/instagram/DHusytoqAMo.jpg', null, 'Image', '2025-03-28T04:30:00.000Z', 101, 0, 'https://www.instagram.com/p/DHusytoqAMo/', array['bmscealumninetwork','londonmeetup','foreverconnected','bmscealumni','london','foryou']::text[]),
  ('3553787257326385820', 'DFRlq6IP7qc', 'Leading with pride!  A proud moment for BMSCE as an alumnus from our college, now a Garhwal Rifles officer, leads the regiment contingent at the Republic Day Parade 2025.

BMSCE celebrates his dedication, courage, and service to the nation. We are truly proud of him! 

Video credit: @defencedirecteducation

#BMSCEPride #RepublicDay2025 #GarhwalRifles #AlumniAchievements #LeadingTheWay', '/instagram/DFRlq6IP7qc.jpg', null, 'Video', '2025-01-26T04:08:17.000Z', 1389, 6, 'https://www.instagram.com/p/DFRlq6IP7qc/', array['BMSCEPride','RepublicDay2025','GarhwalRifles','AlumniAchievements','LeadingTheWay']::text[]),
  ('3536509935200764570', 'DEUNQyASAKa', 'Finally, the most awaited question: How do you get an internship? 

Listen to Pranav, a ''22 pass-out, and Siddhant, a third-semester student having completed 3+ internships, as they share the ultimate secret: go above and beyond. It’s not just about answering questions - it’s about standing out by doing what no one else does. 

Are you ready to think outside the box and leave a lasting impact? ✨ Stay tuned!

#alumni #bmsce #internship #career #growth', '/instagram/DEUNQyASAKa.jpg', null, 'Video', '2025-01-02T12:30:06.000Z', 357, 5, 'https://www.instagram.com/p/DEUNQyASAKa/', array['alumni','bmsce','internship','career','growth']::text[]),
  ('3535739815637667127', 'DEReKERSc03', 'From BMSCE to greatness!

Huge congratulations to Dr. Kavyashree Manjunath for receiving the prestigious Smt. Shuba & Prof. Dwarkadasa Young Entrepreneur Award, presented by the IISc Association in remembrance of Mr. Ratan Tata.

Your hard work and perseverance have truly paid off. Your journey is inspirational, and we are so proud of you! ', '/instagram/DEReKERSc03.jpg', null, 'Image', '2025-01-01T06:30:17.000Z', 141, 0, 'https://www.instagram.com/p/DEReKERSc03/', null),
  ('3535015029085137548', 'DEO5XCMSWqM', ' Your network is your net worth!  Listen to Hritik as he shares the most insightful strategies on how to network effectively and build meaningful connections. Discover why mastering this skill is the key to unlocking personal and professional growth! 

#alumni #bmsce #network #growth', '/instagram/DEO5XCMSWqM.jpg', null, 'Video', '2024-12-31T06:30:33.000Z', 157, 1, 'https://www.instagram.com/p/DEO5XCMSWqM/', array['alumni','bmsce','network','growth']::text[]),
  ('3533629824445439133', 'DEJ-Zp1y9yd', 'Tech is getting crowded, and with more supply than demand, it’s crucial to avoid mistakes that everyone else is making.  Chasing trends and buzzwords might not be the best way to stand out. 

Listen to Dheeraj break down what you shouldn’t do and how to find your edge in this competitive world. Stay ahead, not just in the race! 

#alumni #tech #bmsce #product #career', '/instagram/DEJ-Zp1y9yd.jpg', null, 'Video', '2024-12-29T08:40:14.000Z', 355, 6, 'https://www.instagram.com/p/DEJ-Zp1y9yd/', array['alumni','tech','bmsce','product','career']::text[]),
  ('3533625695471690286', 'DEJ9dkbyGIu', 'Tech is getting crowded, and with more supply than demand, it’s crucial to avoid mistakes that everyone else is making.  Chasing trends and buzzwords might not be the best way to stand out. 

Listen to Dheeraj break down what you shouldn’t do and how to find your edge in this competitive world. Stay ahead, not just in the race! 

#tech #career #alumni #bmsce', '/instagram/DEJ9dkbyGIu.jpg', null, 'Video', '2024-12-29T08:30:39.000Z', 9, 0, 'https://www.instagram.com/p/DEJ9dkbyGIu/', array['tech','career','alumni','bmsce']::text[]),
  ('3532055288193193737', 'DEEYZIry5cJ', 'Confused about your career path?  Hear Akshay share his journey of joining a startup for one role but exploring many others. 

Discover how startups offer unique opportunities to gain diverse experiences across fields, unlike traditional corporate roles. 

#bmsce #alumni #startup #startuplife #risktaker', '/instagram/DEEYZIry5cJ.jpg', null, 'Video', '2024-12-27T04:30:01.000Z', 241, 3, 'https://www.instagram.com/p/DEEYZIry5cJ/', array['bmsce','alumni','startup','startuplife','risktaker']::text[]),
  ('3530605894210233004', 'DD_O1rWTSKs', 'A nostalgic day at the alma mater! 
The day featured a heartfelt felicitation ceremony, captivating cultural performances, and joyful reunions. 

Truly a celebration to remember. See you next time! ⌛
.
.
#alumniday #alumnimeet #bmsce #basavanagudi', '/instagram/DD_O1rWTSKs.jpg', null, 'Video', '2024-12-25T04:30:00.000Z', 380, 0, 'https://www.instagram.com/p/DD_O1rWTSKs/', array['alumniday','alumnimeet','bmsce','basavanagudi']::text[]),
  ('3524120146604509256', 'DDoMJoMKMhI', 'Dear Alumni,
Your presence will add joy and vibrancy to our gathering, making it an unforgettable celebration on 21 Dec 2024. 
Click the link below to register and join us for this special occasion:  
https://bit.ly/BMSCEAlumniday24
Let’s come together and celebrate the past, present, and future of our beloved institution!

#bmscealumni 
#Alumninetwork
#bmsce 
#alumni 
@bmsce.official', '/instagram/DDoMJoMKMhI.jpg', null, 'Video', '2024-12-16T05:44:58.000Z', 177, 1, 'https://www.instagram.com/p/DDoMJoMKMhI/', array['bmscealumni','Alumninetwork','bmsce','alumni']::text[]),
  ('3518343414167498092', 'DDTqrG3Se1s', 'Throwing it back to 1979! ✨ Honored to have our esteemed alumni revisit us, sharing memories, experiences, and significantly contributing to scholarships that will empower the next generation of students. Here''s to bridging generations and building a brighter future together!
.
.
.
#alumni #bmsce #network #basavanagudi #foryou #foryoupage #students', '/instagram/DDTqrG3Se1s.jpg', null, 'Video', '2024-12-08T06:27:50.000Z', 53, 0, 'https://www.instagram.com/p/DDTqrG3Se1s/', array['alumni','bmsce','network','basavanagudi','foryou','foryoupage','students']::text[]),
  ('3517559756414650957', 'DDQ4fYtTgpN', '“Just a day to go until alumni take the field and the competition heats up!  Get ready for an unforgettable day of friendly rivalry, team spirit, and college pride. Who’s ready to relive the glory days?”
.
.
#sports #sportsday #onedaytogo', '/instagram/DDQ4fYtTgpN.jpg', null, 'Image', '2024-12-07T04:30:00.000Z', 34, 0, 'https://www.instagram.com/p/DDQ4fYtTgpN/', array['sports','sportsday','onedaytogo']::text[]),
  ('3517161557296033600', 'DDPd804Si9A', 'Sports Day is returning, and we want YOU to be part of it! Alumni, come join us for a day of friendly competition, old memories, and new moments to cherish. Reconnect, relive the excitement, and bring your college spirit back to the field. See you there!', '/instagram/DDPd804Si9A.jpg', null, 'Video', '2024-12-06T15:21:02.000Z', 49, 0, 'https://www.instagram.com/p/DDPd804Si9A/', null),
  ('3516835048748724613', 'DDOTtgGT7GF', 'Once a sportsperson, always a sportsperson

The Alumni Sports Day is here to let you experience again the laughs you shared and the epic plays you played.This Sunday, relive the moments that made your team a family.
.
.
.
#sportsday #alumni #memories #backtocollege', '/instagram/DDOTtgGT7GF.jpg', null, 'Image', '2024-12-06T04:30:00.000Z', 43, 0, 'https://www.instagram.com/p/DDOTtgGT7GF/', array['sportsday','alumni','memories','backtocollege']::text[]),
  ('3516110134118778007', 'DDLu4mvTQSX', 'Reunite. Reminisce. Replay

Get ready to relive your golden days! Reunite with your teammates, bring back your camaraderie and put your game face on and join us to make the event more memorable.

Venue: BMS College of Engineering 
.
.
#bmsce #sportsday #alumni #cricket', '/instagram/DDLu4mvTQSX.jpg', null, 'Image', '2024-12-05T04:30:00.000Z', 49, 0, 'https://www.instagram.com/p/DDLu4mvTQSX/', array['bmsce','sportsday','alumni','cricket']::text[]),
  ('3502345566020075816', 'DCa1LxvSoEo', ' Exciting News! 

We are thrilled to invite you to the BMSCE Alumni Day on 21st December 2024!  Save the Date! 

Reconnect with old friends, relive cherished memories, and create new ones. Let''s come together to celebrate our journey and achievements!

Registration is mandatory: link in comments

We can’t wait to welcome you back to your almamater!

.

.

#BMSCEAlumni #AlumniDay2024 #ReconnectAndCelebrate 

#alumni #bmscealumni #homecoming #reconnect #bmsce 

@bmsce.official 

@bmscealumni', '/instagram/DCa1LxvSoEo.jpg', null, 'Image', '2024-11-16T04:42:28.000Z', 47, 1, 'https://www.instagram.com/p/DCa1LxvSoEo/', array['BMSCEAlumni','AlumniDay2024','ReconnectAndCelebrate','alumni','bmscealumni','homecoming','reconnect','bmsce']::text[]),
  ('3499440273921773208', 'DCQgmNnzY6Y', ' BMSCE Alumni Network : Call for Volunteers 

We’re recruiting passionate and driven volunteers for roles in Media, Content, Design, and International Relations to help organize large-scale events and connect with top BMS alumni across the world. If you’re from the 2027 or 2028 batch and want to be a part of this dynamic network, apply by 15th November!
Register : link in bio!!
.
.
#volunteer #sportsday #bmsce #alumni #reconnect', '/instagram/DCQgmNnzY6Y.jpg', null, 'Image', '2024-11-12T04:30:00.000Z', 30, 0, 'https://www.instagram.com/p/DCQgmNnzY6Y/', array['volunteer','sportsday','bmsce','alumni','reconnect']::text[]),
  ('3499410347034286121', 'DCQZyuCThgp', 'Dear Alumni, 
We are thrilled to invite BMSCE Alumni to the Alumni Sports Day! This exciting event will take place on Saturday, 7 December 2024 at BMSCE. It’s a fantastic opportunity to reconnect with Batchmates, old friends, showcase your athletic talents, and have a great time.

We look forward to seeing you there and making this a memorable day!
 Join Us for Alumni Sports Day! 
Register : link in bio!!
Note : Registrations are mandatory to participate 
.
.
.
.
#bmscealumni #sportsday #Alumni #reconnect #badminton #cricket #bmsce', '/instagram/DCQZyuCThgp.jpg', null, 'Image', '2024-11-12T03:30:00.000Z', 45, 0, 'https://www.instagram.com/p/DCQZyuCThgp/', array['bmscealumni','sportsday','Alumni','reconnect','badminton','cricket','bmsce']::text[]),
  ('3473370903365553615', 'DAz5G8USA3P', 'Hello Everyone! 
BMSCE Alumni Network, NY Chapter is excited to announce a Navratri potluck celebration for our alumni next Sunday on Oct 13th starting at 12pm
at Woodstock towers, NY 10017

 RSVP : Link in bio!
.
.
#bmsce #navaratri #newyork #bangalore #basvanagudi #alumninetwork #alumni', '/instagram/DAz5G8USA3P.jpg', null, 'Image', '2024-10-07T05:14:59.000Z', 33, 0, 'https://www.instagram.com/p/DAz5G8USA3P/', array['bmsce','navaratri','newyork','bangalore','basvanagudi','alumninetwork','alumni']::text[]),
  ('3450154417917325912', 'C_haSnUNPJY', 'A teacher’s ability to make every student feel seen, valued, and understood is truly extraordinary. 

Wishing all educators a very Happy Teachers’ Day!
.
.
#teachers #teachersday #forupage #foryou #teaching #teach', '/instagram/C_haSnUNPJY.jpg', null, 'Image', '2024-09-05T04:27:58.000Z', 31, 0, 'https://www.instagram.com/p/C_haSnUNPJY/', array['teachers','teachersday','forupage','foryou','teaching','teach']::text[]),
  ('3449430722589792748', 'C_e1vdhSJns', '“Unlocking success together!  Grateful to our incredible alumni for sharing their insights at the Career Catalyst event. Thanks to their guidance, we’re one step closer to acing the GD round and securing our dream careers!  
.
.
.
#CareerCatalyst #BMSEngineering #AlumniSupport #FutureReady”', '/instagram/C_e1vdhSJns.jpg', null, 'Image', '2024-09-04T04:30:00.000Z', 84, 0, 'https://www.instagram.com/p/C_e1vdhSJns/', array['CareerCatalyst','BMSEngineering','AlumniSupport','FutureReady”']::text[]),
  ('3445806934665158931', 'C_R9yaBS2ET', ' Exciting Opportunity Alert! 

️ *Aug 31, 2024 | 12-2 PM*

Get ready for a power-packed Mock Group Discussion & Career Insights session with our esteemed alumni!

 Practice GDs with industry pros 
 AMA session 
 Networking opportunities

Level up your communication skills and get placement-ready! 

Register now: Link in bio!!
Don’t miss out—prepare for success! ', '/instagram/C_R9yaBS2ET.jpg', null, 'Image', '2024-08-30T04:30:00.000Z', 67, 0, 'https://www.instagram.com/p/C_R9yaBS2ET/', null),
  ('3442941857637272114', 'C_HyWDGywoy', 'Independence Day Happy hour celebration in Jersey City was a fantastic success, bringing together BMSCE alumni! 
#BMSCEAlumni #BMSCE
#Engineering #IndependenceDayGathering” ', '/instagram/C_HyWDGywoy.jpg', null, 'Image', '2024-08-26T05:37:54.000Z', 46, 0, 'https://www.instagram.com/p/C_HyWDGywoy/', array['BMSCEAlumni','BMSCE','Engineering','IndependenceDayGathering”']::text[]),
  ('3434936484301107483', 'C-rWIiMy_Eb', 'Wishing you a joyous Independence Day filled with pride, love and happiness.
.
.
#independenceday #alumni #alumninetwork #foryou #forupage', '/instagram/C-rWIiMy_Eb.jpg', null, 'Image', '2024-08-15T04:32:39.000Z', 28, 0, 'https://www.instagram.com/p/C-rWIiMy_Eb/', array['independenceday','alumni','alumninetwork','foryou','forupage']::text[]),
  ('3433485737394875961', 'C-mMRY2yq45', 'Two decades later, the Batch of 2001 returned to BMSCE on 11.8.24, stepping into a time capsule that stirred up a wave of nostalgia and excitement. Reunited on campus, they relived the golden moments and forged new memories with their fellow batchmates. Here’s to timeless friendships and the joy of coming home! ️
.
.
#bmsce #alumni #bmscealumninetwork #basavanagudi #meetup #foruoupage #foryou', '/instagram/C-mMRY2yq45.jpg', null, 'Image', '2024-08-13T04:30:00.000Z', 234, 0, 'https://www.instagram.com/p/C-mMRY2yq45/', array['bmsce','alumni','bmscealumninetwork','basavanagudi','meetup','foruoupage','foryou']::text[]),
  ('3429137251778075086', 'C-WvimCSpnO', 'Join us for an Independence Day Happy Hour Meet-Up, an alumni gathering of BMS College of Engineering, on August 15, 2024, at 6 PM EDT at Smorgasbar, Jersey City. Reconnect with fellow alumni and expand your network. 
Register now by scanning the QR code.
.
.
#happyhour #alumni #alumnimeet #meetup #independenceday #jersey #bmsce #bmscealumninetwork', '/instagram/C-WvimCSpnO.jpg', null, 'Image', '2024-08-07T04:30:00.000Z', 30, 0, 'https://www.instagram.com/p/C-WvimCSpnO/', array['happyhour','alumni','alumnimeet','meetup','independenceday','jersey','bmsce','bmscealumninetwork']::text[]),
  ('3413205352333373463', 'C9eJC8bSvAX', 'BMSCEAN is thrilled that the Singapore international chapter had an amazing experience reconnecting and reliving the golden days. Alumni''s memories and camaraderie are what make these events truly special.

As the journey continues alumni cherish the moments, create new memories, and strengthen the bonds. Whether it’s reminiscing about studies, cheering at college fests, or simply catching up with old friends, every interaction adds to the rich tapestry of BMSCE history.

Having the spirit alive BMSCEAN looks forward to more reunions in the future! 
#bmsce #Alumni #bmscean #meetup', '/instagram/C9eJC8bSvAX.jpg', null, 'Sidecar', '2024-07-16T04:56:46.000Z', 75, 0, 'https://www.instagram.com/p/C9eJC8bSvAX/', array['bmsce','Alumni','bmscean','meetup']::text[]),
  ('3395875023271090487', 'C8gkldvsdk3', 'Cheers to the Class of 2024! As you step into new adventures, know that your journey is just beginning. Welcome to the alumni family! ✨
.
.
.
 #Farewell2024 #NewBeginnings #foreveralumni #bms #bmsalumni #basavanagudi', '/instagram/C8gkldvsdk3.jpg', null, 'Sidecar', '2024-06-22T07:04:30.000Z', 218, 1, 'https://www.instagram.com/p/C8gkldvsdk3/', array['Farewell2024','NewBeginnings','foreveralumni','bms','bmsalumni','basavanagudi']::text[]),
  ('3390085346095644596', 'C8MAKksSb-0', 'Celebrating enduring connections and professional growth at the Alumni Meetup, Hofbräuhaus Melbourne, June 8, 2024.
.
.
.
#alumni #alumnimeet #bmsce #bmscealumninetwork #australia #melbourne', '/instagram/C8MAKksSb-0.jpg', null, 'Image', '2024-06-14T07:21:27.000Z', 39, 0, 'https://www.instagram.com/p/C8MAKksSb-0/', array['alumni','alumnimeet','bmsce','bmscealumninetwork','australia','melbourne']::text[]),
  ('3385683870722204441', 'C78XYrUKqMZ', ' Empowered and ready to lead. Congratulations to the Class of 2023!
.
.
.
#graduation #classof2023 #bmsce #bmsalumni #basavanagudi #bangalore', '/instagram/C78XYrUKqMZ.jpg', null, 'Sidecar', '2024-06-08T05:36:30.000Z', 329, 0, 'https://www.instagram.com/p/C78XYrUKqMZ/', array['graduation','classof2023','bmsce','bmsalumni','basavanagudi','bangalore']::text[]),
  ('3382191500531805381', 'C7v9UAHiyzF', 'BMSCE Alumni Unite! 

Join us for the BMSCE Alumni Meetup in Melbourne this June. It''s the perfect opportunity to reconnect, reminisce about old times, and create new memories together. 

Network with fellow alumni, share your experiences, and expand your professional and personal circles.

Register now using the link in bio

We look forward to seeing you there!

@bmsce.official 

#melbourne 
#meetup 
#alumni', '/instagram/C7v9UAHiyzF.jpg', null, 'Image', '2024-06-03T09:57:47.000Z', 19, 1, 'https://www.instagram.com/p/C7v9UAHiyzF/', array['melbourne','meetup','alumni']::text[]),
  ('3380043789049249439', 'C7oU-r7i76f', 'The Merit-cum-Means Scholarship by IEM Batch of 2018 provided financial assistance to meritorious students Shrikant R, Pallavi SS and Charan K from Industrial Engineering and Management enabling them to pursue professional and technical courses to upgrade their knowledge and proficiency.
Thanks to our Alumni Karan Prasad Aditya Prakash & batch of 2018 for taking this initiative and supporting students.

@bmsce.official 

B. M. S. College of Engineering
#scholarship 
#support 
#alumni 
#alumniengagement', '/instagram/C7oU-r7i76f.jpg', null, 'Sidecar', '2024-05-31T10:50:40.000Z', 459, 3, 'https://www.instagram.com/p/C7oU-r7i76f/', array['scholarship','support','alumni','alumniengagement']::text[]),
  ('3367522972843324125', 'C672E1JSzLd', 'The BMS Alumni Network, IIC, and Big Foundation hosted a prestigious event on May 8th, featuring BMS College of Engineering alumnus and Gud Gum co-founder, Mayank B. Nagori. The evening was marked by insightful discussions, professional networking, and a celebration of innovation.
.
.
.
#bmsalumni #leadership #entrepreneurship #innovation #gudgum #bangalore #basavanagudi', '/instagram/C672E1JSzLd.jpg', null, 'Sidecar', '2024-05-14T04:14:02.000Z', 519, 1, 'https://www.instagram.com/p/C672E1JSzLd/', array['bmsalumni','leadership','entrepreneurship','innovation','gudgum','bangalore','basavanagudi']::text[]),
  ('3362505828151702368', 'C6qBTxCKbNg', 'From the Shark Tank India to our alma mater! Excited to welcome our esteemed alumni @nagorio Mayank B Nagori back to BMSCE @bmsce.official for an inspiring podcast. 


@gud.gum 
@sharktank.india @big_foundation_ 
@iic_bmsce 
.
.
#BMSCE 
#SharkTankSuccess 
#AlumniTalk 
#Inspiration 
#bmsce 
#alumni 
#sharktankindia 
#sharktank #successtips #successstory #podcast', '/instagram/C6qBTxCKbNg.jpg', null, 'Video', '2024-05-07T06:12:12.000Z', 338, 0, 'https://www.instagram.com/p/C6qBTxCKbNg/', array['BMSCE','SharkTankSuccess','AlumniTalk','Inspiration','bmsce','alumni','sharktankindia','sharktank','successtips','successstory','podcast']::text[]),
  ('3359615314709501365', 'C6fwFQnONW1', ' What a Day to Remember! 

Our Alumni New York chapter Meetup was a resounding success! A heartfelt thank you to everyone who joined at Utsav Restaurant for a day filled with nostalgia, laughter, and new connections. ✨

The energy was electric as old friends reunited and new bonds were formed. We shared stories, celebrated achievements, and promised to keep the spirit of BMSCE @bmscealumni alive, no matter where we are.

 We’re already looking forward to the next one! Until then, stay connected and keep the BMSCE pride strong!

@bmsce.official @shrutii__rao @_suprita.anand_ @LikhitBabu @vikasnayak @vibhasnayak

#AlumniReunionNYC
#AlumniPride #NewYorkMemories #networkingsuccess #bmsce #meetup', '/instagram/C6fwFQnONW1.jpg', null, 'Sidecar', '2024-05-03T06:22:56.000Z', 174, 0, 'https://www.instagram.com/p/C6fwFQnONW1/', array['AlumniReunionNYC','AlumniPride','NewYorkMemories','networkingsuccess','bmsce','meetup']::text[]),
  ('3358187560440851808', 'C6arcs1Nm1g', 'BMSCE Alumni Network, in collaboration with BIG & IIC is proud to present:

“Shark Tank Success: Alumni Edition” - A session with the Expert 

Dive into a world of Inspiration, Entrepreneurship and Innovation and get one step closer to contributing to a smart and sustainable future with our very own Alumni and Co-Founder of Gud Gum, Mayank Nagori
 
- Key Business insights
- 4-Shark Deal - Shark Tank S3
- Real-world startup journey
- Q&A Session

 Date: 8th May 2024
 Time: 2 pm
 Venue: Auditorium 1, PJ Block

REGISTER NOW:
 Link in bio!!
@gud.gum 
@nagorio', '/instagram/C6arcs1Nm1g.jpg', null, 'Image', '2024-05-01T07:06:15.000Z', 77, 0, 'https://www.instagram.com/p/C6arcs1Nm1g/', null),
  ('3354562400224887568', 'C6NzLrSSUMQ', 'Still looking for the right career path after graduating this year?  
BMSCE Alumni Network is excited to launch the Alumni Recruitment Bootcamp - an exclusive opportunity for you to receive guidance and insights directly from our alumni!
 
As a part of this initiative, we’re inviting alumni to help you navigate through the recruitment process with confidence. This is your chance to connect with industry professionals who have walked the same path as you. 

Interested in being a part of this enriching experience? 

Here’s your chance to increase your odds in getting that dream job!

Link in bio
.
.
.
#alumni #bms #bmsce #engineering #recrutiment #basvanagudi', '/instagram/C6NzLrSSUMQ.jpg', null, 'Image', '2024-04-26T07:03:42.000Z', 16, 0, 'https://www.instagram.com/p/C6NzLrSSUMQ/', array['alumni','bms','bmsce','engineering','recrutiment','basvanagudi']::text[]),
  ('3353175923251327330', 'C6I37x-ybFi', '✨ Greetings from BMSCE Alumni Network and Dell Technologies 

Join us for the Dell Alumni Connect Session on April 25, 2024, at 7:00 PM (IST) in online mode organized by B.M.S. College of Engineering X Dell Technologies in collaboration with BMSCE Alumni Network. This is your chance to connect with esteemed Dell alumni and explore exciting opportunities with Dell Technologies.

Don''t miss out on this excellent opportunity to gain insights and network with professionals in the industry. Register now using the link below:

[Registration Link](https://lnkd.in/gqbdQpb9)

 Announcement: 
Stay tuned for a Dell trivia quiz after a few days! The top 3 winners will receive exciting Dell goodies. Complete details of the quiz will be provided during the session.
.
.

#bmsce #dell #delltechnologies #alumni #bmscollege', '/instagram/C6I37x-ybFi.jpg', null, 'Image', '2024-04-24T09:09:01.000Z', 28, 1, 'https://www.instagram.com/p/C6I37x-ybFi/', array['bmsce','dell','delltechnologies','alumni','bmscollege']::text[]),
  ('3347533650727739855', 'C501B6NSyHP', 'Dear BMSCE Alumni,

We are thrilled to invite you to an extraordinary gathering of BMSCE alumni in New York City on April 28, 2024. This is a wonderful opportunity to reconnect with classmates, share stories from your college days, and build new relationships.
Connect, reminisce, and network with fellow alumni in the heart of New York City. Join us at Utsav Restaurant on April 28th, 2024, at 12:30 pm. Don''t miss this opportunity to reconnect and forge new connections.
 RSVP today to confirm your attendance and ensure you’re part of this unforgettable experience.  https://bit.ly/Newyorkmeetup

We look forward to rekindling old friendships and starting new ones.

.
. 
. 
. 
#bmsce #meet #alumnimeet  #newyork #forupage #alumni #memories', '/instagram/C501B6NSyHP.jpg', null, 'Image', '2024-04-16T14:18:49.000Z', 48, 1, 'https://www.instagram.com/p/C501B6NSyHP/', array['bmsce','meet','alumnimeet','newyork','forupage','alumni','memories']::text[]),
  ('3341640667230785086', 'C5f5HtpSk4-', ' What an Incredible Alumni Meet-Up! 
We are thrilled to share that our recent alumni meet-up was amazing at #Hyderabad! It was an evening filled with networking, connecting, and rekindling the good old memories.
First ever BMSCEAN meet up at Hyderabad!!!
A heartfelt thank you to everyone who attended and made this event unforgettable. Your enthusiasm and stories brought the alumni community closer than ever. 
.
.
.

#bmsce #bmscealumninetwork #AlumniSuccess #ReunionToRemember #OurAlumniRock #hyderabad #firsthydalumnimeetup', '/instagram/C5f5HtpSk4-.jpg', null, 'Image', '2024-04-08T11:10:31.000Z', 121, 0, 'https://www.instagram.com/p/C5f5HtpSk4-/', array['Hyderabad!','bmsce','bmscealumninetwork','AlumniSuccess','ReunionToRemember','OurAlumniRock','hyderabad','firsthydalumnimeetup']::text[]),
  ('3328605528921914573', 'C4xlRfEyrzN', 'The recent BMSCEAN Mumbai Alumni Meet up had a lot of interaction and brilliance converge. This meet up was just more than alumni gatherings. The Meetup had lot of exchange of words, ideas, vibrant celebrations of achievement, knowledge sharing and lot more.
This day was another day filled with lot of memories with BMSCE ✨✨✨✨', '/instagram/C4xlRfEyrzN.jpg', null, 'Video', '2024-03-21T11:38:45.000Z', 170, 1, 'https://www.instagram.com/p/C4xlRfEyrzN/', null),
  ('3326263278531427281', 'C4pQtQaSrvR', '✨ Calling all BMSCE alumni! Get ready to embark on a journey down memory lane as we reunite in the vibrant city of Singapore on April 13, 2024. It''s a chance to reignite old friendships, share stories of our academic adventures, and celebrate the bonds that unite us.

Join us for a day filled with laughter, nostalgia, and camaraderie as we come together to reminisce about our time at BMSCE and create new memories to cherish for years to come. Don''t miss out on this incredible opportunity to reconnect with your fellow alumni and rediscover the spirit of our alma mater. Mark your calendars and stay tuned for registration details!
.
.
.
 #BMSCE #AlumniMeetup #SingaporeReunion #MemoriesInTheMaking ✈️', '/instagram/C4pQtQaSrvR.jpg', null, 'Image', '2024-03-18T05:58:24.000Z', 35, 0, 'https://www.instagram.com/p/C4pQtQaSrvR/', array['BMSCE','AlumniMeetup','SingaporeReunion','MemoriesInTheMaking']::text[]),
  ('3323393659247384611', 'C4fEOzMOdgj', 'Register now to secure your spot at the BMSCE alumni meet-up in Mumbai on 15th March, 2024! Don''t miss out on reconnecting with old friends and making new memories. Register soon!', '/instagram/C4fEOzMOdgj.jpg', null, 'Image', '2024-03-14T06:56:58.000Z', 50, 0, 'https://www.instagram.com/p/C4fEOzMOdgj/', null),
  ('3319851384450920063', 'C4Sez6tSS5_', 'Dive into the pages of Pulse 2024, an alumni newsletter, where brilliance meets breakthroughs. Uncover inspiring stories, groundbreaking research, and the relentless pursuit of knowledge! 

Join us in celebrating a year of achievements, collaboration, and the spirit that defines BMSCE! 

Head over to our bio to access Pulse 

.

.

.

#bms #alumni #newsletter #engineering #bangalore', '/instagram/C4Sez6tSS5_.jpg', null, 'Video', '2024-03-09T09:39:58.000Z', 37, 0, 'https://www.instagram.com/p/C4Sez6tSS5_/', array['bms','alumni','newsletter','engineering','bangalore']::text[]),
  ('3305212955207711918', 'C3eeavGLLyu', 'The Department of Electronics and Telecommunications Engineering recently collaborated with Taproots AI Pvt. Ltd, co-founded by alumnus Mr. Vinay Rao. 

The partnership aims to address societal issues through innovative solutions and includes provisions for internships, talks, and research papers. 

Taproots AI focuses on revolutionizing sports analytics, offering a platform that turns basic stats into actionable insights for athletes, coaches, and enthusiasts. Users can upload game videos to receive groundbreaking insights and improve decision-making.
.
.
.
#taproots #bangalore #bms #basavanagudi #alumni #alumniassociation', '/instagram/C3eeavGLLyu.jpg', null, 'Image', '2024-02-18T04:55:09.000Z', 299, 1, 'https://www.instagram.com/p/C3eeavGLLyu/', array['taproots','bangalore','bms','basavanagudi','alumni','alumniassociation']::text[]),
  ('3300113015009667063', 'C3MW01qS2f3', 'In 1969, the Mechanical Engineering graduating class of BMS College of Engineering gathered for a memorable photograph. Dressed in graduation attire, the students formed a symbol of unity on the campus grounds, encapsulating the professionalism and camaraderie that defined their academic journey. The photo stands as a timeless testament to the precision and dedication of the class of ‘69.
.
.
.
#bms #bmscollegeofengineering #mechanicalengineering #basavanagudi #bangalore #engineering', '/instagram/C3MW01qS2f3.jpg', null, 'Image', '2024-02-11T04:02:29.000Z', 614, 0, 'https://www.instagram.com/p/C3MW01qS2f3/', array['bms','bmscollegeofengineering','mechanicalengineering','basavanagudi','bangalore','engineering']::text[]),
  ('3296531414935564873', 'C2_odsqJnJJ', 'Sweetening sustainability with every chew!  Gud Gum, founded by Bengaluru brothers Mayank & Bhuvan in 2022, presents a guilt-free indulgence crafted with natural Xylitol and Stevia. 

This plastic-free, fully biodegradable chewing gum not only delights the taste buds but also champions environmental responsibility.  Having successfully sold over 5 lakh pieces, Gud Gum has spared 700 kg of gum plastic from polluting our planet. Join the eco-conscious revolution, one biodegradable chew at a time! 

Mayank, an esteemed alumnus of BMS College of Engineering, brings a wealth of expertise from the chemical engineering batch, strategically guiding the innovative initiatives at Gud Gum. ‍
.
.
.
#gudgum #sustainableliving #biodegradable #biodegradablebites', '/instagram/C2_odsqJnJJ.jpg', null, 'Image', '2024-02-06T05:26:29.000Z', 886, 1, 'https://www.instagram.com/p/C2_odsqJnJJ/', array['gudgum','sustainableliving','biodegradable','biodegradablebites']::text[]),
  ('3269827327972695842', 'C1gwqForV8i', 'Embarking on a warp to an amazing year: The BMSCE Alumni Network 2023 Wrapped Video unveils a journey of triumphs, connections, and excellence. 
.
.
.
#BMSCEHighlights #YearInReview#wrap #2023 #fypage #bangalore #bmsce #bmscealumninetwork #connection', '/instagram/C1gwqForV8i.jpg', null, 'Video', '2023-12-31T09:11:59.000Z', 156, 0, 'https://www.instagram.com/p/C1gwqForV8i/', array['BMSCEHighlights','YearInReview','wrap','2023','fypage','bangalore','bmsce','bmscealumninetwork','connection']::text[]),
  ('3268266529039304997', 'C1bNxeWr8kl', 'BMSCE Homecoming: A Flashback in Frames ✨ Relive the magic, the laughter, and the bonds that never fade. This is our homecoming story in a nutshell.  

.

.

.

#BMSCEHomecoming #FlashbackMoments#bmsce #fypage #bangalore #alumnihomecoming', '/instagram/C1bNxeWr8kl.jpg', null, 'Video', '2023-12-29T05:30:56.000Z', 233, 0, 'https://www.instagram.com/p/C1bNxeWr8kl/', array['BMSCEHomecoming','FlashbackMoments','bmsce','fypage','bangalore','alumnihomecoming']::text[]),
  ('3260956459361941796', 'C1BPp9cSLkk', 'Beyond Boundaries: BMSCE Alumni Illuminate the Cosmos!  Celebrating their pivotal role in Chandrayaan-3 and Aditya L1 missions 
.
.
.
#BMSCEInnovation #bmsce #AlumniSpotlight #india #chandrayaan #isro #bengaluru', '/instagram/C1BPp9cSLkk.jpg', null, 'Image', '2023-12-19T03:25:24.000Z', 321, 0, 'https://www.instagram.com/p/C1BPp9cSLkk/', array['BMSCEInnovation','bmsce','AlumniSpotlight','india','chandrayaan','isro','bengaluru']::text[]),
  ('3254007925643501347', 'C0ojvfISV8j', '"Embrace the Legacy, Ignite the Future!  Calling all BMSCE students to rally together and infuse the spirit of Alumni Homecoming 2023 with passion and camaraderie. 

Let''s create moments that echo through time and build bridges between the past and the present. Are you up for the challenge?

. 
. 
. 

 #BMSCELegacy" #alummi
#alumniengagement #alumniday', '/instagram/C0ojvfISV8j.jpg', null, 'Image', '2023-12-09T13:19:54.000Z', 34, 4, 'https://www.instagram.com/p/C0ojvfISV8j/', array['BMSCELegacy"','alummi','alumniengagement','alumniday']::text[]),
  ('3253012122231520535', 'C0lBUo7pj0X', 'Countdown to Greatness: BMSCE Alumni Day, December 16th!  Ignite the past, fuel the future – an electrifying celebration of legacy, achievement, and boundless possibilities. Join us for an adrenaline-packed reunion that transcends time! ⚡️
.
.
.

 #BMSCEAlumniDay #IgniteTheLegacy”#bmsce #alumni', '/instagram/C0lBUo7pj0X.jpg', null, 'Video', '2023-12-08T04:23:34.000Z', 585, 1, 'https://www.instagram.com/p/C0lBUo7pj0X/', array['BMSCEAlumniDay','IgniteTheLegacy”','bmsce','alumni']::text[]),
  ('3243126753178689536', 'C0B5plkyCAA', 'Inviting our beloved alumni to collaborate with us in elevating this grand fest to the next level and make it an astounding success✨

Scan the QR code for more information!

#phaseshift2023', '/instagram/C0B5plkyCAA.jpg', null, 'Image', '2023-11-24T13:00:57.000Z', 35, 0, 'https://www.instagram.com/p/C0B5plkyCAA/', array['phaseshift2023']::text[]),
  ('3242410812396681149', 'Cz_W3Rwyje9', 'Here''s what went down over the weekend

.

.

.

#bmsce #engineering #alumni', '/instagram/Cz_W3Rwyje9.jpg', null, 'Video', '2023-11-23T13:20:19.000Z', 62, 0, 'https://www.instagram.com/p/Cz_W3Rwyje9/', array['bmsce','engineering','alumni']::text[]),
  ('3241409879940393071', 'Cz7zRyxSehv', 'Swinging bats, swift shuttles, and table tennis finesse – BMSCE''s Alumni Sports Day on November 18th was a triumphant blend of memories and competitive spirit! 
.
.
.
 #BMSCEAlumniSportsDay #sportsfever', '/instagram/Cz7zRyxSehv.jpg', null, 'Sidecar', '2023-11-22T04:09:50.000Z', 317, 0, 'https://www.instagram.com/p/Cz7zRyxSehv/', array['BMSCEAlumniSportsDay','sportsfever']::text[]),
  ('3240261371032220512', 'Cz3uIyfy7Ng', 'Alumni Homecoming 

✅Join us for a monumental celebration on December 16th at B.M.S. College of Engineering. Step into the hallowed halls, rediscover our engineering legacy, and turn the pages of shared history!

 Unveiling Our Legacy
Unite with alumni from the past, present, and future. Experience a symphony of shared passions and enduring bonds, making this celebration more than just a reunion!

Registration link on our bio.
(Kindly register before Dec 10)

.

.

.

#bms #alumni #homecoming #10 #engineering #basavanagudi #bmsce', '/instagram/Cz3uIyfy7Ng.jpg', null, 'Image', '2023-11-20T14:07:57.000Z', 104, 0, 'https://www.instagram.com/p/Cz3uIyfy7Ng/', array['bms','alumni','homecoming','10','engineering','basavanagudi','bmsce']::text[]),
  ('3237335463962986753', 'CztU3PMSckB', 'Gear up as we bring back the thrills and spills of BMS sports this Saturday at the Alumni Sports Day! 

.

.

.

#engineering #cricket #worldcup #badminton #sports', '/instagram/CztU3PMSckB.jpg', null, 'Video', '2023-11-16T13:17:30.000Z', 154, 0, 'https://www.instagram.com/p/CztU3PMSckB/', array['engineering','cricket','worldcup','badminton','sports']::text[]),
  ('3236618571812145399', 'Czqx3FWS4j3', 'Are you ready to forge your path to success? 

Enter Venture Forge, a startup accelerator program focused on nurturing and accelerating early-stage businesses, providing resources and mentorship for entrepreneurial success! ✅

Apply now to stand a chance to get onboarded, link in our bio.

.

.

.

#startup #entrepreneur #ventureforge #innovation #startuplife', '/instagram/Czqx3FWS4j3.jpg', null, 'Image', '2023-11-15T13:30:22.000Z', 22, 0, 'https://www.instagram.com/p/Czqx3FWS4j3/', array['startup','entrepreneur','ventureforge','innovation','startuplife']::text[]),
  ('3232778346322797073', 'CzdIscqJSIR', 'Greetings from Alumni Network and NIRMAAN ISCE 2023 ✨

As NIRMAAN has embarked on its journey to make a difference in the lives of many enthusiasts, we would like you to be part of our endeavours. ‍♂️️ 

Your valuable experience and expertise would greatly enrich our event, providing the participants with insights into the industry and much more.  

Looking forward to the opportunity to reconnect with you and make NIRMAAN one step better. 

Please fill out the form in the bio', '/instagram/CzdIscqJSIR.jpg', null, 'Image', '2023-11-10T06:20:31.000Z', 40, 0, 'https://www.instagram.com/p/CzdIscqJSIR/', null),
  ('3228404191364837421', 'CzNmIHZrvAt', 'Hello from the BMSCE Alumni Network!

 Are you aspiring to join prestigious institutions?  Join us for an exclusive session on crafting the perfect Statement of Purpose! ✍️ Learn to showcase your unique story and stand out in your admission journey. Don''t miss this chance to elevate your application!  Sign up now for guidance and personalized tips! 

*Registration Link:* https://forms.gle/KdK4PGcWwW3kiLSi7
*Date & Timings:* 5th of November 2023 at 3 PM IST', '/instagram/CzNmIHZrvAt.jpg', null, 'Image', '2023-11-04T05:29:51.000Z', 76, 0, 'https://www.instagram.com/p/CzNmIHZrvAt/', null),
  ('3222761947389464859', 'Cy5jOqNy5Eb', ' Exciting News

We''re thrilled to be back with the newest edition of the energy packed, adrenaline fueled, Alumni Sports Day 2023! 

Let''s dawn our jerseys, get on the field and relive all those wonderful memories back in the day! 

️ 18th November, 2023

⏰ Register before 3PM, 13th November

 Head to our bio to register

Spread the word among your batch mates and beyond to participate together. Looking forward to seeing you back home!

.

.

.

#bms #alumni #sportsday #cricket #football #chess #tournament #basavanagudi', '/instagram/Cy5jOqNy5Eb.jpg', null, 'Image', '2023-10-27T10:39:43.000Z', 60, 0, 'https://www.instagram.com/p/Cy5jOqNy5Eb/', array['bms','alumni','sportsday','cricket','football','chess','tournament','basavanagudi']::text[]),
  ('3219965470954996886', 'CyvnYklS8SW', 'Greetings from the BMSCE Alumni Network! ✨

Looking to pursue an MBA course but not sure where to start? Look no further, as we bring to you a panel of people who have been there and done that.

This diverse panel will be talking about their journey of pursuing an MBA from prestigious institutions in India and abroad and answering all your questions on how to start your own journey. 

Date: 28th October, 2023
Time: 7:00 PM IST
Mode: Online

Looking forward to planning an MBA after engineering?

Registration link in our bio.

.

.

.

#bmsce #BMSCEAlumniNetwork #mba #alumni', '/instagram/CyvnYklS8SW.jpg', null, 'Image', '2023-10-23T14:03:37.000Z', 93, 1, 'https://www.instagram.com/p/CyvnYklS8SW/', array['bmsce','BMSCEAlumniNetwork','mba','alumni']::text[]),
  ('3212570963460462073', 'CyVWEU0y5X5', '✨ Ready to soar into academic excellence?  

Join our Higher Education Community''s mentorship program for expert guidance on entrance exams, resume crafting, university selection, and more!  Enroll now to unlock a world of knowledge and endless possibilities. 

Your success story begins with the Higher Education Community—where dreams take flight! 

Registration link in our bio!

.

.

.

#mentorship #academia #highereducation #masters', '/instagram/CyVWEU0y5X5.jpg', null, 'Image', '2023-10-13T09:12:03.000Z', 22, 0, 'https://www.instagram.com/p/CyVWEU0y5X5/', array['mentorship','academia','highereducation','masters']::text[]),
  ('3211201245214241591', 'CyQeoTTSXM3', '✨ Exciting news from the BMSCE Alumni Network! 

Introducing our  Higher Education Mentorship Program . As a master''s degree alumni, your wisdom is invaluable. Shape the future of our alma mater with your insights!

Highlights:
 Uni & Course Selection
 Application Tips
 Exam Prep Assistance

Registration link in bio 
 Deadline: 14th Oct 2023

Join us in shaping academic excellence!  

.

.

.

#bmsce #mentorship #leaders', '/instagram/CyQeoTTSXM3.jpg', null, 'Image', '2023-10-11T11:50:40.000Z', 33, 0, 'https://www.instagram.com/p/CyQeoTTSXM3/', array['bmsce','mentorship','leaders']::text[]),
  ('3210478067360368934', 'CyN6MrcMokm', 'Empowering Your GATE Ascent 

Engage with accomplished BMSCE Alumni on October 11th.

Gain Expertise, Ignite Ambition! 

Registration through our bio.
.

.

.

 #gateexam #pg #engineering #bmsce', '/instagram/CyN6MrcMokm.jpg', null, 'Image', '2023-10-10T11:53:51.000Z', 145, 0, 'https://www.instagram.com/p/CyN6MrcMokm/', array['gateexam','pg','engineering','bmsce']::text[]),
  ('3192277008238236886', 'CxNPwaMr9TW', 'Exciting News! ✨

The Alumni Network is thrilled to announce the launch of our brand-new Alumni Portal! 

Stay connected with your fellow alumni, discover upcoming events, and expand your professional network in just a few clicks! 

Our Alumni Portal offers fantastic features, including a:

 Job Board
 Update Feed
 Mentor Program
 Searchable Directory of alumni

We highly encourage you to explore the portal and create your account!  

Register through our bio! 

.

.

.

#engineering #alumni #bmsce', '/instagram/CxNPwaMr9TW.jpg', null, 'Video', '2023-09-15T09:14:29.000Z', 130, 1, 'https://www.instagram.com/p/CxNPwaMr9TW/', array['engineering','alumni','bmsce']::text[]),
  ('3191728384376472420', 'CxLTA4aSoNk', 'All comes down to this! 

.

.

.

#engineering #alumni #bmsce #basavanagudi', '/instagram/CxLTA4aSoNk.jpg', null, 'Video', '2023-09-14T15:03:58.000Z', 62, 0, 'https://www.instagram.com/p/CxLTA4aSoNk/', array['engineering','alumni','bmsce','basavanagudi']::text[]),
  ('3190958022740725078', 'CxIj2pOpM1W', 'Last few steps before we''re live! 

.

.

.

#engineering #alumni #bmsce
#basavanagudi', '/instagram/CxIj2pOpM1W.jpg', null, 'Image', '2023-09-13T13:31:00.000Z', 43, 0, 'https://www.instagram.com/p/CxIj2pOpM1W/', array['engineering','alumni','bmsce','basavanagudi']::text[]),
  ('3190888132558337201', 'CxIT9m7JjSx', 'Join us on Engineer''s Day as we unveil a new era of connections, opportunities, and memories. 

Get ready to embark on an unforgettable journey with fellow BMSCE alumni and students! 

.

.

.

#engineering #alumni #bmsce', '/instagram/CxIT9m7JjSx.jpg', null, 'Video', '2023-09-13T11:12:35.000Z', 507, 0, 'https://www.instagram.com/p/CxIT9m7JjSx/', array['engineering','alumni','bmsce']::text[]),
  ('3190723071940839067', 'CxHubqPrUab', 'Here''s a glimpse of how we''re making a difference! 

Swipe to the end ➡️

Stay tuned for more!

.

.

.

#engineering #alumni #bmsce #basavanagudi', '/instagram/CxHubqPrUab.jpg', null, 'Sidecar', '2023-09-13T05:44:12.000Z', 91, 0, 'https://www.instagram.com/p/CxHubqPrUab/', array['engineering','alumni','bmsce','basavanagudi']::text[]),
  ('3190188306193895565', 'CxF01y1StCN', 'Something''s cooking back here! ‍

Stay tuned! 

.

.

.

#engineering #alumni #bmsce', '/instagram/CxF01y1StCN.jpg', null, 'Image', '2023-09-12T12:01:43.000Z', 70, 0, 'https://www.instagram.com/p/CxF01y1StCN/', array['engineering','alumni','bmsce']::text[]),
  ('3185738717181172382', 'Cw2BHwIytqe', 'BMSCE Alumni Unite! 

Join us for a memorable gathering at Kish Santa Clara on September 9th, 2023, at 7PM PDT. 

Let''s reminisce and create new memories together. 

Registration link in our bio.

.

.

.

#usa #bmsce #engineering #california #sfo #meetup #alumni #india', '/instagram/Cw2BHwIytqe.jpg', null, 'Image', '2023-09-06T08:41:10.000Z', 36, 0, 'https://www.instagram.com/p/Cw2BHwIytqe/', array['usa','bmsce','engineering','california','sfo','meetup','alumni','india']::text[]),
  ('3184995029324753173', 'CwzYBq2SWkV', 'Teachers extend beyond their professional roles; they encompass family, friends, and even strangers who unknowingly impart profound wisdom. On this Teacher''s Day, let''s embrace the opportunity to recognize and appreciate all those who have taught us valuable lessons, both big and small! 

Let us make this Teacher''s Day even more meaningful by expressing our gratitude to all those who have contributed to our growth and learning. ✨

Happy Teacher''s Day to everyone who has been a source of knowledge and inspiration in our lives! 

.

.

.

#teacher #teachersofinstagram #india #instagood #engineering #trending', '/instagram/CwzYBq2SWkV.jpg', null, 'Image', '2023-09-05T08:03:36.000Z', 47, 0, 'https://www.instagram.com/p/CwzYBq2SWkV/', array['teacher','teachersofinstagram','india','instagood','engineering','trending']::text[]),
  ('3183698059679371580', 'CwuxIRvShE8', 'Join us in the heart of London on September 8th, 2023, for a nostalgic reunion filled with memories and laughter. 

Reconnect with old friends, reminisce about your academic journey, and forge new connections. ✨

This vibrant alumni meet-up promises a night of camaraderie, delicious food, and exciting surprises. 

Register now and receive the specific details soon! 

.

.

.

#alumni #london #bmsan #bmsce #reunion', '/instagram/CwuxIRvShE8.jpg', null, 'Image', '2023-09-03T13:06:45.000Z', 38, 0, 'https://www.instagram.com/p/CwuxIRvShE8/', array['alumni','london','bmsan','bmsce','reunion']::text[]),
  ('3180128040068255721', 'CwiFZp4hw_p', 'Institution’s Innovation Council (IIC), BMSCE in Collaboration with BMSCE Alumni Network presents A Panel Discussion on “Early Stage Investments in Student Startups and Life as an Associate in VC”✨

We are excited to invite you to a captivating webinar where our esteemed panelists will be diving into the world of student startups, securing investments, crafting effective pitch decks, and the exciting journey of a Venture Capitalist.

 Date: 4th September, 2023
⏰ Time: 7 pm to 8 pm
Mode :Online (Google Meet)
Don''t miss out on this golden opportunity to learn from those who''ve walked the path you aspire to!

Registration Link in the Bio !!!

For questions, contact:
Pavithra Ganta - 9113973362
Gargi Bharadwaj - 6389886116', '/instagram/CwiFZp4hw_p.jpg', null, 'Image', '2023-08-29T14:53:46.000Z', 90, 2, 'https://www.instagram.com/p/CwiFZp4hw_p/', null),
  ('3177760803053159420', 'CwZrJ0nJMP8', 'Reuniting Minds: 1998 Computer Science Batch - 25 Years On ✨

''From Algorithms to Anecdotes, Our Journey Continues...''

Inside the very walls where algorithms were decoded and dreams were coded, the 1998 Computer Science Batch came together after 25 years, corridors of BMS College of Engineering bore witness to a reunion that bridged the past and the present, rekindling friendships and memories! 

Laughter, and tech talks echoed through the halls once again. Here''s to the friendships that stood the test of time! ‍

.

.

.

#computerscience #reunion #bmsce #engineering #algorithms #bengaluru #basavanagudi', '/instagram/CwZrJ0nJMP8.jpg', null, 'Image', '2023-08-26T08:30:29.000Z', 198, 0, 'https://www.instagram.com/p/CwZrJ0nJMP8/', array['computerscience','reunion','bmsce','engineering','algorithms','bengaluru','basavanagudi']::text[]),
  ('3175751867307522868', 'CwSiX9Zpfs0', 'India Scripts Lunar History, Conquers The Moon!  

India becomes the only country to reach moon''s South Pole! ✨

Breaking barriers and pushing the boundaries of exploration, Chandrayaan-3 achieves an awe-inspiring milestone!  

India''s scientific prowess shines brighter than ever as we uncover the secrets hidden in the lunar terrain. 

@isro.in

.

.

.

#chandrayaan3 #lunarexploration #proudmoment', '/instagram/CwSiX9Zpfs0.jpg', null, 'Image', '2023-08-23T13:59:05.000Z', 114, 0, 'https://www.instagram.com/p/CwSiX9Zpfs0/', array['chandrayaan3','lunarexploration','proudmoment']::text[]),
  ('3174954508650576797', 'CwPtE3SJHud', ' Honoring History and Wisdom! 

We were truly honored to have our esteemed principal, Dr. Murlidhara, as the guest of honor at the remarkable book release event of our first batch alumnus, the legendary Mr. SG Krishnamurthy, who at 96 years young, belongs to the cherished batch of 1946-1951 in civil engineering! 

In a heartwarming ceremony held on August 13th, 2023, the BMSCE Alumni Association proudly felicitated Mr. Krishnamurthy for his exceptional achievements and lifelong contributions. ✨

Here''s to the legacy of knowledge, the bond of shared experiences, and the inspiration that alumni like Mr. Krishnamurthy provide. Let''s continue to strive for excellence, just as he has done, and keep the flame of BMSCE''s spirit alive! 

.

.

.

#bookrelease #bmsce #engineering #1946 #basavanagudi #bangalore #india #instagood', '/instagram/CwPtE3SJHud.jpg', null, 'Sidecar', '2023-08-22T11:34:53.000Z', 181, 0, 'https://www.instagram.com/p/CwPtE3SJHud/', array['bookrelease','bmsce','engineering','1946','basavanagudi','bangalore','india','instagood']::text[]),
  ('3169653739496016951', 'Cv830hTpgw3', '76 years of progress, unity, and unwavering patriotism. Wishing everyone a joyous  Independence Day! 

.

.

.

#india #independenceday #g20india #engineering #bangalore #bmsce', '/instagram/Cv830hTpgw3.jpg', null, 'Image', '2023-08-15T04:03:12.000Z', 116, 0, 'https://www.instagram.com/p/Cv830hTpgw3/', array['india','independenceday','g20india','engineering','bangalore','bmsce']::text[]),
  ('3169174226208971434', 'Cv7Kyrwglqq', 'Everything''s always ending. But everything''s always beginning, too. — Patrick Ness

We present to you the after movie of the Graduation Day Ceremony for the ''Batch of 2022'' held on 15th July 2023! 

This momentous occasion celebrated hard work, dedication, and achievements of the students!

It marked the beginning of a new chapter, where students will embark on a journey of infinite possibilities. It was a time to reflect on the challenges they have overcome, the memories they have made, and the knowledge and skills they have gained! 

.

.

.

#graduation #graduationday #bmsce
#bangalore #instagood #reelsinstagram 
#reelsindia #engineering #convocation', '/instagram/Cv7Kyrwglqq.jpg', null, 'Video', '2023-08-14T12:14:05.000Z', 419, 5, 'https://www.instagram.com/p/Cv7Kyrwglqq/', array['graduation','graduationday','bmsce','bangalore','instagood','reelsinstagram','reelsindia','engineering','convocation']::text[]),
  ('3159060993546721862', 'CvXPTx4JRpG', 'A journey of memories, laughter, and growth ✨ 

As they toss their caps in the air, the Batch of 2022 bid farewell to our beloved alma mater 

.

.

.

#graduation #bms #engineering #basavanagudi #nostalgia #instagood #instaphoto', '/instagram/CvXPTx4JRpG.jpg', null, 'Sidecar', '2023-07-31T13:17:18.000Z', 426, 0, 'https://www.instagram.com/p/CvXPTx4JRpG/', array['graduation','bms','engineering','basavanagudi','nostalgia','instagood','instaphoto']::text[]),
  ('3145237117544986532', 'CumIH6FpHek', 'Exciting news! ✨

We''re thrilled to announce our Chief Guest for the graduation ceremony. Join us in welcoming Dr. S. Mohan, Vice Chancellor, Puducherry Technological University, a visionary leader and inspiration! 

Get ready for a memorable ceremony filled with celebration and inspiration. 

Let''s honor our achievements and embrace the future together! 

.

.

.

#Graduation #bmsce #engineering 
#instagood #alumni', '/instagram/CumIH6FpHek.jpg', null, 'Image', '2023-07-12T11:31:43.000Z', 290, 0, 'https://www.instagram.com/p/CumIH6FpHek/', array['Graduation','bmsce','engineering','instagood','alumni']::text[]),
  ('3144655043947702903', 'CukDxnzpKp3', 'BMSCE invites Batch of 2022 for Graduation Day 

#graduation #graduationday #bmsce #BMSCEAlumniNetwork #BMSCE #batchof2022', '/instagram/CukDxnzpKp3.jpg', null, 'Image', '2023-07-11T16:15:15.000Z', 94, 0, 'https://www.instagram.com/p/CukDxnzpKp3/', array['graduation','graduationday','bmsce','BMSCEAlumniNetwork','BMSCE','batchof2022']::text[]),
  ('3139411694613528911', 'CuRbk2NJYFP', 'Throw your caps in the air, it''s graduation day! The big day is finally here! 

BMSCE Alumni Network is pleased to invite the batch of 2022 students for their Graduation Day! ✨

You''ve worked incredibly hard to reach this milestone and we want to celebrate your achievements with you! Join us as we celebrate the end of one journey and the start of a new one!

Let''s don our caps and gowns, walk across the stage, and show the world what we''re made of! See you there! 

Date: 15th July, 2023

More details will be shared shortly.

.

.

.

#bmsce #bangalore #explore #instagood #engineering #graduation #alumni #basavanagudi #reunion #friends', '/instagram/CuRbk2NJYFP.jpg', null, 'Image', '2023-07-04T10:37:39.000Z', 492, 1, 'https://www.instagram.com/p/CuRbk2NJYFP/', array['bmsce','bangalore','explore','instagood','engineering','graduation','alumni','basavanagudi','reunion','friends']::text[]),
  ('3138010957064970981', 'CuMdFbtJCLl', 'Throw your caps in the air, it''s graduation day! The big day is finally here! 

BMSCE Alumni Network is pleased to invite the batch of 2022 students for their Graduation Day! ✨

You''ve worked incredibly hard to reach this milestone and we want to celebrate your achievements with you! Join us as we celebrate the end of one journey and the start of a new one!

Let''s don our caps and gowns, walk across the stage, and show the world what we''re made of! See you there! 

Date: 15th July, 2023 
Venue: BMSCE, Basavanagudi

Rules and regulations will be sent to your mail shortly.

.

.

.

#2022 #bmsce #grad #graduation #instagood #engineering #bangalore', '/instagram/CuMdFbtJCLl.jpg', null, 'Image', '2023-07-02T12:14:38.000Z', 74, 1, 'https://www.instagram.com/p/CuMdFbtJCLl/', array['2022','bmsce','grad','graduation','instagood','engineering','bangalore']::text[]),
  ('3127181994694824086', 'Ctl-3SlyFCW', 'Yoga takes you into the present moment, the only place where life exists. ‍♀️‍♂️

On the occasion of the upcoming International Yoga Day on 21st June 2023, the BMS Alumni Network along with the BMSCE Yoga Team will be hosting a Yoga Session on the 25th June 2023, Sunday! ✨

@varshasutrave, the founder of Varsha Sutrave Wellness and a yoga practitioner for over 5 years, will be conducting the session (Alumnus- Biotech 2008).

Date: 25/06/2023
Venue: Indoor Stadium, BMSCE
Timings: 7 AM - 9 AM

.

.

.

#bmsan #bms #yoga #yogaday', '/instagram/Ctl-3SlyFCW.jpg', null, 'Image', '2023-06-17T13:39:25.000Z', 43, 2, 'https://www.instagram.com/p/Ctl-3SlyFCW/', array['bmsan','bms','yoga','yogaday']::text[]),
  ('3124264119237588092', 'CtbnanTp7R8', 'Glimpses from our recent ''Plantation Drive'' in collaboration with NSS BMSCE on the occasion of World Environment Day! 

A total of 51 volunteers planted 26 saplings! 

.

.

.

#bms #bmsan #nss #bmsce #plantationdrive #environmentday', '/instagram/CtbnanTp7R8.jpg', null, 'Sidecar', '2023-06-13T13:02:07.000Z', 205, 0, 'https://www.instagram.com/p/CtbnanTp7R8/', array['bms','bmsan','nss','bmsce','plantationdrive','environmentday']::text[]),
  ('3120537781955547857', 'CtOYJRRpVLR', 'The bond between alumni is strengthened through shared experiences and a deep connection to the institution. 

This is exactly what happened miles away from Bengaluru at our ''California Meet-Up'' held on 19th May, 2023 at Swaad Indian Cuisine in San Jose! ✨

Our Prof Mr. Harish Mekali from ECE Dept, BMSCE joined the interaction of 21 alumni. 

.

.

.

#bmsce #bms #BMSCEAlumniNetwork #california #bengaluru #alumni', '/instagram/CtOYJRRpVLR.jpg', null, 'Image', '2023-06-08T09:38:33.000Z', 143, 1, 'https://www.instagram.com/p/CtOYJRRpVLR/', array['bmsce','bms','BMSCEAlumniNetwork','california','bengaluru','alumni']::text[]),
  ('3119008460417971724', 'CtI8atmprYM', '"He who plants a tree. Plants a hope.” 
- Lucy Larcom

On the occasion of World Environment Day, BMS Alumni Network along with BMSCE NSS brings to you a ''Plantation Drive'' to make our planet greener! 

Please note that volunteers are requested to arrange their own transport.

Breakfast for all volunteers will be provided! 

Location shall be sent out soon! For more updates, check out our Instagram Stories!

Date: 11/06/2023
Timings: 8 AM - 12 Noon

Registration Link is also on our bio. 

.

.

.

#bmsce #nss #environment #basavanagudi #bengaluru', '/instagram/CtI8atmprYM.jpg', null, 'Image', '2023-06-06T07:00:04.000Z', 128, 0, 'https://www.instagram.com/p/CtI8atmprYM/', array['bmsce','nss','environment','basavanagudi','bengaluru']::text[]),
  ('3115575246500245269', 'Cs8vy3-pa8V', 'Back to where it all began! ✨ 

The Batch of ''79 and ''80 visiting our alma mater. Walking down memory lane, reliving the laughter, the friendships, and the unforgettable moments
 
.

.

.

#bmsce #alumni #basavanagudi', '/instagram/Cs8vy3-pa8V.jpg', null, 'Sidecar', '2023-06-01T13:18:53.000Z', 443, 0, 'https://www.instagram.com/p/Cs8vy3-pa8V/', array['bmsce','alumni','basavanagudi']::text[]),
  ('3114104718115553869', 'Cs3hb3spUJN', 'Glimpses from our recent UTSAV Alumni Meet! 

From the classroom to the real world, our alumni have gone on to do amazing things. Bringing together some of our brightest minds to share stories and inspire the next generation to greatness! 

UTSAV - The Festival of Faith - is a grand cultural fest hosted by BMSCE. It aimed to uplift and nurture the light within us by celebrating unique talents, strengths and individuality.

Regalia, the theme of UTSAV 2023, emulates royalty - it is not just an emotion, but a way of life that makes one feel a sense of belonging.✨', '/instagram/Cs3hb3spUJN.jpg', null, 'Sidecar', '2023-05-30T12:37:12.000Z', 378, 3, 'https://www.instagram.com/p/Cs3hb3spUJN/', null),
  ('3108833020093119381', 'CskyykUp7uV', ' Calling all BMSCE Alumni! 

Utsav 2023 is finally here, bringing back a flood of memories! Join us for an incredible evening of fun games and an open mic session on May 28th, 2023, at 4 PM. Relive the joy of your early days and connect with alumni from various batches. 

Register now and don''t forget to share this exciting event with your friends. Let''s make it a Sunday to remember! See you there! 

Registration link on our bio.

.

.

.

#bmsce #utsavroyale #memories #reunion #basavanagudi #engineering', '/instagram/CskyykUp7uV.jpg', null, 'Image', '2023-05-23T06:03:17.000Z', 66, 0, 'https://www.instagram.com/p/CskyykUp7uV/', array['bmsce','utsavroyale','memories','reunion','basavanagudi','engineering']::text[]),
  ('3098711689393971486', 'CsA1d0jraEe', 'Thanks to our Alumni Sanjeev Kumar Kushal Ganesh Hasmitha Ganesh Supreeta Anand Byatnal Disha P Khanted who shared their experience and also guided the students during the online event "Moving to US : 101". It was wonderful to interact with all of them.
#alumni #bms #BMSCE #BMScollegeofengineering', '/instagram/CsA1d0jraEe.jpg', null, 'Image', '2023-05-09T06:54:00.000Z', 54, 0, 'https://www.instagram.com/p/CsA1d0jraEe/', array['alumni','bms','BMSCE','BMScollegeofengineering']::text[]),
  ('3094361494421623946', 'CrxYWJxpdSK', 'BMSCE Alumni are bringing together the most passionate and innovative minds for an international meet-up of #inspiration, collaboration, and excitement.

With an #entertainment, and interactive experiences, this is the perfect opportunity to connect with like-minded individuals and expand your network.

To foster #community growth while we explore #california together embracing the beauty of the city with folks sharing ideas, and exchanging #knowledge and expertise.

If you are in and around let us meet on 19th may 2023, 7PM EST to #experience the best meetup in California.

Register @ https://lu.ma/BMSCEAN-SF-meetup

.

#bmsce #bms #BMSCEAlumniNetwork #toronto Harish Mekali', '/instagram/CrxYWJxpdSK.jpg', null, 'Image', '2023-05-03T06:50:57.000Z', 118, 1, 'https://www.instagram.com/p/CrxYWJxpdSK/', array['inspiration','entertainment','community','california','knowledge','experience','bmsce','bms','BMSCEAlumniNetwork','toronto']::text[]),
  ('3093146692978306517', 'CrtEIdxJW3V', '*Greetings from BMSCE Alumni Network ,*
Here are our panelist for the upcoming webinar on “Moving to US:101” . This webinar will create a platform for students and alumni of all academic backgrounds to come together and understand the journey how our panelist went through when they moved to US. They will be sharing the experience and also will answer to your questions you have in your mind.

*Date:* 4th May,2023
*Time:* 4 PM to 5 PM
*Mode:* Online -zoom

*Register Now:*
https://lu.ma/BMSCEAN-US-101', '/instagram/CrtEIdxJW3V.jpg', null, 'Image', '2023-05-01T14:37:21.000Z', 136, 0, 'https://www.instagram.com/p/CrtEIdxJW3V/', null),
  ('3091589527192858031', 'CrniEuHpe2v', 'Greetings from *BMSCE Alumni Network!*✨

Do you miss your college days? Of course you do:)
The legacy of BMSCE UTSAV continues, and we would love to have you at the Utsav Alumni Open House- 2023.

We invite you to revisit your days, and be a part of this continuing legacy in all its glory! ⚡
The sole motive of this open house is to bring together the alumni, students and faculty of BMSCE in working towards contributing to REGALIA- UTSAV 2023.
Help us enrich the UTSAV experience with your network and guide us in navigating through the mind-blowing event with your expert mentorship and collaborations!

Please fill this form if you think you''ll be able to make it
https://lu.ma/BMSCEAN-Utsav23-meet', '/instagram/CrniEuHpe2v.jpg', null, 'Image', '2023-04-29T11:03:32.000Z', 92, 0, 'https://www.instagram.com/p/CrniEuHpe2v/', null),
  ('3090011996559881383', 'Crh7YoOpbSn', '_Planning to study in the US?_
_Unlock your potential in the US with insights from BMSCE Alumni_
 
Greetings from BMSCE Alumni Network!

We are excited to introduce you to "Moving to Us:101", a live webinar specifically designed for students planning to move to the US for further studies or work. The webinar will feature distinguished speakers who are BMSCE Alumni and have moved to the US and are now working and settled there. 

During the webinar, the speakers will share their valuable experiences, insights, and advice on how to navigate and succeed in the US, including the US education system, job market, cultural differences, and tips on how to adapt and excel in a new environment.

Date: 4th May,2023
Time: 4 PM to 5 PM
Mode: Online 

Register Now:
https://lu.ma/BMSCEAN-US-101', '/instagram/Crh7YoOpbSn.jpg', null, 'Image', '2023-04-27T06:49:16.000Z', 57, 0, 'https://www.instagram.com/p/Crh7YoOpbSn/', null),
  ('3080649067360248678', 'CrAqgE5pWNm', ' BMSCE Alumni Network is looking for enthusiastic alums to join as Batch Ambassadors! 
 If you''re someone who loves to connect with fellow alums, wants to give back to the student community, or be the voice of your branch and batch, this is your chance to make a difference. 
 As a Batch Ambassador, you''ll have the opportunity to engage with your batchmates and keep them updated on the latest happenings, events, and opportunities. 
 Plus, you''ll get to collaborate with other passionate alums and build a stronger alumni network. Don''t miss out on this amazing opportunity to reconnect and make an impact! 
Registration link in bio 

#BMSCEAlumni #BatchAmbassador #AlumniNetwork #MakeADifference #JoinUsNow', '/instagram/CrAqgE5pWNm.jpg', null, 'Image', '2023-04-14T08:46:48.000Z', 60, 1, 'https://www.instagram.com/p/CrAqgE5pWNm/', array['BMSCEAlumni','BatchAmbassador','AlumniNetwork','MakeADifference','JoinUsNow']::text[]),
  ('3072553174392360471', 'Cqj5tVBJ84X', 'BMSCE #Alumni met up at #Toronto, #Canada on 23rd #March 2023 and shared #ideas and #happiness.

From left: Vittal (ML, B''16), Srinidhi (ECE, B''16), Gopal (ECE, B''16), Harish (Asst. prof., ECE), Keshav (ECE, B''19), Priya N (ECE, B''14)

It gives us immense happiness to see our alumni bond with each other even miles away from #Bangalore.', '/instagram/Cqj5tVBJ84X.jpg', null, 'Image', '2023-04-03T04:41:42.000Z', 250, 1, 'https://www.instagram.com/p/Cqj5tVBJ84X/', array['Alumni','Toronto','Canada','March','ideas','happiness.','Bangalore.']::text[]),
  ('3070415981972491156', 'CqcTxFeJwuU', '#CubbonPark on #March 25th saw #BMSCE #alumni enjoy fresh, crisp air and do #yoga amidst greenery.

The #event was well attended and well conducted as well.

We look forward to many such interactions with our dear alumni.

@bmscealumninetwork #alumniengagement #events', '/instagram/CqcTxFeJwuU.jpg', null, 'Video', '2023-03-31T05:57:46.000Z', 51, 0, 'https://www.instagram.com/p/CqcTxFeJwuU/', array['CubbonPark','March','BMSCE','alumni','yoga','event','alumniengagement','events']::text[]),
  ('3063857434011127007', 'CqFAhpsrEzf', 'This #happiness month let''s become happy from within.

Come, join us as we combine #nature and #yoga on 25th March 2023 at #CubbonPark at 7AM IST.

@BMSCEalumninetwork welcomes all it''s alumni to this session.
Register using the link in our bio 
.
.
.
.
#alumni #bengaluru #weekend #yoga #BMSCEAlumniNetwork #BMSCE', '/instagram/CqFAhpsrEzf.jpg', null, 'Image', '2023-03-22T04:44:49.000Z', 50, 1, 'https://www.instagram.com/p/CqFAhpsrEzf/', array['happiness','nature','yoga','CubbonPark','alumni','bengaluru','weekend','BMSCEAlumniNetwork','BMSCE']::text[]),
  ('3059793941611534931', 'Cp2kmDfpdpT', 'Are you ready to embark on an exciting journey towards better health and wellness?

Yoga is a practice that combines physical postures, breathing techniques, and meditation to promote physical, mental, and emotional well-being. 

We, BMSCE Alumni are thrilled to invite you to our upcoming yoga session where we will explore various yoga postures, breathing techniques, and meditation practices that will help you connect with your body and mind in a profound way.

Join us on *25th March* in *Cubbon Park* at *7:00 AM* for an invigorating yoga session that will leave you feeling refreshed and rejuvenated :)

*PLEASE NOTE THE CHANGE IN DATE*

Registeration link in bio 

#BMSCEAlumniNetwork #bmsce #bengaluru #yoga #health #mentalwellbeing #physicalwellbeing #emotionalwellbeing #cubbonpark', '/instagram/Cp2kmDfpdpT.jpg', null, 'Image', '2023-03-16T14:11:23.000Z', 45, 0, 'https://www.instagram.com/p/Cp2kmDfpdpT/', array['BMSCEAlumniNetwork','bmsce','bengaluru','yoga','health','mentalwellbeing','physicalwellbeing','emotionalwellbeing','cubbonpark']::text[]),
  ('3057446974717690332', 'CpuO9MPpAHc', 'BMSCE Alumni Network is hosting a panel discussion this evening and all are welcome to attend 
It''ll be a delight to host you all on topics that cover women empowerment, workplace culture, challenges faced by women, women in technology etc.
Please click the link in our bio to join the meet
.
.
.
.
#womenempowerment #womeninbusiness #womenentrepreneurs #BMSCEAlumniNetwork #bmsce #bengaluru', '/instagram/CpuO9MPpAHc.jpg', null, 'Image', '2023-03-13T08:28:23.000Z', 33, 0, 'https://www.instagram.com/p/CpuO9MPpAHc/', array['womenempowerment','womeninbusiness','womenentrepreneurs','BMSCEAlumniNetwork','bmsce','bengaluru']::text[]),
  ('3056942742394877775', 'CpscTpTJ7dP', 'BMSCE Alumni Network
is happy to host an online panel discussion on account of International Women''s Day.

Join us as we talk about women empowerment in the digital space.

Please register using the link in our bio to be a part of the event on March 13th at 7pm.
.
.
.
.
#bmsce #BMSCEAlumniNetwork #bms #bengaluru #womenempowerment', '/instagram/CpscTpTJ7dP.jpg', null, 'Sidecar', '2023-03-12T15:46:34.000Z', 92, 3, 'https://www.instagram.com/p/CpscTpTJ7dP/', array['bmsce','BMSCEAlumniNetwork','bms','bengaluru','womenempowerment']::text[]),
  ('3056171819765052392', 'CpptBPpp7Po', 'What a lovely way to start the #weekend!

Yoga with fellow #alumni at our very own, Cubbon Park. 

Come join us as we stretch ourselves and be in sync with our Mind-Body-Soul on the 18th of March ''23 at 7AM IST. 

#BMSCEAlumniNetwork welcomes you all to register by clicking the link in our bio to be a part of this event.
.
.
.
.
#bmsce #bms #bengaluru #cubbonpark #meetup #alumni #alumninetwork', '/instagram/CpptBPpp7Po.jpg', null, 'Image', '2023-03-11T14:14:53.000Z', 50, 0, 'https://www.instagram.com/p/CpptBPpp7Po/', array['weekend!','alumni','BMSCEAlumniNetwork','bmsce','bms','bengaluru','cubbonpark','meetup','alumninetwork']::text[]),
  ('3055233173268452114', 'CpmXmI-p9MS', 'BMSCE Alumni Network welcomes all alumni in and around Mumbai to come and join us as we network and explore opportunities that can benefit us all.

Looking forward to a happy time together.

Kindly scan the QR code to register or use the link in our bio to be a part of this wonderful event.
.
.
.
.
#bmsce #BMSCEAlumniNetwork #bombay #mumbai #bengaluru', '/instagram/CpmXmI-p9MS.jpg', null, 'Image', '2023-03-10T07:09:57.000Z', 73, 2, 'https://www.instagram.com/p/CpmXmI-p9MS/', array['bmsce','BMSCEAlumniNetwork','bombay','mumbai','bengaluru']::text[]),
  ('3054638906829418542', 'CpkQebOp7Au', 'BMSCE Alumni Network presents an online panel discussion on March 13th at 7pm IST. 

We''d love to have you all join us as we discuss how #technology and digital presence has shaped the present world especially for women.

Please scan the QR code to register for the event or register using the link in our bio 
.
.
.
.
#BMSCEAlumniNetwork #bmsce #bms #bengaluru #womensday', '/instagram/CpkQebOp7Au.jpg', null, 'Image', '2023-03-09T11:29:15.000Z', 48, 2, 'https://www.instagram.com/p/CpkQebOp7Au/', array['technology','BMSCEAlumniNetwork','bmsce','bms','bengaluru','womensday']::text[]),
  ('3053808850478765417', 'CphTvhAuxVp', 'Women have significant contributions in every aspect of society, including leadership, education, healthcare, science, technology, and the arts.

 International Women''s Day is a time to celebrate the social, economic, cultural, and political achievements of women.
It''s a reminder to continue pushing for progress and 
empowering women to reach their full potential.

We BMSCE Alumni are wishing all the wonderful women out there a happy and inspiring International Women''s Day! 

May your voices be heard, your achievements celebrated, and your potential unleashed. Keep shining and making the world a better place.', '/instagram/CphTvhAuxVp.jpg', null, 'Image', '2023-03-08T08:00:05.000Z', 52, 1, 'https://www.instagram.com/p/CphTvhAuxVp/', null),
  ('3053688653468739185', 'Cpg4aa0pSZx', 'Are you ready for an unforgettable meet-up of #networking and fun?

We BMSCE Alumni are bringing together the city''s most passionate and innovative minds for a meet-up of inspiration, collaboration, and excitement.

With an impressive lineup of activities, entertainment, and interactive experiences, this is the perfect opportunity to connect with like-minded individuals and expand your network.

To foster #community growth while we explore #mumbai together embracing the beauty of the city with folks sharing ideas, exchanging knowledge and expertise.

let us meet on 18th march 2023 to experience the best meetup in Mumbai!!
.
.
.
.
#BMSCEAlumniNetwork #alumni #bmsce #bms', '/instagram/Cpg4aa0pSZx.jpg', null, 'Image', '2023-03-08T04:01:16.000Z', 46, 0, 'https://www.instagram.com/p/Cpg4aa0pSZx/', array['networking','community','mumbai','BMSCEAlumniNetwork','alumni','bmsce','bms']::text[]),
  ('3052496534301431260', 'CpcpWzVJdXc', 'BMSCE Alumni Network presents Women’s Day 2023, a step to make a change.

Empowering women is not a phrase that we bring up around the time when Women’s Day comes up. This is something we inculcate in our daily lives. 

We look forward to hosting a few #alumni who have been a constant source of #inspiration and have been actively involved in breaking the disparity. 

Watch out this space for more details!
.
.
.
.
#womensday #womenempowerment #engineering #bmsce #bengaluru #BMSCEAlumniNetwork #alumninetwork', '/instagram/CpcpWzVJdXc.jpg', null, 'Image', '2023-03-06T12:32:44.000Z', 48, 0, 'https://www.instagram.com/p/CpcpWzVJdXc/', array['alumni','inspiration','womensday','womenempowerment','engineering','bmsce','bengaluru','BMSCEAlumniNetwork','alumninetwork']::text[]),
  ('3049393046706855034', 'CpRntHRghx6', 'Welcome to the latest edition of our alumni newsletter. We are proud to share inspiring stories of our #alumni making a positive impact in their communities. Our alumni continue to inspire us with their dedication and creativity. We are also excited to update you on the latest developments at our institution, where our faculty and staff continue to push the boundaries of #knowledge and #research. 
As always, we encourage you to stay connected and engaged with us, and share your news and accomplishments with our alumni #community. Thank you for your continued support.
.
.
.
#BMSCEAlumniNetwork #bmsce #bengaluru #newsletter', '/instagram/CpRntHRghx6.jpg', null, 'Video', '2023-03-02T05:51:37.000Z', 151, 0, 'https://www.instagram.com/p/CpRntHRghx6/', array['alumni','knowledge','research.','community.','BMSCEAlumniNetwork','bmsce','bengaluru','newsletter']::text[]),
  ('3047426898987993332', 'CpKop5hJkj0', 'BMS College of Engineering was founded in the year 1946 by late Sri BM Sreenivasaiah, a great visionary, educationist and a philanthropist. 
The institution has been nurtured by his dynamic & enterprising son, late Sri BS Narayan.

The Maharaja of Mysore honoured Sri BM Sreenivasaiah with the title of Raja Karya Prasaktha in 1946.

Sri BS Narayan was instrumental in initiating international collaborative programmes and cross cultural programmes.

BMSCE is the first private sector initiative in the education section in India!
In the past 77 years it has grown tremendously and has produced thousands of illustrious leaders in all spheres across the globe who are contributing their best! 

#glorioushistory #educationinindia #education #BMSCEalumninetwork #vtu  #alumni #bmsce #basvanagudi #bengaluru #philanthropy', '/instagram/CpKop5hJkj0.jpg', null, 'Image', '2023-02-27T12:40:17.000Z', 436, 1, 'https://www.instagram.com/p/CpKop5hJkj0/', array['glorioushistory','educationinindia','education','BMSCEalumninetwork','vtu','alumni','bmsce','basvanagudi','bengaluru','philanthropy']::text[]),
  ('3045302482342643204', 'CpDFnkVpgYE', 'Are you considering doing an MBA?

How about an University at New York? 

We, at #BMSCE are delighted to introduce you to the MBA in #Innovation and #Entrepreneurship program offered by Mercy College, New York.

Their program is designed to provide students with the #knowledge and skills they need to succeed in the ever-changing world of #business.

We would love to hear your thoughts on this and what specifically interests you about the program. 

Register to know more. 

#BMSCEAlumniNetwork', '/instagram/CpDFnkVpgYE.jpg', null, 'Image', '2023-02-24T14:19:27.000Z', 88, 0, 'https://www.instagram.com/p/CpDFnkVpgYE/', array['BMSCE','Innovation','Entrepreneurship','knowledge','business.','BMSCEAlumniNetwork']::text[]),
  ('3042339701276321636', 'Co4j9bcpKdk', 'It was a great pleasure to have our #Delhi chapter #alumni from various branches and batches attend the meet-up at the Constitution Club of India meeting, Delhi on Feb 12th this year.

The enthusiasm for the regular meet-ups and ways to contribute to the #AlmaMater are all commendable.

BMSCE alumni network looks forward to such interactions on a regular basis at various locations pan #India.
.
.
.
.
#bmsce #BMSCEAlumniNetwork #engineering', '/instagram/Co4j9bcpKdk.jpg', null, 'Image', '2023-02-20T12:12:56.000Z', 125, 2, 'https://www.instagram.com/p/Co4j9bcpKdk/', array['Delhi','alumni','AlmaMater','India.','bmsce','BMSCEAlumniNetwork','engineering']::text[]),
  ('3037797613281187960', 'CoobNWXJ5h4', 'BMSCE Alumni met up for a morning walk and talk at Lal Bagh on Saturday, 11th Feb 2023.
20 #Alumni between the years 1991 & 2002 were a part of the Weekend Lalbagh visit.

The fresh air, talks, laughter, and #discussions brought with it a great sense of camaraderie. There was a close #networking session amongst alumni and a discussion on how to contribute to BMSCE with their #skill set that will help the #students to improvise and get new #opportunities in the field of #technology. It was an amazing #experience for all the alumni who were a part of this new initiative. The morning walk ended with a steaming cup of filter coffee.

Watch out for this space for more such events where our alumni can come together and bond.
.
.
.
.
#alumninetwrok #bmsce #bms #bengaluru #lalbhag #weekendvibes', '/instagram/CoobNWXJ5h4.jpg', null, 'Sidecar', '2023-02-14T05:48:37.000Z', 187, 1, 'https://www.instagram.com/p/CoobNWXJ5h4/', array['Alumni','discussions','networking','skill','students','opportunities','technology.','experience','alumninetwrok','bmsce','bms','bengaluru','lalbhag','weekendvibes']::text[]),
  ('3034430916562136672', 'CocdtdtJi5g', 'What would meeting up with old friends from #college mean to you?
1. Bring in a lot of laughter & old #memories to the fore 
2. Deepen the bond between your Alma Mater and you
3. Increase a sense of belonging & purpose
4. Would help in #brainstorming new ideas
5. Enable you to contribute to your #AlmaMater & current #students
6. Help in networking with people from other branches & batches
7. Sheer fun with talks & games
8. Let''s admit, a walk with #greenery around is always welcome
9. Create a base for more such visits
10. The best way to spend a Saturday morning!

If you agree with at least one of the above mentioned points, you know where to be this Saturday, 11th Feb between 7:30 & 11AM :)

#BMSCE #AlumniNetwork welcomes you to a full filled walk that could quench your thirst for fresh air and positivity.
Come, join us as we meet up at Lal Bagh and go ahead with activities.
Register using the link our bio ', '/instagram/CocdtdtJi5g.jpg', null, 'Image', '2023-02-09T14:19:35.000Z', 86, 1, 'https://www.instagram.com/p/CocdtdtJi5g/', array['college','memories','brainstorming','AlmaMater','students','greenery','BMSCE','AlumniNetwork']::text[]),
  ('3030794623017929533', 'CoPi6bcJcs9', 'We are kicking off BMSCE Alumni Network Bengaluru Weekends, a series of meetups exclusively for #alumni of #BMSCE. 

To foster #community growth while we explore #Bengaluru together with folks from different generations sharing their stories, with fun-filled games, catching up at events that show the essence of this beautiful city.

​On February 11th, 2023 let us all get together at Lalbagh to have a fun-filled start to the weekend. The agenda and a link to a WhatsApp group will be shared via email.

Click the link in our bio to register ', '/instagram/CoPi6bcJcs9.jpg', null, 'Image', '2023-02-04T13:54:55.000Z', 175, 1, 'https://www.instagram.com/p/CoPi6bcJcs9/', array['alumni','BMSCE.','community','Bengaluru']::text[]),
  ('3028546141041383582', 'CoHjqtaptie', 'The department of #Civil #Engineering at BMSCE conducted a workshop on Jan 12th ''23 on ''Successful Project Management ''. 

This event was conducted by Mr Umesh K Jois, founder & former President & CEO of Jois Construction Management System, New Jersey, USA. He graduated from #BMSCE in 1973.

Along with him were a few more #alumni from the same batch who were a part of the event - S Ramesh, 
BK Satish, PN Venktesh and RN Nanjundrao.', '/instagram/CoHjqtaptie.jpg', null, 'Image', '2023-02-01T11:27:35.000Z', 170, 0, 'https://www.instagram.com/p/CoHjqtaptie/', array['Civil','Engineering','BMSCE','alumni']::text[]),
  ('3026882181816649892', 'CoBpU6oJAik', 'BMSCE Alumni Network is happy to share that Mr. Madhukar BA, an alumnus of our Civil Engineering department of 1988 batch who has donated a few books to our college library. 
He is the Managing Director and CEO of Potential Project Managers Pvt. Ltd., and Cleantech Emersol Private Limited.

The book is titled “Zero to Four Figures” which has #information on New age #digital #entrepreneurship #stories and #lessons written by his daughter Ms. Prithvi Madhukar. This book is a compilation of 61 stories and lessons from Prithvi''s first three years of digital entrepreneurship. The topics range from #Business #Strategy to #Mindset to #Marketing. It is an easy read. It would help our young students who have the mindset to become entrepreneurs in the near future. They will be enlightened by going through this book which is displayed in the college library as a reference copy.
.
.
.
.
#author #bmsce #bms #bengaluru #bangalore #engineering #CivilEngineering #alumni #college', '/instagram/CoBpU6oJAik.jpg', null, 'Image', '2023-01-30T04:21:36.000Z', 231, 2, 'https://www.instagram.com/p/CoBpU6oJAik/', array['information','digital','entrepreneurship','stories','lessons','Business','Strategy','Mindset','Marketing.','author','bmsce','bms','bengaluru','bangalore','engineering','CivilEngineering','alumni','college']::text[]),
  ('3023309285504728905', 'Cn088bopj9J', 'It''s a proud moment that our #alumni, Lt Cdr Disha Amrith is set to lead the #IndianNavy contingent at the 74th #Republic Day parade this year on the Kartavya Path!
She will be leading 144 young sailors.

Lt Cdr Disha was a student of BMSCE Computer Science department and graduated in 2015.

As a Naval Aviator and an officer, she sure is an inspiration to our current students. We encourage and stand by our students to join the armed forces.
.
.
.
.
#armedforces #indianarmedforces #republicdayindia #republicday #kartavyapath #newdelhi #bengaluru #bangalore #bmsce #Engineering #college #alumninetwork #trending', '/instagram/Cn088bopj9J.jpg', null, 'Sidecar', '2023-01-25T06:02:53.000Z', 1278, 4, 'https://www.instagram.com/p/Cn088bopj9J/', array['alumni','IndianNavy','Republic','armedforces','indianarmedforces','republicdayindia','republicday','kartavyapath','newdelhi','bengaluru','bangalore','bmsce','Engineering','college','alumninetwork','trending']::text[]),
  ('3021352130329353761', 'Cnt_8E1pp4h', 'Sri. Narasimha Murthy Katary Saluva, an alumnus of our Civil Engineering department of 1963 batch visited the BMSCE campus on Jan 6th ''23. 
He, at the age of 82 had a great time cherishing his memories at BMSCE. 
Mr. Saluva generously contributed a sum of Rs 1,00,000 towards the scholarship of meritorious students.

#alumni #bmsce #scholarship #education #engineering #engineer #bengaluru #bangalore #college #CivilEngineering', '/instagram/Cnt_8E1pp4h.jpg', null, 'Sidecar', '2023-01-22T13:14:22.000Z', 377, 0, 'https://www.instagram.com/p/Cnt_8E1pp4h/', array['alumni','bmsce','scholarship','education','engineering','engineer','bengaluru','bangalore','college','CivilEngineering']::text[])
on conflict (post_id) do nothing;
