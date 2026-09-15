import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import Reveal from "@/components/Reveal";
import DirectoryControls, {
  Pagination,
  type Facets,
} from "@/components/DirectoryControls";
import { createClient } from "@/lib/supabase/server";
import MemberPhoto from "@/components/MemberPhoto";

export const metadata: Metadata = {
  title: "Directory — BMSCE Alumni Network",
  description:
    "Search the BMS alumni directory by batch, branch, city, or company. Find your people.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
const EMPTY_FACETS: Facets = {
  years: [],
  branches: [],
  cities: [],
  companies: [],
  industries: [],
  roles: [],
};

type Row = {
  id: string;
  full_name: string | null;
  user_type: string | null;
  graduation_year: number | null;
  branch: string | null;
  company: string | null;
  job_title: string | null;
  industry: string | null;
  current_city: string | null;
  photo_url: string | null;
};

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "student" ? "student" : "alumni";
  // Strip characters that are meaningful in PostgREST's or() grammar / ILIKE
  // wildcards, so the search term can't alter the query.
  const q = (sp.q ?? "").replace(/[,()%*\\]/g, " ").trim().slice(0, 60);
  const year = sp.year ?? "";
  const branch = sp.branch ?? "";
  const city = sp.city ?? "";
  const company = sp.company ?? "";
  const industry = sp.industry ?? "";
  const role = sp.role ?? "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Shell>
        <div className="mt-4 rounded-2xl border border-dashed border-gold/40 bg-ivory-dim/40 px-6 py-20 text-center">
          <p className="font-display text-2xl italic text-ink">
            Sign in to browse the directory.
          </p>
          <p className="mx-auto mt-3 max-w-sm font-sans text-sm leading-relaxed text-ink/65">
            The alumni directory is for members of the network.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center justify-center rounded-sm bg-oxblood px-7 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
          >
            Sign in
          </Link>
        </div>
      </Shell>
    );
  }

  // Filtered, paginated page of results — all in Postgres.
  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, user_type, graduation_year, branch, company, job_title, industry, current_city, photo_url",
      { count: "exact" }
    )
    .eq("verification_status", "verified")
    .eq("user_type", tab);

  if (year) query = query.eq("graduation_year", Number(year));
  if (branch) query = query.eq("branch", branch);
  if (city) query = query.eq("current_city", city);
  if (company) query = query.eq("company", company);
  if (industry) query = query.eq("industry", industry);
  if (role) query = query.eq("job_title", role);
  if (q) query = query.or(`full_name.ilike.%${q}%,company.ilike.%${q}%`);

  const [
    { data, count },
    { count: alumniCount },
    { count: studentCount },
    { data: facetData },
  ] = await Promise.all([
    query.order("full_name", { ascending: true }).range(from, to).returns<Row[]>(),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified")
      .eq("user_type", "alumni"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified")
      .eq("user_type", "student"),
    // Falls back to empty facets if migration 0009 hasn't run — search still works.
    supabase.rpc("directory_facets", { p_user_type: tab }),
  ]);

  const facets: Facets = (facetData as Facets | null) ?? EMPTY_FACETS;
  const rows = data ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!(q || year || branch || city || company || industry || role);
  const noun = tab === "student" ? "students" : "alumni";

  return (
    <Shell>
      <DirectoryControls
        tab={tab}
        facets={facets}
        alumniCount={alumniCount ?? 0}
        studentCount={studentCount ?? 0}
      />

      {total === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gold/40 bg-ivory-dim/40 px-6 py-20 text-center">
          <p className="font-display text-2xl italic text-ink">
            {hasFilters
              ? `No ${noun} match those filters.`
              : `No verified ${noun} yet.`}
          </p>
          <p className="mx-auto mt-3 max-w-sm font-sans text-sm leading-relaxed text-ink/65">
            {hasFilters
              ? "Try clearing a filter or two."
              : "As members join and get verified, they'll appear here."}
          </p>
        </div>
      ) : (
        <>
          <p className="mt-8 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink/55">
            {total} {noun}
            {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((r, i) => (
              <DirectoryCard key={r.id} row={r} index={i} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} />
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-7xl px-6 pb-6 pt-16 md:px-10 md:pb-8 md:pt-24">
            <Reveal>
              <Eyebrow>Directory</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] tracking-tight text-ink">
                Find your people.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-ink/70 md:text-lg">
                Filter by batch, branch, city, or company to find who you are
                looking for.
              </p>
            </Reveal>
          </div>
        </section>
        <section>
          <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
            {children}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function DirectoryCard({ row, index }: { row: Row; index: number }) {
  const name = row.full_name ?? "BMS member";
  const isStudent = row.user_type === "student";
  const roleLine = [row.job_title, row.company].filter(Boolean).join(", ");
  const yearLabel = row.graduation_year
    ? isStudent
      ? `Class of ${row.graduation_year}`
      : `Batch of ${row.graduation_year}`
    : null;
  const batchLine = [yearLabel, row.branch].filter(Boolean).join(" · ");

  return (
    <Reveal delay={Math.min(index, 8) * 50} className="h-full">
      <Link
        href={`/directory/${row.id}`}
        className="flex h-full flex-col rounded-2xl border border-maroon/30 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-maroon/60"
      >
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-gold/40 font-display text-lg italic text-oxblood">
          {row.photo_url ? (
            <MemberPhoto src={row.photo_url} />
          ) : (
            initials(name)
          )}
        </div>
        <h3 className="mt-6 font-display text-xl text-ink">{name}</h3>
        {isStudent && (
          <span className="mt-2 w-fit rounded-full border border-gold/40 px-2.5 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-accent">
            Current student
          </span>
        )}
        {roleLine && (
          <p className="mt-2 font-sans text-sm text-ink/65">{roleLine}</p>
        )}
        {row.industry && (
          <p className="mt-1 font-sans text-xs text-ink/50">{row.industry}</p>
        )}
        {batchLine && (
          <p className="mt-3 font-sans text-sm text-ink/55">{batchLine}</p>
        )}
        {row.current_city && (
          <p className="mt-auto pt-5 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
            {row.current_city}
          </p>
        )}
      </Link>
    </Reveal>
  );
}
