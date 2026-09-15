import Link from "next/link";
import Logo from "./Logo";

// Only pages with real content behind them. Careers/Newsletter/Leadership/
// Press/FAQs/Give-back/Alumni-spotlight are intentionally omitted for now.
const GROUPS = [
  {
    title: "Community",
    links: [
      { label: "Directory", href: "/directory" },
      { label: "Chapters", href: "/chapters" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "Our story", href: "/about" },
      { label: "Contact", href: "/about#contact" },
    ],
  },
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

export default function Footer() {
  return (
    <footer className="bg-ink text-ivory/70">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Logo className="h-11 w-auto" placeholderClassName="h-11 w-32" />
            <p className="mt-5 max-w-[22ch] font-sans text-sm leading-relaxed text-ivory/55">
              The home for every BMS graduate, wherever the world has taken
              them.
            </p>
          </div>

          {GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ivory/55">
                {group.title}
              </h3>
              <ul className="mt-5 flex flex-col gap-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="font-sans text-sm text-ivory/65 transition-colors hover:text-ivory"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col-reverse items-center gap-6 border-t border-gold/20 pt-8 sm:flex-row sm:justify-between">
          <p className="font-sans text-xs text-ivory/45">
            &copy; {new Date().getFullYear()} BMSCE Alumni Association. All
            rights reserved.
            <span className="mx-2 text-ivory/25">·</span>
            <Link
              href="/privacy"
              className="text-ivory/55 transition-colors hover:text-ivory"
            >
              Privacy
            </Link>
            <span className="mx-2 text-ivory/25">·</span>
            <Link
              href="/terms"
              className="text-ivory/55 transition-colors hover:text-ivory"
            >
              Terms
            </Link>
          </p>
          <div className="flex items-center gap-5">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
                className="text-ivory/55 transition-colors hover:text-accent"
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
      </div>
    </footer>
  );
}
