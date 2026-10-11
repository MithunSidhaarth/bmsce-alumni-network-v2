import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Instagram importer.
//
// Uses Meta's official Instagram API. The account must be a professional
// (Business or Creator) account and the organisation must authorise access:
//
//   A. "Instagram API with Instagram Login": a long-lived user token with the
//      instagram_business_basic permission. Host graph.instagram.com, the
//      token lasts 60 days and is refreshed here automatically.
//   B. "Instagram API with Facebook Login": a Page-linked account read with a
//      system-user token. Set INSTAGRAM_USER_ID as well; host graph.facebook.com.
//
// Nothing here scrapes instagram.com. Without a token the importer reports
// "not configured" and the site keeps serving what is already stored.
//
// Media files are not copied: Meta's CDN URLs are stored and refreshed on
// every sync (they expire), and each card links to the original permalink.
// ---------------------------------------------------------------------------

const VERSION = process.env.INSTAGRAM_API_VERSION ?? "v23.0";
const FIELDS = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count";
const MAX_ATTEMPTS = 3;

export type SyncTrigger = "schedule" | "manual";
export type SyncResult = {
  status: "success" | "partial" | "failed" | "not_configured";
  fetched: number;
  new: number;
  updated: number;
  failed: number;
  error: string | null;
};

type IgMedia = Record<string, unknown> & { id: string };
type Page = { data?: IgMedia[]; paging?: { next?: string }; error?: { message?: string; code?: number } };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Never let a token reach a log line or an error shown in the dashboard. */
function redact(text: string) {
  return text.replace(/access_token=[^&\s"']+/g, "access_token=[redacted]");
}

class PermanentError extends Error {}

/** GET with retry and exponential backoff on rate limits and server errors. */
async function getJson(url: string): Promise<{ json: Page; attempts: number }> {
  let lastError = "Unknown error";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      const json = (await res.json().catch(() => ({}))) as Page;
      if (res.ok && !json.error) return { json, attempts: attempt };
      lastError = json.error?.message ?? `HTTP ${res.status}`;
      const transient = res.status === 429 || res.status >= 500 || [1, 2, 4, 17, 32, 613].includes(json.error?.code ?? 0);
      if (!transient) throw new PermanentError(lastError);
    } catch (e) {
      if (e instanceof PermanentError) throw e;
      lastError = e instanceof Error ? e.message : String(e);
    }
    if (attempt < MAX_ATTEMPTS) await sleep(600 * 3 ** (attempt - 1));
  }
  throw new Error(`${lastError} (after ${MAX_ATTEMPTS} attempts)`);
}

async function resolveToken(supabase: SupabaseClient, secret: string | null): Promise<string | null> {
  // A token stored through the admin console (and auto-refreshed) wins over
  // the environment variable, which is the simple way to get started.
  if (secret) {
    const { data } = await supabase.rpc("ig_token_get", { p_secret: secret });
    if (typeof data === "string" && data) return data;
  }
  return process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || null;
}

/** Instagram Login tokens last 60 days. Refresh so the schedule never lapses. */
async function refreshToken(supabase: SupabaseClient, secret: string | null, token: string) {
  if (process.env.INSTAGRAM_USER_ID || !secret) return;
  try {
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
      { cache: "no-store", signal: AbortSignal.timeout(15000) }
    );
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (res.ok && json.access_token) {
      await supabase.rpc("ig_token_set", {
        p_secret: secret,
        p_token: json.access_token,
        p_expires_at: new Date(Date.now() + (json.expires_in ?? 5184000) * 1000).toISOString(),
      });
    }
  } catch {
    // A failed refresh is not a failed sync; the current token still works.
  }
}

/**
 * Run one sync. `supabase` is an admin's session for a manual sync, or an
 * anonymous client plus the server secret for the scheduled route. Either
 * way the database function re-checks who is calling.
 */
export async function runInstagramSync(
  supabase: SupabaseClient,
  opts: { trigger: SyncTrigger; secret: string | null; maxItems?: number }
): Promise<SyncResult> {
  const record = async (status: string | null, items: IgMedia[], error: string | null, attempts: number) => {
    const { data, error: rpcError } = await supabase.rpc("ig_ingest", {
      p_secret: opts.secret,
      p_trigger: opts.trigger,
      p_status: status,
      p_items: items,
      p_error: error ? redact(error).slice(0, 900) : null,
      p_attempts: attempts,
    });
    if (rpcError) {
      return { status: "failed", fetched: items.length, new: 0, updated: 0, failed: items.length, error: rpcError.message } as SyncResult;
    }
    return data as SyncResult;
  };

  const token = await resolveToken(supabase, opts.secret);
  if (!token) return record("not_configured", [], "No Instagram access token is configured.", 1);

  const userId = process.env.INSTAGRAM_USER_ID?.trim();
  const base = userId
    ? `https://graph.facebook.com/${VERSION}/${encodeURIComponent(userId)}/media`
    : `https://graph.instagram.com/${VERSION}/me/media`;
  const max = opts.maxItems ?? 60;
  const items: IgMedia[] = [];
  let attempts = 1;

  try {
    let url: string | undefined = `${base}?fields=${FIELDS}&limit=${Math.min(max, 50)}&access_token=${encodeURIComponent(token)}`;
    while (url && items.length < max) {
      const { json, attempts: used }: { json: Page; attempts: number } = await getJson(url);
      attempts = Math.max(attempts, used);
      items.push(...(json.data ?? []));
      url = json.paging?.next;
    }
  } catch (e) {
    // Whatever was fetched before the failure is still stored.
    return record(items.length ? null : "failed", items.slice(0, max), e instanceof Error ? e.message : String(e), MAX_ATTEMPTS);
  }

  const result = await record(null, items.slice(0, max), null, attempts);
  await refreshToken(supabase, opts.secret, token);
  return result;
}
