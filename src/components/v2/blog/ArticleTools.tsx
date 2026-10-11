"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "../Icon";

/** Share links, plus one read counted per browser session. */
export default function ArticleTools({ slug, title, url, count }: { slug: string; title: string; url: string; count: boolean }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!count) return;
    const key = `read:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode: count the read anyway */
    }
    createClient().rpc("record_article_view", { p_slug: slug }).then(() => undefined);
  }, [slug, count]);

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}&hashtags=BMSCEAlumni` },
    { label: "Email", href: `mailto:?subject=${t}&body=${u}` },
  ];

  return (
    <aside aria-label="Share this article" className="mt-12 flex flex-wrap items-center gap-2 border-t border-ink/15 pt-6">
      <span className="label-mono mr-2 text-ink/70">Share</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="chip">
          {l.label}
        </a>
      ))}
      <button
        type="button"
        className="chip"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard unavailable */
          }
        }}
      >
        <Icon name="link" className="h-4 w-4" />
        <span role="status">{copied ? "Copied" : "Copy link"}</span>
      </button>
    </aside>
  );
}
