"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  className?: string;
};

export default function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className = "",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            node.classList.add("is-visible");
            observer.unobserve(node);
          }
        });
      },
      // Triggers well before the element reaches the viewport edge and
      // needs only a sliver visible — call sites pass delay values tuned
      // for the old, slower reveal; halving it here (one place) keeps
      // every staggered list snappy without touching each call site.
      { threshold: 0.01, rootMargin: "0px 0px 15% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={{ animationDelay: delay ? `${delay * 0.5}ms` : undefined }}
    >
      {children}
    </Tag>
  );
}
