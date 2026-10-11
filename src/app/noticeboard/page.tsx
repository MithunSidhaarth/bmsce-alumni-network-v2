import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Wall from "@/components/v2/wall/Wall";
import { getMe } from "@/lib/me";
import type { NoticeCard } from "@/lib/types";

export const metadata: Metadata = {
  title: "The Wall: BMSCE Alumni Network",
  description:
    "The living noticeboard of the BMSCE alumni network: announcements, reunion photographs, achievements and official Instagram posts, pinned in one place.",
};
export const dynamic = "force-dynamic";

export default async function NoticeboardPage() {
  const { supabase, me } = await getMe();
  const isMember = Boolean(me && !me.suspended_at && (me.verification_status === "verified" || me.role === "admin"));

  // One call returns only what this viewer may see: signed-out visitors get
  // official content; verified members also get what the community pinned.
  const [{ data, error }, { data: settings }] = await Promise.all([
    supabase.rpc("noticeboard_feed", { p_limit: 120 }),
    supabase.from("site_settings").select("ig_handle").eq("id", 1).maybeSingle(),
  ]);

  return (
    <>
      <Nav />
      <noscript>
        <style>{`.wall-item{opacity:1}`}</style>
      </noscript>
      <main>
        {/* A failed query must never take the page down: show a bare wall. */}
        <Wall cards={error ? [] : ((data ?? []) as NoticeCard[])} isMember={isMember} isAdmin={Boolean(me && me.role === "admin" && !me.suspended_at)} handle={settings?.ig_handle ?? "bmscealumni"} />
      </main>
      <Footer />
    </>
  );
}
