import type { Metadata } from "next";
import Link from "next/link";
import NewsletterAdmin from "./NewsletterAdmin";
import { createClient } from "@/lib/supabase/server";
import type { Newsletter } from "@/lib/types";

export const metadata: Metadata = {
  title: "Admin · Newsletters — BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

export default async function AdminNewslettersPage() {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("newsletters")
    .select("*")
    .order("year", { ascending: false })
    .order("uploaded_at", { ascending: false })
    .returns<Newsletter[]>();

  return (
    <>
      <h1 className="font-display text-[clamp(2rem,5vw,3rem)] leading-[1.02] tracking-tight text-ink">
        Upload a newsletter.
      </h1>
      <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-ink/70">
        Add a past newsletter as a PDF and tag it with a year (and an
        optional title if there&rsquo;s more than one that year). It appears
        in the archive on the public{" "}
        <Link
          href="/newsletter"
          className="text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
        >
          Newsletter page
        </Link>{" "}
        right away.
      </p>
      <div className="mt-10">
        <NewsletterAdmin existing={existing ?? []} />
      </div>
    </>
  );
}
