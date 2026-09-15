"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import AuthMenu from "./AuthMenu";
import CommandPalette from "./CommandPalette";
import { useAuth } from "./AuthProvider";
import { createClient } from "@/lib/supabase/client";

type NavChild = { label: string; href: string };
type NavItem = { label: string; href: string; children?: NavChild[] };

// Header nav (exact order). Notable Alumni stays hidden.
const BASE_LINKS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Chapters", href: "/chapters" },
  { label: "Directory", href: "/directory" },
  { label: "Events", href: "/events" },
  { label: "Newsletter", href: "/newsletter" },
  { label: "Gallery", href: "/gallery" },
];

// Members-only discussions. Only shown to signed-in users.
const COMMUNITY_ITEM: NavItem = { label: "Community", href: "/community" };

// Only shown when the admin has enabled Careers (site_settings.careers_enabled).
const CAREERS_ITEM: NavItem = {
  label: "Careers",
  href: "/careers/jobs",
  children: [
    { label: "Jobs", href: "/careers/jobs" },
    { label: "Internships", href: "/careers/internships" },
    { label: "Mentorship", href: "/careers/mentorship" },
  ],
};

const DESKTOP_LINK =
  "inline-flex items-center gap-1 border-b-2 pb-1 font-sans text-[13px] font-medium uppercase tracking-[0.12em] transition-colors";

function isRoute(href: string) {
  return href.startsWith("/");
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Read from navigator only after mount — during SSR there's no navigator,
  // and rendering "Ctrl K" then swapping to "⌘K" mid-render (rather than
  // after mount) would fail hydration on a Mac.
  const [isMac, setIsMac] = useState(false);
  // Careers is hidden by default and only appears once the admin flag loads on.
  const [careersEnabled, setCareersEnabled] = useState(false);
  // Community is members-only — shown once we know the visitor is signed in.
  const { signedIn, profile } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cmd/Ctrl+K opens the command palette from anywhere in the app.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setIsMac(/Mac/i.test(navigator.platform));
  }, []);

  // Lock background scroll while the full-bleed mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Close the menu on route change (e.g. browser back) so it never stays
  // open behind a new page.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let active = true;
    createClient()
      .from("site_settings")
      .select("careers_enabled")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setCareersEnabled(data?.careers_enabled === true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Community (members-only) sits with Directory; Careers appends when enabled.
  const LINKS: NavItem[] = [
    ...BASE_LINKS.slice(0, 4),
    ...(signedIn ? [COMMUNITY_ITEM] : []),
    ...BASE_LINKS.slice(4),
    ...(careersEnabled ? [CAREERS_ITEM] : []),
  ];

  const activeChild = (href: string) => isRoute(href) && pathname === href;

  const activeItem = (item: NavItem) => {
    if (item.children) {
      return item.children.some((c) => pathname === c.href);
    }
    return isRoute(item.href) && pathname === item.href;
  };

  const linkClass = (active: boolean) =>
    `${DESKTOP_LINK} ${
      active
        ? "border-accent text-oxblood"
        : "border-transparent text-ink/75 hover:text-oxblood"
    }`;

  // Mobile menu flattens the Directory dropdown into its child links.
  const mobileItems: NavChild[] = LINKS.flatMap((item) =>
    item.children ? item.children : [{ label: item.label, href: item.href }]
  );

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled || menuOpen
          ? "border-b border-gold/25 bg-ivory/90 backdrop-blur-md"
          : "border-b border-transparent bg-ivory/0"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-sm transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <Logo
            className="h-9 w-auto md:h-10"
            placeholderClassName="h-9 w-28 md:h-10"
          />
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((item) => {
            const active = activeItem(item);

            if (item.children) {
              return (
                <li key={item.label} className="group relative">
                  <Link href={item.href} className={linkClass(active)}>
                    {item.label}
                    <svg
                      viewBox="0 0 12 12"
                      className="h-2.5 w-2.5 transition-transform duration-200 group-hover:rotate-180"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.5 4.5 6 8l3.5-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                  <div className="pointer-events-none invisible absolute left-0 top-full z-50 pt-3 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100">
                    <ul className="min-w-[190px] overflow-hidden rounded-xl border border-gold/30 bg-ivory shadow-[0_12px_32px_-14px_rgba(26,20,18,0.3)]">
                      {item.children.map((child) => {
                        const cActive = activeChild(child.href);
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={`block px-4 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.1em] transition-colors ${
                                cActive
                                  ? "bg-gold/15 text-oxblood"
                                  : "text-oxblood/80 hover:bg-gold/10 hover:text-oxblood"
                              }`}
                            >
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            }

            return (
              <li key={item.label}>
                {isRoute(item.href) ? (
                  <Link href={item.href} className={linkClass(active)}>
                    {item.label}
                  </Link>
                ) : (
                  <a href={item.href} className={linkClass(active)}>
                    {item.label}
                  </a>
                )}
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-5 md:flex">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search"
            className="group flex items-center gap-2 rounded-full border border-gold/40 px-3 py-1.5 text-ink/60 transition-colors hover:border-oxblood/50 hover:text-oxblood"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
              <path d="M20 20l-4.3-4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <kbd className="font-sans text-[10px] font-medium tracking-[0.06em] text-ink/40 group-hover:text-oxblood/70">
              {isMac ? "⌘K" : "Ctrl K"}
            </kbd>
          </button>
          <AuthMenu variant="desktop" />
        </div>

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-label="Search"
          className="flex h-10 w-10 items-center justify-center rounded-sm text-ink/60 md:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
            <path d="M20 20l-4.3-4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label="Toggle menu"
          className="relative z-10 flex h-10 w-10 items-center justify-center rounded-sm md:hidden"
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 h-px w-5 transition-all duration-300 ${
                menuOpen ? "top-2 rotate-45 bg-ivory" : "top-0 bg-ink"
              }`}
            />
            <span
              className={`absolute left-0 top-2 h-px w-5 bg-ink transition-opacity duration-300 ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 h-px w-5 transition-all duration-300 ${
                menuOpen ? "top-2 -rotate-45 bg-ivory" : "top-4 bg-ink"
              }`}
            />
          </span>
        </button>
      </nav>

      {/* Full-bleed dark takeover — an editorial index page, not a dropdown:
          big serial-numbered serif links staggering in, a seal watermark
          echoing SitePreloader for brand continuity, and the auth actions
          anchored at the bottom like a colophon. */}
      <div
        id="mobile-menu"
        className={`grid overflow-hidden bg-oxblood transition-[grid-template-rows] duration-500 ease-out md:hidden ${
          menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="relative min-h-[calc(100vh-64px)] overflow-hidden px-6 pb-10 pt-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-24 bottom-16 h-72 w-72 rounded-full bg-gold/10 blur-3xl"
            />
            <svg
              viewBox="0 0 160 160"
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 opacity-[0.07]"
            >
              <circle cx="80" cy="80" r="70" fill="none" stroke="var(--color-ivory)" strokeWidth="1" />
              <circle cx="80" cy="80" r="58" fill="none" stroke="var(--color-ivory)" strokeWidth="0.75" />
              <text x="80" y="90" textAnchor="middle" className="fill-ivory font-display text-3xl italic">
                BMS
              </text>
            </svg>

            <ul className="relative flex flex-col">
              {mobileItems.map((link, i) => {
                const active = activeChild(link.href);
                const cls = `group flex items-center justify-between gap-4 py-4 transition-all duration-500 ease-out ${
                  menuOpen
                    ? "translate-x-0 opacity-100"
                    : "translate-x-3 opacity-0"
                }`;
                const style = {
                  transitionDelay: menuOpen ? `${100 + i * 50}ms` : "0ms",
                };
                const content = (
                  <>
                    <span className="flex items-baseline gap-4">
                      <span className="font-sans text-[10px] font-medium text-ivory/35">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`font-display text-[26px] italic leading-none ${
                          active ? "text-accent" : "text-ivory"
                        }`}
                      >
                        {link.label}
                      </span>
                    </span>
                    <svg
                      viewBox="0 0 16 16"
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 transition-all duration-300 ${
                        active
                          ? "translate-x-0 text-accent opacity-100"
                          : "-translate-x-1 text-ivory/40 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                      }`}
                    >
                      <path
                        d="M2 8h11M9 4l4 4-4 4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                );
                return (
                  <li key={link.href} className="border-b border-ivory/10">
                    {isRoute(link.href) ? (
                      <Link
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={cls}
                        style={style}
                      >
                        {content}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={cls}
                        style={style}
                      >
                        {content}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>

            <div
              className={`relative mt-8 flex flex-col gap-3 border-t border-ivory/15 pt-6 transition-all duration-500 ease-out ${
                menuOpen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
              style={{
                transitionDelay: menuOpen
                  ? `${100 + mobileItems.length * 50}ms`
                  : "0ms",
              }}
            >
              <AuthMenu variant="mobile" />
            </div>

            <p
              className={`relative mt-10 font-sans text-[10px] font-medium uppercase tracking-[0.32em] text-ivory/30 transition-opacity duration-500 ${
                menuOpen ? "opacity-100" : "opacity-0"
              }`}
              style={{
                transitionDelay: menuOpen
                  ? `${160 + mobileItems.length * 50}ms`
                  : "0ms",
              }}
            >
              Est. 1946 · Bengaluru
            </p>
          </div>
        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        signedIn={signedIn}
        isAdmin={profile?.role === "admin"}
      />
    </header>
  );
}
