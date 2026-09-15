"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PageResult = {
  kind: "page";
  label: string;
  hint: string;
  href: string;
};
type PersonResult = {
  kind: "person";
  label: string;
  hint: string;
  href: string;
};
type Result = PageResult | PersonResult;

function PAGES(opts: { signedIn: boolean; isAdmin: boolean }): PageResult[] {
  const pages: PageResult[] = [
    { kind: "page", label: "Home", hint: "Overview", href: "/" },
    { kind: "page", label: "About", hint: "Our story", href: "/about" },
    { kind: "page", label: "Chapters", hint: "Find your city", href: "/chapters" },
    { kind: "page", label: "Directory", hint: "Search alumni", href: "/directory" },
    { kind: "page", label: "Events", hint: "What's coming up", href: "/events" },
    { kind: "page", label: "Newsletter", hint: "Past editions", href: "/newsletter" },
    { kind: "page", label: "Gallery", hint: "Moments from the network", href: "/gallery" },
  ];
  if (opts.signedIn) {
    pages.push({
      kind: "page",
      label: "Community",
      hint: "Ask the network",
      href: "/community",
    });
    pages.push({
      kind: "page",
      label: "My profile",
      hint: "Your details",
      href: "/profile",
    });
  }
  if (opts.isAdmin) {
    pages.push({
      kind: "page",
      label: "Admin dashboard",
      hint: "Manage the network",
      href: "/admin",
    });
  }
  return pages;
}

export default function CommandPalette({
  open,
  onClose,
  signedIn,
  isAdmin,
}: {
  open: boolean;
  onClose: () => void;
  signedIn: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<PersonResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const pages = useMemo(
    () => PAGES({ signedIn, isAdmin }),
    [signedIn, isAdmin]
  );

  const pageMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages.slice(0, 6);
    return pages.filter(
      (p) =>
        p.label.toLowerCase().includes(q) || p.hint.toLowerCase().includes(q)
    );
  }, [pages, query]);

  const results: Result[] = [...pageMatches, ...people];

  // Reset on open, focus the input.
  useEffect(() => {
    if (open) {
      setQuery("");
      setPeople([]);
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Live alumni search — directory profiles are public for verified alumni,
  // so this works whether or not the visitor is signed in.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setPeople([]);
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, current_city, company")
        .eq("user_type", "alumni")
        .eq("verification_status", "verified")
        .ilike("full_name", `%${q}%`)
        .limit(6)
        .returns<
          {
            id: string;
            full_name: string | null;
            current_city: string | null;
            company: string | null;
          }[]
        >();
      if (!active || !data) return;
      setPeople(
        data.map((p) => ({
          kind: "person",
          label: p.full_name || "Member",
          hint: [p.company, p.current_city].filter(Boolean).join(" · ") || "Alumni",
          href: `/directory/${p.id}`,
        }))
      );
    }, 220);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, people.length]);

  const go = (r: Result) => {
    onClose();
    router.push(r.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[activeIndex];
      if (r) go(r);
    }
  };

  // Keep the active row in view during keyboard navigation.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-ink/60 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-gold/30 bg-ivory shadow-[0_30px_80px_-20px_rgba(26,20,18,0.5)] motion-safe:animate-fade-up"
      >
        <div className="flex items-center gap-3 border-b border-gold/25 px-5 py-4">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 text-ink/40"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
            <path d="M20 20l-4.3-4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, alumni…"
            className="w-full bg-transparent font-sans text-base text-ink placeholder:text-ink/40 focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-gold/40 px-1.5 py-0.5 font-sans text-[10px] font-medium text-ink/45 sm:block">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 && (
            <p className="px-5 py-8 text-center font-sans text-sm text-ink/50">
              No matches for &ldquo;{query}&rdquo;.
            </p>
          )}

          {pageMatches.length > 0 && (
            <p className="px-5 pb-1 pt-2 font-sans text-[10px] font-medium uppercase tracking-[0.18em] text-ink/40">
              Pages
            </p>
          )}
          {pageMatches.map((r, i) => (
            <ResultRow
              key={`page-${r.href}`}
              result={r}
              active={i === activeIndex}
              onHover={() => setActiveIndex(i)}
              onSelect={() => go(r)}
            />
          ))}

          {people.length > 0 && (
            <p className="px-5 pb-1 pt-3 font-sans text-[10px] font-medium uppercase tracking-[0.18em] text-ink/40">
              People
            </p>
          )}
          {people.map((r, i) => {
            const idx = pageMatches.length + i;
            return (
              <ResultRow
                key={`person-${r.href}`}
                result={r}
                active={idx === activeIndex}
                onHover={() => setActiveIndex(idx)}
                onSelect={() => go(r)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ResultRow({
  result,
  active,
  onHover,
  onSelect,
}: {
  result: Result;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onClick={onSelect}
      className={`flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left transition-colors ${
        active ? "bg-oxblood/[0.06]" : ""
      }`}
    >
      <span>
        <span className="block font-sans text-sm font-medium text-ink">
          {result.label}
        </span>
        <span className="block font-sans text-xs text-ink/50">
          {result.hint}
        </span>
      </span>
      {active && (
        <span className="font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-accent">
          Enter ↵
        </span>
      )}
    </button>
  );
}
