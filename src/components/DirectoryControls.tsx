"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type Facets = {
  years: (number | string)[];
  branches: string[];
  cities: string[];
  companies: string[];
  industries: string[];
  roles: string[];
};

type Tab = "alumni" | "student";

export default function DirectoryControls({
  tab,
  facets,
  alumniCount,
  studentCount,
}: {
  tab: Tab;
  facets: Facets;
  alumniCount: number;
  studentCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const isStudents = tab === "student";

  // Push a new query string. Any filter change resets to page 1; switching tab
  // clears the filters (they belong to the previous group).
  const navigate = (
    updates: Record<string, string | null>,
    { resetPage = true, resetFilters = false } = {}
  ) => {
    const next = new URLSearchParams(
      resetFilters ? "" : params.toString()
    );
    if (resetFilters && tab) next.set("tab", params.get("tab") ?? "alumni");
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (resetPage) next.delete("page");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  // Debounced search box.
  const [q, setQ] = useState(params.get("q") ?? "");
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      navigate({ q: q.trim() || null });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const cur = (k: string) => params.get(k) ?? "all";
  const hasFilters =
    !!params.get("q") ||
    ["year", "branch", "city", "company", "industry", "role"].some((k) =>
      params.get(k)
    );

  return (
    <div>
      {/* Alumni / Students tabs */}
      <div className="flex gap-1 border-b border-gold/30">
        {(
          [
            { key: "alumni" as const, label: "Alumni", count: alumniCount },
            { key: "student" as const, label: "Students", count: studentCount },
          ]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() =>
              navigate({ tab: t.key }, { resetFilters: true })
            }
            aria-current={tab === t.key ? "page" : undefined}
            className={`-mb-px border-b-2 px-5 py-3 font-sans text-[13px] font-medium uppercase tracking-[0.12em] transition-colors ${
              tab === t.key
                ? "border-oxblood text-oxblood"
                : "border-transparent text-ink/50 hover:text-oxblood"
            }`}
          >
            {t.label}
            <span className="ml-2 text-ink/35">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="sticky top-[88px] z-30 border-b border-gold/30 bg-ivory/90 py-5 backdrop-blur-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="lg:w-72">
            <label htmlFor="dir-search" className="sr-only">
              Search
            </label>
            <input
              id="dir-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                isStudents ? "Search by name…" : "Search by name or company…"
              }
              className="w-full rounded-xl border border-gold/40 bg-ivory-dim/40 px-4 py-2.5 font-sans text-sm text-ink placeholder:text-ink/40 focus:border-gold focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex-1 lg:grid-cols-6">
            <Select
              label={isStudents ? "Class" : "Batch"}
              value={cur("year")}
              onChange={(v) => navigate({ year: v === "all" ? null : v })}
              allLabel={isStudents ? "All years" : "All batches"}
              options={facets.years.map((y) => ({
                value: String(y),
                label: String(y),
              }))}
            />
            <Select
              label="Branch"
              value={cur("branch")}
              onChange={(v) => navigate({ branch: v === "all" ? null : v })}
              allLabel="All branches"
              options={facets.branches.map((b) => ({ value: b, label: b }))}
            />
            <Select
              label="City"
              value={cur("city")}
              onChange={(v) => navigate({ city: v === "all" ? null : v })}
              allLabel="All cities"
              options={facets.cities.map((c) => ({ value: c, label: c }))}
            />
            <Select
              label="Company"
              value={cur("company")}
              onChange={(v) => navigate({ company: v === "all" ? null : v })}
              allLabel={isStudents ? "Any company" : "All companies"}
              options={facets.companies.map((c) => ({ value: c, label: c }))}
            />
            <Select
              label="Industry"
              value={cur("industry")}
              onChange={(v) => navigate({ industry: v === "all" ? null : v })}
              allLabel="All industries"
              options={facets.industries.map((c) => ({ value: c, label: c }))}
            />
            <Select
              label="Role"
              value={cur("role")}
              onChange={(v) => navigate({ role: v === "all" ? null : v })}
              allLabel="All roles"
              options={facets.roles.map((c) => ({ value: c, label: c }))}
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                navigate(
                  {
                    q: null,
                    year: null,
                    branch: null,
                    city: null,
                    company: null,
                    industry: null,
                    role: null,
                  },
                  { resetPage: true }
                );
              }}
              className="group shrink-0 self-start font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-oxblood lg:self-center"
            >
              <span className="border-b border-gold pb-1 transition-colors group-hover:border-oxblood">
                Clear filters
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      disabled={options.length === 0}
      className="w-full rounded-xl border border-gold/40 bg-ivory-dim/40 px-3 py-2.5 font-sans text-sm text-ink transition-colors focus:border-gold focus:outline-none disabled:opacity-50"
    >
      <option value="all">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (totalPages <= 1) return null;

  const go = (p: number) => {
    const next = new URLSearchParams(params.toString());
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  return (
    <div className="mt-12 flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        className="rounded-sm border border-gold/50 px-5 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ink/75 transition-colors hover:border-oxblood hover:text-oxblood disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      <span className="font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ink/60">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        className="rounded-sm border border-gold/50 px-5 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-ink/75 transition-colors hover:border-oxblood hover:text-oxblood disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
