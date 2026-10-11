"use client";

import { useEffect, useState, useTransition } from "react";
import { votePoll } from "@/app/posts/actions";
import { createClient } from "@/lib/supabase/client";
import { plural } from "@/lib/format";
import Icon from "./Icon";
import { said } from "@/lib/fail";

/**
 * A poll on a post. Totals are stored on the post; who voted for what is
 * private (a member can only ever read their own vote). Results show once you
 * have voted, so nobody is nudged by the running score.
 */
export default function Poll({ postId, options, counts, canVote }: { postId: string; options: string[]; counts: number[] | null; canVote: boolean }) {
  const [tally, setTally] = useState<number[]>(() => options.map((_, i) => counts?.[i] ?? 0));
  const [mine, setMine] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // The member's own vote, if any (the database only returns their own row).
  useEffect(() => {
    let live = true;
    createClient()
      .from("poll_votes")
      .select("option_index")
      .eq("post_id", postId)
      .maybeSingle()
      .then(({ data }) => {
        if (!live) return;
        setMine(typeof data?.option_index === "number" ? data.option_index : null);
        setReady(true);
      });
    return () => {
      live = false;
    };
  }, [postId]);

  const total = tally.reduce((a, b) => a + b, 0);
  const showResults = mine !== null || !canVote;

  const vote = (option: number | null) => {
    if (pending) return;
    setError(null);
    const before = { tally, mine };
    // Count it straight away; put it back if the server says no.
    setTally((t) => t.map((n, i) => n - (i === mine ? 1 : 0) + (i === option ? 1 : 0)));
    setMine(option);
    start(async () => {
      try {
        const fresh = await votePoll(postId, option);
        if (fresh.length === options.length) setTally(fresh);
      } catch (e) {
        setTally(before.tally);
        setMine(before.mine);
        setError(said(e) ?? "That vote could not be counted.");
      }
    });
  };

  return (
    <div className="mt-4" aria-busy={!ready}>
      <ul className="flex flex-col gap-2">
        {options.map((option, i) => {
          const share = total > 0 ? Math.round((tally[i] / total) * 100) : 0;
          const chosen = mine === i;
          return (
            <li key={i}>
              <button
                type="button"
                disabled={!canVote || !ready || pending}
                aria-pressed={chosen}
                onClick={() => vote(chosen ? null : i)}
                className={`relative block w-full overflow-hidden rounded-md border px-3.5 py-2.5 text-left text-[0.9375rem] transition-colors ${
                  chosen ? "border-ink" : "border-ink/20 enabled:hover:border-ink/55"
                } disabled:cursor-default`}
              >
                {showResults && (
                  <span
                    className={`absolute inset-y-0 left-0 transition-[width] duration-500 ease-out ${chosen ? "bg-blue/25" : "bg-ink/[0.07]"}`}
                    style={{ width: `${share}%` }}
                    aria-hidden="true"
                  />
                )}
                <span className="relative flex items-center gap-2">
                  {chosen && <Icon name="check" className="h-4 w-4" />}
                  <span className="min-w-0 flex-1 break-words font-medium">{option}</span>
                  {showResults && <span className="shrink-0 font-mono text-xs text-ink/70">{share}%</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-ink/70">
        {plural(total, "vote", "votes")}
        {canVote && mine === null && ready ? " · results appear after you vote" : ""}
        {canVote && mine !== null ? " · tap your choice again to take it back" : ""}
      </p>
      {error && (
        <p role="alert" className="mt-1 text-xs text-pin">
          {error}
        </p>
      )}
    </div>
  );
}
