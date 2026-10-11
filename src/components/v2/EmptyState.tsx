import Link from "next/link";
import type { ReactNode } from "react";

/** A torn sheet with a handwritten nudge: what is missing and what to do. */
export default function EmptyState({
  title,
  body,
  action,
  children,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <div className="relative mx-auto mt-6 max-w-md -rotate-1 rounded-box border border-dashed border-ink/30 bg-paper px-7 py-9 text-center">
      <span className="tape" aria-hidden="true" />
      <p className="hand text-[1.7rem] text-forest">{title}</p>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink/70">{body}</p>
      {action && (
        <Link href={action.href} className="btn btn-sm mt-5">
          {action.label}
        </Link>
      )}
      {children}
    </div>
  );
}
