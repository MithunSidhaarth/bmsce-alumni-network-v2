import { createBrowserClient } from "@supabase/ssr";

// Browser (client component) Supabase client. Cookie-aware so it shares the
// session with the server client.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
