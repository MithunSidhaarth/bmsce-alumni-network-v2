"use client";

import {
  useMemo,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { addNewsletter, deleteNewsletter } from "../actions";
import { createClient } from "@/lib/supabase/client";
import { safeUrl } from "@/lib/url";
import type { Newsletter } from "@/lib/types";

const FIELD =
  "w-full rounded-xl border border-gold/40 bg-ivory-dim/40 px-4 py-3 font-sans text-sm text-ink placeholder:text-ink/40 transition-colors focus:border-gold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const LABEL =
  "font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink/60";
const MAX_PDF = 20 * 1024 * 1024; // 20 MB, matches the bucket cap

export default function NewsletterAdmin({
  existing,
}: {
  existing: Newsletter[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(String(currentYear));
  const [title, setTitle] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  // Bumping this remounts the file input to clear it after a successful upload.
  const [fileKey, setFileKey] = useState(0);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const onPdf = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    setOk(false);
    if (f && f.type !== "application/pdf") {
      setPdf(null);
      setError("The newsletter must be a PDF.");
      return;
    }
    if (f && f.size > MAX_PDF) {
      setPdf(null);
      setError("The PDF must be under 20 MB.");
      return;
    }
    setPdf(f);
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setOk(false);

    const yearNum = Number(year);
    if (!Number.isInteger(yearNum) || yearNum < 1900 || yearNum > currentYear + 1) {
      setError("Enter a valid year.");
      return;
    }
    if (!pdf) {
      setError("Choose a PDF to upload.");
      return;
    }

    startTransition(async () => {
      try {
        // Upload the PDF to the public `newsletters` bucket, then record the row.
        const safeTitle = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const path = `${yearNum}-${safeTitle ? `${safeTitle}-` : ""}${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage
          .from("newsletters")
          .upload(path, pdf, { contentType: "application/pdf", upsert: true });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage
          .from("newsletters")
          .getPublicUrl(path);

        await addNewsletter({
          year: yearNum,
          title,
          pdfUrl: pub.publicUrl,
        });

        setTitle("");
        setPdf(null);
        setFileKey((k) => k + 1);
        setOk(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not upload the newsletter."
        );
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      try {
        await deleteNewsletter(id);
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[8rem_1fr]">
          <label className="block">
            <span className={LABEL}>Year *</span>
            <input
              className={`${FIELD} mt-2`}
              type="number"
              inputMode="numeric"
              min={1900}
              max={currentYear + 1}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className={LABEL}>Title</span>
            <input
              className={`${FIELD} mt-2`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Optional — e.g. Spring 2024 Edition"
            />
          </label>
        </div>

        <label className="block">
          <span className={LABEL}>Newsletter PDF *</span>
          <input
            key={fileKey}
            id="newsletter-pdf"
            type="file"
            accept="application/pdf"
            onChange={onPdf}
            className="mt-2 block w-full text-xs text-ink/60 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-gold/40 file:bg-ivory-dim/60 file:px-3 file:py-1.5 file:font-sans file:text-[11px] file:uppercase file:tracking-[0.12em] file:text-ink"
          />
          {pdf && (
            <span className="mt-1.5 block font-sans text-xs text-ink/55">
              {pdf.name}
            </span>
          )}
        </label>

        {error && <p className="font-sans text-sm text-oxblood">{error}</p>}
        {ok && (
          <p className="font-sans text-sm text-oxblood">Newsletter added ✓</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="self-start rounded-sm bg-oxblood px-7 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Upload newsletter"}
        </button>
      </form>

      {existing.length > 0 && (
        <div>
          <h2 className="font-display text-2xl text-ink">In the archive</h2>
          <ul className="mt-5 flex flex-col gap-3">
            {existing.map((n) => {
              const pdfHref = safeUrl(n.pdf_url);
              return (
              <li
                key={n.id}
                className="flex items-center gap-4 rounded-xl border border-gold/25 bg-ivory-dim/40 p-4"
              >
                <span className="shrink-0 font-display text-xl text-oxblood">
                  {n.year}
                </span>
                <div className="min-w-0 flex-1">
                  {pdfHref ? (
                    <a
                      href={pdfHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate font-sans text-sm text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
                    >
                      {n.title || `Newsletter ${n.year}`}
                    </a>
                  ) : (
                    <span className="block truncate font-sans text-sm text-ink/60">
                      {n.title || `Newsletter ${n.year}`}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(n.id)}
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
