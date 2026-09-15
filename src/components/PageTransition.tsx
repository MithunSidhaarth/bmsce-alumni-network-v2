"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Keying by pathname forces React to remount this subtree on every route
// change, which replays the page-enter CSS animation fresh each time —
// simplest reliable way to get a page transition in the App Router without
// pulling in an animation library for it.
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="motion-safe:animate-[var(--animate-page-enter)]">
      {children}
    </div>
  );
}
