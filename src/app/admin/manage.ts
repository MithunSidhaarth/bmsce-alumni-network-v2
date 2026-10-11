"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import archive from "@/data/instagram-archive.json";
import { chapters as starterChapters } from "@/data/chapters";
import { actionAdmin } from "@/lib/me";
import { logAdminAction } from "@/lib/audit";
import { runInstagramSync } from "@/lib/instagram";
import { sendDigest } from "@/lib/newsletter";
import { slugify } from "@/lib/format";
import { safeUrl } from "@/lib/url";
import type { ActionState } from "@/components/v2/admin/AdminForm";

// Every admin action: (previous state, form data) -> a message for the form.
// actionAdmin() checks the caller's role on the server; Row Level Security and
// SECURITY DEFINER functions check it again in the database, so a forged
// request from a non-admin fails twice.

type Ctx = { supabase: SupabaseClient; userId: string };

async function admin(fn: (ctx: Ctx) => Promise<string | void>, paths: string[] = []): Promise<ActionState> {
  try {
    const { supabase, user } = await actionAdmin();
    const message = await fn({ supabase, userId: user.id });
    ["/admin", ...paths].forEach((p) => revalidatePath(p, p === "/admin" ? "layout" : "page"));
    return { ok: message ?? "Saved." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

const str = (d: FormData, k: string) => String(d.get(k) ?? "").trim();
const opt = (d: FormData, k: string) => str(d, k) || null;
const bool = (d: FormData, k: string) => ["on", "true", "1"].includes(str(d, k));
const must = (v: string, label: string) => {
  if (!v) throw new Error(`${label} is required.`);
  return v;
};
const check = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};
const url = (d: FormData, k: string, label: string) => {
  const raw = str(d, k);
  if (!raw) return null;
  const safe = safeUrl(raw);
  if (!safe) throw new Error(`${label} must be a full http(s) link.`);
  return safe;
};

// ---------------------------------------------------------------- members --

export async function setMemberRole(_: ActionState, d: FormData) {
  return admin(async ({ supabase, userId }) => {
    const id = must(str(d, "id"), "Member");
    const role = str(d, "role") === "admin" ? "admin" : "member";
    if (id === userId && role !== "admin") throw new Error("You cannot remove your own admin role.");
    check((await supabase.from("profiles").update({ role }).eq("id", id)).error);
    await logAdminAction(supabase, `member.role:${role}`, id);
    return role === "admin" ? "Now an admin." : "Admin role removed.";
  });
}

export async function setMemberSuspended(_: ActionState, d: FormData) {
  return admin(async ({ supabase, userId }) => {
    const id = must(str(d, "id"), "Member");
    const suspend = str(d, "suspend") === "1";
    if (id === userId) throw new Error("You cannot suspend yourself.");
    check(
      (
        await supabase
          .from("profiles")
          .update({ suspended_at: suspend ? new Date().toISOString() : null, suspended_reason: suspend ? opt(d, "reason") : null })
          .eq("id", id)
      ).error
    );
    await logAdminAction(supabase, suspend ? "member.suspend" : "member.restore", id);
    return suspend ? "Account suspended. They can sign in but cannot post, message or use admin tools." : "Account restored.";
  });
}

export async function updateMemberDetails(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    const id = must(str(d, "id"), "Member");
    const year = str(d, "graduation_year");
    if (year && !/^(19|20)\d\d$/.test(year)) throw new Error("Graduation year must be a four-digit year.");
    check(
      (
        await supabase
          .from("profiles")
          .update({
            full_name: must(str(d, "full_name"), "Name"),
            graduation_year: year ? Number(year) : null,
            branch: opt(d, "branch"),
            current_city: opt(d, "current_city"),
            company: opt(d, "company"),
            job_title: opt(d, "job_title"),
          })
          .eq("id", id)
      ).error
    );
    await logAdminAction(supabase, "member.edit", id);
    return "Details updated.";
  });
}

// -------------------------------------------------------------- lifecycle --

export async function setPassingOutDate(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    const { data, error } = await supabase.rpc("admin_set_passing_out_date", {
      p_profile: must(str(d, "id"), "Member"),
      p_date: opt(d, "date"),
      p_note: opt(d, "note"),
    });
    check(error);
    return data === "graduated"
      ? "Date saved. It has already passed, so the member is now alumni."
      : data === "reverted_to_student"
      ? "Date saved. The automatic graduation was reversed: they are a student again until the new date."
      : "Date saved.";
  });
}

export async function setMembership(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    check(
      (
        await supabase.rpc("admin_set_membership", {
          p_profile: must(str(d, "id"), "Member"),
          p_type: str(d, "type") === "student" ? "student" : "alumni",
          p_hold: bool(d, "hold"),
          p_note: opt(d, "note"),
        })
      ).error
    );
    return "Membership updated and recorded in the history.";
  });
}

export async function runLifecycleNow() {
  return admin(async ({ supabase }) => {
    const { data, error } = await supabase.rpc("run_membership_lifecycle");
    check(error);
    if (data === -1) throw new Error("The job failed. See the run history below.");
    return data === 0 ? "Ran. Nobody was due today." : `Ran. ${data} member${data === 1 ? "" : "s"} moved to alumni.`;
  });
}

// --------------------------------------------------------------- chapters --

export async function saveChapter(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    const id = opt(d, "id");
    const name = must(str(d, "name"), "Name");
    const lat = str(d, "lat");
    const lng = str(d, "lng");
    const row = {
      name,
      slug: slugify(str(d, "slug") || name),
      region: must(str(d, "region"), "Region"),
      country: opt(d, "country"),
      city: opt(d, "city"),
      description: opt(d, "description"),
      cover_url: url(d, "cover_url", "Cover image"),
      whatsapp_url: url(d, "whatsapp_url", "WhatsApp link"),
      join_policy: str(d, "join_policy") === "request" ? "request" : "open",
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
      updated_at: new Date().toISOString(),
    };
    if (!row.slug) throw new Error("The address needs at least one letter or number.");
    check(id ? (await supabase.from("chapters").update(row).eq("id", id)).error : (await supabase.from("chapters").insert(row)).error);
    await logAdminAction(supabase, id ? "chapter.edit" : "chapter.create", row.slug);
    return id ? "Chapter updated." : "Chapter created.";
  }, ["/chapters"]);
}

export async function setChapterArchived(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    const id = must(str(d, "id"), "Chapter");
    const archived = str(d, "archived") === "1";
    check((await supabase.from("chapters").update({ status: archived ? "archived" : "active" }).eq("id", id)).error);
    await logAdminAction(supabase, archived ? "chapter.archive" : "chapter.restore", id);
    return archived ? "Archived. Its posts and members are kept; it is hidden from members." : "Restored.";
  }, ["/chapters"]);
}

export async function setChapterLead(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    check(
      (
        await supabase.rpc("admin_set_chapter_role", {
          p_chapter: must(str(d, "chapter_id"), "Chapter"),
          p_profile: must(str(d, "profile_id"), "Member"),
          p_role: str(d, "role") === "lead" ? "lead" : "member",
        })
      ).error
    );
    return str(d, "role") === "lead" ? "Now a chapter lead." : "No longer a chapter lead.";
  }, ["/chapters"]);
}

export async function setEventChapter(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    const id = must(str(d, "id"), "Event");
    check((await supabase.from("events").update({ chapter_id: opt(d, "chapter_id") }).eq("id", id)).error);
    await logAdminAction(supabase, "event.set_chapter", id);
    return "Saved.";
  }, ["/events", "/chapters"]);
}

// ------------------------------------------------------------- moderation --

export async function moderatePost(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    const id = must(str(d, "id"), "Post");
    const what = str(d, "what");
    if (what === "delete") check((await supabase.from("posts").delete().eq("id", id)).error);
    else if (what === "hide" || what === "unhide") check((await supabase.from("posts").update({ is_hidden: what === "hide" }).eq("id", id)).error);
    else if (what === "pin" || what === "unpin") check((await supabase.from("posts").update({ is_pinned: what === "pin" }).eq("id", id)).error);
    else throw new Error("Unknown action.");
    await logAdminAction(supabase, `post.${what}`, id);
    return { delete: "Deleted.", hide: "Hidden from members.", unhide: "Visible again.", pin: "Pinned. It is on The Wall too.", unpin: "Unpinned." }[what];
  }, ["/", "/community", "/noticeboard"]);
}

export async function moderateComment(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    const id = must(str(d, "id"), "Reply");
    const what = str(d, "what");
    if (what === "delete") check((await supabase.from("post_comments").delete().eq("id", id)).error);
    else check((await supabase.from("post_comments").update({ is_hidden: what === "hide" }).eq("id", id)).error);
    await logAdminAction(supabase, `comment.${what}`, id);
    return what === "delete" ? "Deleted." : what === "hide" ? "Hidden." : "Visible again.";
  });
}

// ------------------------------------------------------------ noticeboard --

export async function updateNotice(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    const id = must(str(d, "id"), "Item");
    const what = str(d, "what");
    const patch: Record<string, unknown> =
      what === "publish" ? { status: "published", origin: "admin" }
      : what === "hide" ? { status: "hidden" }
      : what === "pin" ? { is_pinned: true }
      : what === "unpin" ? { is_pinned: false }
      : what === "order" ? { sort_order: Math.max(-999, Math.min(999, Number(str(d, "sort_order")) || 0)) }
      : {};
    if (what === "remove") check((await supabase.from("notice_items").delete().eq("id", id)).error);
    else if (Object.keys(patch).length) check((await supabase.from("notice_items").update(patch).eq("id", id)).error);
    else throw new Error("Unknown action.");
    await logAdminAction(supabase, `notice.${what}`, id);
    return { publish: "On The Wall.", hide: "Hidden from The Wall.", pin: "Pinned to the top.", unpin: "Unpinned.", order: "Order saved.", remove: "Removed from The Wall. The original content is untouched." }[what];
  }, ["/noticeboard"]);
}

/** Put an existing event, gallery photo or post on The Wall by hand. */
export async function featureOnWall(_: ActionState, d: FormData) {
  return admin(async ({ supabase, userId }) => {
    const source = str(d, "source");
    const ref = must(str(d, "ref"), "Item");
    const column = { post: "post_id", event: "event_id", photo: "photo_id", instagram: "social_post_id" }[source];
    if (!column) throw new Error("Unknown content type.");
    check(
      (
        await supabase
          .from("notice_items")
          .upsert({ source, [column]: ref, origin: "admin", status: "published", created_by: userId }, { onConflict: column })
      ).error
    );
    await logAdminAction(supabase, `notice.feature:${source}`, ref);
    return "Added to The Wall.";
  }, ["/noticeboard"]);
}

export async function addManualNotice(_: ActionState, d: FormData) {
  return admin(async ({ supabase, userId }) => {
    const title = opt(d, "title");
    const body = opt(d, "body");
    const image_url = url(d, "image_url", "Image");
    if (!title && !body && !image_url) throw new Error("Add a title, some text or an image.");
    check(
      (
        await supabase.from("notice_items").insert({
          source: "manual", title, body, image_url, link_url: url(d, "link_url", "Link"),
          origin: "admin", status: "published", is_pinned: bool(d, "pinned"), created_by: userId,
        })
      ).error
    );
    return "Pinned to The Wall.";
  }, ["/noticeboard"]);
}

export async function saveWallSettings(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    const sources = ["instagram", "post", "event", "photo", "manual"].filter((s) => bool(d, `src_${s}`));
    check(
      (await supabase.from("site_settings").update({ notice_sources: sources, ig_auto_publish: bool(d, "ig_auto_publish") }).eq("id", 1)).error
    );
    await logAdminAction(supabase, "notice.settings", sources.join(","));
    return "Wall settings saved.";
  }, ["/noticeboard"]);
}

// -------------------------------------------------------------- instagram --

export async function syncInstagramNow() {
  return admin(async ({ supabase }) => {
    const r = await runInstagramSync(supabase, { trigger: "manual", secret: process.env.APP_SERVER_SECRET ?? null });
    await logAdminAction(supabase, "instagram.manual_sync", r.status);
    if (r.status === "not_configured") throw new Error("Instagram is not connected yet. Add an access token below, then sync again.");
    if (r.status === "failed") throw new Error(`Sync failed: ${r.error ?? "unknown error"}`);
    return `Sync ${r.status}: ${r.fetched} fetched, ${r.new} new, ${r.updated} refreshed, ${r.failed} failed.`;
  }, ["/noticeboard"]);
}

export async function retryInstagramFailures() {
  return admin(async ({ supabase }) => {
    const { data, error } = await supabase.rpc("ig_retry_failures");
    check(error);
    const r = data as { fetched: number; new: number; updated: number; failed: number };
    return r.fetched === 0 ? "No failed records to retry." : `Retried ${r.fetched}: ${r.new + r.updated} imported, ${r.failed} still failing.`;
  }, ["/noticeboard"]);
}

export async function saveInstagramToken(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    const token = str(d, "token");
    const remove = str(d, "remove") === "1";
    if (!remove && token.length < 40) throw new Error("That does not look like a Meta access token.");
    check((await supabase.rpc("ig_token_set", { p_secret: null, p_token: remove ? null : token, p_expires_at: null })).error);
    return remove ? "Stored token removed." : "Token stored. Run a sync to test it.";
  });
}

export async function saveInstagramHandle(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    const handle = str(d, "handle").replace(/^@/, "");
    if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) throw new Error("Enter the account's username, without the link.");
    check((await supabase.from("site_settings").update({ ig_handle: handle }).eq("id", 1)).error);
    return "Account name saved.";
  }, ["/noticeboard"]);
}

export async function setInstagramHidden(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    const id = must(str(d, "id"), "Post");
    const hidden = str(d, "hidden") === "1";
    check((await supabase.from("social_posts").update({ is_hidden: hidden }).eq("id", id)).error);
    await logAdminAction(supabase, hidden ? "instagram.hide" : "instagram.unhide", id);
    return hidden ? "Hidden everywhere on this site. The post on Instagram is not affected." : "Visible again.";
  }, ["/noticeboard", "/events"]);
}

/**
 * One-time loader for content that ships with the site: the chapter list and
 * the Instagram archive collected before the API was connected. Safe to run
 * again: existing rows are left alone.
 */
export async function importStarterContent() {
  return admin(async ({ supabase }) => {
    const chapterRows = starterChapters.map((c) => ({
      slug: slugify(c.name), name: c.name, region: c.continent, country: c.country,
      cover_url: c.image, lng: c.coordinates[0], lat: c.coordinates[1],
    }));
    check((await supabase.from("chapters").upsert(chapterRows, { onConflict: "slug", ignoreDuplicates: true })).error);

    const posts = (archive as Record<string, unknown>[]).map((p) => ({ ...p, source: "seed" }));
    for (let i = 0; i < posts.length; i += 60) {
      check((await supabase.from("social_posts").upsert(posts.slice(i, i + 60), { onConflict: "post_id", ignoreDuplicates: true })).error);
    }
    const { data: stored } = await supabase.from("social_posts").select("id, posted_at").eq("source", "seed");
    const notices = (stored ?? []).map((s) => ({
      source: "instagram", social_post_id: s.id, origin: "auto", status: "published", display_date: s.posted_at ?? new Date().toISOString(),
    }));
    for (let i = 0; i < notices.length; i += 100) {
      check((await supabase.from("notice_items").upsert(notices.slice(i, i + 100), { onConflict: "social_post_id", ignoreDuplicates: true })).error);
    }
    await logAdminAction(supabase, "starter.import", `${chapterRows.length} chapters, ${posts.length} posts`);
    return `Loaded ${chapterRows.length} chapters and ${posts.length} archived Instagram posts (existing rows were kept).`;
  }, ["/chapters", "/noticeboard", "/events"]);
}

// ------------------------------------------------------------------- blog --

export async function saveArticle(_: ActionState, d: FormData) {
  return admin(async ({ supabase, userId }) => {
    const id = opt(d, "id");
    const title = must(str(d, "title"), "Title");
    const status = ["draft", "published", "archived"].includes(str(d, "status")) ? str(d, "status") : "draft";
    const body_md = str(d, "body_md");
    if (status === "published" && body_md.length < 40) throw new Error("Write the article before publishing it.");
    const row = {
      title,
      slug: slugify(str(d, "slug") || title),
      excerpt: opt(d, "excerpt"),
      body_md,
      cover_url: url(d, "cover_url", "Cover image"),
      category: must(str(d, "category"), "Category"),
      tags: str(d, "tags").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8),
      author_name: opt(d, "author_name"),
      author_title: opt(d, "author_title"),
      author_id: opt(d, "author_id"),
      status,
      is_featured: bool(d, "is_featured"),
    };
    if (!row.slug) throw new Error("The address needs at least one letter or number.");
    const res = id
      ? await supabase.from("articles").update(row).eq("id", id)
      : await supabase.from("articles").insert({ ...row, author_id: row.author_id ?? userId });
    if (res.error?.code === "23505") throw new Error("Another article already uses that address. Change the slug.");
    check(res.error);
    await logAdminAction(supabase, `article.${id ? "edit" : "create"}:${status}`, row.slug);
    return status === "published" ? "Saved and published." : "Saved as a draft.";
  }, ["/blog"]);
}

export async function deleteArticle(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    const id = must(str(d, "id"), "Article");
    check((await supabase.from("articles").delete().eq("id", id)).error);
    await logAdminAction(supabase, "article.delete", id);
    return "Deleted.";
  }, ["/blog"]);
}

// ---------------------------------------------------------------- digests --

export async function saveDigest(_: ActionState, d: FormData) {
  return admin(async ({ supabase, userId }) => {
    const id = opt(d, "id");
    const article_ids = d.getAll("article_ids").map(String).filter((v) => /^[0-9a-f-]{36}$/i.test(v));
    if (article_ids.length === 0) throw new Error("Pick at least one published article.");
    const when = str(d, "scheduled_at");
    const schedule = str(d, "intent") === "schedule";
    if (schedule && !when) throw new Error("Choose a date and time to schedule it.");
    // The form's date-time is India Standard Time.
    const scheduled_at = schedule ? new Date(`${when}:00+05:30`).toISOString() : null;
    if (scheduled_at && +new Date(scheduled_at) < Date.now() - 60000) throw new Error("That time has already passed.");
    const row = {
      subject: must(str(d, "subject"), "Subject"),
      preheader: opt(d, "preheader"),
      intro: opt(d, "intro"),
      article_ids,
      status: schedule ? "scheduled" : "draft",
      scheduled_at,
    };
    check(
      id
        ? (await supabase.from("newsletter_digests").update(row).eq("id", id).in("status", ["draft", "scheduled", "failed"])).error
        : (await supabase.from("newsletter_digests").insert({ ...row, created_by: userId })).error
    );
    return schedule ? "Scheduled. It goes out on the next daily run after that time." : "Draft saved.";
  });
}

export async function sendDigestNow(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    const id = must(str(d, "id"), "Digest");
    const r = await sendDigest(supabase, { secret: null, digestId: id });
    await logAdminAction(supabase, "digest.send", id);
    if (!r.sent) throw new Error(r.reason);
    return `Sent to ${r.delivered} subscriber${r.delivered === 1 ? "" : "s"}${r.failed ? `, ${r.failed} failed` : ""}.`;
  });
}

export async function deleteDigest(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    check((await supabase.from("newsletter_digests").delete().eq("id", must(str(d, "id"), "Digest")).neq("status", "sending")).error);
    return "Deleted.";
  });
}

export async function removeSubscriber(_: ActionState, d: FormData) {
  return admin(async ({ supabase }) => {
    check((await supabase.from("newsletter_subscribers").delete().eq("id", must(str(d, "id"), "Subscriber"))).error);
    return "Subscriber removed.";
  });
}
