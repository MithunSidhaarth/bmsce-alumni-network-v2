// Shared cookie options for every Supabase client (server, browser, and the
// middleware's session-refresh client) — found during a security audit that
// none of the three explicitly set `secure`, relying only on @supabase/ssr's
// default (which doesn't set it either, so the cookie would be sent over a
// plain-http connection to the same host if one were ever made — HSTS in
// next.config.ts already blocks that in practice, but setting it explicitly
// here removes the dependency on that being the only line of defense).
//
// `httpOnly` is deliberately left at @supabase/ssr's default (false): the
// browser client (client.ts) reads the session cookie directly via
// document.cookie to hydrate client components — that's the actual
// @supabase/ssr architecture (see their own Next.js integration docs), not
// an oversight here. Making it httpOnly would break every "use client"
// component that reads auth state. The compensating control is that this
// app has zero dangerouslySetInnerHTML and no other injection sink that
// could run attacker JS in the first place (verified during the same audit).
//
// `secure: false` in development so cookies still work over plain
// http://localhost.
export const supabaseCookieOptions = {
  secure: process.env.NODE_ENV === "production",
};
