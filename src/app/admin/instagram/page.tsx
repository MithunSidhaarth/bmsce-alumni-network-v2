import type { Metadata } from "next";
import AdminForm, { Submit } from "@/components/v2/admin/AdminForm";
import { AdminHeader, Empty, Panel, Pill, Stat, table } from "@/components/v2/admin/ui";
import {
  importStarterContent,
  retryInstagramFailures,
  saveInstagramHandle,
  saveInstagramToken,
  setInstagramHidden,
  syncInstagramNow,
} from "../manage";
import { requireAdmin } from "@/lib/me";
import { clockTime, shortDate, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Instagram · Admin" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { tone: "good" | "warn" | "bad"; label: string }> = {
  success: { tone: "good", label: "Success" },
  partial: { tone: "warn", label: "Partial" },
  failed: { tone: "bad", label: "Failed" },
  not_configured: { tone: "warn", label: "Not connected" },
};

export default async function InstagramAdmin() {
  const { supabase } = await requireAdmin();
  const [connection, settings, runs, failures, apiCount, seedCount, posts] = await Promise.all([
    supabase.rpc("ig_connection"),
    supabase.from("site_settings").select("ig_handle, ig_auto_publish").eq("id", 1).maybeSingle(),
    supabase.from("ig_sync_runs").select("*").order("id", { ascending: false }).limit(12),
    supabase.from("ig_sync_failures").select("id, media_id, error, attempts, last_attempt_at").is("resolved_at", null).order("last_attempt_at", { ascending: false }).limit(30),
    supabase.from("social_posts").select("id", { count: "exact", head: true }).eq("source", "api"),
    supabase.from("social_posts").select("id", { count: "exact", head: true }).neq("source", "api"),
    supabase.from("social_posts").select("id, caption, image_url, thumbnail_url, permalink, posted_at, source, is_hidden").order("posted_at", { ascending: false }).limit(24),
  ]);

  const conn = (connection.data ?? {}) as { has_stored_token?: boolean; expires_at?: string | null; server_secret_set?: boolean };
  const envToken = Boolean(process.env.INSTAGRAM_ACCESS_TOKEN);
  const hasToken = Boolean(conn.has_stored_token) || envToken;
  const cronReady = Boolean(process.env.CRON_SECRET && process.env.APP_SERVER_SECRET);
  const all = runs.data ?? [];
  const lastAttempt = all[0];
  const lastSuccess = all.find((r) => r.status === "success" || r.status === "partial");
  const lastWithItems = all.find((r) => r.fetched > 0);
  const handle = settings.data?.ig_handle ?? "bmscealumni";

  // One honest sentence about where the automation stands.
  const state = !hasToken
    ? { tone: "warn" as const, title: "Awaiting account authorisation", text: "No Meta access token is configured, so nothing is being imported automatically. The Wall is showing the archive that ships with the site." }
    : !lastSuccess
    ? { tone: "warn" as const, title: "Connected, not yet verified", text: "A token is configured but no sync has succeeded yet. Run a sync now to test it." }
    : !cronReady
    ? { tone: "warn" as const, title: "Manual only", text: "Syncing works, but the scheduled run cannot authenticate: CRON_SECRET or APP_SERVER_SECRET is missing in this environment." }
    : lastAttempt?.status === "failed"
    ? { tone: "bad" as const, title: "Failing", text: `The last sync failed: ${lastAttempt.error ?? "unknown error"}` }
    : { tone: "good" as const, title: "Fully operational", text: "New posts are imported on the daily schedule and appear on The Wall." };

  return (
    <>
      <AdminHeader
        title="Instagram"
        lead={<>Imports posts from <strong>@{handle}</strong> through Meta&rsquo;s official Instagram API. Imported posts are read only here: captions and photographs always come from Instagram, and each card links back to the original.</>}
      >
        <AdminForm action={syncInstagramNow}>
          <Submit>Sync now</Submit>
        </AdminForm>
      </AdminHeader>

      <div className={`mb-7 rounded-md border px-5 py-4 ${state.tone === "good" ? "border-blue bg-white" : state.tone === "bad" ? "border-red bg-white" : "border-mist bg-white"}`}>
        <p className="font-display text-lg font-bold">Status: {state.title}</p>
        <p className="mt-1 text-sm text-ink/80">{state.text}</p>
      </div>

      <div className="mb-7 flex flex-wrap gap-3">
        <Stat label="Connection" value={hasToken ? "Token set" : "No token"} hint={conn.has_stored_token ? (conn.expires_at ? `Stored token, refreshes before ${shortDate(conn.expires_at)}` : "Stored in the database") : envToken ? "From INSTAGRAM_ACCESS_TOKEN" : "Add one below"} />
        <Stat label="Last successful sync" value={lastSuccess ? timeAgo(lastSuccess.finished_at) : "Never"} hint={lastSuccess ? `${shortDate(lastSuccess.finished_at)} ${clockTime(lastSuccess.finished_at)}` : undefined} />
        <Stat label="Last attempt" value={lastAttempt ? timeAgo(lastAttempt.finished_at) : "Never"} hint={lastAttempt ? STATUS[lastAttempt.status]?.label : undefined} />
        <Stat label="Imported posts" value={apiCount.count ?? 0} hint={`plus ${seedCount.count ?? 0} from the archive`} />
        <Stat label="New in last sync" value={lastWithItems?.new_count ?? 0} hint={lastWithItems ? `${lastWithItems.fetched} checked` : undefined} />
        <Stat label="Failed imports" value={failures.data?.length ?? 0} hint="Unresolved records" />
      </div>

      <Panel
        title={`Failed records (${failures.data?.length ?? 0})`}
        aside={(failures.data?.length ?? 0) > 0 ? <AdminForm action={retryInstagramFailures}><Submit className="btn btn-ghost btn-sm">Retry failed records</Submit></AdminForm> : undefined}
      >
        {(failures.data ?? []).length === 0 ? (
          <p className="text-sm text-ink/70">No failed imports. If one post cannot be stored, it is listed here with the reason while the rest of the sync continues.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {failures.data!.map((f) => (
              <li key={f.id} className="rounded border border-ink/10 px-3 py-2">
                <span className="font-mono text-xs">{f.media_id}</span> · {f.attempts} attempt{f.attempts === 1 ? "" : "s"} · last {shortDate(f.last_attempt_at)}
                <span className="block text-pin">{f.error}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Sync history">
        {all.length === 0 ? (
          <Empty>No sync has run yet.</Empty>
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead><tr><th className={table.th}>When</th><th className={table.th}>Trigger</th><th className={table.th}>Result</th><th className={table.th}>Checked</th><th className={table.th}>New</th><th className={table.th}>Refreshed</th><th className={table.th}>Failed</th><th className={table.th}>Detail</th></tr></thead>
              <tbody>
                {all.map((r) => (
                  <tr key={r.id}>
                    <td className={table.td}>{shortDate(r.finished_at)} <span className="text-xs text-ink/70">{clockTime(r.finished_at)}</span></td>
                    <td className={table.td}>{r.trigger}</td>
                    <td className={table.td}><Pill tone={STATUS[r.status]?.tone ?? "warn"}>{STATUS[r.status]?.label ?? r.status}</Pill></td>
                    <td className={table.td}>{r.fetched}</td>
                    <td className={table.td}>{r.new_count}</td>
                    <td className={table.td}>{r.updated_count}</td>
                    <td className={table.td}>{r.failed_count}</td>
                    <td className={`${table.td} max-w-xs text-xs text-ink/70`}>{r.error ?? (r.attempts > 1 ? `Succeeded after ${r.attempts} attempts` : "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-x-7 lg:grid-cols-2">
        <Panel title="Connect the account">
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink/80">
            <li>The Instagram account must be a <strong>professional</strong> account (Business or Creator). Switch it in the Instagram app under Settings, Account type and tools.</li>
            <li>In Meta for Developers, create an app with the <strong>Instagram</strong> product (&ldquo;API setup with Instagram login&rdquo;) and add the account as a tester or owner.</li>
            <li>Generate a long-lived access token for the account with the <code className="font-mono text-xs">instagram_business_basic</code> permission.</li>
            <li>Paste the token below (it is stored in a private database schema and refreshed automatically before it expires), or set <code className="font-mono text-xs">INSTAGRAM_ACCESS_TOKEN</code> in the hosting environment.</li>
            <li>Press <strong>Sync now</strong>. From then on the daily schedule keeps The Wall up to date.</li>
          </ol>
          <p className="mt-3 text-xs text-ink/70">
            Using a Facebook Page instead? Set <code className="font-mono">INSTAGRAM_USER_ID</code> to the Instagram business account id and use a system-user token with <code className="font-mono">instagram_basic</code> and <code className="font-mono">pages_read_engagement</code>.
          </p>
          <AdminForm action={saveInstagramToken} className="mt-4 flex flex-col gap-2">
            <label><span className="field-label">Access token</span><input name="token" type="password" autoComplete="off" className="field" placeholder={conn.has_stored_token ? "A token is stored. Paste a new one to replace it." : "Paste the long-lived token"} /></label>
            <div className="flex flex-wrap gap-2">
              <Submit>Store token</Submit>
              {conn.has_stored_token && <Submit name="remove" value="1" className="btn btn-ghost btn-sm" confirm="Remove the stored token? Automatic imports will stop.">Remove stored token</Submit>}
            </div>
            <p className="text-xs text-ink/70">The token is never shown again and never sent to the browser.</p>
          </AdminForm>
        </Panel>

        <Panel title="Account and schedule">
          <AdminForm action={saveInstagramHandle} className="flex flex-wrap items-end gap-2">
            <label className="min-w-[12rem] flex-1"><span className="field-label">Official account username</span><input name="handle" defaultValue={handle} className="field" /></label>
            <Submit>Save</Submit>
          </AdminForm>
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-ink/70">Schedule</dt><dd>Daily at 07:00 India time (<code className="font-mono text-xs">vercel.json</code>, <code className="font-mono text-xs">/api/cron/instagram</code>)</dd>
            <dt className="text-ink/70">Scheduled run can authenticate</dt><dd>{cronReady ? <Pill tone="good">Yes</Pill> : <Pill tone="bad">Missing CRON_SECRET or APP_SERVER_SECRET</Pill>}</dd>
            <dt className="text-ink/70">New imports</dt><dd>{settings.data?.ig_auto_publish === false ? "Wait for approval (change under The Wall)" : "Shown on The Wall straight away (change under The Wall)"}</dd>
            <dt className="text-ink/70">Duplicates</dt><dd>Matched on Instagram&rsquo;s media id, then on the post shortcode</dd>
            <dt className="text-ink/70">Media</dt><dd>Linked from Meta&rsquo;s CDN and refreshed every sync; not copied</dd>
          </dl>
          {(seedCount.count ?? 0) === 0 && (
            <AdminForm action={importStarterContent} className="mt-5">
              <p className="mb-2 text-sm text-ink/70">The archive of earlier posts that ships with the site has not been loaded.</p>
              <Submit className="btn btn-ghost btn-sm">Load the Instagram archive and chapter list</Submit>
            </AdminForm>
          )}
        </Panel>
      </div>

      <Panel title="Recent posts on this site">
        {(posts.data ?? []).length === 0 ? (
          <Empty>No Instagram posts stored yet.</Empty>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {posts.data!.map((p) => (
              <li key={p.id} className={p.is_hidden ? "opacity-50" : ""}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumbnail_url ?? p.image_url ?? ""} alt="Picture from an imported Instagram post" loading="lazy" className="aspect-square w-full rounded bg-ivory-dim object-cover" />
                <p className="mt-1.5 line-clamp-2 text-xs text-ink/70">{p.caption}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <Pill>{p.source === "api" ? "Imported" : "Archive"}</Pill>
                  {p.permalink && <a href={p.permalink} target="_blank" rel="noreferrer" className="font-semibold text-forest underline">Original</a>}
                </p>
                <AdminForm action={setInstagramHidden} hidden={{ id: p.id, hidden: p.is_hidden ? "0" : "1" }}>
                  <Submit className="mt-1 text-xs font-semibold text-ink/70 underline hover:text-ink">{p.is_hidden ? "Show on this site" : "Hide on this site"}</Submit>
                </AdminForm>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
