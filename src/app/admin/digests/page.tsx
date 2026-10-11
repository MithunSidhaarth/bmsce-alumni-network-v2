import type { Metadata } from "next";
import Link from "next/link";
import AdminForm, { Submit } from "@/components/v2/admin/AdminForm";
import { AdminHeader, Empty, Panel, Pill, Stat, table } from "@/components/v2/admin/ui";
import { deleteDigest, removeSubscriber, saveDigest, sendDigestNow } from "../manage";
import { requireAdmin } from "@/lib/me";
import { mailerConfigured } from "@/lib/newsletter";
import { clockTime, shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Email digests · Admin" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { tone: "good" | "warn" | "bad" | "neutral"; label: string }> = {
  draft: { tone: "neutral", label: "Draft" },
  scheduled: { tone: "warn", label: "Scheduled" },
  sending: { tone: "warn", label: "Sending" },
  sent: { tone: "good", label: "Sent" },
  failed: { tone: "bad", label: "Failed" },
};

type Digest = {
  id: string; subject: string; preheader: string | null; intro: string | null; article_ids: string[]; status: string;
  scheduled_at: string | null; sent_at: string | null; recipients: number; delivered: number; failed: number; last_error: string | null; created_at: string;
};

// yyyy-mm-ddThh:mm in India time, for <input type="datetime-local">.
const istLocal = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 16);

export default async function DigestsAdmin({ searchParams }: { searchParams: Promise<{ edit?: string; subscribers?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: digests }, { data: articles }, subs, { data: subList }] = await Promise.all([
    supabase.from("newsletter_digests").select("*").order("created_at", { ascending: false }).limit(40),
    supabase.from("articles").select("id, title, category, published_at").eq("status", "published").order("published_at", { ascending: false }).limit(40),
    supabase.from("newsletter_subscribers").select("status"),
    sp.subscribers
      ? supabase.from("newsletter_subscribers").select("id, email, status, consent_at, consent_source").order("created_at", { ascending: false }).limit(200)
      : Promise.resolve({ data: null }),
  ]);
  const rows = (digests ?? []) as Digest[];
  const editing = sp.edit && sp.edit !== "new" ? rows.find((d) => d.id === sp.edit) ?? null : null;
  const showForm = sp.edit === "new" || Boolean(editing);
  const count = (s: string) => (subs.data ?? []).filter((x) => x.status === s).length;
  const ready = mailerConfigured();
  const editable = !editing || ["draft", "scheduled", "failed"].includes(editing.status);

  return (
    <>
      <AdminHeader
        title="Email digests"
        lead="Pick published articles, add a short note, preview the email, then send it now or schedule it. Every recipient subscribed with explicit consent and every email carries a one-click unsubscribe link."
      >
        <Link href="/admin/digests?edit=new" className="btn btn-sm">New digest</Link>
      </AdminHeader>

      {!ready && (
        <div className="mb-7 rounded-md border border-[#c98a1a]/40 bg-[#fff1d6] px-5 py-4 text-sm">
          <p className="font-display text-lg font-bold">Email sending is not configured</p>
          <p className="mt-1 text-ink/80">
            Digests can be written, previewed and scheduled, but nothing will be delivered until <code className="font-mono text-xs">RESEND_API_KEY</code> and{" "}
            <code className="font-mono text-xs">NEWSLETTER_FROM</code> (a sender on a domain verified with Resend) are set in the hosting environment.
            A send attempted before then is recorded as failed, never as sent.
          </p>
        </div>
      )}

      <div className="mb-7 flex flex-wrap gap-3">
        <Stat label="Subscribers" value={count("subscribed")} hint={<Link href="/admin/digests?subscribers=1" className="underline">See the list</Link>} />
        <Stat label="Unsubscribed" value={count("unsubscribed")} />
        <Stat label="Bounced" value={count("bounced")} hint="Removed from future sends" />
        <Stat label="Digests sent" value={rows.filter((d) => d.status === "sent").length} />
      </div>

      {showForm && (
        <Panel title={editing ? `Digest: ${STATUS[editing.status]?.label}` : "New digest"} aside={<Link href="/admin/digests" className="text-sm font-semibold text-forest hover:underline">Close</Link>}>
          {(articles ?? []).length === 0 ? (
            <p className="text-sm text-ink/70">There are no published articles to send yet. <Link href="/admin/blog?edit=new" className="font-semibold text-forest underline">Write one first</Link>.</p>
          ) : (
            <AdminForm action={saveDigest} hidden={{ id: editing?.id }} className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="field-label">Subject line</span><input name="subject" defaultValue={editing?.subject ?? ""} className="field" required maxLength={200} disabled={!editable} /></label>
              <label className="sm:col-span-2"><span className="field-label">Preview text (shown after the subject in most inboxes)</span><input name="preheader" defaultValue={editing?.preheader ?? ""} className="field" maxLength={140} disabled={!editable} /></label>
              <label className="sm:col-span-2"><span className="field-label">Opening note (optional)</span><textarea name="intro" defaultValue={editing?.intro ?? ""} rows={3} className="field" disabled={!editable} /></label>
              <fieldset className="sm:col-span-2">
                <legend className="field-label">Articles to include, in this order</legend>
                <div className="max-h-64 overflow-y-auto rounded border border-ink/15 bg-ivory p-2">
                  {articles!.map((a) => (
                    <label key={a.id} className="flex items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-ink/[0.05]">
                      <input type="checkbox" name="article_ids" value={a.id} defaultChecked={editing?.article_ids.includes(a.id)} className="mt-1 h-4 w-4" disabled={!editable} />
                      <span>{a.title}<span className="block text-xs text-ink/55">{a.category} · {a.published_at ? shortDate(a.published_at) : ""}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label><span className="field-label">Schedule for (India time)</span><input type="datetime-local" name="scheduled_at" defaultValue={editing?.scheduled_at ? istLocal(editing.scheduled_at) : ""} className="field" disabled={!editable} /></label>
              <p className="self-end text-xs text-ink/60">Scheduled digests go out on the daily run at 09:00 India time, on or after the time you pick.</p>
              {editable && (
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <Submit name="intent" value="draft">Save draft</Submit>
                  <Submit name="intent" value="schedule" className="btn btn-ghost btn-sm">Save and schedule</Submit>
                </div>
              )}
            </AdminForm>
          )}
          {editing && (
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-dashed border-ink/25 pt-4">
              <a href={`/admin/digests/preview?id=${editing.id}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Preview the email</a>
              {editable && (
                <AdminForm action={sendDigestNow} hidden={{ id: editing.id }}>
                  <Submit confirm={`Send this digest to ${count("subscribed")} subscriber(s) now? This cannot be undone.`}>Send now</Submit>
                </AdminForm>
              )}
              {editing.status !== "sending" && (
                <AdminForm action={deleteDigest} hidden={{ id: editing.id }}>
                  <Submit className="text-sm font-semibold text-pin underline" confirm="Delete this digest?">Delete</Submit>
                </AdminForm>
              )}
              {editing.last_error && <p className="basis-full text-sm text-pin">Last error: {editing.last_error}</p>}
            </div>
          )}
        </Panel>
      )}

      {rows.length === 0 ? (
        <Empty>No digests yet.</Empty>
      ) : (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead><tr><th className={table.th}>Digest</th><th className={table.th}>Status</th><th className={table.th}>When</th><th className={table.th}>Delivered</th><th className={table.th}>Failed</th></tr></thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td className={table.td}>
                    <Link href={`/admin/digests?edit=${d.id}`} className="font-semibold hover:underline">{d.subject}</Link>
                    <p className="text-xs text-ink/55">{d.article_ids.length} article{d.article_ids.length === 1 ? "" : "s"}</p>
                    {d.last_error && <p className="mt-1 max-w-md text-xs text-pin">{d.last_error}</p>}
                  </td>
                  <td className={table.td}><Pill tone={STATUS[d.status]?.tone}>{STATUS[d.status]?.label ?? d.status}</Pill></td>
                  <td className={table.td}>
                    {d.sent_at ? `Sent ${shortDate(d.sent_at)}` : d.scheduled_at ? `Due ${shortDate(d.scheduled_at)} ${clockTime(d.scheduled_at)}` : `Created ${shortDate(d.created_at)}`}
                  </td>
                  <td className={table.td}>{d.delivered}</td>
                  <td className={table.td}>{d.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subList && (
        <Panel title="Subscribers" aside={<Link href="/admin/digests" className="text-sm font-semibold text-forest hover:underline">Close</Link>}>
          {subList.length === 0 ? (
            <p className="text-sm text-ink/60">Nobody has subscribed yet. The sign-up form is in the site footer and on Blog &amp; Insights.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-ink/10 text-sm">
              {subList.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <span>{s.email} <span className="text-xs text-ink/55">· consent {shortDate(s.consent_at)} via {s.consent_source}</span></span>
                  <span className="flex items-center gap-3">
                    <Pill tone={s.status === "subscribed" ? "good" : s.status === "bounced" ? "bad" : "neutral"}>{s.status}</Pill>
                    <AdminForm action={removeSubscriber} hidden={{ id: s.id }}><Submit className="text-xs font-semibold text-pin underline" confirm="Remove this address completely?">Remove</Submit></AdminForm>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </>
  );
}
