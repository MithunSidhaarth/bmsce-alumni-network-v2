"use client";

import Link from "next/link";
import ThemeToggle from "./v2/ThemeToggle";
import { useAuth } from "./AuthProvider";
import SubscribeForm from "./v2/SubscribeForm";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "The Network",
    links: [
      { label: "Alumni Network", href: "/directory" },
      { label: "Chapters", href: "/chapters" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    title: "Read and remember",
    links: [
      { label: "The Wall", href: "/noticeboard" },
      { label: "Blog & Insights", href: "/blog" },
      { label: "Gallery", href: "/gallery" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "Our story", href: "/about" },
      { label: "FAQs", href: "/faqs" },
      { label: "Contact", href: "/about#contact" },
    ],
  },
];

// The network is on LinkedIn and Instagram only.
const SOCIALS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/company/bmsce-an" },
  { label: "Instagram", href: "https://www.instagram.com/bmscealumni/" },
];

export default function Footer() {
  const { inApp } = useAuth();

  // Inside the app the shell already carries navigation, so the footer
  // shrinks to the legal line.
  if (inApp) {
    return (
      <footer className="border-t border-ink/10 px-5 py-6 md:px-8">
        <p className="label-mono flex flex-wrap items-center gap-x-4 gap-y-2 text-ink/70">
          <span>&copy; {new Date().getFullYear()} BMSCE Alumni Network</span>
          <Link href="/about" className="hover:text-ink">About</Link>
          <Link href="/faqs" className="hover:text-ink">FAQs</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <ThemeToggle label className="inline-flex items-center gap-1.5 uppercase hover:text-ink [&>svg]:h-4 [&>svg]:w-4" />
        </p>
      </footer>
    );
  }

  return (
    <footer className="sig relative overflow-hidden bg-brand-ink text-ivory">
      <div className="mx-auto max-w-7xl px-5 pb-24 pt-16 md:px-10 md:pb-10 md:pt-24">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="label-mono text-lime">Est. 1946 · Basavanagudi, Bengaluru</p>
            <p className="mt-5 max-w-[14ch] font-display text-[clamp(2.4rem,6vw,4.25rem)] font-extrabold leading-[0.92] tracking-tight">
              Once BMSCE. <span className="serif-accent text-lime">Always</span> BMSCE.
            </p>
            <div className="mt-9 max-w-md">
              <p className="text-sm font-semibold">Stories from the Network, in your inbox</p>
              <p className="mt-1 text-sm text-ivory/70">
                A digest of new Blog &amp; Insights articles. Unsubscribe in one click.
              </p>
              <SubscribeForm source="footer" tone="dark" />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-10 gap-y-10 lg:justify-end">
            {COLUMNS.map((col) => (
              <div key={col.title} className="min-w-[9rem]">
                <h2 className="label-mono text-ivory/70">{col.title}</h2>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-[0.9375rem] text-ivory/80 underline-offset-4 hover:text-lime underline">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-ivory/15 pt-7 text-sm text-ivory/70 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} BMSCE Alumni Network. All rights reserved.</p>
          <p className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="hover:text-lime">
                {s.label}
              </a>
            ))}
            <Link href="/privacy" className="hover:text-lime">Privacy</Link>
            <Link href="/terms" className="hover:text-lime">Terms</Link>
            <ThemeToggle label className="inline-flex items-center gap-1.5 hover:text-lime [&>svg]:h-4 [&>svg]:w-4" />
          </p>
        </div>
      </div>
    </footer>
  );
}
