"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addComment, deleteComment, setFollow, toggleCommentLike } from "@/app/posts/actions";
import { reportContent } from "@/app/moderation/actions";
import { plural, timeAgo } from "@/lib/format";
import type { Mention } from "@/lib/types";
import Avatar from "./Avatar";
import Icon from "./Icon";
import MentionTextarea, { mentionsIn } from "./MentionTextarea";
import RichText from "./RichText";
import { said } from "@/lib/fail";

export type Reply = {
  id: string;
  body: string;
  mentions?: Mention[];
  created_at: string;
  author_id: string | null;
  author: { id: string; full_name: string | null; photo_url: string | null; user_type: string; graduation_year: number | null } | null;
  likes: number;
  liked: boolean;
};

export default function Replies({
  postId,
  replies,
  me,
  following,
}: {
  postId: string;
  replies: Reply[];
  me: { id: string; full_name: string | null; photo_url: string | null; isAdmin: boolean };
  following: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<unknown>, after?: () => void) =>
    start(async () => {
      setError(null);
      try {
        await fn();
        after?.();
        router.refresh();
      } catch (e) {
        setError(said(e) ?? "Something went wrong.");
      }
    });

  return (
    <section id="replies" aria-labelledby="replies-title" className="mt-8 scroll-mt-24">
      <div className="flex items-center justify-between gap-3">
        <h2 id="replies-title" className="font-display text-xl">
          {replies.length === 0 ? "No replies yet" : plural(replies.length, "reply", "replies")}
        </h2>
        <button
          type="button"
          aria-pressed={following}
          disabled={pending}
          onClick={() => run(() => setFollow(postId, !following))}
          className="chip"
          data-active={following}
        >
          <Icon name="bell" className="h-4 w-4" />
          {following ? "Following" : "Follow"}
        </button>
      </div>

      {replies.length > 0 && (
        <ol className="mt-5 flex flex-col gap-5">
          {replies.map((r) => (
            <li key={r.id} className="flex gap-3">
              <Avatar name={r.author?.full_name} src={r.author?.photo_url} size={36} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="rounded-[4px_14px_14px_14px] border border-ink/10 bg-paper px-4 py-3">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    {r.author ? (
                      <Link href={`/directory/${r.author.id}`} className="font-semibold underline">
                        {r.author.full_name ?? "Member"}
                      </Link>
                    ) : (
                      <span className="font-semibold text-ink/70">Former member</span>
                    )}
                    <span className="text-xs text-ink/70">
                      {r.author?.user_type === "student"
                        ? "Student"
                        : r.author?.graduation_year
                        ? `Class of ${r.author.graduation_year}`
                        : ""}
                    </span>
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed">
                    <RichText text={r.body} mentions={r.mentions} />
                  </p>
                </div>
                <p className="mt-1.5 flex items-center gap-4 pl-1 text-xs text-ink/70">
                  <time dateTime={r.created_at}>{timeAgo(r.created_at)}</time>
                  <button
                    type="button"
                    aria-pressed={r.liked}
                    disabled={pending}
                    onClick={() => run(() => toggleCommentLike(r.id, postId))}
                    className={`font-semibold hover:text-ink ${r.liked ? "text-tangerine" : ""}`}
                  >
                    {r.liked ? "Liked" : "Like"}
                    {r.likes > 0 && <span className="ml-1 font-mono">{r.likes}</span>}
                  </button>
                  {(r.author_id === me.id || me.isAdmin) && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => window.confirm("Delete this reply?") && run(() => deleteComment(r.id, postId))}
                      className="font-semibold hover:text-pin"
                    >
                      Delete
                    </button>
                  )}
                  {r.author_id !== me.id && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        const reason = window.prompt("What is wrong with this reply? (optional)");
                        if (reason !== null) run(() => reportContent("comment", r.id, reason), () => setNote("Reported. Thank you."));
                      }}
                      className="font-semibold hover:text-ink"
                    >
                      Report
                    </button>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form
        className="mt-7 flex gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => addComment(postId, body, null, mentionsIn(body, mentions).map((m) => ({ id: m.id }))),
            () => {
              setBody("");
              setMentions([]);
            }
          );
        }}
      >
        <Avatar name={me.full_name} src={me.photo_url} size={36} className="mt-1" />
        <div className="min-w-0 flex-1">
          <label htmlFor="reply-body" className="sr-only">
            Write a reply
          </label>
          <MentionTextarea
            id="reply-body"
            value={body}
            onValue={setBody}
            mentions={mentions}
            onMentions={setMentions}
            rows={3}
            maxLength={5000}
            placeholder="Write a reply. Type @ to mention someone."
            className="field resize-y"
          />
          <div className="mt-2 flex items-center gap-3">
            <button type="submit" disabled={pending || !body.trim()} className="btn btn-sm">
              {pending ? "Sending" : "Reply"}
            </button>
            <p role="status" className="text-xs text-ink/70">
              {note}
            </p>
            {error && (
              <p role="alert" className="text-sm text-pin">
                {error}
              </p>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}
