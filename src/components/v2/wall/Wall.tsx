"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import type { NoticeCard } from "@/lib/types";
import { longDate, seeded, stampDate } from "@/lib/format";
import Avatar from "../Avatar";
import Icon from "../Icon";

// ---------------------------------------------------------------------------
// The Wall: a green noticeboard of real, stored content. Every card is a
// different physical thing (a print, a typed notice, a sticky note, a ticket)
// with its own stable tilt, so the board looks curated and slightly chaotic
// but is identical on the server, in the browser, and on every visit.
// ---------------------------------------------------------------------------

type Shape = "print" | "notice" | "sticky" | "ticket";
type FilterKey = "all" | "instagram" | "notices" | "memories" | "events";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "instagram", label: "Instagram" },
  { key: "notices", label: "Announcements" },
  { key: "memories", label: "Memories" },
  { key: "events", label: "Events" },
];

const NOTE_COLOURS = ["#c8f53c", "#ffd9c7", "#e2dbff", "#fff3a8"];
const PIN_COLOURS = ["#e23a2e", "#6a4cff", "#ff5a1f", "#131a15"];

type View = {
  card: NoticeCard;
  shape: Shape;
  group: Exclude<FilterKey, "all">;
  image: string | null;
  title: string | null;
  text: string;
  date: string;
  year: number;
  official: boolean;
  byline: string | null;
  href: { url: string; label: string; external: boolean } | null;
};

function describe(card: NoticeCard): View {
  const base = { card, date: card.date, year: new Date(card.date).getFullYear() };
  if (card.source === "instagram" && card.instagram) {
    const ig = card.instagram;
    return {
      ...base,
      shape: "print",
      group: "instagram",
      image: ig.image,
      title: null,
      text: ig.caption ?? "",
      official: true,
      byline: null,
      href: ig.permalink ? { url: ig.permalink, label: "View on Instagram", external: true } : null,
    };
  }
  if (card.source === "event" && card.event) {
    return {
      ...base,
      shape: "ticket",
      group: "events",
      image: card.event.image,
      title: card.event.title,
      text: card.event.location ?? "",
      date: card.event.date,
      year: new Date(card.event.date).getFullYear(),
      official: true,
      byline: null,
      href: { url: `/events/${card.event.id}`, label: "Event details", external: false },
    };
  }
  if (card.source === "photo" && card.photo) {
    return {
      ...base,
      shape: "print",
      group: "memories",
      image: card.photo.image,
      title: null,
      text: card.photo.caption ?? "",
      official: true,
      byline: "From the gallery",
      href: { url: "/gallery", label: "Open the gallery", external: false },
    };
  }
  if (card.source === "post" && card.post) {
    const p = card.post;
    const image = p.media[0] ?? null;
    const isNotice = p.kind === "announcement";
    return {
      ...base,
      shape: image ? "print" : isNotice || p.body.length > 220 ? "notice" : "sticky",
      group: isNotice ? "notices" : "memories",
      image,
      title: p.title,
      text: p.body,
      official: false,
      byline: [p.author ?? "A member", p.chapter].filter(Boolean).join(" · "),
      href: { url: `/community/${p.id}`, label: "Open the post", external: false },
    };
  }
  // Manual card written by an admin.
  return {
    ...base,
    shape: card.image ? "print" : "notice",
    group: "notices",
    image: card.image,
    title: card.title,
    text: card.body ?? "",
    official: true,
    byline: "BMSCE Alumni Network",
    href: card.link ? { url: card.link, label: "Read more", external: /^https?:/.test(card.link) } : null,
  };
}

function Attribution({ v, compact = false }: { v: View; compact?: boolean }) {
  if (v.card.source === "instagram") {
    return (
      <span className="label-mono inline-flex items-center gap-1 text-ink/60">
        <Icon name="instagram" className="h-3.5 w-3.5" />
        {compact ? "Instagram" : "Official Instagram"}
      </span>
    );
  }
  if (v.card.source === "post" && v.card.post) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-ink/70">
        <Avatar name={v.card.post.author} src={v.card.post.author_photo} size={18} />
        <span className="truncate">{v.byline}</span>
      </span>
    );
  }
  return <span className="label-mono text-ink/60">{v.byline ?? "Alumni Network"}</span>;
}

export default function Wall({ cards, isMember, handle }: { cards: NoticeCard[]; isMember: boolean; handle: string }) {
  const views = useMemo(() => cards.map(describe), [cards]);
  const years = useMemo(() => [...new Set(views.map((v) => v.year))].sort((a, b) => b - a), [views]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [year, setYear] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const board = useRef<HTMLUListElement | null>(null);
  const dialog = useRef<HTMLDialogElement | null>(null);

  const shown = useMemo(
    () => views.filter((v) => (filter === "all" || v.group === filter) && (year === null || v.year === year)),
    [views, filter, year]
  );
  const openIndex = shown.findIndex((v) => v.card.id === open);
  const current = openIndex >= 0 ? shown[openIndex] : null;

  // Cards drop onto the board as they scroll into view, a few at a time.
  useEffect(() => {
    const root = board.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-card]"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    let batch = 0;
    let reset: number | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.style.setProperty("--delay", `${Math.min(batch, 9) * 70}ms`);
          batch += 1;
          el.classList.add("is-in");
          io.unobserve(el);
        });
        window.clearTimeout(reset);
        reset = window.setTimeout(() => (batch = 0), 220);
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    items.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      window.clearTimeout(reset);
    };
  }, [shown]);

  // Taking a card off the wall: where the browser supports it, the card
  // itself grows into the reading view (a shared-element transition).
  const show = useCallback((id: string | null, from?: HTMLElement | null) => {
    const apply = () => flushSync(() => setOpen(id));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
    if (!doc.startViewTransition || reduce || !from) return apply();
    from.style.viewTransitionName = "notice-open";
    const t = doc.startViewTransition(() => {
      from.style.viewTransitionName = "";
      apply();
    });
    t.finished.finally(() => (from.style.viewTransitionName = ""));
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (current && !d.open) d.showModal();
    if (!current && d.open) d.close();
  }, [current]);

  const step = (dir: 1 | -1) => {
    if (openIndex < 0) return;
    const next = shown[(openIndex + dir + shown.length) % shown.length];
    setOpen(next.card.id);
  };

  return (
    <div className="board min-h-[calc(100dvh-var(--topbar))] px-4 pb-24 pt-8 md:px-8 md:pt-12">
      <header className="mx-auto max-w-[1400px]">
        <p className="label-mono text-ink/75">BMSCE Alumni Network · the noticeboard</p>
        <h1 className="mt-3 flex flex-wrap items-end gap-x-[0.22em] font-display text-[clamp(4rem,17vw,13rem)] font-extrabold leading-[0.78] tracking-[-0.06em] text-ink" aria-label="The Wall">
          {["The", "Wall"].map((word, w) => (
            <span key={word} className="flex" aria-hidden="true">
              {word.split("").map((ch, i) => (
                <span
                  key={i}
                  className="wall-letter inline-block"
                  style={{
                    ["--tilt" as string]: `${((seeded(word + i) - 0.5) * 7).toFixed(1)}deg`,
                    animationDelay: `${(w * 3 + i) * 70}ms`,
                  }}
                >
                  {ch}
                </span>
              ))}
            </span>
          ))}
          <span
            className="stickynote mb-[0.12em] ml-2 hidden rotate-6 px-3 py-2 text-left align-top sm:inline-block"
            style={{ ["--note" as string]: "#fff3a8" }}
            aria-hidden="true"
          >
            <span className="hand block text-[1.5rem] leading-none tracking-normal">{cards.length} things</span>
            <span className="hand block text-[1.15rem] leading-none tracking-normal">pinned here</span>
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-ink/90">
          Announcements, reunion photographs, achievements and everything the alumni association
          posts on Instagram, pinned in one place. Pick something up to read it.
        </p>

        <div className="mt-7 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div role="group" aria-label="Show" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 no-scrollbar md:mx-0 md:flex-wrap md:px-0">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
                className="chip wall-chip"
              >
                {f.label}
              </button>
            ))}
          </div>
          {years.length > 1 && (
            <div role="group" aria-label="Year" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 no-scrollbar md:mx-0 md:px-0 lg:ml-auto">
              <button type="button" aria-pressed={year === null} onClick={() => setYear(null)} className="chip wall-chip">
                All years
              </button>
              {years.map((y) => (
                <button key={y} type="button" aria-pressed={year === y} onClick={() => setYear(y)} className="chip wall-chip font-mono">
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink/80">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="instagram" className="h-4 w-4" /> Official posts from @{handle}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="user" className="h-4 w-4" /> Posts from members carry their name
          </span>
          {!isMember && (
            <Link href="/login?next=/noticeboard" className="font-semibold underline underline-offset-4">
              Sign in to see what members have pinned
            </Link>
          )}
        </p>
      </header>

      {shown.length === 0 ? (
        <div className="mx-auto mt-16 max-w-md -rotate-2 bg-paper px-7 py-9 text-center shadow-[var(--shadow-lift)]">
          <span className="pin" aria-hidden="true" />
          <p className="hand text-[1.9rem] text-forest">{cards.length === 0 ? "A bare wall" : "Nothing pinned under this"}</p>
          <p className="mt-2 text-sm text-ink/70">
            {cards.length === 0
              ? "Nothing has been pinned yet. Announcements, pinned posts and Instagram imports will appear here as they arrive."
              : "Try another filter or year."}
          </p>
        </div>
      ) : (
        <ul
          ref={board}
          key={`${filter}-${year}`}
          className="mx-auto mt-12 max-w-[1400px] columns-1 gap-7 sm:columns-2 lg:columns-3 2xl:columns-4"
        >
          {shown.map((v, i) => {
            const id = v.card.id;
            const tilt = ((seeded(id) - 0.5) * 6.4).toFixed(2);
            const nudge = Math.round((seeded(id, 7) - 0.5) * 14);
            const lift = seeded(id, 3) > 0.62 ? -18 : 0;
            const depth = 1 + Math.floor(seeded(id, 11) * 3);
            const taped = v.shape === "print" && seeded(id, 5) > 0.5;
            const sway = i % 7 === 3;
            return (
              <li
                key={id}
                data-card
                className={`wall-item depth-${depth} mb-8 break-inside-avoid`}
                style={{ marginTop: lift, paddingInline: 6 }}
              >
                <button
                  type="button"
                  onClick={(e) => show(id, e.currentTarget)}
                  aria-haspopup="dialog"
                  aria-label={`Open: ${(v.title ?? v.text ?? "Photograph").slice(0, 80)}`}
                  className={`wall-card pinned relative block w-full text-left ${sway ? "wall-sway" : ""}`}
                  style={{ ["--tilt" as string]: `${tilt}deg`, marginLeft: nudge }}
                >
                  {taped ? (
                    <span className={`tape ${i % 2 ? "tape-lime" : ""}`} aria-hidden="true" />
                  ) : (
                    <span className="pin wall-pin" style={{ ["--pin" as string]: PIN_COLOURS[Math.floor(seeded(id, 9) * PIN_COLOURS.length)] }} aria-hidden="true" />
                  )}

                  {v.shape === "print" && (
                    <span className="block bg-white p-2.5 pb-3 shadow-[0_16px_26px_-14px_rgb(0_0_0/0.6)]">
                      {v.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.image} alt="" loading="lazy" decoding="async" className="aspect-[4/5] w-full bg-ivory-dim object-cover" />
                      )}
                      {(v.title || v.text) && (
                        <span className="mt-2.5 line-clamp-2 block px-0.5 text-[0.8125rem] leading-snug text-ink/85">
                          {v.title ?? v.text}
                        </span>
                      )}
                      <span className="mt-2 flex items-center justify-between gap-2 px-0.5">
                        <Attribution v={v} compact />
                        <span className="label-mono shrink-0 text-ink/50">{stampDate(v.date)}</span>
                      </span>
                    </span>
                  )}

                  {v.shape === "notice" && (
                    <span className="block bg-paper px-5 pb-5 pt-7 shadow-[0_16px_26px_-14px_rgb(0_0_0/0.6)]">
                      <span className="stamp text-tangerine">{v.group === "notices" ? "Notice" : "From a member"}</span>
                      {v.title && <span className="mt-3 block font-display text-[1.45rem] font-bold leading-[1.05]">{v.title}</span>}
                      <span className="mt-2.5 line-clamp-6 block whitespace-pre-line text-sm leading-relaxed text-ink/80">{v.text}</span>
                      <span className="rule-dashed my-3 block" />
                      <span className="flex items-center justify-between gap-2">
                        <Attribution v={v} />
                        <span className="label-mono shrink-0 text-ink/50">{stampDate(v.date)}</span>
                      </span>
                    </span>
                  )}

                  {v.shape === "sticky" && (
                    <span
                      className="stickynote block px-5 pb-5 pt-7"
                      style={{ ["--note" as string]: NOTE_COLOURS[Math.floor(seeded(id, 13) * NOTE_COLOURS.length)] }}
                    >
                      {v.title && <span className="block font-display text-lg font-bold leading-tight">{v.title}</span>}
                      <span className={`line-clamp-6 block ${v.text.length < 120 ? "hand text-[1.55rem] leading-[1.08]" : "mt-1 text-sm leading-relaxed"}`}>
                        {v.text}
                      </span>
                      <span className="mt-4 flex items-center justify-between gap-2">
                        <Attribution v={v} />
                        <span className="label-mono shrink-0 text-ink/55">{stampDate(v.date)}</span>
                      </span>
                    </span>
                  )}

                  {v.shape === "ticket" && (
                    <span className="flex overflow-hidden rounded-md bg-paper shadow-[0_16px_26px_-14px_rgb(0_0_0/0.6)]">
                      <span className="flex w-20 shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-ink/30 bg-tangerine py-5 text-white">
                        <span className="font-display text-3xl font-extrabold leading-none">
                          {new Date(v.date).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit" })}
                        </span>
                        <span className="label-mono mt-1">
                          {new Date(v.date).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", month: "short" }).toUpperCase()}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 px-4 py-4">
                        <span className="label-mono text-tangerine">Admit one · Event</span>
                        <span className="mt-1 block font-display text-xl font-bold leading-tight">{v.title}</span>
                        {v.text && <span className="mt-1 block truncate text-xs text-ink/60">{v.text}</span>}
                      </span>
                    </span>
                  )}

                  {v.card.pinned && (
                    <span className="stamp absolute -right-2 -top-3 rotate-6 border-ink bg-lime text-ink">Pinned</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* The reading view. A native dialog: focus is trapped, Esc closes. */}
      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === e.currentTarget && show(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        aria-labelledby="notice-title"
        className="wall-dialog m-auto w-[min(94vw,62rem)] max-w-none bg-transparent p-0 backdrop:bg-ink/75"
      >
        {current && (
          <article className="relative grid max-h-[88dvh] overflow-hidden bg-paper shadow-[var(--shadow-lift)] md:grid-cols-[1.1fr_1fr]" style={{ viewTransitionName: "notice-open" }}>
            {current.image && (
              <div className="flex max-h-[42dvh] items-center justify-center bg-ink md:max-h-[88dvh]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={current.image} alt="" className="max-h-[42dvh] w-full object-contain md:max-h-[88dvh]" />
              </div>
            )}
            <div className={`flex min-h-0 flex-col overflow-y-auto px-6 pb-6 pt-7 ${current.image ? "" : "md:col-span-2 md:mx-auto md:max-w-2xl"}`}>
              <p className="flex items-center justify-between gap-3">
                <span className="stamp text-tangerine">
                  {current.card.source === "instagram"
                    ? "Instagram"
                    : current.group === "events"
                    ? "Event"
                    : current.official
                    ? "Notice"
                    : "From a member"}
                </span>
                <time dateTime={current.date} className="label-mono text-ink/55">
                  {longDate(current.date)}
                </time>
              </p>
              <h2 id="notice-title" className={`mt-4 font-display text-2xl leading-tight ${current.title ? "" : "sr-only"}`}>
                {current.title ?? "Pinned item"}
              </h2>
              {current.text && (
                <p className="mt-3 whitespace-pre-wrap break-words text-[0.9688rem] leading-relaxed text-ink/85">{current.text}</p>
              )}
              <div className="mt-auto pt-6">
                <hr className="rule-dashed mb-4" />
                <p className="flex flex-wrap items-center justify-between gap-3">
                  <Attribution v={current} />
                  {current.href &&
                    (current.href.external ? (
                      <a href={current.href.url} target="_blank" rel="noreferrer" className="btn btn-sm">
                        {current.href.label} <Icon name="arrow" className="h-4 w-4" />
                      </a>
                    ) : (
                      <Link href={current.href.url} className="btn btn-sm">
                        {current.href.label} <Icon name="arrow" className="h-4 w-4" />
                      </Link>
                    ))}
                </p>
                {current.card.source === "instagram" && (
                  <p className="mt-3 text-xs text-ink/50">
                    Imported from the official @{handle} Instagram account. The original post is the source of record.
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => show(null)}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-ink/20 bg-paper/95 hover:bg-lime"
            >
              <Icon name="x" />
            </button>
            {shown.length > 1 && (
              <div className="absolute bottom-3 left-3 flex gap-2">
                <button type="button" onClick={() => step(-1)} aria-label="Previous" className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/20 bg-paper/95 hover:bg-lime">
                  <Icon name="back" />
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Next" className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/20 bg-paper/95 hover:bg-lime">
                  <Icon name="arrow" />
                </button>
              </div>
            )}
          </article>
        )}
      </dialog>
    </div>
  );
}
