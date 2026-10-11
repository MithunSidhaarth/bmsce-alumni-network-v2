"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resizeImage, MEDIUM_MAX_DIMENSION, MEDIUM_QUALITY } from "@/lib/resizeImage";
import { createPost } from "@/app/posts/actions";
import { FORUM_TAGS, KIND_LABEL } from "@/lib/posts";
import type { PostKind } from "@/lib/types";
import Avatar from "./Avatar";
import Icon from "./Icon";

const PROMPTS: Record<PostKind, string> = {
  post: "What is happening in your corner of the network?",
  discussion: "Lay out the question or the idea. The more context, the better the replies.",
  announcement: "Write the announcement. It will also be pinned to The Wall.",
  achievement: "A new role, a launch, a paper, a marathon. Tell the network.",
  memory: "A canteen story, a fest, a professor you still quote. Add a photo if you have one.",
};

const MAX_PHOTOS = 4;

export default function Composer({
  me,
  userId,
  kinds,
  defaultKind = "post",
  chapterId = null,
  chapterName,
  eventId = null,
  disabledReason,
}: {
  me: { full_name: string | null; photo_url: string | null };
  userId: string;
  kinds: PostKind[];
  defaultKind?: PostKind;
  chapterId?: string | null;
  chapterName?: string;
  /** Attach the post to an event (shown on that event's page). */
  eventId?: string | null;
  /** Shown instead of the form, e.g. while an account awaits verification. */
  disabledReason?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PostKind>(defaultKind);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (disabledReason) {
    return (
      <div className="sheet flex items-center gap-3 px-5 py-4 text-sm text-ink/70">
        <Icon name="lock" className="h-5 w-5 text-ink/45" />
        {disabledReason}
      </div>
    );
  }

  const needsTitle = kind === "discussion" || kind === "announcement";

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const next: string[] = [];
      for (const file of Array.from(files).slice(0, MAX_PHOTOS - photos.length)) {
        if (!file.type.startsWith("image/")) continue;
        const blob = await resizeImage(file, MEDIUM_MAX_DIMENSION, MEDIUM_QUALITY);
        const path = `${userId}/${crypto.randomUUID()}.webp`;
        const { error: upErr } = await supabase.storage
          .from("post-media")
          .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
        if (upErr) throw new Error(upErr.message);
        next.push(supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl);
      }
      setPhotos((p) => [...p, ...next]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That photo could not be uploaded.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = () => {
    setError(null);
    start(async () => {
      try {
        await createPost({ kind, title: needsTitle ? title : undefined, body, tags, media: photos, chapterId, eventId });
        setTitle("");
        setBody("");
        setTags([]);
        setPhotos([]);
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not publish that.");
      }
    });
  };

  if (!open) {
    return (
      <div className="sheet flex items-center gap-3 px-4 py-3 sm:px-5">
        <Avatar name={me.full_name} src={me.photo_url} size={40} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-11 min-w-0 flex-1 truncate rounded-full border border-ink/15 bg-ivory px-4 text-left text-[0.9375rem] text-ink/55 transition-colors hover:border-ink/40"
        >
          {chapterName ? `Post to ${chapterName}` : PROMPTS[defaultKind]}
        </button>
        <button
          type="button"
          onClick={() => {
            setKind(kinds.includes("memory") ? "memory" : defaultKind);
            setOpen(true);
          }}
          aria-label="Share a photo"
          className="hidden h-11 w-11 items-center justify-center rounded-full border border-ink/15 text-ink/70 hover:border-ink hover:text-ink sm:flex"
        >
          <Icon name="image" />
        </button>
      </div>
    );
  }

  return (
    <div className="sheet px-4 pb-4 pt-5 sm:px-6">
      <span className="tape tape-lime" aria-hidden="true" />
      {kinds.length > 1 && (
        <div role="radiogroup" aria-label="What are you sharing?" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-3 no-scrollbar">
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              data-active={kind === k}
              onClick={() => setKind(k)}
              className="chip"
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}

      {needsTitle && (
        <>
          <label htmlFor="composer-title" className="sr-only">
            Title
          </label>
          <input
            id="composer-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder={kind === "discussion" ? "Your question or topic" : "Headline"}
            className="mb-2 w-full border-0 border-b border-ink/15 bg-transparent pb-2 font-display text-xl font-bold placeholder:text-ink/35 focus:border-ink focus:outline-none"
          />
        </>
      )}
      <label htmlFor="composer-body" className="sr-only">
        Your post
      </label>
      <textarea
        id="composer-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        autoFocus
        rows={4}
        maxLength={10000}
        placeholder={PROMPTS[kind]}
        className="w-full resize-y border-0 bg-transparent text-[1rem] leading-relaxed placeholder:text-ink/40 focus:outline-none"
      />

      {photos.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {photos.map((p) => (
            <li key={p} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" className="h-20 w-20 rounded object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((all) => all.filter((x) => x !== p))}
                aria-label="Remove photo"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-ivory"
              >
                <Icon name="x" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {kind === "discussion" && !chapterId && (
        <fieldset className="mt-3">
          <legend className="label-mono text-ink/55">Tag it (optional)</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {FORUM_TAGS.map((t) => {
              const on = tags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTags((all) => (on ? all.filter((x) => x !== t) : all.length < 3 ? [...all, t] : all))}
                  className="chip min-h-8 py-1 text-xs"
                >
                  {t}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-pin">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-ink/10 pt-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => addPhotos(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || photos.length >= MAX_PHOTOS}
          className="btn btn-ghost btn-sm"
        >
          <Icon name="image" className="h-4 w-4" />
          {uploading ? "Uploading" : "Photo"}
        </button>
        <span className="ml-auto" />
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm" disabled={pending}>
          Cancel
        </button>
        <button type="button" onClick={submit} disabled={pending || uploading || !body.trim()} className="btn btn-sm">
          {pending ? "Posting" : chapterName ? `Post to ${chapterName}` : "Post"}
        </button>
      </div>
    </div>
  );
}
