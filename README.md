# BMSCE Alumni Network v2

A community platform for the alumni of B.M.S. College of Engineering: a
personal feed, one common forum, a community for every chapter, private
messages, an editorial blog with email digests, and The Wall, a noticeboard
that pulls in the association's Instagram posts.

This repository, its Vercel project and its Supabase project are independent
of the v1 site. Nothing here reads from or writes to v1.

- **Stack:** Next.js 16 (App Router, React 19), TypeScript, Tailwind CSS 4,
  Supabase (Postgres, Auth, Storage, Realtime), Vercel.
- **Hosting region:** Mumbai (`bom1` on Vercel, `ap-south-1` on Supabase).

## Run it locally

```bash
npm install
cp .env.local.example .env.local   # then fill in the Supabase values
npm run dev
```

Apply the SQL files in `supabase/migrations/` in filename order to a fresh
Supabase project (SQL Editor, or `supabase db push`). They build the whole
schema, every Row Level Security policy, the storage buckets and the scheduled
lifecycle job.

The first person to sign up with an address listed in
`private.app_config.bootstrap_admin_emails` becomes a verified admin. After
that, admins are managed in **Admin, Members**. Then open **Admin, Chapters**
and press **Load the chapter list and Instagram archive** once.

## How it is put together

| Area | Where | Notes |
|---|---|---|
| Design system | `src/app/v2.css` | Tokens, paper/tape/pin primitives, the board, motion. |
| App shell | `src/components/v2/AppChrome.tsx` | Rail on desktop, icon rail on tablets, tab bar on phones. |
| Feed, forum, chapter posts | `posts` table, `src/lib/posts.ts`, `src/app/posts/actions.ts` | One content model. `kind = discussion` with no chapter is the common forum; a `chapter_id` puts a post in that chapter. |
| Chapters | `chapters`, `chapter_members` | Members can belong to several. Leads are appointed by admins and can pin, announce and approve inside their chapter only. |
| Messages | `dm_threads`, `dm_messages`, `user_blocks` | Realtime over Supabase. Only the two participants can read a thread: admins cannot. |
| The Wall | `notice_items`, `noticeboard_feed()` | A curated list that points at stored posts, events, photos and Instagram imports. |
| Instagram | `src/lib/instagram.ts`, `/api/cron/instagram`, `ig_ingest()` | Official Meta API only. See below. |
| Blog & digests | `articles`, `newsletter_*`, `src/lib/newsletter.ts` | Digests are built from published articles. |
| Membership lifecycle | `run_membership_lifecycle()`, `membership_events` | Runs in the database on a schedule. See below. |
| Admin | `src/app/admin/*`, `src/app/admin/manage.ts` | Separate console; every action is re-checked in the database. |

### Permissions

The browser only ever holds the publishable key. Every rule is enforced in
Postgres: Row Level Security on every table, guard triggers on `profiles` and
`posts` (so a member cannot make themselves an admin, verify themselves, pin a
post or forge counters), and `SECURITY DEFINER` functions that check the
caller. Server actions repeat the checks only to give clear messages.

Roles: `member`, `admin` (site-wide), and chapter `lead` (one chapter). A
suspended account can sign in but cannot post, message or use admin tools.

### Student to alumni

Students record a **passing-out date**. `run_membership_lifecycle()` is
scheduled with `pg_cron` every six hours (one run lands at 00:05 India time)
and moves a student to alumni once that date has arrived, compared in India
Standard Time. It runs whether or not the member logs in, changes nothing
else about the account, writes to `membership_events`, and notifies the
member. Running it twice does nothing the second time.

- No date, or an account on **hold**: never graduated automatically. They are
  listed in **Admin, Student to alumni** for a person to decide.
- A graduation *year* is never turned into a date.
- Members can only enter a future date; admins can correct any date.
- Correcting the date of someone already graduated: an *automatic* graduation
  is reversed if the new date is still in the future; a change an admin made
  by hand is never reversed by a date.

### Instagram import

`/api/cron/instagram` runs daily (see `vercel.json`) and can be triggered from
**Admin, Instagram**. It calls Meta's Instagram API, matches posts on the
stable media id (then on the shortcode, so archived posts are updated rather
than duplicated), stores failures per record without stopping the run, and
logs every run in `ig_sync_runs`.

It needs a **professional** Instagram account and a long-lived access token
(`instagram_business_basic`). Paste the token in **Admin, Instagram** (stored
in a private schema and refreshed automatically) or set
`INSTAGRAM_ACCESS_TOKEN`. Until then the importer reports "not connected" and
The Wall shows the archive that ships with the site. Nothing scrapes
instagram.com. Media files are not copied: Meta's CDN links are stored and
refreshed on each sync.

Vercel's Hobby plan runs cron jobs once a day. For a tighter schedule, change
the cron expression on a paid plan, or call the same route from any scheduler
with `Authorization: Bearer $CRON_SECRET`.

### Email digests

Admins pick published articles, preview the email, and send it or schedule it
(`/api/cron/digests`, daily). Delivery uses Resend. Without `RESEND_API_KEY`
and `NEWSLETTER_FROM` a send is recorded as failed with that reason: the
dashboard never reports a delivery that did not happen. Subscribers opt in
with a consent checkbox and every email has a one-click unsubscribe link.

### Posts: asks and offers, polls, mentions, link cards

Two more kinds of post (Ask, Offer). A post can carry a poll: its options and
running totals live on the post, and each vote is a row only its owner can
read, so votes are private. Typing `@` offers members; the database rewrites
the mention list from the profiles table and keeps only people whose name is
really in the text, then notifies them. The first web address in a post gets a
text-only card, fetched once on the server (`src/lib/linkPreview.ts`): https
only, no bare IP addresses, the host must resolve to public addresses, the
connection is pinned to the checked address, every redirect is re-checked.

### Messages: typing, read receipts, who is online

"Typing" and the online dots travel over private Realtime channels. Row Level
Security on `realtime.messages` (see `realtime_topic_ok`) lets only the two
people in a conversation join `dm:<thread id>`, and only verified members join
`online`. A member can switch their own dot off in settings.

### Events

Events are posters with a strip of tear-off tabs: tearing one is the RSVP.
`/events/<id>/calendar` serves an .ics file. `run_event_reminders()` (pg_cron,
hourly) notifies everyone who is going, once, in the day before. A photograph
posted on a past event's page is offered to The Wall for an admin to approve.

### Install as an app, and push notifications

`src/app/manifest.ts` and `public/sw.js` make the site installable. Push uses
VAPID keys. Anything that tells a member something (a notification row, a
direct message) adds a row to `private.push_outbox`; the app server collects
the outbox with the server secret (`push_claim`) and delivers it
(`src/lib/push.ts`), removing devices the push service reports as gone.
There is no always-on worker: delivery is triggered right after the action
that caused it, whenever a member opens the app, and by the daily job, so a
scheduled reminder may wait until one of those happens.

Status: the server path is tested end to end against a push service with a
device that does not exist (it is asked, answers "gone", the device is
removed). Delivery to a real phone has to be confirmed on a real phone:
Notifications, This device, Turn on, Send a test.

### Other things worth knowing

- **The ID card** (`src/components/v2/IdCard.tsx`) follows the printed BMS card.
  The barcode is real Code 39 of the roll number (`profiles.usn`, optional);
  without one the card shows the batch. `/profile/card` draws the signed-in
  member's own card as a PNG.
- **The campus map** (`src/components/v2/campus/CampusMap.tsx`) is drawn from a
  member's sketch. Every building is a data row: move one by editing `BLOCKS`.
- **Share cards** (`src/lib/og.tsx`) are drawn on the server for the site,
  articles, events and each item on The Wall (`/noticeboard?item=<id>`).
- **Night theme:** a `theme` cookie sets `data-theme="night"` on `<html>`. The
  page goes dark; paper, photo prints and the board keep their daytime colours
  (the "islands" at the end of `src/app/v2.css`). Add `keep-day` or
  `keep-dark` to an element that must not flip.
- **Motion is always on.** The site does not follow the device's "reduce
  motion" setting; this was a deliberate product decision.
- **Messages from server actions:** a production build hides the text of
  errors thrown on the server. Actions throw `fail("...")` and the browser reads
  it with `said(e)` (`src/lib/fail.ts`).
- **Archive photos** get WebP copies at two sizes before every `dev` and
  `build` (`scripts/make-webp.mjs`; not committed).

## Environment variables

See `.env.local.example`. In short:

| Variable | Needed for | Secret |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | everything | no |
| `NEXT_PUBLIC_SITE_URL` | links in emails, auth redirects, sitemap | no |
| `CRON_SECRET` | authenticating Vercel Cron | yes |
| `APP_SERVER_SECRET` | scheduled jobs calling database functions | yes |
| `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID` | Instagram import | yes |
| `RESEND_API_KEY`, `NEWSLETTER_FROM` | email digests | yes |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | push notifications (sent to browsers) | no |
| `VAPID_PRIVATE_KEY` | signing push notifications | yes |
| `VAPID_SUBJECT` | contact URL sent to push services (https or mailto) | no |

**Rotating the server secret:** generate a new 64-character hex string, set it
as `APP_SERVER_SECRET`, and store its SHA-256 in the database:

```sql
update private.app_config
   set value = encode(extensions.digest('<new secret>', 'sha256'), 'hex')
 where key = 'server_secret_sha256';
```

## Supabase dashboard settings

These cannot be set from code:

1. **Authentication, URL Configuration:** set the Site URL to the production
   domain and add `<domain>/auth/callback` to the redirect allow-list.
2. **Authentication, Providers:** add Google and LinkedIn credentials if you
   want those sign-in buttons to work. Email and password works out of the box.
3. **Authentication, SMTP:** add a real SMTP sender. The built-in one only
   delivers to project team members and is heavily rate limited.

## Checks

```bash
npm run build     # type-checks and builds every route
npm run verify    # 115 end-to-end checks against the real database
```

`scripts/verify.mjs` signs in as three test accounts and checks permissions,
posts, chapters, the noticeboard, private messages (including Realtime
delivery and that a third account receives nothing), the student-to-alumni
lifecycle, suspension, the newsletter, polls and mentions, push, the private
live channels, and the built-in logic (barcode, link-preview safety). It
cleans up after itself. One check ("a member's suggestion waits for approval")
fails if the script is run more than a few times in a day, because the test
member hits the real daily limit on Wall suggestions.

`scripts/lib/browser.mjs` is a small headless-Chrome driver (no dependencies)
for clicking through the real pages: sign in with a test account, click, type,
take screenshots at desktop or phone size.

`scripts/export-migrations.mjs` writes the migrations recorded in the database
into `supabase/migrations/`, so the repository always matches what is
deployed.

## Deploying

Pushing to `master` deploys to Vercel. Set the environment variables above in
the Vercel project first. Cron schedules are in `vercel.json` (times are UTC).
