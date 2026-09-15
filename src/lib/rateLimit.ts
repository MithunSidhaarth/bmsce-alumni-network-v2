import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Postgres-backed fixed-window rate limit (see check_rate_limit in
 * SETUP_SECURITY_AUDIT.sql). Throws a user-facing error when the bucket is
 * over its limit for the current window.
 *
 * Fails OPEN if the limiter itself errors, so a limiter outage never locks
 * legitimate users out — brute-forceable auth is covered separately by
 * Supabase Auth's built-in rate limits.
 */
export async function rateLimit(
  supabase: SupabaseClient,
  bucket: string,
  max: number,
  windowSeconds: number
): Promise<void> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_bucket: bucket,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) return; // fail open
  if (data === false) {
    throw new Error(
      "You're doing that a bit too fast — please wait a moment and try again."
    );
  }
}
