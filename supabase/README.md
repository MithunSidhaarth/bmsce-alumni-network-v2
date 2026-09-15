# Supabase setup — BMS Alumni Network

Do these in order. You only need to do this once.

## 1. Run the schema

1. Open your project → **SQL Editor** → **New query**.
2. Paste the entire contents of [`migrations/0001_init.sql`](./migrations/0001_init.sql) and click **Run**.
3. Then run [`migrations/0002_email_and_student_verification.sql`](./migrations/0002_email_and_student_verification.sql)
   the same way (it must run after 0001).
4. Confirm both succeed. This creates: `profiles`, `events`, `event_rsvps`,
   `mentorship_requests`, all RLS policies, the auto-profile trigger (with
   `@bmsce.ac.in` student auto-verification), and the `avatars` storage bucket.

## 1b. Import the Instagram social feed (optional, run once)

After the core schema is in, load the 168 historical Instagram posts:

1. **SQL Editor → New query** → paste all of
   [`SETUP_SOCIAL_POSTS.sql`](./SETUP_SOCIAL_POSTS.sql) → **Run**. This creates
   the `social_posts` table and inserts the 168 rows.
2. The post thumbnails are already re-hosted inside the app at
   `public/instagram/<code>.jpg` (so they never break), and every row keeps the
   permanent `permalink` to the real Instagram post.
3. They show on the **Events page** under "From our Instagram". Admins can add
   more at **/admin/social**.

## 2. Configure Auth providers

Supabase dashboard → **Authentication → Providers**.

### Email (magic link) — already on by default

The **Email** provider is enabled by default, which powers both the "Email me a
sign-in link" (magic link) option **and** the email + password option
(create account / sign in / forgot password). A few notes:

- **Password reset** links redirect through `/auth/callback?type=recovery` to
  the `/auth/reset` page. `/auth/callback` is already in your redirect
  allow-list (step 3 below), so no extra entry is needed.
- If **"Confirm email"** is ON (Auth → Providers → Email), a new password
  signup must click a confirmation link before they can sign in — the UI shows
  a "check your email to confirm" message in that case.

- Magic links use Supabase's **built-in email service**, which is heavily
  **rate-limited** (a few per hour) and only meant for testing. For real use,
  configure your own SMTP under **Authentication → Emails → SMTP Settings**.
- Open the magic link **on the same device/browser** you requested it from
  (the sign-in uses a PKCE code stored in that browser).
- **Students:** anyone who signs in with an `@bmsce.ac.in` address is auto-set
  to `user_type='student'` + `verification_status='verified'` by the DB trigger
  (receiving the link proves they own a real BMS mailbox). During onboarding
  they're asked for a personal email, which becomes their sign-in email going
  forward (Supabase sends a confirmation to that address; the verified-student
  status stays on the same account). No admin review needed for students.

### Google

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. **APIs & Services → OAuth consent screen** → configure (External), add your email
   as a test user while in testing.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application.**
4. Under **Authorized redirect URIs**, add exactly:
   ```
   https://sujxfhpvbrhhlmvzbgwv.supabase.co/auth/v1/callback
   ```
5. Copy the **Client ID** and **Client secret** into Supabase → Providers → Google →
   enable, paste both, save.

### LinkedIn (OIDC)

> Use the provider labelled **"LinkedIn (OIDC)"** in Supabase — the older
> "LinkedIn" (OAuth2) provider is deprecated.

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps) → **Create app**.
2. In the app → **Products** tab → add **"Sign In with LinkedIn using OpenID Connect"**.
3. **Auth** tab → under **Authorized redirect URLs for your app**, add exactly:
   ```
   https://sujxfhpvbrhhlmvzbgwv.supabase.co/auth/v1/callback
   ```
4. Copy the **Client ID** and **Client Secret** into Supabase → Providers →
   **LinkedIn (OIDC)** → enable, paste both, save.

### Site URL / redirect allow-list

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` (change to your production domain when you deploy).
- **Redirect URLs** (add both):
  ```
  http://localhost:3000/auth/callback
  https://YOUR-PROD-DOMAIN/auth/callback
  ```

## 3. Make yourself an admin

After you've signed in once (so your `profiles` row exists), run this in the
SQL Editor, replacing the email:

```sql
update public.profiles
set role = 'admin', verification_status = 'verified'
where id = (select id from auth.users where email = 'YOUR-EMAIL@example.com');
```

(The SQL Editor runs as a trusted service context, so it's allowed to set
`role`/`verification_status` even though normal users can't.)

## 4. Environment variables

`.env.local` already has the public values:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

The app uses **only** the anon/publishable key on the client and in server
components — no service-role key is needed for the current feature set (all
access is governed by RLS). If we later add server-only admin actions that must
bypass RLS, we'll add `SUPABASE_SERVICE_ROLE_KEY` here (server-only, never
`NEXT_PUBLIC_`).
