"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { joinChapter, leaveChapter, removeMember, reviewMember } from "@/app/chapters/actions";

/** Join, request, leave: the membership control in a chapter's header. */
export default function ChapterControls({
  chapterId,
  slug,
  signedIn,
  verified,
  status,
  joinPolicy,
  whatsappUrl,
}: {
  chapterId: string;
  slug: string;
  signedIn: boolean;
  verified: boolean;
  status: "active" | "pending" | null;
  joinPolicy: "open" | "request";
  whatsappUrl: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      setError(null);
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });

  if (!signedIn) {
    return (
      <Link href={`/login?next=/chapters/${slug}`} className="btn btn-lime">
        Sign in to join
      </Link>
    );
  }
  if (!verified) return <p className="text-sm text-ivory/75">You can join once your account is verified.</p>;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {status === null && (
        <button type="button" disabled={pending} onClick={() => run(() => joinChapter(chapterId, slug))} className="btn btn-lime">
          {pending ? "One moment" : joinPolicy === "open" ? "Join this chapter" : "Request to join"}
        </button>
      )}
      {status === "pending" && (
        <>
          <span className="stamp border-lime text-lime">Request sent</span>
          <button type="button" disabled={pending} onClick={() => run(() => leaveChapter(chapterId, slug))} className="text-sm font-semibold text-ivory/80 underline underline-offset-4 hover:text-ivory">
            Withdraw
          </button>
        </>
      )}
      {status === "active" && (
        <>
          <span className="stamp border-lime bg-lime text-ink">You are a member</span>
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-sm border-ivory/50 bg-transparent text-ivory hover:bg-ivory/10">
              WhatsApp group
            </a>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => window.confirm("Leave this chapter?") && run(() => leaveChapter(chapterId, slug))}
            className="text-sm font-semibold text-ivory/75 underline underline-offset-4 hover:text-ivory"
          >
            Leave
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="w-full text-sm text-[#ffb3a3]">
          {error}
        </p>
      )}
    </div>
  );
}

/** Lead/admin controls on one member row. */
export function MemberReview({
  chapterId,
  slug,
  profileId,
  mode,
}: {
  chapterId: string;
  slug: string;
  profileId: string;
  mode: "pending" | "active";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Something went wrong.");
      }
    });

  if (mode === "pending") {
    return (
      <span className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => run(() => reviewMember(chapterId, slug, profileId, true))} className="btn btn-sm">
          Approve
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => reviewMember(chapterId, slug, profileId, false))} className="btn btn-ghost btn-sm">
          Decline
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => window.confirm("Remove this member from the chapter?") && run(() => removeMember(chapterId, slug, profileId))}
      className="text-xs font-semibold text-ink/50 hover:text-pin"
    >
      Remove
    </button>
  );
}
