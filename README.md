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
npm run verify    # 88 end-to-end checks against the real database
```

`scripts/verify.mjs` signs in as three test accounts and checks permissions,
posts, chapters, the noticeboard, private messages (including Realtime
delivery and that a third account receives nothing), the student-to-alumni
lifecycle, suspension and the newsletter. It cleans up after itself.

`scripts/export-migrations.mjs` writes the migrations recorded in the database
into `supabase/migrations/`, so the repository always matches what is
deployed.

## Deploying

Pushing to `master` deploys to Vercel. Set the environment variables above in
the Vercel project first. Cron schedules are in `vercel.json` (times are UTC).
