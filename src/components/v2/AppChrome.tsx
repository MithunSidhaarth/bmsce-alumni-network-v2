"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { flushPush } from "@/app/push/actions";
import type { Me } from "@/lib/me";
import Avatar from "./Avatar";
import CommandPalette from "./CommandPalette";
import Icon, { type IconName } from "./Icon";
import Presence from "./Presence";
import ThemeToggle from "./ThemeToggle";

type Item = { label: string; short?: string; href: string; icon: IconName; match: string[] };

// The member navigation, in the order the product defines it.
const ITEMS: Item[] = [
  { label: "Home", href: "/", icon: "home", match: ["/"] },
  { label: "Alumni Network", short: "Network", href: "/directory", icon: "people", match: ["/directory"] },
  { label: "Messages", href: "/messages", icon: "mail", match: ["/messages"] },
  { label: "Events", href: "/events", icon: "calendar", match: ["/events", "/gallery"] },
  { label: "Blog & Insights", short: "Blog", href: "/blog", icon: "book", match: ["/blog"] },
  { label: "Profile", href: "/profile", icon: "user", match: ["/profile"] },
];


function isActive(pathname: string, item: Item) {
  return item.match.some((m) => (m === "/" ? pathname === "/" : pathname.startsWith(m)));
}

function Badge({ n, className = "" }: { n: number; className?: string }) {
  if (n <= 0) return null;
  return (
    <span
      className={`inline-flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-tangerine px-1 font-mono text-[10px] font-medium leading-none text-white ${className}`}
    >
      {n > 99 ? "99+" : n}
      <span className="sr-only"> unread</span>
    </span>
  );
}

export default function AppChrome({ me }: { me: Me }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadDm, setUnreadDm] = useState(0);
  const [unreadNotes, setUnreadNotes] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isAdmin = me.role === "admin";

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const [dm, notes] = await Promise.all([
      supabase.rpc("dm_unread_count"),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null),
    ]);
    if (!dm.error) setUnreadDm(Number(dm.data ?? 0));
    if (!notes.error) setUnreadNotes(notes.count ?? 0);
  }, []);

  // Counts: once on load, again on every navigation, and live over Realtime.
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("touch_activity").then(() => undefined);
    // Installable app and push notifications. Scheduled reminders have no
    // always-on sender, so opening the app also delivers whatever is waiting.
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    if (me.verification_status === "verified") flushPush().catch(() => undefined);
    const channel = supabase
      .channel(`chrome:${me.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${me.id}` },
        () => refresh()
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me.id, me.verification_status, refresh]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };

  const onWall = pathname.startsWith("/noticeboard");
  const firstName = (me.full_name ?? "").trim().split(/\s+/)[0] || "You";

  return (
    <>
      {me.verification_status === "verified" && <Presence meId={me.id} announce={me.privacy?.show_online !== false} />}
      {me.verification_status === "verified" && <CommandPalette />}
      {/* ---- Rail: tablet (icons) and desktop (labels) ---- */}
      <nav
        aria-label="Main"
        className="fixed inset-y-0 left-0 z-40 hidden w-[var(--rail-slim)] flex-col border-r border-ink/10 md:flex rail:w-[var(--rail)]"
      >
        <Link
          href="/"
          className="flex h-[var(--topbar)] items-center gap-2.5 px-4 rail:px-5"
          aria-label="BMSCE Alumni Network home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bmsce-crest.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
          <span className="hidden font-display text-[1.05rem] font-extrabold leading-[0.95] tracking-tight rail:block">
            BMSCE
            <span className="serif-accent block text-[0.95rem] font-normal">alumni network</span>
          </span>
        </Link>

        <ul className="mt-3 flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 no-scrollbar">
          {ITEMS.map((item) => {
            const active = isActive(pathname, item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                  className={`group relative flex h-11 items-center gap-3 rounded-lg px-3 text-[0.9375rem] transition-colors ${
                    active ? "bg-ink font-semibold text-ivory" : "font-medium text-ink/75 hover:bg-ink/[0.06] hover:text-ink"
                  }`}
                >
                  <span className="relative">
                    <Icon name={item.icon} />
                    {item.href === "/messages" && (
                      <Badge n={unreadDm} className="absolute -right-2 -top-2 rail:hidden" />
                    )}
                  </span>
                  <span className="hidden rail:block">{item.label}</span>
                  {item.href === "/messages" && (
                    <Badge n={unreadDm} className="ml-auto hidden rail:inline-flex" />
                  )}
                </Link>
              </li>
            );
          })}

          {/* The signature feature gets its own pinned-note entry. */}
          <li className="mt-4">
            <Link
              href="/noticeboard"
              aria-current={onWall ? "page" : undefined}
              title="The Wall"
              className={`keep-day relative flex h-12 items-center gap-3 rounded-lg border-[1.5px] border-ink px-3 font-display text-[0.95rem] font-bold transition-transform hover:-translate-y-0.5 ${
                onWall ? "bg-ink text-lime" : "bg-lime text-ink"
              }`}
            >
              <Icon name="pin" />
              <span className="hidden rail:block">The Wall</span>
              <span className="hand ml-auto hidden text-[1.05rem] rail:block" aria-hidden="true">
                look!
              </span>
            </Link>
          </li>
          <li className="mt-1.5">
            <Link
              href="/campus"
              aria-current={pathname.startsWith("/campus") ? "page" : undefined}
              title="Campus map"
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-[0.9375rem] transition-colors ${
                pathname.startsWith("/campus") ? "bg-ink font-semibold text-ivory" : "font-medium text-ink/75 hover:bg-ink/[0.06] hover:text-ink"
              }`}
            >
              <Icon name="map" />
              <span className="hidden rail:block">Campus map</span>
            </Link>
          </li>
        </ul>

        {isAdmin && (
          <Link
            href="/admin"
            title="Admin console"
            className={`mx-2.5 mb-2 flex h-10 items-center gap-3 rounded-lg border border-dashed border-ink/35 px-3 text-sm font-medium ${
              pathname.startsWith("/admin") ? "bg-ink text-ivory" : "text-ink/70 hover:border-ink hover:text-ink"
            }`}
          >
            <Icon name="shield" />
            <span className="hidden rail:block">Admin console</span>
          </Link>
        )}
      </nav>

      {/* ---- Top bar ---- */}
      <header className="fixed left-0 right-0 top-0 z-30 flex h-[var(--topbar)] items-center gap-2 border-b border-ink/10 bg-ivory/90 px-3 backdrop-blur-md md:left-[var(--rail-slim)] md:px-6 rail:left-[var(--rail)]">
        <Link href="/" className="flex items-center gap-2 md:hidden" aria-label="Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bmsce-crest.png" alt="" className="h-8 w-8 object-contain" />
        </Link>

        <form action="/search" role="search" className="keep-day relative min-w-0 flex-1 md:max-w-md">
          <label htmlFor="global-search" className="sr-only">
            Search people and posts
          </label>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
          <input
            id="global-search"
            name="q"
            type="search"
            placeholder="Search people and posts"
            autoComplete="off"
            className="h-10 w-full rounded-full border border-ink/15 bg-paper pl-9 pr-3 text-sm placeholder:text-ink/45 focus:border-ink focus:outline-none focus:ring-2 focus:ring-lime md:pr-20"
          />
          {me.verification_status === "verified" && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("palette:open"))}
              aria-label="Open quick search"
              className="label-mono absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-ink/20 px-1.5 py-1 text-ink/55 hover:border-ink hover:text-ink md:block"
            >
              Ctrl K
            </button>
          )}
        </form>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle className="flex h-10 w-10 items-center justify-center rounded-full text-ink/75 hover:bg-ink/[0.06] hover:text-ink" />
          <Link
            href="/notifications"
            aria-label={`Notifications${unreadNotes ? `, ${unreadNotes} unread` : ""}`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink/75 hover:bg-ink/[0.06] hover:text-ink"
          >
            <Icon name="bell" />
            <Badge n={unreadNotes} className="absolute right-0.5 top-0.5" />
          </Link>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 hover:bg-ink/[0.06] sm:pr-3"
            >
              <Avatar name={me.full_name} src={me.photo_url} size={34} />
              <span className="hidden max-w-[9rem] truncate text-sm font-semibold sm:block">{firstName}</span>
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="sheet absolute right-0 top-[calc(100%+0.5rem)] w-60 origin-top-right p-1.5 motion-ok:animate-[var(--animate-rise)]"
              >
                <div className="border-b border-ink/10 px-3 pb-2.5 pt-2">
                  <p className="truncate text-sm font-semibold">{me.full_name ?? "Member"}</p>
                  <p className="label-mono mt-1 text-ink/55">
                    {me.user_type === "student" ? "Student" : "Alumni"}
                    {me.verification_status !== "verified" && " · pending review"}
                  </p>
                </div>
                {(
                  [
                    ["Your profile", "/profile", "user"],
                    ["Settings and privacy", "/profile/edit", "settings"],
                    ["Chapters", "/chapters", "map"],
                    ["Events", "/events", "calendar"],
                    ["Campus map", "/campus", "map"],
                    ["Blog & Insights", "/blog", "book"],
                  ] as [string, string, IconName][]
                ).map(([label, href, icon]) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    className="flex items-center gap-3 rounded px-3 py-2 text-sm hover:bg-ink/[0.06]"
                  >
                    <Icon name={icon} className="h-4 w-4 text-ink/60" />
                    {label}
                  </Link>
                ))}
                {isAdmin && (
                  <Link href="/admin" role="menuitem" className="flex items-center gap-3 rounded px-3 py-2 text-sm hover:bg-ink/[0.06]">
                    <Icon name="shield" className="h-4 w-4 text-ink/60" />
                    Admin console
                  </Link>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={signOut}
                  className="mt-1 flex w-full items-center gap-3 rounded border-t border-ink/10 px-3 py-2.5 text-left text-sm hover:bg-ink/[0.06]"
                >
                  <Icon name="logout" className="h-4 w-4 text-ink/60" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ---- Tab bar: phones only. Five thumb-reach destinations; the rest
             live in the profile menu above. ---- */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/15 bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <ul className="grid h-[var(--tabbar)] grid-cols-5">
          {["/", "/directory"].map((href) => {
            const item = ITEMS.find((i) => i.href === href)!;
            return <Tab key={item.href} item={item} active={isActive(pathname, item)} />;
          })}
          <li className="flex items-start justify-center">
            <Link
              href="/noticeboard"
              aria-current={onWall ? "page" : undefined}
              className={`keep-day -mt-4 flex h-14 w-14 flex-col items-center justify-center rounded-full border-[1.5px] border-ink shadow-[0_3px_0_var(--color-ink)] ${
                onWall ? "bg-ink text-lime" : "bg-lime text-ink"
              }`}
            >
              <Icon name="pin" />
              <span className="sr-only">The Wall</span>
            </Link>
          </li>
          {["/events", "/messages"].map((href) => {
            const item = ITEMS.find((i) => i.href === href)!;
            return <Tab key={item.href} item={item} active={isActive(pathname, item)} badge={href === "/messages" ? unreadDm : 0} />;
          })}
        </ul>
      </nav>
    </>
  );
}

function Tab({ item, active, badge = 0 }: { item: Item; active: boolean; badge?: number }) {
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`relative flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium ${
          active ? "text-ink" : "text-ink/55"
        }`}
      >
        <span className="relative">
          <Icon name={item.icon} filled={false} className={`h-[1.35rem] w-[1.35rem] ${active ? "stroke-[2]" : ""}`} />
          <Badge n={badge} className="absolute -right-2.5 -top-1.5" />
        </span>
        {item.short ?? item.label}
        {active && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-tangerine" aria-hidden="true" />}
      </Link>
    </li>
  );
}
