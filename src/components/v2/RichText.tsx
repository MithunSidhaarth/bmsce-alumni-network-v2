import Link from "next/link";
import type { Mention } from "@/lib/types";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Member-written text with its "@Name" mentions and web addresses made into
 * links. Everything else is plain text (React escapes it), and only http and
 * https addresses become links.
 */
export default function RichText({ text, mentions = [] }: { text: string; mentions?: Mention[] }) {
  // Longest names first, so "@Asha Rao" wins over "@Asha".
  const named = mentions.filter((m) => m.name).sort((a, b) => b.name.length - a.name.length);
  const pattern = new RegExp(`(https?:\\/\\/[^\\s<>"')\\]]+${named.map((m) => `|@${escapeRe(m.name)}`).join("")})`, "g");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        if (part.startsWith("@")) {
          const who = named.find((m) => `@${m.name}` === part);
          return who ? (
            <Link key={i} href={`/directory/${who.id}`} className="font-semibold text-forest underline">
              {part}
            </Link>
          ) : (
            part
          );
        }
        // Sentence punctuation after an address is not part of it.
        const url = part.replace(/[.,;:!?]+$/, "");
        return (
          <span key={i}>
            <a href={url} target="_blank" rel="noopener noreferrer nofollow ugc" className="break-all text-forest underline underline-offset-2 hover:no-underline">
              {url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </a>
            {part.slice(url.length)}
          </span>
        );
      })}
    </>
  );
}
