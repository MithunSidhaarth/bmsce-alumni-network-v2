import type { Metadata } from "next";
import Link from "next/link";
import AdminList from "./AdminList";
import CareersToggle from "./CareersToggle";
import { createClient } from "@/lib/supabase/server";
import { getCareersEnabled } from "@/lib/settings";
import type { Profile, VerificationStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Admin — BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

type Tab = "pending" | "rejected" | "verified";

const TABS: { key: Tab; label: string; status: VerificationStatus }[] = [
  { key: "pending", label: "Pending", status: "unverified" },
  { key: "rejected", label: "Rejected", status: "rejected" },
  { key: "verified", label: "Verified", status: "verified" },
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();

  const tabKey = ((await searchParams).tab ?? "pending") as Tab;
  const active = TABS.find((t) => t.key === tabKey) ?? TABS[0];

  // Counts for the tab labels + overview stat cards.
  const counts: Record<Tab, number> = {
    pending: 0,
    rejected: 0,
    verified: 0,
  };
  const [, eventsUpcoming, galleryTotal] = await Promise.all([
    Promise.all(
      TABS.map(async (t) => {
        let q = supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("verification_status", t.status);
        if (t.key !== "rejected") q = q.eq("user_type", "alumni");
        const { count } = await q;
        counts[t.key] = count ?? 0;
      })
    ),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .gte("event_date", new Date().toISOString())
      .then((r) => r.count ?? 0),
    supabase
      .from("gallery_photos")
      .select("id", { count: "exact", head: true })
      .then((r) => r.count ?? 0),
  ]);

  let listQuery = supabase
    .from("profiles")
    .select("*")
    .eq("verification_status", active.status)
    .order("created_at", { ascending: false });
  // Rejected can include students too; pending/verified lists are alumni.
  if (active.key !== "rejected") {
    listQuery = listQuery.eq("user_type", "alumni");
  }
  const { data: members } = await listQuery.returns<Profile[]>();
  const memberList = members ?? [];

  const careersEnabled = await getCareersEnabled();

  // Contact info lives in member_contacts now; admins may read all of it.
  const contacts: Record<
    string,
    { personal_email: string | null; college_email: string | null }
  > = {};
  if (memberList.length) {
    const { data: contactRows } = await supabase
      .from("member_contacts")
      .select("member_id, personal_email, college_email")
      .in(
        "member_id",
        memberList.map((m) => m.id)
      );
    for (const c of contactRows ?? [])
      contacts[c.member_id as string] = {
        personal_email: (c.personal_email as string) ?? null,
        college_email: (c.college_email as string) ?? null,
      };
  }

  const stats: {
    label: string;
    value: number;
    href: string;
    tone?: "accent";
  }[] = [
    {
      label: "Pending review",
      value: counts.pending,
      href: "/admin?tab=pending",
      tone: counts.pending > 0 ? "accent" : undefined,
    },
    { label: "Verified alumni", value: counts.verified, href: "/admin?tab=verified" },
    { label: "Upcoming events", value: eventsUpcoming, href: "/admin/events" },
    { label: "Gallery photos", value: galleryTotal, href: "/admin/gallery" },
  ];

  return (
    <>
      <h1 className="font-display text-[clamp(2rem,5vw,3rem)] leading-[1.02] tracking-tight text-ink">
        Overview.
      </h1>
      <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-ink/70">
        Review alumni who&rsquo;ve completed their profile. Approving adds
        them to the directory; rejecting hides them with an optional note.
      </p>

      {/* Stat cards */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-xl border border-gold/25 bg-ivory-dim/50 p-4 transition-colors hover:border-oxblood/40 hover:bg-ivory-dim"
          >
            <p
              className={`font-display text-3xl ${
                s.tone === "accent" ? "text-accent" : "text-ink"
              }`}
            >
              {s.value}
            </p>
            <p className="mt-1 font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink/55">
              {s.label}
            </p>
          </Link>
        ))}
      </div>

      {/* Tabs */}
      <div className="mt-10 flex gap-1 border-b border-gold/30">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin?tab=${t.key}`}
            className={`-mb-px border-b-2 px-4 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.12em] transition-colors ${
              active.key === t.key
                ? "border-oxblood text-oxblood"
                : "border-transparent text-ink/55 hover:text-oxblood"
            }`}
          >
            {t.label}
            <span className="ml-2 text-ink/40">{counts[t.key]}</span>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <AdminList members={memberList} contacts={contacts} tab={active.key} />
      </div>

      {/* Site settings */}
      <div className="mt-16 border-t border-gold/25 pt-10">
        <h2 className="font-display text-2xl text-ink md:text-3xl">
          Site settings
        </h2>
        <div className="mt-6">
          <CareersToggle enabled={careersEnabled} />
        </div>
      </div>
    </>
  );
}
