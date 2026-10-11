-- Hardening from the Supabase security advisor. None of these functions
-- leaked data (each checks its caller), but nothing should be callable by a
-- role that has no business calling it.

-- 1. Trigger functions are never called through the API.
revoke execute on function
  public.handle_new_user(), public.enforce_profile_guard(), public.enforce_mentorship_transition(),
  public.posts_guard(), public.posts_after_insert(), public.post_comments_sync(),
  public.post_reactions_sync(), public.posts_notice_sync(), public.dm_messages_sync(),
  public.touch_updated_at(), public.articles_touch()
from public, anon, authenticated;

-- 2. Member and admin functions: signed-in users only. (Postgres grants
--    EXECUTE to PUBLIC by default, which is why revoking from anon alone
--    was not enough.)
revoke execute on function
  public.admin_metrics(integer), public.admin_set_chapter_role(uuid, uuid, text),
  public.admin_set_membership(uuid, text, boolean, text), public.admin_set_passing_out_date(uuid, date, text),
  public.admin_export_migrations(), public.lifecycle_needs_review(), public.run_membership_lifecycle(),
  public.log_admin_action(text, text), public.ig_connection(), public.ig_retry_failures(),
  public.can_dm(uuid), public.start_dm(uuid), public.mark_thread_read(uuid), public.dm_inbox(),
  public.dm_unread_count(), public.join_chapter(uuid), public.review_chapter_member(uuid, uuid, boolean),
  public.suggest_for_noticeboard(uuid), public.touch_activity(), public.delete_my_account(),
  public.directory_facets(text), public.chapter_member_counts()
from public, anon;
grant execute on function
  public.admin_metrics(integer), public.admin_set_chapter_role(uuid, uuid, text),
  public.admin_set_membership(uuid, text, boolean, text), public.admin_set_passing_out_date(uuid, date, text),
  public.admin_export_migrations(), public.lifecycle_needs_review(), public.run_membership_lifecycle(),
  public.log_admin_action(text, text), public.ig_connection(), public.ig_retry_failures(),
  public.can_dm(uuid), public.start_dm(uuid), public.mark_thread_read(uuid), public.dm_inbox(),
  public.dm_unread_count(), public.join_chapter(uuid), public.review_chapter_member(uuid, uuid, boolean),
  public.suggest_for_noticeboard(uuid), public.touch_activity(), public.delete_my_account(),
  public.directory_facets(text), public.chapter_member_counts()
to authenticated;

-- Left callable without a session on purpose:
--   noticeboard_feed, newsletter_subscribe, newsletter_unsubscribe, record_article_view,
--   event_going_counts, check_rate_limit: public features.
--   ig_ingest, ig_token_get, ig_token_set, digest_claim, digest_finish: the scheduled
--   server routes call these with no user session and prove themselves with the server secret.
--   is_admin, is_verified, is_chapter_member, is_chapter_lead, in_dm_thread, dm_blocked,
--   owns_posting, is_active_mentor, shares_*, has_accepted_mentorship_with: used inside
--   Row Level Security policies, which run as the calling role. They only ever
--   answer "false" for a visitor.

-- 3. Pin the search path on the remaining functions.
alter function public.touch_updated_at() set search_path = public;
alter function public.articles_touch() set search_path = public;
alter function public.network_today() set search_path = public;

-- 4. Keep extensions out of the API schema.
alter extension pg_trgm set schema extensions;
