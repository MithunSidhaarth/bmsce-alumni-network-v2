import type { Metadata } from "next";
import HappeningAdmin from "./HappeningAdmin";
import { UPDATE_COLUMNS, type CampusUpdate } from "@/components/UpdateCard";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin · What's happening: BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

export default async function AdminHappeningPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campus_updates")
    .select(UPDATE_COLUMNS)
    .order("published_at", { ascending: false })
    .returns<CampusUpdate[]>();
  return (
    <>
      <h1 className="font-display text-[clamp(2rem,5vw,3rem)] leading-[1.02] tracking-tight text-ink">
        What&rsquo;s happening in BMSCE.
      </h1>
      <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-ink/70">
        Posts appear on the public /happening page and the homepage.
      </p>
      <div className="mt-10">
        <HappeningAdmin items={data ?? []} />
      </div>
    </>
  );
}
