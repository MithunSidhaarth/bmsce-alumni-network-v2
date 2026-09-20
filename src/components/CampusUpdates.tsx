import Link from "next/link";
import Eyebrow from "./Eyebrow";
import Reveal from "./Reveal";
import UpdateCard, { UPDATE_COLUMNS, type CampusUpdate } from "./UpdateCard";
import { createClient } from "@/lib/supabase/server";

// Homepage teaser: latest 3 items, with a friendly empty state until the
// first update is published.
export default async function CampusUpdates() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campus_updates")
    .select(UPDATE_COLUMNS)
    .order("published_at", { ascending: false })
    .limit(3)
    .returns<CampusUpdate[]>();

  return (
    <section className="border-t border-gold/30 bg-ivory-dim/40">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <Reveal>
              <Eyebrow>Right now</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-6 max-w-xl font-display text-4xl leading-[1.05] text-ink md:text-5xl">
                What&rsquo;s happening in BMSCE.
              </h2>
            </Reveal>
          </div>
          <Link
            href="/happening"
            className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
          >
            See all →
          </Link>
        </div>
        {data?.length ? (
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {data.map((u, i) => (
              <Reveal key={u.id} delay={i * 80} className="h-full">
                <UpdateCard u={u} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-2xl border border-dashed border-gold/50 bg-ivory px-6 py-14 text-center">
            <p className="font-display text-xl italic text-ink">
              Fresh updates from campus are on the way.
            </p>
            <p className="mx-auto mt-3 max-w-md font-sans text-sm leading-relaxed text-ink/65">
              Campus news and alumni initiatives will appear here as soon as
              they&rsquo;re posted.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
