"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Analytics" }],
  },
  {
    title: "People",
    items: [
      { href: "/admin/review", label: "Verification queue" },
      { href: "/admin/members", label: "Members" },
      { href: "/admin/lifecycle", label: "Student to alumni" },
      { href: "/admin/chapters", label: "Chapters" },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/moderation", label: "Posts and replies" },
      { href: "/admin/reports", label: "Reports" },
      { href: "/admin/noticeboard", label: "The Wall" },
      { href: "/admin/instagram", label: "Instagram" },
      { href: "/admin/blog", label: "Blog & Insights" },
      { href: "/admin/digests", label: "Email digests" },
    ],
  },
  {
    title: "Site",
    items: [
      { href: "/admin/events", label: "Events" },
      { href: "/admin/gallery", label: "Gallery" },
      { href: "/admin/happening", label: "Campus updates" },
      { href: "/admin/newsletters", label: "PDF archive" },
      { href: "/admin/volunteers", label: "Volunteers" },
    ],
  },
];

export default function AdminSidebar({
  adminName,
  badges,
}: {
  adminName: string | null;
  badges: Record<string, number>;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <aside className="min-w-0 md:sticky md:top-[calc(var(--topbar)+1.5rem)] md:max-h-[calc(100vh-var(--topbar)-3rem)] md:self-start md:overflow-y-auto no-scrollbar">
      <p className="label-mono hidden text-ink/70 md:block">Admin console</p>
      <p className="mb-5 mt-1 hidden truncate font-display text-lg font-bold md:block">{adminName ?? "Admin"}</p>
      <nav aria-label="Admin sections" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 no-scrollbar md:mx-0 md:flex-col md:gap-5 md:overflow-visible md:px-0 md:pb-0">
        {GROUPS.map((group) => (
          <div key={group.title} className="flex gap-1 md:flex-col md:gap-0.5">
            <p className="label-mono mb-1 hidden text-ink/70 md:block">{group.title}</p>
            {group.items.map((item) => {
              const active = isActive(item.href);
              const badge = badges[item.href] ?? 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center justify-between gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-ink text-ivory" : "text-ink/70 hover:bg-ink/[0.06] hover:text-ink"
                  }`}
                >
                  {item.label}
                  {badge > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-tangerine px-1.5 font-mono text-[10px] text-white">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
