"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import AuthMenu from "./AuthMenu";

// The public header. Signed-in members get the app shell (AppChrome) from the
// root layout instead, so this renders nothing for them.
const LINKS = [
  { label: "About", href: "/about" },
  { label: "Chapters", href: "/chapters" },
  { label: "Events", href: "/events" },
  { label: "Blog", href: "/blog" },
  { label: "Gallery", href: "/gallery" },
];

export default function Nav() {
  const { inApp, signedIn } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (inApp) return null;

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,border-color] duration-200 ${
        scrolled || open ? "border-b border-ink/10 bg-ivory/92 backdrop-blur-md" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 md:px-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="BMSCE Alumni Network home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bmsce-crest.png" alt="" className="h-9 w-9 object-contain" />
          <span className="font-display text-[1.05rem] font-extrabold leading-[0.95] tracking-tight">
            BMSCE
            <span className="serif-accent block text-[0.95rem] font-normal">alumni network</span>
          </span>
        </Link>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-ink text-ivory" : "text-ink/75 hover:bg-ink/[0.07] hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/noticeboard"
            className="ml-1 inline-flex -rotate-2 items-center rounded-sm bg-lime px-3 py-1.5 font-display text-sm font-bold text-ink shadow-[2px_2px_0_var(--color-ink)] transition-transform hover:rotate-0"
          >
            The Wall
          </Link>
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {signedIn ? (
            <AuthMenu />
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link href="/join" className="btn btn-sm">
                Join the network
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="public-menu"
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-ink/20 lg:hidden"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span aria-hidden="true" className="relative block h-3 w-5">
            <span className={`absolute left-0 top-0 h-[1.5px] w-full bg-ink transition-transform ${open ? "translate-y-[5px] rotate-45" : ""}`} />
            <span className={`absolute bottom-0 left-0 h-[1.5px] w-full bg-ink transition-transform ${open ? "-translate-y-[5px] -rotate-45" : ""}`} />
          </span>
        </button>
      </div>

      {open && (
        <div
          id="public-menu"
          className="fixed inset-x-0 bottom-0 top-16 overflow-y-auto bg-ivory px-5 pb-10 pt-6 lg:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col">
            {[...LINKS, { label: "The Wall", href: "/noticeboard" }].map((l, i) => (
              <Link
                key={l.href}
                href={l.href}
                style={{ animationDelay: `${i * 40}ms` }}
                className="border-b border-ink/10 py-4 font-display text-[2rem] font-bold leading-none tracking-tight motion-ok:animate-[var(--animate-rise)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 flex flex-col gap-3">
            {signedIn ? (
              <AuthMenu variant="mobile" />
            ) : (
              <>
                <Link href="/join" className="btn">
                  Join the network
                </Link>
                <Link href="/login" className="btn btn-ghost">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
