import Link from "next/link";
import { getMe } from "@/lib/me";
import { myReactions, normalizePosts, POST_SELECT } from "@/lib/posts";
import Composer from "./Composer";
import Icon from "./Icon";
import PostCard from "./PostCard";

/**
 * The community side of an event: which chapter is hosting it, and the posts
 * and photographs members have attached to it. Memories shared here are
 * ordinary posts, so they also reach the feed and can be put on The Wall.
 */
export default async function EventCommunity({ eventId }: { eventId: string }) {
  const { supabase, me } = await getMe();
  const isAdmin = me?.role === "admin" && !me.suspended_at;
  const verified = Boolean(me && !me.suspended_at && (me.verification_status === "verified" || isAdmin));

  const { data: event } = await supabase
    .from("events")
    .select("event_date, chapter:chapters(name, slug)")
    .eq("id", eventId)
    .maybeSingle();
  const chapter = Array.isArray(event?.chapter) ? event?.chapter[0] : event?.chapter;
  const isPast = event ? new Date(event.event_date).getTime() < Date.now() : false;

  const { data } = verified
    ? await supabase.from("posts").select(POST_SELECT).eq("event_id", eventId).order("created_at", { ascending: false }).limit(20)
    : { data: [] };
  const posts = normalizePosts(data);
  const reactions = me ? await myReactions(supabase, me.id, posts.map((p) => p.id)) : {};

  if (!chapter && !verified) return null;

  return (
    <section aria-labelledby="event-community" className="mx-auto max-w-3xl px-5 pb-20 md:px-10">
      <h2 id="event-community" className="border-b-[1.5px] border-ink pb-2 font-display text-2xl">
        {isPast ? "Memories from this event" : "Talk about this event"}
      </h2>
      {chapter && (
        <p className="mt-4 text-sm">
          Hosted by the{" "}
          <Link href={`/chapters/${chapter.slug}`} className="inline-flex items-center gap-1 font-semibold text-forest underline underline-offset-4">
            <Icon name="map" className="h-4 w-4" />
            {chapter.name} chapter
          </Link>
        </p>
      )}
      {verified && me && (
        <div className="mt-5 flex flex-col gap-5">
          <Composer
            me={me}
            userId={me.id}
            kinds={isPast ? ["memory", "post"] : ["post", "discussion"]}
            defaultKind={isPast ? "memory" : "post"}
            eventId={eventId}
          />
          {posts.map((p) => (
            <PostCard key={p.id} post={p} viewer={{ id: me.id, isAdmin }} myReaction={reactions[p.id] ?? null} />
          ))}
          {posts.length === 0 && (
            <p className="text-sm text-ink/70">
              {isPast ? "Nobody has shared a photo or a story from this one yet." : "No posts about this event yet."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
