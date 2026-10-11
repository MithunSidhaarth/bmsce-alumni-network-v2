import Link from "next/link";
import type { Post, ReactionKind } from "@/lib/types";
import { KIND_LABEL } from "@/lib/posts";
import { seeded, timeAgo } from "@/lib/format";
import Avatar from "./Avatar";
import PostActions from "./PostActions";

export type Viewer = { id: string; isAdmin: boolean; leadOf?: string[] };

// Each kind of post is a different piece of paper, so the feed reads like a
// pinboard of mixed things rather than a column of identical cards.
const STAMP: Record<Post["kind"], string> = {
  post: "",
  discussion: "text-forest",
  announcement: "text-tangerine",
  achievement: "text-forest bg-lime border-lime",
  memory: "text-violet",
};

function byline(post: Post) {
  const a = post.author;
  if (!a) return "Former member";
  const bits = [
    a.user_type === "student" ? "Student" : a.graduation_year ? `Batch of ${a.graduation_year}` : "Alumni",
    a.branch,
  ].filter(Boolean);
  return bits.join(" · ");
}

function Media({ media, polaroid }: { media: string[]; polaroid: boolean }) {
  if (media.length === 0) return null;
  if (polaroid) {
    return (
      <div className="mb-4 bg-white p-2 pb-3 shadow-[0_1px_3px_rgb(19_26_21/0.18)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media[0]} alt="" loading="lazy" className="block h-auto max-h-[36rem] w-full object-contain" />
        {media.length > 1 && (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {media.slice(1, 5).map((m) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m} src={m} alt="" loading="lazy" className="aspect-square w-full object-cover" />
            ))}
          </div>
        )}
      </div>
    );
  }
  const cols = media.length === 1 ? "grid-cols-1" : "grid-cols-2";
  return (
    <div className={`mt-4 grid gap-1.5 overflow-hidden rounded ${cols}`}>
      {media.slice(0, 4).map((m, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={m}
          src={m}
          alt=""
          loading="lazy"
          className={`w-full object-cover ${media.length === 1 ? "max-h-[30rem]" : "aspect-square"} ${
            media.length === 3 && i === 0 ? "col-span-2 aspect-[2/1]" : ""
          }`}
        />
      ))}
    </div>
  );
}

export default function PostCard({
  post,
  viewer,
  myReaction,
  full = false,
}: {
  post: Post;
  viewer: Viewer;
  myReaction: ReactionKind | null;
  /** The thread page shows the whole body; lists clamp it. */
  full?: boolean;
}) {
  const href = `/community/${post.id}`;
  const isMemory = post.kind === "memory";
  const tilt = isMemory ? (seeded(post.id) - 0.5) * 1.6 : 0;
  const canModerate = viewer.isAdmin || (post.chapter_id ? (viewer.leadOf ?? []).includes(post.chapter_id) : false);
  const long = post.body.length > 420;

  return (
    <article
      className={`sheet px-5 pb-3 pt-5 sm:px-6 ${post.kind === "discussion" ? "sheet-ruled" : ""} ${
        post.is_hidden ? "opacity-60" : ""
      }`}
      style={tilt ? { transform: `rotate(${tilt.toFixed(2)}deg)` } : undefined}
    >
      {post.kind === "announcement" && <span className="tape tape-left" aria-hidden="true" />}
      {post.kind === "achievement" && (
        <span className="absolute inset-y-0 left-0 w-1.5 rounded-l-[3px] bg-lime" aria-hidden="true" />
      )}
      {post.is_pinned && <span className="pin" aria-hidden="true" />}

      <header className="flex items-start gap-3">
        {post.author ? (
          <Link href={`/directory/${post.author.id}`} className="shrink-0" aria-label={post.author.full_name ?? "Member"}>
            <Avatar name={post.author.full_name} src={post.author.photo_url} size={42} />
          </Link>
        ) : (
          <Avatar name={null} size={42} />
        )}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 text-[0.9375rem] leading-tight">
            {post.author ? (
              <Link href={`/directory/${post.author.id}`} className="font-semibold hover:underline">
                {post.author.full_name ?? "Member"}
              </Link>
            ) : (
              <span className="font-semibold text-ink/60">Former member</span>
            )}
            {post.chapter && (
              <Link href={`/chapters/${post.chapter.slug}`} className="text-sm text-ink/60 hover:text-ink hover:underline">
                in {post.chapter.name}
              </Link>
            )}
          </p>
          <p className="mt-1 text-[0.8125rem] text-ink/55">
            {byline(post)} ·{" "}
            <Link href={href} className="hover:underline">
              <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
            </Link>
            {post.updated_at && " · edited"}
            {post.is_hidden && " · hidden by a moderator"}
          </p>
        </div>
        {post.kind !== "post" && <span className={`stamp mt-0.5 ${STAMP[post.kind]}`}>{KIND_LABEL[post.kind]}</span>}
      </header>

      <div className="mt-4">
        {isMemory && <Media media={post.media} polaroid />}
        {post.title && (
          <h2 className="font-display text-[1.35rem] leading-[1.12] sm:text-2xl">
            {full ? post.title : <Link href={href} className="hover:underline">{post.title}</Link>}
          </h2>
        )}
        <p
          className={`whitespace-pre-wrap break-words text-[0.9688rem] leading-relaxed text-ink/90 ${post.title ? "mt-2" : ""} ${
            full ? "" : "line-clamp-6"
          }`}
        >
          {post.body}
        </p>
        {!full && long && (
          <Link href={href} className="mt-1 inline-block text-sm font-semibold text-forest hover:underline">
            Read the rest
          </Link>
        )}
        {!isMemory && <Media media={post.media} polaroid={false} />}
        {post.tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <li key={t}>
                <Link
                  href={`/community?tag=${encodeURIComponent(t)}`}
                  className="label-mono rounded-sm bg-ink/[0.06] px-2 py-1 text-ink/70 hover:bg-lime hover:text-ink"
                >
                  {t}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PostActions
        postId={post.id}
        href={href}
        reactionCount={post.reaction_count}
        commentCount={post.comment_count}
        myReaction={myReaction}
        isOwn={post.author_id === viewer.id}
        canModerate={canModerate}
        isAdmin={viewer.isAdmin}
        isPinned={post.is_pinned}
        isHidden={post.is_hidden}
      />
    </article>
  );
}
