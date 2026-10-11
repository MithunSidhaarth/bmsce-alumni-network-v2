"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { motionOK } from "@/lib/motion";

type Doc = Document & { startViewTransition?: (update: () => Promise<void> | void) => { finished: Promise<void> } };

/**
 * A link whose clicked element grows into the page it leads to.
 *
 * On click, the source element (the link itself, or the closest ancestor
 * matching "source") is given a view-transition name. The destination page
 * marks its counterpart with the same name (see vt() in lib/vt.ts), and the browser
 * morphs one into the other. Where the View Transitions API is missing,
 * this is an ordinary link.
 */
export default function TransitionLink({
  vtName,
  source,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { vtName: string; source?: string }) {
  const router = useRouter();

  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    const doc = document as Doc;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!doc.startViewTransition || !motionOK()) return;
    const from = (source ? e.currentTarget.closest<HTMLElement>(source) : e.currentTarget) ?? e.currentTarget;
    e.preventDefault();
    from.style.viewTransitionName = vtName;
    const href = String(props.href);

    const transition = doc.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          // The old page is held on screen until the destination's matching
          // element exists (or a short timeout passes), so the morph lands on
          // real content rather than a loading skeleton.
          // (A timer, not requestAnimationFrame: frames are paused here.)
          const started = performance.now();
          router.push(href);
          const timer = window.setInterval(() => {
            const target = document.querySelector<HTMLElement>(`[data-vt="${vtName}"]`);
            if ((target && target !== from) || performance.now() - started > 1200) {
              window.clearInterval(timer);
              if (from.isConnected) from.style.viewTransitionName = "";
              resolve();
            }
          }, 30);
        })
    );
    transition.finished.catch(() => undefined).finally(() => {
      if (from.isConnected) from.style.viewTransitionName = "";
    });
  };

  return <Link {...props} onClick={go} />;
}
