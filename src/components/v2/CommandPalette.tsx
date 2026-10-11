"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { quickSearch, type QuickHit } from "@/app/search/actions";
import Icon from "./Icon";

type Row = { href: string; title: string; sub: string; group: string };

// Places you can jump to by name, before any search has come back.
const PAGES: Row[] = [
  ["Home", "/", "Your feed"],
  ["Alumni Network", "/directory", "Find people"],
  ["The forum", "/community", "Discussions"],
  ["Chapters", "/chapters", "City and region communities"],
  ["Messages", "/messages", "Your conversations"],
  ["Events", "/events", "What is coming up"],
  ["Blog & Insights", "/blog", "Articles"],
  ["The Wall", "/noticeboard", "The noticeboard"],
  ["Campus map", "/campus", "Find your way around"],
  ["Notifications", "/notifications", "What you missed"],
  ["Your profile", "/profile", "Your ID card and posts"],
  ["Settings and privacy", "/profile/edit", "Edit your details"],
].map(([title, href, sub]) => ({ title, href, sub, group: "Go to" }));

/**
 * Ctrl+K (or Cmd+K, or "/") opens one box that finds people, posts, chapters
 * and articles and jumps to any page. Arrow keys move, Enter opens, Esc closes.
 */
export default function CommandPalette() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<QuickHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("palette:open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("palette:open", onOpen);
    };
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    if (!open) {
      setQ("");
      setHits([]);
      setActive(0);
    }
  }, [open]);

  // Search a moment after the typing pauses; drop answers to older questions.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setBusy(false);
      return;
    }
    let live = true;
    setBusy(true);
    const timer = window.setTimeout(() => {
      quickSearch(term)
        .then((found) => live && setHits(found))
        .catch(() => live && setHits([]))
        .finally(() => live && setBusy(false));
    }, 180);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [q]);

  const rows = useMemo<Row[]>(() => {
    const needle = q.trim().toLowerCase();
    const pages = needle ? PAGES.filter((p) => p.title.toLowerCase().includes(needle) || p.sub.toLowerCase().includes(needle)) : PAGES.slice(0, 7);
    return [...hits, ...pages];
  }, [q, hits]);
  useEffect(() => setActive(0), [rows.length]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  let lastGroup = "";
  return (
    <dialog
      ref={dialog}
      onClose={() => setOpen(false)}
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
      aria-label="Search"
      className="m-auto mt-[12vh] w-[min(94vw,36rem)] max-w-none bg-transparent p-0 backdrop:bg-ink/55 backdrop:backdrop-blur-[2px]"
    >
      <div className="sheet overflow-hidden motion-ok:animate-[var(--animate-rise)]">
        <div className="flex items-center gap-3 border-b border-ink/10 px-4">
          <Icon name="search" className="h-5 w-5 text-ink/45" />
          <label htmlFor="palette-q" className="sr-only">
            Search people, posts, chapters and articles
          </label>
          <input
            id="palette-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            autoComplete="off"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={rows[active] ? `palette-${active}` : undefined}
            placeholder="Search people, posts, chapters, articles"
            className="h-14 min-w-0 flex-1 bg-transparent text-[1.05rem] placeholder:text-ink/40 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                if (rows.length) setActive((a) => (a + (e.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length);
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (rows[active]) go(rows[active].href);
                else if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
              }
            }}
          />
          <kbd className="label-mono hidden rounded border border-ink/20 px-1.5 py-0.5 text-ink/50 sm:block">Esc</kbd>
        </div>

        <ul id="palette-list" role="listbox" aria-label="Results" className="max-h-[min(60vh,26rem)] overflow-y-auto p-1.5">
          {rows.map((row, i) => {
            const heading = row.group !== lastGroup ? row.group : null;
            lastGroup = row.group;
            return (
              <li key={`${row.group}-${row.href}`} role="presentation">
                {heading && <p className="label-mono px-3 pb-1 pt-3 text-ink/45">{heading}</p>}
                <button
                  id={`palette-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onClick={() => go(row.href)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left ${i === active ? "bg-lime text-ink" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-semibold">{row.title}</span>
                    <span className="block truncate text-xs text-ink/60">{row.sub}</span>
                  </span>
                  {i === active && <Icon name="arrow" className="h-4 w-4" />}
                </button>
              </li>
            );
          })}
          {rows.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-ink/60">
              {busy ? "Searching" : "Nothing found. Press Enter to search every post."}
            </li>
          )}
        </ul>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink/10 px-4 py-2 text-xs text-ink/55" aria-live="polite">
          <span>↑ ↓ to move</span>
          <span>Enter to open</span>
          {busy && <span>Searching…</span>}
        </p>
      </div>
    </dialog>
  );
}
