import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import Reveal from "@/components/Reveal";
import UpdateCard, {
  UPDATE_COLUMNS,
  type CampusUpdate,
} from "@/components/UpdateCard";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "What's happening in BMSCE: BMSCE Alumni Network",
  description:
    "Campus news and alumni initiatives from BMS College of Engineering.",
};

export const dynamic = "force-dynamic";

export default async function HappeningPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campus_updates")
    .select(UPDATE_COLUMNS)
    .order("published_at", { ascending: false })
    .returns<CampusUpdate[]>();

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-7xl px-6 pb-24 pt-20 md:px-10 md:pt-28">
            <Reveal>
              <Eyebrow>Right now</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 font-display text-[clamp(2.5rem,7vw,4.5rem)] leading-[1.02] tracking-tight text-ink">
                What&rsquo;s happening in BMSCE.
              </h1>
            </Reveal>
            {data?.length ? (
              <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {data.map((u) => (
                  <UpdateCard key={u.id} u={u} />
                ))}
              </div>
            ) : (
              <p className="mt-10 max-w-xl font-sans text-base text-ink/65">
                Nothing posted yet. Campus news and alumni initiatives will
                appear here.
              </p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
