"use client";

import { useState, useTransition, type FormEvent } from "react";
import { addSocialPost, deleteSocialPost } from "../actions";
import { safeUrl } from "@/lib/url";
import type { SocialPost } from "@/lib/types";

const FIELD =
  "w-full rounded-xl border border-gold/40 bg-ivory-dim/40 px-4 py-3 font-sans text-sm text-ink placeholder:text-ink/40 transition-colors focus:border-gold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const LABEL =
  "font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/60";

export default function AddSocialPost({ recent }: { recent: SocialPost[] }) {
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [permalink, setPermalink] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setOk(false);
    if (!permalink.trim()) {
      setError("An Instagram permalink is required.");
      return;
    }
    startTransition(async () => {
      try {
        await addSocialPost({ caption, imageUrl, permalink, hashtags });
        setCaption("");
        setImageUrl("");
        setPermalink("");
        setHashtags("");
        setOk(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add post.");
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      try {
        await deleteSocialPost(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-12">
      <form
        onSubmit={submit}
        className="flex flex-col gap-6 rounded-2xl border border-gold/25 bg-ivory-dim/40 p-6 md:p-8"
      >
        <label className="block">
          <span className={LABEL}>Instagram permalink *</span>
          <input
            className={`${FIELD} mt-2`}
            type="url"
            value={permalink}
            onChange={(e) => setPermalink(e.target.value)}
            placeholder="https://www.instagram.com/p/XXXXXXXXX/"
            required
          />
        </label>

        <label className="block">
          <span className={LABEL}>Image URL</span>
          <input
            className={`${FIELD} mt-2`}
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://… (or /instagram/xxx.jpg)"
          />
          <span className="mt-1.5 block font-sans text-xs text-ink/50">
            Optional. If the image link later breaks, the card still opens the
            real post via the permalink.
          </span>
        </label>

        <label className="block">
          <span className={LABEL}>Caption</span>
          <textarea
            className={`${FIELD} mt-2 min-h-[90px] resize-y`}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="A short caption…"
          />
        </label>

        <label className="block">
          <span className={LABEL}>Hashtags</span>
          <input
            className={`${FIELD} mt-2`}
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="bms, alumni, reunion (comma-separated)"
          />
        </label>

        {error && <p className="font-sans text-sm text-oxblood">{error}</p>}
        {ok && (
          <p className="font-sans text-sm text-oxblood">Post added ✓</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="self-start rounded-sm bg-oxblood px-7 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon disabled:opacity-60"
        >
          {busy ? "Saving…" : "Add post"}
        </button>
      </form>

      {/* Recently added (manual) posts, with delete */}
      {recent.length > 0 && (
        <div>
          <h2 className="font-display text-2xl text-ink">Recently added</h2>
          <ul className="mt-5 flex flex-col gap-3">
            {recent.map((p) => {
              const permalinkHref = safeUrl(p.permalink);
              return (
              <li
                key={p.id}
                className="flex items-center gap-4 rounded-xl border border-gold/25 bg-ivory-dim/40 p-4"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-ivory-dim">
                  {p.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans text-sm text-ink/80">
                    {p.caption || p.permalink || "(no caption)"}
                  </p>
                  {permalinkHref && (
                    <a
                      href={permalinkHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-sans text-xs text-oxblood/70 underline decoration-accent underline-offset-2"
                    >
                      {p.permalink}
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(p.id)}
                  className="shrink-0 rounded-sm border border-gold/50 px-3 py-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink/70 transition-colors hover:border-oxblood hover:text-oxblood disabled:opacity-60"
                >
                  Delete
                </button>
              </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
