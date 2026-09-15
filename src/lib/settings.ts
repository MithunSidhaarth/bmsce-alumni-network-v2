// Reads the admin-controlled `careers_enabled` flag. Uses a plain REST fetch
// so it works in both server components and edge middleware, and defaults to
// `false` on any error (including before the migration has been run).
export async function getCareersEnabled(): Promise<boolean> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return false;

    const res = await fetch(
      `${url}/rest/v1/site_settings?select=careers_enabled&limit=1`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      }
    );
    if (!res.ok) return false;
    const rows = (await res.json()) as { careers_enabled?: boolean }[];
    return rows?.[0]?.careers_enabled === true;
  } catch {
    return false;
  }
}
