import type { ReactNode } from "react";

// Admin screens use the same paper and ink as the rest of the site, with the
// decoration turned off: plain tables, clear labels, nothing tilted.

export function AdminHeader({ title, lead, children }: { title: string; lead?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-5">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl">{title}</h1>
        {lead && <p className="mt-2 text-sm leading-relaxed text-ink/70">{lead}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function Panel({ title, children, aside }: { title?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="mb-7 rounded-md border border-ink/12 bg-paper">
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-5 py-3">
          <h2 className="text-[0.9375rem] font-bold">{title}</h2>
          {aside}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-[9.5rem] flex-1 rounded-md border border-ink/12 bg-paper px-4 py-3.5">
      <p className="label-mono text-ink/55">{label}</p>
      <p className="mt-1.5 font-display text-[1.9rem] font-bold leading-none">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-ink/55">{hint}</p>}
    </div>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad"; children: ReactNode }) {
  const tones = {
    neutral: "bg-ink/[0.07] text-ink/75",
    good: "bg-lime/70 text-ink",
    warn: "bg-[#ffe2b8] text-[#7a4a00]",
    bad: "bg-[#ffd3cd] text-[#8f1d14]",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export const table = {
  wrap: "overflow-x-auto rounded-md border border-ink/12 bg-paper",
  table: "w-full min-w-[40rem] border-collapse text-left text-sm",
  th: "label-mono border-b border-ink/12 px-4 py-2.5 font-medium text-ink/55",
  td: "border-b border-ink/[0.07] px-4 py-3 align-top",
};

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-ink/25 px-5 py-8 text-center text-sm text-ink/60">{children}</p>;
}
