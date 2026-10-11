import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

/**
 * Scheduled routes are called by Vercel Cron, which sends
 * `Authorization: Bearer <CRON_SECRET>`. Anything else gets a 401.
 */
export function isCronRequest(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 16) return false;
  const got = request.headers.get("authorization") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(`Bearer ${expected}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * A database client with no user session. On its own it can do nothing
 * privileged: scheduled jobs pass APP_SERVER_SECRET to specific database
 * functions, which verify its hash before doing any work.
 */
export function serverClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function serverSecret(): string | null {
  const s = process.env.APP_SERVER_SECRET;
  return s && s.length >= 32 ? s : null;
}
