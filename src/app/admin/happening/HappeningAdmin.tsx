"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addUpdate, deleteUpdate } from "./actions";
import type { CampusUpdate } from "@/components/UpdateCard";
import { said } from "@/lib/fail";

const FIELD =
  "w-full rounded-xl border border-gold/40 bg-ivory-dim/40 px-4 py-3 font-sans text-sm text-ink placeholder:text-ink/40 focus:border-gold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const LABEL =
  "font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/60";

export default function HappeningAdmin({ items }: { items: CampusUpdate[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const g = (k: string) => String(f.get(k) ?? "");
    setError(null);
    start(async () => {
      try {
        await addUpdate({
          title: g("title"),
          body: g("body"),
          category: g("category"),
          imageUrl: g("imageUrl"),
          linkUrl: g("linkUrl"),
          publishedAt: g("publishedAt"),
        });
        form.reset();
        router.refresh();
      } catch (err) {
        setError(said(err) ?? "Could not save.");
      }
    });
  };

  const remove = (id: string) => {
    if (!confirm("Delete this update?")) return;
    start(async () => {
      try {
        await deleteUpdate(id);
        router.refresh();
      } catch (err) {
        setError(said(err) ?? "Could not delete.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-10">
      <form onSubmit={submit} className="flex max-w-2xl flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className={LABEL}>Title *</span>
          <input name="title" required maxLength={200} className={FIELD} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={LABEL}>Text</span>
          <textarea name="body" rows={4} maxLength={4000} className={FIELD} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className={LABEL}>Category</span>
            <select name="category" className={FIELD}>
              <option>Campus news</option>
              <option>Alumni initiative</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className={LABEL}>Date (defaults to now)</span>
            <input name="publishedAt" type="date" className={FIELD} />
          </label>
        </div>
        <label className="flex flex-col gap-2">
          <span className={LABEL}>Photo URL</span>
          <input
            name="imageUrl"
            type="url"
            placeholder="https://…"
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={LABEL}>Link (Read more)</span>
          <input
            name="linkUrl"
            type="url"
            placeholder="https://…"
            className={FIELD}
          />
        </label>
        {error && (
          <p role="alert" className="font-sans text-sm text-oxblood">
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="self-start rounded-sm bg-oxblood px-8 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.14em] text-ivory hover:bg-maroon disabled:opacity-50"
        >
          {busy ? "Saving…" : "Publish update"}
        </button>
      </form>

      <ul className="flex max-w-2xl flex-col gap-3">
        {items.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-gold/30 px-4 py-3"
          >
            <span className="font-sans text-sm text-ink">
              {u.title}
              <span className="ml-2 text-ink/50">
                {u.category} ·{" "}
                {new Date(u.published_at).toLocaleDateString("en-IN")}
              </span>
            </span>
            <button
              onClick={() => remove(u.id)}
              disabled={busy}
              className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink/60 hover:text-oxblood"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
