import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/nav";

// Hosts allowed to appear in the post-login redirect base, checked against
// the parsed X-Forwarded-Host header with any port stripped — never a
// substring/prefix match on the raw header, so lookalikes like
// "evil.vercel.app.attacker.com" or "notvercel.app" can't slip through.
const ALLOWED_HOSTS = [
  new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").hostname,
  // Add the production custom domain here once one is configured, e.g.:
  // "alumni.bmsce.ac.in",
];

function isAllowedHost(host: string) {
  // Preview deploys use generated *.vercel.app subdomains — block them and
  // login breaks on every preview branch.
  return ALLOWED_HOSTS.includes(host) || host.endsWith(".vercel.app");
}

// OAuth redirect target. Exchanges the code for a session, then sends the user
// to onboarding (first login) or their intended destination.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Sanitized so a crafted callback URL can't redirect off-site.
  const next = safeNextPath(searchParams.get("next"));
  const type = searchParams.get("type");
  // The student/alumni entry point chosen on the login screen — carried
  // through the callback instead of localStorage (which persists across
  // sessions on a shared computer and is trivially editable from devtools).
  // Re-validated here against a strict whitelist before it's ever trusted.
  const asParam = searchParams.get("as");
  const signupAs = asParam === "student" || asParam === "alumni" ? asParam : null;

  // Behind a proxy (Vercel/Netlify/etc.) `origin` can be an internal host or
  // http. Honour the forwarded host so post-login redirects land on the real
  // public domain instead of localhost / an internal URL — but only if it's
  // on the allowlist. x-forwarded-host is attacker-controllable; trusting it
  // unconditionally lets someone redirect users off-site right after login.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const isLocal = process.env.NODE_ENV === "development";

  const originHost = new URL(origin).hostname;
  let forwardedHostname: string | null = null;
  if (forwardedHost) {
    try {
      forwardedHostname = new URL(`http://${forwardedHost}`).hostname;
    } catch {
      forwardedHostname = null;
    }
  }
  const trustedForwardedHost =
    forwardedHostname &&
    (forwardedHostname === originHost || isAllowedHost(forwardedHostname))
      ? forwardedHost
      : null;

  const base =
    !isLocal && trustedForwardedHost
      ? `${forwardedProto}://${trustedForwardedHost}`
      : origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Password recovery: session is established; send them straight to the
      // reset form regardless of onboarding state.
      if (type === "recovery") {
        return NextResponse.redirect(`${base}${next}`);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarded")
          .eq("id", user.id)
          .single();

        const dest = profile?.onboarded
          ? next
          : `/onboarding${signupAs ? `?as=${signupAs}` : ""}`;
        return NextResponse.redirect(`${base}${dest}`);
      }
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth`);
}
