import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ArticleBody from "@/components/v2/blog/ArticleBody";
import ArticleTools from "@/components/v2/blog/ArticleTools";
import Avatar from "@/components/v2/Avatar";
import Icon from "@/components/v2/Icon";
import { getMe } from "@/lib/me";
import { ARTICLE_CARD, type ArticleCard } from "@/lib/blog";
import { longDate } from "@/lib/format";
import type { Article } from "@/lib/types";
import { vt } from "@/lib/vt";

export const dynamic = "force-dynamic";

const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function load(slug: string) {
  const { supabase, me } = await getMe();
  // RLS returns drafts to admins only, so they can preview before publishing.
  const { data } = await supabase.from("articles").select("*").eq("slug", slug).maybeSingle();
  return { supabase, me, article: data as Article | null };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { article } = await load(slug);
  if (!article) return { title: "Article not found: BMSCE Alumni Network" };
  const description = article.excerpt ?? article.body_md.replace(/[#*_>`\[\]()]/g, "").slice(0, 160);
  return {
    title: `${article.title}: BMSCE Alumni Network`,
    description,
    alternates: { canonical: `/blog/${article.slug}` },
    robots: article.status === "published" ? undefined : { index: false, follow: false },
    openGraph: {
      type: "article",
      title: article.title,
      description,
      url: `/blog/${article.slug}`,
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at,
      authors: article.author_name ? [article.author_name] : undefined,
      section: article.category,
      tags: article.tags,
      images: article.cover_url ? [{ url: article.cover_url }] : undefined,
    },
    twitter: { card: article.cover_url ? "summary_large_image" : "summary", title: article.title, description },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, me, article } = await load(slug);
  if (!article) notFound();

  const [{ data: related }, author] = await Promise.all([
    supabase
      .from("articles")
      .select(ARTICLE_CARD)
      .eq("status", "published")
      .eq("category", article.category)
      .neq("id", article.id)
      .order("published_at", { ascending: false })
      .limit(3),
    // The author's member profile is only readable by signed-in members.
    article.author_id && me
      ? supabase.from("profiles").select("id, full_name, photo_url, job_title, company, graduation_year").eq("id", article.author_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const more = (related ?? []) as ArticleCard[];
  const profile = author.data;
  const authorName = article.author_name ?? profile?.full_name ?? "BMSCE Alumni Network";
  const authorLine =
    article.author_title ??
    ([profile?.job_title, profile?.company].filter(Boolean).join(" at ") || (profile?.graduation_year ? `Class of ${profile.graduation_year}` : null));

  return (
    <>
      <Nav />
      <main className="pb-20">
        <article>
          <header {...vt(`article-${article.slug}`)} className="mx-auto max-w-[46rem] px-5 pt-8 md:pt-14">
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/70 hover:text-ink">
              <Icon name="back" className="h-4 w-4" /> Blog &amp; Insights
            </Link>
            {article.status !== "published" && (
              <p className="stamp ml-4 text-tangerine">{article.status === "draft" ? "Draft: only admins can see this" : "Archived"}</p>
            )}
            <p className="label-mono mt-8 text-tangerine">
              <Link href={`/blog?category=${encodeURIComponent(article.category)}`} className="underline">{article.category}</Link>
            </p>
            <h1 className="mt-3 font-serif text-[clamp(2.3rem,6.2vw,4rem)] font-normal leading-[1.02] tracking-[-0.03em]">{article.title}</h1>
            {article.excerpt && <p className="mt-5 font-serif text-[1.35rem] leading-snug text-ink/70">{article.excerpt}</p>}
            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-ink/15 py-4">
              <Avatar name={authorName} src={profile?.photo_url} size={44} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">
                  {profile ? <Link href={`/directory/${profile.id}`} className="underline">{authorName}</Link> : authorName}
                </p>
                {authorLine && <p className="text-sm text-ink/70">{authorLine}</p>}
              </div>
              <p className="label-mono text-ink/70">
                {article.published_at ? <time dateTime={article.published_at}>{longDate(article.published_at)}</time> : "Not published"} · {article.reading_minutes} min read
              </p>
            </div>
          </header>

          {article.cover_url && (
            <figure className="mx-auto mt-8 max-w-[62rem] px-0 md:px-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.cover_url} alt={`Cover picture for “${article.title}”`} className="max-h-[34rem] w-full object-cover md:rounded-box" />
            </figure>
          )}

          <div className="mx-auto mt-10 max-w-[42rem] px-5">
            <ArticleBody markdown={article.body_md} />
            {article.tags.length > 0 && (
              <ul className="mt-10 flex flex-wrap gap-2">
                {article.tags.map((t) => (
                  <li key={t} className="label-mono rounded-sm bg-ink/[0.06] px-2 py-1 text-ink/70">{t}</li>
                ))}
              </ul>
            )}
            <ArticleTools slug={article.slug} title={article.title} url={`${site}/blog/${article.slug}`} count={article.status === "published"} />
          </div>
        </article>

        {more.length > 0 && (
          <section aria-labelledby="related-title" className="mx-auto mt-16 max-w-[1180px] px-5 md:px-10">
            <h2 id="related-title" className="border-b-[1.5px] border-ink pb-2 font-display text-2xl">More in {article.category}</h2>
            <ul className="grid gap-x-10 md:grid-cols-3">
              {more.map((a) => (
                <li key={a.id} className="border-b border-ink/15 py-6">
                  <p className="label-mono text-ink/70">{a.published_at ? longDate(a.published_at) : ""} · {a.reading_minutes} min</p>
                  <h3 className="mt-2 font-serif text-[1.45rem] font-normal leading-[1.12]">
                    <Link href={`/blog/${a.slug}`} className="underline">{a.title}</Link>
                  </h3>
                  {a.excerpt && <p className="mt-2 line-clamp-2 text-sm text-ink/70">{a.excerpt}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
