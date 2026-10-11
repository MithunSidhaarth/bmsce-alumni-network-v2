import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SubscribeForm from "@/components/v2/SubscribeForm";
import Icon from "@/components/v2/Icon";
import TransitionLink from "@/components/v2/vt/TransitionLink";
import { getMe } from "@/lib/me";
import { ARTICLE_CARD, BLOG_CATEGORIES, type ArticleCard } from "@/lib/blog";
import { longDate } from "@/lib/format";
import { safeUrl } from "@/lib/url";
import type { Newsletter } from "@/lib/types";

export const metadata: Metadata = {
  title: "Blog & Insights: BMSCE Alumni Network",
  description:
    "Alumni stories, career advice, startup journeys, industry perspectives and campus memories from the BMSCE alumni network.",
  openGraph: { title: "Blog & Insights: BMSCE Alumni Network", type: "website" },
};
export const dynamic = "force-dynamic";

function Byline({ a }: { a: ArticleCard }) {
  return (
    <p className="label-mono text-ink/55">
      {a.author_name ? `${a.author_name} · ` : ""}
      {a.published_at ? longDate(a.published_at) : ""} · {a.reading_minutes} min read
    </p>
  );
}

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const sp = await searchParams;
  const category = (BLOG_CATEGORIES as readonly string[]).includes(sp.category ?? "") ? sp.category! : null;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const { supabase, me } = await getMe();

  let query = supabase.from("articles").select(ARTICLE_CARD).eq("status", "published").order("published_at", { ascending: false }).limit(40);
  if (category) query = query.eq("category", category);
  if (q) query = query.textSearch("fts", q, { type: "websearch", config: "english" });

  const [{ data }, { data: pdfs }] = await Promise.all([
    query,
    supabase.from("newsletters").select("id, year, title, pdf_url, uploaded_by, uploaded_at").order("year", { ascending: false }).order("uploaded_at", { ascending: false }).returns<Newsletter[]>(),
  ]);
  const articles = (data ?? []) as ArticleCard[];
  const filtered = Boolean(category || q);
  const lead = filtered ? null : (articles.find((a) => a.is_featured) ?? articles[0] ?? null);
  const rest = articles.filter((a) => a.id !== lead?.id);
  const [second, third, ...others] = rest;
  const href = (c: string | null) => (c ? `/blog?category=${encodeURIComponent(c)}` : "/blog");

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1180px] px-5 pb-20 pt-8 md:px-10 md:pt-12">
        {/* Masthead */}
        <header className="border-b-[3px] border-double border-ink pb-6 text-center">
          <p className="label-mono text-tangerine">The BMSCE Alumni Network</p>
          <h1 className="mt-3 font-serif text-[clamp(2.8rem,9vw,6rem)] font-normal leading-[0.92] tracking-[-0.035em]">
            Blog <span className="serif-accent">&amp;</span> Insights
          </h1>
          <p className="mx-auto mt-4 max-w-xl font-serif text-lg text-ink/70">
            Stories, lessons and memories from people who started where you did.
          </p>
        </header>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <nav aria-label="Categories" className="-mx-5 flex gap-1.5 overflow-x-auto px-5 no-scrollbar md:mx-0 md:flex-wrap md:px-0">
            <Link href="/blog" data-active={!category} className="chip">All</Link>
            {BLOG_CATEGORIES.map((c) => (
              <Link key={c} href={href(c)} data-active={category === c} className="chip">{c}</Link>
            ))}
          </nav>
          <form action="/blog" role="search" className="relative lg:ml-auto lg:w-64">
            <label htmlFor="blog-q" className="sr-only">Search articles</label>
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
            <input id="blog-q" name="q" defaultValue={q} placeholder="Search articles" className="field rounded-full pl-9" />
            {category && <input type="hidden" name="category" value={category} />}
          </form>
        </div>

        {articles.length === 0 && (
          <div className="mx-auto mt-16 max-w-lg text-center">
            <p className="font-serif text-3xl">{filtered ? "No articles match." : "The first issue is being written."}</p>
            <p className="mt-3 font-serif text-lg text-ink/65">
              {filtered
                ? "Try another category or a different word."
                : "Articles appear here as soon as the editors publish them. Subscribe below and the first one will find you."}
            </p>
            {filtered ? <Link href="/blog" className="btn btn-sm mt-5">See everything</Link> : me?.role === "admin" ? <Link href="/admin/blog?edit=new" className="btn btn-sm mt-5">Write the first article</Link> : null}
          </div>
        )}

        {lead && (
          <article className="mt-10 grid gap-8 border-b border-ink/15 pb-10 lg:grid-cols-[1.25fr_1fr] lg:items-center">
            <Link href={`/blog/${lead.slug}`} className="group block overflow-hidden bg-forest">
              {lead.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lead.cover_url} alt="" className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              ) : (
                <span className="flex aspect-[16/10] items-end p-6 font-display text-[clamp(2rem,6vw,4rem)] font-extrabold leading-[0.9] text-lime">{lead.category}</span>
              )}
            </Link>
            <div>
              <p className="label-mono text-tangerine">Featured · {lead.category}</p>
              <h2 className="mt-3 font-serif text-[clamp(2rem,4.6vw,3.4rem)] font-normal leading-[1.02] tracking-[-0.025em]">
                <TransitionLink href={`/blog/${lead.slug}`} vtName={`article-${lead.slug}`} source="article" className="hover:underline">{lead.title}</TransitionLink>
              </h2>
              {lead.excerpt && <p className="mt-4 font-serif text-xl leading-snug text-ink/70">{lead.excerpt}</p>}
              <div className="mt-5"><Byline a={lead} /></div>
            </div>
          </article>
        )}

        {(second || third) && !filtered && (
          <div className="grid gap-x-10 border-b border-ink/15 md:grid-cols-2 md:divide-x md:divide-ink/15">
            {[second, third].filter(Boolean).map((a, i) => (
              <article key={a.id} className={`py-8 ${i === 1 ? "md:pl-10" : ""}`}>
                <p className="label-mono text-tangerine">{a.category}</p>
                <h2 className="mt-2 font-serif text-[1.9rem] font-normal leading-[1.08] tracking-[-0.02em]">
                  <TransitionLink href={`/blog/${a.slug}`} vtName={`article-${a.slug}`} source="article" className="hover:underline">{a.title}</TransitionLink>
                </h2>
                {a.excerpt && <p className="mt-3 font-serif text-lg leading-snug text-ink/70">{a.excerpt}</p>}
                <div className="mt-4"><Byline a={a} /></div>
              </article>
            ))}
          </div>
        )}

        {(filtered ? articles : others).length > 0 && (
          <ul className="mt-2 grid gap-x-10 md:grid-cols-2 lg:grid-cols-3">
            {(filtered ? articles : others).map((a) => (
              <li key={a.id} className="border-b border-ink/15 py-7">
                <article>
                  {a.cover_url && (
                    <Link href={`/blog/${a.slug}`} className="mb-4 block overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.cover_url} alt="" loading="lazy" className="aspect-[3/2] w-full object-cover" />
                    </Link>
                  )}
                  <p className="label-mono text-tangerine">{a.category}</p>
                  <h2 className="mt-2 font-serif text-2xl font-normal leading-[1.12] tracking-[-0.015em]">
                    <TransitionLink href={`/blog/${a.slug}`} vtName={`article-${a.slug}`} source="article" className="hover:underline">{a.title}</TransitionLink>
                  </h2>
                  {a.excerpt && <p className="mt-2 line-clamp-3 text-[0.9375rem] leading-relaxed text-ink/70">{a.excerpt}</p>}
                  <div className="mt-3"><Byline a={a} /></div>
                </article>
              </li>
            ))}
          </ul>
        )}

        <section aria-labelledby="subscribe-title" className="mt-14 grid gap-8 bg-forest px-6 py-10 text-ivory md:grid-cols-2 md:px-12 md:py-14">
          <div>
            <p className="label-mono text-lime">By email</p>
            <h2 id="subscribe-title" className="mt-3 font-serif text-[clamp(1.9rem,4vw,2.8rem)] font-normal leading-[1.02]">
              The digest: the best of these pages, <span className="serif-accent text-lime">sent to you</span>.
            </h2>
          </div>
          <div className="md:pt-4">
            <p className="text-ivory/75">Every edition is assembled from articles published here. No separate newsletter, nothing you cannot read on the site.</p>
            <SubscribeForm source="blog" tone="dark" />
          </div>
        </section>

        <section id="archive" aria-labelledby="archive-title" className="mt-16 scroll-mt-24">
          <h2 id="archive-title" className="border-b-[1.5px] border-ink pb-2 font-display text-2xl">Newsletter archive</h2>
          <p className="mt-3 max-w-2xl text-ink/70">Earlier printed and PDF editions of the alumni newsletter, kept here for the record.</p>
          {(pdfs ?? []).length === 0 ? (
            <p className="mt-5 text-sm text-ink/55">No past editions have been uploaded yet.</p>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pdfs!.map((n) => {
                const url = safeUrl(n.pdf_url);
                return (
                  <li key={n.id} className="sheet flex items-center justify-between gap-4 px-5 py-4">
                    <span>
                      <span className="label-mono text-ink/55">{n.year}</span>
                      <span className="block font-serif text-lg">{n.title ?? `${n.year} edition`}</span>
                    </span>
                    {url && <a href={url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">PDF</a>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
