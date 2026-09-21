import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseCookieOptions } from "./cookieOptions";

// Refreshes the Supabase auth session on every matched request and forwards
// the updated cookies to both the browser and downstream server components.
// `requestHeaders`, when passed, carries the per-request CSP nonce (see
// middleware.ts) and is threaded onto the forwarded request so Next.js can
// pick it up when rendering.
export async function updateSession(
  request: NextRequest,
  requestHeaders?: Headers
) {
  let supabaseResponse = NextResponse.next({
    request: requestHeaders ? { headers: requestHeaders } : request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: requestHeaders ? { headers: requestHeaders } : request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and getClaims().
  // getClaims() verifies the JWT locally (no Auth-server round trip when the
  // project uses asymmetric signing keys) and still refreshes an expired
  // session. Pages that need the user object call getUser() themselves.
  await supabase.auth.getClaims();

  return supabaseResponse;
}
