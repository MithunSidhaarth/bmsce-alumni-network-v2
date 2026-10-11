import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { fail } from "@/lib/fail";

export type Me = Pick<
  Profile,
  | "id"
  | "full_name"
  | "photo_url"
  | "role"
  | "user_type"
  | "verification_status"
  | "onboarded"
  | "suspended_at"
  | "privacy"
>;

// One auth + profile lookup per request, shared by the root layout and
// whichever page renders under it.
export const getMe = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, me: null };
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, photo_url, role, user_type, verification_status, onboarded, suspended_at, privacy"
    )
    .eq("id", user.id)
    .maybeSingle<Me>();
  return { supabase, user, me: data ?? null };
});

/** Signed in and onboarded, or redirected to the right place. */
export async function requireMember(next: string) {
  const { supabase, user, me } = await getMe();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!me || !me.onboarded) redirect("/onboarding");
  const isAdmin = me.role === "admin" && !me.suspended_at;
  const verified =
    !me.suspended_at && (me.verification_status === "verified" || isAdmin);
  return { supabase, user, me, verified, isAdmin };
}

/** Admin only. Everyone else is sent home; RLS is still the real boundary. */
export async function requireAdmin() {
  const ctx = await requireMember("/admin");
  if (!ctx.isAdmin) redirect("/");
  return ctx;
}

/** For server actions: throws instead of redirecting. */
export async function actionMember() {
  const { supabase, user, me } = await getMe();
  if (!user || !me) throw fail("You need to be signed in.");
  if (me.suspended_at) throw fail("This account is suspended.");
  const isAdmin = me.role === "admin";
  if (me.verification_status !== "verified" && !isAdmin) {
    throw fail("Your account needs to be verified first.");
  }
  return { supabase, user, me, isAdmin };
}

export async function actionAdmin() {
  const ctx = await actionMember();
  if (!ctx.isAdmin) throw fail("Not authorized.");
  return ctx;
}
