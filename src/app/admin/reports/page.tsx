import { longDate } from "@/lib/format";
import type { Metadata } from "next";
import Link from "next/link";
import ReportActions from "./ReportActions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin · Reports: BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

type ReportRow = {
  id: string;
  reporter_id: string | null;
  target_type:
    | "posting"
    | "profile"
    | "mentor"
    | "discussion_post"
    | "discussion_comment";
  target_id: string;
  reason: string | null;
  created_at: string;
};

export default async function AdminReportsPage() {
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("reports")
    .select("id, reporter_id, target_type, target_id, reason, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .returns<ReportRow[]>();

  const list = reports ?? [];

  // Resolve reporter names + a friendly target label.
  const profileIds = new Set<string>();
  const postingIds = new Set<string>();
  const discPostIds = new Set<string>();
  const discCommentIds = new Set<string>();
  for (const r of list) {
    if (r.reporter_id) profileIds.add(r.reporter_id);
    if (r.target_type === "posting") postingIds.add(r.target_id);
    else if (r.target_type === "discussion_post") discPostIds.add(r.target_id);
    else if (r.target_type === "discussion_comment")
      discCommentIds.add(r.target_id);
    else profileIds.add(r.target_id);
  }

  const nameById = new Map<string, string>();
  const postingById = new Map<string, string>();
  const discPostById = new Map<string, string>(); // id -> title
  const discCommentById = new Map<string, { postId: string; snippet: string }>();
  await Promise.all([
    profileIds.size
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", [...profileIds])
          .then(({ data }) => {
            for (const p of data ?? [])
              nameById.set(p.id as string, (p.full_name as string) ?? "");
          })
      : Promise.resolve(),
    postingIds.size
      ? supabase
          .from("job_postings")
          .select("id, title, company")
          .in("id", [...postingIds])
          .then(({ data }) => {
            for (const p of data ?? [])
              postingById.set(
                p.id as string,
                `${p.title as string} · ${p.company as string}`
              );
          })
      : Promise.resolve(),
    discPostIds.size
      ? supabase
          .from("discussion_posts")
          .select("id, title")
          .in("id", [...discPostIds])
          .then(({ data }) => {
            for (const p of data ?? [])
              discPostById.set(p.id as string, (p.title as string) ?? "");
          })
      : Promise.resolve(),
    discCommentIds.size
      ? supabase
          .from("discussion_comments")
          .select("id, post_id, body")
          .in("id", [...discCommentIds])
          .then(({ data }) => {
            for (const c of data ?? [])
              discCommentById.set(c.id as string, {
                postId: c.post_id as string,
                snippet: ((c.body as string) ?? "")
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 80),
              });
          })
      : Promise.resolve(),
  ]);

  const targetHref = (r: ReportRow) => {
    if (r.target_type === "posting") return `/careers/openings/${r.target_id}`;
    if (r.target_type === "discussion_post") return `/community/${r.target_id}`;
    if (r.target_type === "discussion_comment")
      return `/community/${discCommentById.get(r.target_id)?.postId ?? ""}`;
    return `/directory/${r.target_id}`;
  };
  const targetLabel = (r: ReportRow) => {
    if (r.target_type === "posting")
      return postingById.get(r.target_id) ?? "Posting";
    if (r.target_type === "discussion_post")
      return discPostById.get(r.target_id) || "Discussion post";
    if (r.target_type === "discussion_comment") {
      const c = discCommentById.get(r.target_id);
      return c ? `“${c.snippet}”` : "Comment";
    }
    return nameById.get(r.target_id) || "Member profile";
  };

  return (
    <>
      <h1 className="slash font-display text-[clamp(2rem,5vw,3rem)] leading-[1.02] tracking-tight text-ink">
        Flagged content.
      </h1>
      <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-ink/70">
        Open reports from members. Open the item to review it, then resolve
        (you took action) or dismiss (no action needed).
      </p>

      {list.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-dashed border-gold/40 bg-ivory-dim/40 px-6 py-16 text-center">
                <p className="font-display text-xl italic text-ink">
                  Nothing flagged. All clear.
                </p>
              </div>
            ) : (
              <ul className="mt-10 flex flex-col gap-4">
                {list.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col gap-4 rounded-2xl border border-gold/25 bg-ivory-dim/50 p-6 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div>
                      <span className="rounded-full border border-oxblood/40 px-3 py-1 font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-oxblood">
                        {r.target_type}
                      </span>
                      <Link
                        href={targetHref(r)}
                        className="mt-3 block font-display text-xl text-ink underline underline-offset-4 hover:decoration-accent"
                      >
                        {targetLabel(r)}
                      </Link>
                      {r.reason && (
                        <p className="mt-2 max-w-xl font-sans text-sm leading-relaxed text-ink/75">
                          &ldquo;{r.reason}&rdquo;
                        </p>
                      )}
                      <p className="mt-2 font-sans text-xs text-ink/70">
                        Reported by{" "}
                        {r.reporter_id
                          ? nameById.get(r.reporter_id) || "a member"
                          : "a former member"}{" "}
                        ·{" "}
                        {longDate(r.created_at)}
                      </p>
                    </div>
                    <ReportActions id={r.id} />
                  </li>
                ))}
              </ul>
      )}
    </>
  );
}
