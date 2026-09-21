"use client";

import Link from "next/link";
import Logo from "./Logo";
import { useCareersEnabled } from "@/lib/useCareersEnabled";

// Careers is feature-flagged (site_settings.careers_enabled) — same
// client-side fetch pattern as Nav.tsx, so the footer's Careers column only
// appears when the section is actually live.
const NETWORK_LINKS = [
  { label: "Directory", href: "/directory" },
  { label: "Chapters", href: "/chapters" },
  { label: "Events", href: "/events" },
  { label: "Community", href: "/community" },
];

const CAREERS_LINKS = [
  { label: "Jobs", href: "/careers/jobs" },
  { label: "Internships", href: "/careers/internships" },
  { label: "Mentorship", href: "/careers/mentorship" },
];

const RESOURCE_LINKS = [
  { label: "Newsletter", href: "/newsletter" },
  { label: "Gallery", href: "/gallery" },
];

const ABOUT_LINKS = [
  { label: "Our story", href: "/about" },
  { label: "FAQs", href: "/faqs" },
  { label: "Contact", href: "/about#contact" },
];

// The alumni network is only on LinkedIn and Instagram — X and YouTube were
// removed rather than left as dead links.
const SOCIALS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/bmsce-an",
    path: "M4.75 4.75a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5ZM4 9.75h1.5v9.5H4v-9.5Zm4.25 0H9.7v1.3h.02c.34-.63 1.18-1.3 2.43-1.3 2.6 0 3.08 1.66 3.08 3.82v5.68h-1.5v-5.04c0-1.2-.02-2.75-1.7-2.75-1.7 0-1.96 1.3-1.96 2.66v5.13h-1.5v-9.5Z",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/bmscealumni/",
    path: "M8.5 4h7A4.5 4.5 0 0 1 20 8.5v7a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 15.5v-7A4.5 4.5 0 0 1 8.5 4Zm0 1.5A3 3 0 0 0 5.5 8.5v7a3 3 0 0 0 3 3h7a3 3 0 0 0 3-3v-7a3 3 0 0 0-3-3h-7ZM12 8.25a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5Zm0 1.5a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Zm4.1-2.6a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z",
  },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="min-w-[8rem] flex-1 basis-[8rem]">
      <h3 className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ivory/50">
        {title}
      </h3>
      <ul className="mt-5 flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="font-sans text-sm text-ivory/70 transition-colors hover:text-ivory"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const careersEnabled = useCareersEnabled();


  return (
    <footer className="bg-oxblood text-ivory/70">
      <div className="mx-auto max-w-7xl px-6 py-14 md:px-10 md:py-20">
        {/* Brand block at a fixed width, link columns as a flex row that
            always grows to fill whatever's left — a fixed grid-cols count
            left a dead empty column whenever Careers was off, the same bug
            the homepage bento grid had. Flex has no "wrong number of
            items" state: 3 columns or 4, they always fill the row. */}
        <div className="flex flex-col gap-12 md:flex-row md:gap-10">
          <div className="md:w-64 md:shrink-0">
            <Logo
              src="/logo-bw.png"
              className="h-11 w-auto"
              placeholderClassName="h-11 w-32"
            />
            <p className="mt-5 max-w-[26ch] font-sans text-sm leading-relaxed text-ivory/55">
              The home for every BMS graduate, wherever the world has taken
              them.
            </p>
            <div className="mt-6 flex items-center gap-5">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="text-ivory/55 transition-colors hover:text-brass-light"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[18px] w-[18px]"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-1 flex-wrap gap-x-6 gap-y-12">
            <FooterColumn title="Network" links={NETWORK_LINKS} />
            {careersEnabled && <FooterColumn title="Careers" links={CAREERS_LINKS} />}
            <FooterColumn title="Resources" links={RESOURCE_LINKS} />
            <FooterColumn title="About" links={ABOUT_LINKS} />
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 border-t border-ivory/15 pt-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="font-sans text-xs text-ivory/45">
            &copy; {new Date().getFullYear()} BMSCE Alumni Association. All
            rights reserved.
          </p>
          <p className="font-sans text-xs text-ivory/45">
            Made with ❤️ in Basavangudi
          </p>
          <p className="font-sans text-xs text-ivory/45">
            <Link
              href="/privacy"
              className="text-ivory/60 transition-colors hover:text-ivory"
            >
              Privacy
            </Link>
            <span className="mx-2 text-ivory/25">·</span>
            <Link
              href="/terms"
              className="text-ivory/60 transition-colors hover:text-ivory"
            >
              Terms
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
