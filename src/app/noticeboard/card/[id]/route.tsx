import { isBlankShot } from "@/data/instagram-blank";
import { ogCard } from "@/lib/og";
import { serverClient } from "@/lib/server/cron";
import type { NoticeCard } from "@/lib/types";

// Share card for one thing pinned to The Wall. Read without a session, so
// only what a signed-out visitor could see anyway is ever drawn.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = /^[0-9a-f-]{36}$/.test(id) ? await serverClient().rpc("noticeboard_feed", { p_limit: 400 }) : { data: null };
  const card = ((data ?? []) as NoticeCard[]).find((c) => c.id === id);
  const image = card ? card.instagram?.image ?? card.photo?.image ?? card.event?.image ?? card.image ?? card.post?.media?.[0] ?? null : null;
  const text = card ? card.title ?? card.event?.title ?? card.post?.title ?? card.instagram?.caption ?? card.post?.body ?? card.photo?.caption ?? card.body ?? "" : "";
  const res = await ogCard({
    eyebrow: card ? `The Wall · ${new Date(card.date).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" })}` : "The Wall",
    title: text.trim() || "Pinned to The Wall",
    note: "pinned to The Wall",
    image: isBlankShot(image) ? null : image,
  });
  res.headers.set("cache-control", "public, max-age=3600, s-maxage=86400");
  return res;
}
