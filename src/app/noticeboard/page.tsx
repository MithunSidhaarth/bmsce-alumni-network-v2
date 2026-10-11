import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Wall from "@/components/v2/wall/Wall";
import { getMe } from "@/lib/me";
import type { NoticeCard } from "@/lib/types";

const DESCRIPTION =
  "The living noticeboard of the BMSCE alumni network: announcements, reunion photographs, achievements and official Instagram posts, pinned in one place.";
const ITEM = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ item?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { item } = await searchParams;
  const base: Metadata = { title: "The Wall: BMSCE Alumni Network", description: DESCRIPTION };
  // A link to one pinned item shows that item's own card when it is shared.
  if (!item || !ITEM.test(item)) return base;
  const image = { url: `/noticeboard/card/${item}`, width: 1200, height: 630 };
  return { ...base, openGraph: { title: "Pinned to The Wall", description: DESCRIPTION, images: [image] }, twitter: { card: "summary_large_image", images: [image.url] } };
}

export default async function NoticeboardPage({ searchParams }: Props) {
  const { item } = await searchParams;
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
        <Wall cards={error ? [] : ((data ?? []) as NoticeCard[])} isMember={isMember} isAdmin={Boolean(me && me.role === "admin" && !me.suspended_at)} handle={settings?.ig_handle ?? "bmscealumni"} initialOpen={item && ITEM.test(item) ? item : null} />
      </main>
      <Footer />
    </>
  );
}
