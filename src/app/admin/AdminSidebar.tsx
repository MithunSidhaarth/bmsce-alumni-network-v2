"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  badge?: number;
};

export default function AdminSidebar({
  adminName,
  pendingCount,
  reportsCount,
}: {
  adminName: string | null;
  pendingCount: number;
  reportsCount: number;
}) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/admin", label: "Overview", badge: pendingCount },
    { href: "/admin/events", label: "Events" },
    { href: "/admin/reports", label: "Reports", badge: reportsCount },
    { href: "/admin/social", label: "Social posts" },
    { href: "/admin/newsletters", label: "Newsletters" },
    { href: "/admin/gallery", label: "Gallery" },
  ];

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <aside className="shrink-0 md:w-56">
      <div className="mb-6 hidden md:block">
        <p className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink/40">
          Signed in as
        </p>
        <p className="mt-1 truncate font-display text-lg text-ink">
          {adminName || "Admin"}
        </p>
      </div>

      <nav
        aria-label="Admin sections"
        className="-mx-1 flex gap-1 overflow-x-auto pb-2 md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:pb-0"
      >
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3.5 py-2.5 font-sans text-[13px] font-medium transition-colors md:shrink md:whitespace-normal ${
                active
                  ? "bg-oxblood text-ivory"
                  : "text-ink/65 hover:bg-ivory-dim hover:text-ink"
              }`}
            >
              {item.label}
              {!!item.badge && (
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-sans text-[10px] font-semibold ${
                    active
                      ? "bg-ivory/20 text-ivory"
                      : "bg-accent/15 text-accent"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-gold/25 pt-4 md:mt-6">
        <Link
          href="/"
          className="block px-3.5 py-2 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ink/45 transition-colors hover:text-oxblood"
        >
          ← Back to site
        </Link>
      </div>
    </aside>
  );
}
