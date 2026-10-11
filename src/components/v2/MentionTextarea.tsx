"use client";

import { useEffect, useRef, useState, type TextareaHTMLAttributes } from "react";
import { searchMembers } from "@/app/posts/actions";
import type { Mention } from "@/lib/types";
import Avatar from "./Avatar";

type Hit = { id: string; name: string; photo: string | null; line: string };

// "@" then the start of a name, right before the caret.
const TRIGGER = /(^|\s)@([^\s@][^@\n]{0,29})$/;

/**
 * A textarea where typing "@" and a few letters of a name offers matching
 * members. Choosing one writes "@Full Name" into the text and reports who was
 * mentioned. Arrow keys move through the list, Enter or Tab picks, Esc closes.
 */
export default function MentionTextarea({
  value,
  onValue,
  mentions,
  onMentions,
  ...rest
}: {
  value: string;
  onValue: (next: string) => void;
  mentions: Mention[];
  onMentions: (next: Mention[]) => void;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const field = useRef<HTMLTextAreaElement | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const listId = `${rest.id ?? "mention"}-people`;

  const read = (text: string, caret: number) => {
    const found = text.slice(0, caret).match(TRIGGER);
    setQuery(found && found[2].trim().length >= 2 ? found[2].trim() : null);
  };

  // Look people up a moment after the typing pauses.
  useEffect(() => {
    if (query === null) {
      setHits([]);
      return;
    }
    let live = true;
    const timer = window.setTimeout(() => {
      searchMembers(query)
        .then((found) => {
          if (!live) return;
          setHits(found);
          setActive(0);
        })
        .catch(() => live && setHits([]));
    }, 180);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const pick = (hit: Hit) => {
    const el = field.current;
    if (!el) return;
    const caret = el.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const at = before.lastIndexOf("@");
    if (at < 0) return;
    const next = `${before.slice(0, at)}@${hit.name} ${value.slice(caret)}`;
    onValue(next);
    if (!mentions.some((m) => m.id === hit.id)) onMentions([...mentions, { id: hit.id, name: hit.name }]);
    setQuery(null);
    const pos = at + hit.name.length + 2;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const open = query !== null && hits.length > 0;

  return (
    <div className="relative">
      <textarea
        {...rest}
        ref={field}
        value={value}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          onValue(e.target.value);
          read(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onClick={(e) => read(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)}
        onBlur={() => window.setTimeout(() => setQuery(null), 150)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a + (e.key === "ArrowDown" ? 1 : hits.length - 1)) % hits.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            pick(hits[active]);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setQuery(null);
          }
        }}
      />
      {open && (
        <ul id={listId} role="listbox" aria-label="Members" className="sheet absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto p-1.5">
          {hits.map((hit, i) => (
            <li
              key={hit.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: the textarea must not lose its caret first.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(hit);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 ${i === active ? "bg-lime" : ""}`}
            >
              <Avatar name={hit.name} src={hit.photo} size={30} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{hit.name}</span>
                <span className="block truncate text-xs text-ink/60">{hit.line}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Only the people whose "@Name" is still in the text. */
export function mentionsIn(text: string, mentions: Mention[]): Mention[] {
  return mentions.filter((m) => text.includes(`@${m.name}`));
}
