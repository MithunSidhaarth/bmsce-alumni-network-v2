import type { Metadata } from "next";
import Link from "next/link";
import SeriesChart from "@/components/v2/admin/SeriesChart";
import { AdminHeader, Empty, Panel, Pill, Stat, table } from "@/components/v2/admin/ui";
import { requireAdmin } from "@/lib/me";
import { shortDate, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Admin: BMSCE Alumni Network" };
export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90, 365];

type Metrics = {
  range_days: number;
  members: { total: number; students: number; alumni: number; verified: number; pending: number; suspended: number; new_in_range: number; students_without_date: number };
  active: { today: number; d7: number; d30: number; in_range: number; students_in_range: number; alumni_in_range: number };
  series: { day: string; registrations: number; active: number; posts: number; comments: number }[];
  content: { posts: number; discussions: number; comments: number; posts_in_range: number; comments_in_range: number; open_reports: number; messages_in_range: number };
  chapters: { name: string; slug: string; members: number; pending: number; posts: number }[];
  events: { upcoming: number; rsvps_going: number; rsvps_in_range: number };
  blog: { published: number; drafts: number; views_in_range: number; top: { title: string; slug: string; views: number }[] };
  newsletter: { subscribed: number; unsubscribed: number; bounced: number; digests_sent: number; delivered: number; failed: number };
  instagram: { imported: number; archive: number; open_failures: number; last_success: string | null; last_attempt: string | null; last_status: string | null };
  lifecycle: { last_run: string | null; last_ok: boolean | null; graduated_in_range: number; due_next_30: number; on_hold: number };
};

export default async function AdminOverview({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { supabase } = await requireAdmin();
  const days = RANGES.includes(Number((await searchParams).range)) ? Number((await searchParams).range) : 30;
  const { data, error } = await supabase.rpc("admin_metrics", { p_days: days });
  const m = data as Metrics | null;

  if (error || !m) {
    return (
      <>
        <AdminHeader title="Analytics" />
        <Empty>The numbers could not be loaded: {error?.message ?? "no data returned"}.</Empty>
      </>
    );
  }

  const dayList = m.series.map((s) => s.day);
  const label = days === 365 ? "12 months" : `${days} days`;
  const topChapters = m.chapters.filter((c) => c.members > 0 || c.posts > 0).slice(0, 8);

  return (
    <>
      <AdminHeader
        title="Analytics"
        lead="Live counts from the database. Activity is recorded once per member per day, in India Standard Time. Nothing on this page is estimated or sampled."
      >
        <div role="group" aria-label="Date range" className="flex gap-1.5">
          {RANGES.map((r) => (
            <Link key={r} href={r === 30 ? "/admin" : `/admin?range=${r}`} data-active={days === r} className="chip">
              {r === 365 ? "12 months" : `${r} days`}
            </Link>
          ))}
        </div>
      </AdminHeader>

      <div className="mb-7 flex flex-wrap gap-3">
        <Stat label="Registered members" value={m.members.total} hint={`${m.members.new_in_range} joined in the last ${label}`} />
        <Stat label="Alumni" value={m.members.alumni} hint={`${m.active.alumni_in_range} active in ${label}`} />
        <Stat label="Students" value={m.members.students} hint={`${m.active.students_in_range} active in ${label}`} />
        <Stat label="Active members" value={m.active.in_range} hint={`Today ${m.active.today} · 7 days ${m.active.d7} · 30 days ${m.active.d30}`} />
        <Stat
          label="Awaiting verification"
          value={m.members.pending}
          hint={<Link href="/admin/review" className="underline">Open the queue</Link>}
        />
      </div>

      <div className="mb-7 flex flex-wrap gap-4">
        <SeriesChart title="New registrations per day" days={dayList} series={[{ name: "Registrations", values: m.series.map((s) => s.registrations) }]} />
        <SeriesChart title="Active members per day" days={dayList} series={[{ name: "Active members", values: m.series.map((s) => s.active) }]} />
        <SeriesChart
          title="Posts and replies per day"
          days={dayList}
          series={[
            { name: "Posts", values: m.series.map((s) => s.posts) },
            { name: "Replies", values: m.series.map((s) => s.comments) },
          ]}
        />
      </div>

      <div className="grid gap-x-7 lg:grid-cols-2">
        <Panel title="Community">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Row k="Posts, all time" v={m.content.posts} />
            <Row k={`Posts, last ${label}`} v={m.content.posts_in_range} />
            <Row k="Forum discussions" v={m.content.discussions} />
            <Row k="Replies, all time" v={m.content.comments} />
            <Row k={`Replies, last ${label}`} v={m.content.comments_in_range} />
            <Row k={`Direct messages, last ${label}`} v={m.content.messages_in_range} />
            <Row k="Open reports" v={m.content.open_reports} />
            <Row k="Suspended accounts" v={m.members.suspended} />
          </dl>
        </Panel>

        <Panel title="Events, blog and email">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Row k="Upcoming events" v={m.events.upcoming} />
            <Row k={`Event RSVPs, last ${label}`} v={m.events.rsvps_in_range} />
            <Row k="Published articles" v={m.blog.published} />
            <Row k={`Article reads, last ${label}`} v={m.blog.views_in_range} />
            <Row k="Email subscribers" v={m.newsletter.subscribed} />
            <Row k="Unsubscribed / bounced" v={`${m.newsletter.unsubscribed} / ${m.newsletter.bounced}`} />
            <Row k="Digests sent" v={m.newsletter.digests_sent} />
            <Row k="Emails delivered / failed" v={`${m.newsletter.delivered} / ${m.newsletter.failed}`} />
          </dl>
          {m.blog.top.some((a) => a.views > 0) && (
            <>
              <p className="label-mono mt-5 text-ink/70">Most read articles</p>
              <ol className="mt-2 flex flex-col gap-1 text-sm">
                {m.blog.top.filter((a) => a.views > 0).map((a) => (
                  <li key={a.slug} className="flex justify-between gap-4">
                    <Link href={`/blog/${a.slug}`} className="truncate underline">{a.title}</Link>
                    <span className="font-mono text-ink/70">{a.views}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Panel>

        <Panel title="Chapter participation" aside={<Link href="/admin/chapters" className="text-sm font-semibold text-forest underline">Manage</Link>}>
          {topChapters.length === 0 ? (
            <p className="text-sm text-ink/70">No chapter has members or posts yet.</p>
          ) : (
            <div className={table.wrap}>
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className={table.th}>Chapter</th>
                    <th className={table.th}>Members</th>
                    <th className={table.th}>Requests</th>
                    <th className={table.th}>Posts</th>
                  </tr>
                </thead>
                <tbody>
                  {topChapters.map((c) => (
                    <tr key={c.slug}>
                      <td className={table.td}><Link href={`/chapters/${c.slug}`} className="font-semibold underline">{c.name}</Link></td>
                      <td className={table.td}>{c.members}</td>
                      <td className={table.td}>{c.pending}</td>
                      <td className={table.td}>{c.posts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Automation health">
          <ul className="flex flex-col gap-4 text-sm">
            <li className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <span className="font-semibold">Student to alumni job</span>
                <span className="block text-xs text-ink/70">
                  {m.lifecycle.last_run ? `Last run: ${timeAgo(m.lifecycle.last_run)}` : "Has not run yet"} · {m.lifecycle.graduated_in_range} graduated in {label} · {m.lifecycle.due_next_30} due in 30 days · {m.lifecycle.on_hold} on hold
                </span>
              </span>
              {m.lifecycle.last_ok === null ? <Pill>Waiting for first run</Pill> : m.lifecycle.last_ok ? <Pill tone="good">Healthy</Pill> : <Pill tone="bad">Last run failed</Pill>}
            </li>
            <li className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <span className="font-semibold">Instagram import</span>
                <span className="block text-xs text-ink/70">
                  {m.instagram.imported} imported by API · {m.instagram.archive} from the archive · {m.instagram.open_failures} failed records ·{" "}
                  {m.instagram.last_success ? `last success ${shortDate(m.instagram.last_success)}` : "no successful sync yet"}
                </span>
              </span>
              {m.instagram.last_status === "success" ? (
                <Pill tone="good">Syncing</Pill>
              ) : m.instagram.last_status === "partial" ? (
                <Pill tone="warn">Partial</Pill>
              ) : m.instagram.last_status === "failed" ? (
                <Pill tone="bad">Failing</Pill>
              ) : (
                <Pill tone="warn">Not connected</Pill>
              )}
            </li>
            {m.members.students_without_date > 0 && (
              <li className="rounded border border-dashed border-ink/25 px-3 py-2 text-ink/75">
                {m.members.students_without_date} student{m.members.students_without_date === 1 ? " has" : "s have"} no passing-out date and will not graduate automatically.{" "}
                <Link href="/admin/lifecycle" className="font-semibold text-forest underline">Review them</Link>
              </li>
            )}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: number | string }) {
  return (
    <div>
      <dt className="text-xs text-ink/70">{k}</dt>
      <dd className="font-display text-xl font-bold">{v}</dd>
    </div>
  );
}
