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
  { label: "Happening", href: "/happening" },
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
          {/* Always dark ink — this button lives in the light header bar
              in both states, never over the dark panel, so it must never
              turn white (that's what made it disappear before). */}
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 h-px w-5 bg-ink transition-all duration-300 ${
                menuOpen ? "top-2 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 top-2 h-px w-5 bg-ink transition-opacity duration-300 ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 h-px w-5 bg-ink transition-all duration-300 ${
                menuOpen ? "top-2 -rotate-45" : "top-4"
              }`}
            />
          </span>
        </button>
      </nav>

      {/* Light, restrained dropdown — plain uppercase links on the same
          ivory the rest of the site uses, a thin brass rule between them,
          solid oxblood for the primary action. Direct, not a production. */}
      <div
        id="mobile-menu"
        className={`grid overflow-hidden border-t border-gold/25 bg-ivory transition-[grid-template-rows] duration-300 ease-out md:hidden ${
          menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr] border-t-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="max-h-[calc(100vh-64px)] overflow-y-auto px-6 pb-8 pt-2">
            <ul className="flex flex-col">
              {mobileItems.map((link) => {
                const active = activeChild(link.href);
                const cls = `block border-b border-gold/20 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.14em] transition-colors ${
                  active ? "text-oxblood" : "text-ink/75 hover:text-oxblood"
                }`;
                return (
                  <li key={link.href}>
                    {isRoute(link.href) ? (
                      <Link href={link.href} onClick={() => setMenuOpen(false)} className={cls}>
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} onClick={() => setMenuOpen(false)} className={cls}>
                        {link.label}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="mt-6">
              <AuthMenu variant="mobile" />
            </div>
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
