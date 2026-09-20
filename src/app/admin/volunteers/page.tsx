import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin · Volunteers: BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

export default async function AdminVolunteersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("volunteer_signups")
    .select("id, name, email, batch, city, message, created_at")
    .order("created_at", { ascending: false });
  return (
    <>
      <h1 className="font-display text-[clamp(2rem,5vw,3rem)] leading-[1.02] tracking-tight text-ink">
        Volunteers.
      </h1>
      <ul className="mt-10 flex max-w-2xl flex-col gap-4">
        {(data ?? []).map((v) => (
          <li key={v.id} className="rounded-xl border border-gold/30 p-5">
            <p className="font-display text-lg text-ink">{v.name}</p>
            <p className="mt-1 font-sans text-sm text-ink/65">
              <a className="text-oxblood underline" href={`mailto:${v.email}`}>
                {v.email}
              </a>
              {v.batch && ` · Batch ${v.batch}`}
              {v.city && ` · ${v.city}`} ·{" "}
              {new Date(v.created_at).toLocaleDateString("en-IN")}
            </p>
            {v.message && (
              <p className="mt-3 whitespace-pre-line font-sans text-sm text-ink/80">
                {v.message}
              </p>
            )}
          </li>
        ))}
        {!data?.length && (
          <p className="font-sans text-base text-ink/60">No sign-ups yet.</p>
        )}
      </ul>
    </>
  );
}
