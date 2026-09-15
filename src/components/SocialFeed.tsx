"use client";

import { useState } from "react";
import Image from "next/image";
import Reveal from "./Reveal";
import type { SocialPost } from "@/lib/types";

const PAGE = 12;

export default function SocialFeed({ posts }: { posts: SocialPost[] }) {
  const [visible, setVisible] = useState(PAGE);

  if (posts.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-gold/40 bg-ivory-dim/40 px-6 py-16 text-center">
        <p className="font-display text-xl italic text-ink">
          No highlights yet.
        </p>
        <p className="mx-auto mt-3 max-w-sm font-sans text-sm leading-relaxed text-ink/65">
          Moments from our Instagram will appear here soon.
        </p>
      </div>
    );
  }

  const shown = posts.slice(0, visible);

  return (
    <div>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((post, i) => (
          <PostCard key={post.id} post={post} index={i} />
        ))}
      </div>

      {visible < posts.length && (
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE)}
            className="inline-flex items-center justify-center rounded-sm border border-gold/50 px-8 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-oxblood transition-colors hover:border-oxblood hover:bg-oxblood hover:text-ivory"
          >
            Load more ({posts.length - visible} left)
          </button>
        </div>
      )}
    </div>
  );
}

export function PostCard({ post, index }: { post: SocialPost; index: number }) {
  const isVideo = post.post_type === "Video";
  const isSidecar = post.post_type === "Sidecar";
  const caption = truncate(post.caption ?? "", 120);
  const href = post.permalink ?? undefined;

  return (
    <Reveal delay={Math.min(index, 8) * 50} className="h-full">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gold/25 bg-ivory-dim/60 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-lg"
      >
        {/* Thumbnail. The 168 imported posts are re-hosted locally, so they get
            next/image optimization; admin-added posts may carry an arbitrary
            remote URL we can't whitelist, so those stay on a plain lazy <img>. */}
        <div className="relative aspect-square overflow-hidden bg-ivory-dim">
          {post.image_url ? (
            post.image_url.startsWith("/") ? (
              <Image
                src={post.image_url}
                alt={caption || "Instagram post"}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.image_url}
                alt={caption || "Instagram post"}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-lg italic text-oxblood/50">
              BMS
            </div>
          )}

          {/* type badge */}
          {(isVideo || isSidecar) && (
            <span className="absolute right-3 top-3 rounded-lg bg-ink/70 px-2 py-1 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-ivory backdrop-blur-sm">
              {isVideo ? "▸ Video" : "▦ Album"}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-5">
          {caption && (
            <p className="font-sans text-sm leading-relaxed text-ink/75">
              {caption}
            </p>
          )}

          <div className="mt-auto flex items-center gap-4 pt-5 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
            <span>♥ {formatCount(post.likes_count)}</span>
            <span>✎ {formatCount(post.comments_count)}</span>
            {post.posted_at && (
              <span className="ml-auto normal-case tracking-normal text-ink/45">
                {formatDate(post.posted_at)}
              </span>
            )}
          </div>

          <span className="mt-4 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-oxblood/70 transition-colors group-hover:text-oxblood">
            View on Instagram →
          </span>
        </div>
      </a>
    </Reveal>
  );
}

function truncate(s: string, n: number) {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n).trimEnd() + "…" : clean;
}

function formatCount(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n ?? 0);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
