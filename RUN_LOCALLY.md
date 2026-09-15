# Run this app locally

Start to finish, about 10 minutes. You need Node.js 20 or newer
(`node -v` to check) and a free Supabase account.

---

## 1. Create the Supabase project

1. Go to https://supabase.com/dashboard and sign in.
2. **New project**. Pick any name, set a database password (save it
   somewhere — you won't need it for the app, only for direct DB access),
   and choose the region closest to you.
3. Wait for provisioning to finish (~2 minutes).

The free tier is enough for everything in this app.

## 2. Apply the database schema

**SQL Editor** → **New query** → paste the entire contents of
[`supabase/migrations/ALL_MIGRATIONS.sql`](./supabase/migrations/ALL_MIGRATIONS.sql)
→ **Run**.

That one file is migrations `0001` through `0021` concatenated in order, so a
single run builds the whole schema: `profiles`, `events`, `event_rsvps`,
`mentorship_requests`, `job_postings`, `social_posts`, `discussions`,
`newsletters`, `site_settings`, the gallery tables, every RLS policy, the
auto-profile trigger with `@bmsce.ac.in` student auto-verification, and the
storage buckets.

Expect "Success. No rows returned" at the end. If you'd rather go
file-by-file, run `supabase/migrations/0001_init.sql` through
`0021_gallery.sql` individually, in numeric order — same result.

> The `supabase/SETUP_*.sql` files are older standalone copies of the later
> migrations. Don't run them on top of `ALL_MIGRATIONS.sql` or you'll hit
> "already exists" errors.

### Optional: the Instagram backfill

`supabase/SETUP_SOCIAL_POSTS.sql` inserts 168 historical Instagram rows. The
`social_posts` *table* is already created by migration 0003, so if you want
the seed data, run only the `INSERT` statements from that file — not the
`CREATE TABLE` at the top.

## 3. Configure auth

**Authentication** → **URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: add `http://localhost:3000/auth/callback`

Email sign-in (magic link + password) is on by default, so you can stop here.
Two things worth knowing:

- Supabase's built-in email sender is rate-limited to a few messages per hour.
  Fine for testing; set up SMTP under **Authentication → Emails** for real use.
- Open magic links in the same browser you requested them from — the PKCE code
  lives in that browser's storage.

For Google sign-in, follow section 2 of [`supabase/README.md`](./supabase/README.md).

## 4. Wire up the app

```bash
cp .env.local.example .env.local
```

Open `.env.local` and paste in the two values from **Project Settings → API**:

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL, e.g. `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the `anon` / `public` key |

Leave `NEXT_PUBLIC_SITE_URL` as `http://localhost:3000`.

The `anon` key is meant to be public — RLS policies are what protect your
data. Do not put the `service_role` key here; the app never uses it.

## 5. Install and start

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## 6. Make yourself an admin

Sign up through the UI first, then in **SQL Editor**:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

Sign out and back in. `/admin` is now reachable.

---

## If something breaks

**"Your project's URL and Key are required"** — `.env.local` is missing,
misnamed, or the dev server wasn't restarted after you created it. Env changes
need a restart.

**Sign-in redirects to a blank page or errors** — `http://localhost:3000/auth/callback`
isn't in the redirect allow-list (step 3), or `NEXT_PUBLIC_SITE_URL` has a
trailing slash. It shouldn't.

**Empty lists everywhere but no errors** — normal on a fresh database. Create
an event or post as admin and it fills in.

**"relation ... does not exist"** — the schema run in step 2 stopped partway.
Re-check the SQL Editor output for the first red error and run from there.

**`npm install` fails on `sharp` or `three`** — usually Node too old. Upgrade
to Node 20+ and retry.
