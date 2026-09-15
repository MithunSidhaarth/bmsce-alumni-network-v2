"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Jobs", href: "/careers/jobs" },
  { label: "Internships", href: "/careers/internships" },
  { label: "Mentorship", href: "/careers/mentorship" },
];

export default function CareersTabs() {
  const pathname = usePathname();

  return (
    <nav className="mt-10 flex flex-wrap gap-x-8 gap-y-2 border-b border-gold/30">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 pb-3 font-sans text-[13px] font-medium uppercase tracking-[0.12em] transition-colors ${
              active
                ? "border-gold text-oxblood"
                : "border-transparent text-ink/55 hover:text-oxblood"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
