// End-to-end checks against a real Supabase project, signed in as real (test)
// accounts. It verifies the things that must never silently break:
// permissions, private messages, realtime delivery, chapter rules, the
// noticeboard, and the student-to-alumni lifecycle.
//
//   node scripts/verify.mjs
//
// Needs in .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
// and three onboarded, verified test accounts:
//   TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD      (role admin)
//   TEST_ALUM_EMAIL / TEST_ALUM_PASSWORD        (alumni)
//   TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD  (student)
// Everything it creates is deleted at the end. Do not point it at accounts
// that belong to real people.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);

let passed = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) passed += 1;
  else failures.push(`${name}${detail ? ` (${detail})` : ""}`);
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${!ok && detail ? `: ${detail}` : ""}`);
}
const blocked = (r) => Boolean(r.error) || (Array.isArray(r.data) && r.data.length === 0) || r.data === null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function signIn(prefix) {
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: env[`${prefix}_EMAIL`],
    password: env[`${prefix}_PASSWORD`],
  });
  if (error) throw new Error(`${prefix} sign-in failed: ${error.message}`);
  return { client, id: data.user.id };
}

const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const admin = await signIn("TEST_ADMIN");
const alum = await signIn("TEST_ALUM");
const student = await signIn("TEST_STUDENT");
const made = { posts: [], threads: [], notices: [], chapter: null };

try {
  console.log("\nSigned-out visitors");
  check("cannot read member profiles", blocked(await anon.from("profiles").select("id").limit(1)));
  check("cannot read posts", blocked(await anon.from("posts").select("id").limit(1)));
  check("cannot read contact details", blocked(await anon.from("member_contacts").select("member_id").limit(1)));
  check("cannot read admin metrics", Boolean((await anon.rpc("admin_metrics", { p_days: 30 })).error));
  const publicWall = await anon.rpc("noticeboard_feed", { p_limit: 120 });
  check("can read the public noticeboard", !publicWall.error && Array.isArray(publicWall.data));
  check("noticeboard hides community posts from visitors", (publicWall.data ?? []).every((c) => c.source !== "post"));

  console.log("\nPrivilege escalation (as an ordinary member)");
  check("cannot make themselves admin", Boolean((await alum.client.from("profiles").update({ role: "admin" }).eq("id", alum.id)).error));
  check("cannot verify themselves", Boolean((await alum.client.from("profiles").update({ verification_status: "rejected" }).eq("id", alum.id)).error));
  check("cannot lift or set a suspension", Boolean((await alum.client.from("profiles").update({ suspended_at: new Date().toISOString() }).eq("id", alum.id)).error));
  const editOther = await alum.client.from("profiles").update({ bio: "edited by someone else" }).eq("id", student.id).select("id");
  check("cannot edit another member's profile", blocked(editOther));
  check("cannot read admin metrics", Boolean((await alum.client.rpc("admin_metrics", { p_days: 30 })).error));
  check("cannot override membership", Boolean((await alum.client.rpc("admin_set_membership", { p_profile: alum.id, p_type: "student", p_hold: false, p_note: "x" })).error));
  check("cannot run the lifecycle job", Boolean((await alum.client.rpc("run_membership_lifecycle")).error));
  check("cannot read the audit log", blocked(await alum.client.from("admin_audit_log").select("id").limit(1)));
  check("cannot write articles", Boolean((await alum.client.from("articles").insert({ slug: "verify-x", title: "Verify", body_md: "x" })).error));
  check("cannot read the Instagram token", Boolean((await alum.client.rpc("ig_token_get", { p_secret: "x".repeat(40) })).error));
  check("cannot read newsletter subscribers", blocked(await alum.client.from("newsletter_subscribers").select("email").limit(1)));

  console.log("\nPosts and the forum");
  const post = await alum.client.from("posts").insert({ author_id: alum.id, kind: "discussion", title: "[verify] Test discussion", body: "Created by scripts/verify.mjs", tags: ["General"] }).select("id, is_pinned, comment_count").single();
  check("a verified member can start a discussion", !post.error, post.error?.message);
  if (post.data) made.posts.push(post.data.id);
  const pid = post.data?.id;
  check("cannot post as someone else", Boolean((await alum.client.from("posts").insert({ author_id: student.id, body: "impersonation" })).error));
  check("cannot post an announcement", Boolean((await alum.client.from("posts").insert({ author_id: alum.id, kind: "announcement", title: "x", body: "x" })).error));
  check("cannot pin their own post", Boolean((await alum.client.from("posts").update({ is_pinned: true }).eq("id", pid)).error));
  const forged = await alum.client.from("posts").update({ reaction_count: 999 }).eq("id", pid).select("reaction_count").single();
  check("cannot forge reaction counts", forged.data?.reaction_count === 0, `count=${forged.data?.reaction_count}`);
  check("another member can reply", !(await student.client.from("post_comments").insert({ post_id: pid, author_id: student.id, body: "[verify] reply" })).error);
  check("another member can react", !(await student.client.from("post_reactions").insert({ post_id: pid, user_id: student.id, kind: "insight" })).error);
  const counted = await alum.client.from("posts").select("comment_count, reaction_count").eq("id", pid).single();
  check("counts follow replies and reactions", counted.data?.comment_count === 1 && counted.data?.reaction_count === 1, JSON.stringify(counted.data));
  const note = await alum.client.from("notifications").select("type").eq("user_id", alum.id).in("type", ["reply", "reaction"]);
  check("the author is notified of the reply and the reaction", (note.data ?? []).length >= 2, `got ${(note.data ?? []).length}`);
  check("cannot read another member's notifications", blocked(await student.client.from("notifications").select("id").eq("user_id", alum.id)));
  const search = await student.client.from("posts").select("id").textSearch("fts", "verify discussion", { type: "websearch", config: "english" });
  check("posts are searchable", (search.data ?? []).some((r) => r.id === pid));
  check("a member cannot delete someone else's post", blocked(await student.client.from("posts").delete().eq("id", pid).select("id")));

  console.log("\nThe noticeboard");
  check("an admin can pin the post", !(await admin.client.from("posts").update({ is_pinned: true }).eq("id", pid)).error);
  const wall = await alum.client.rpc("noticeboard_feed", { p_limit: 120 });
  check("a pinned post appears on the wall for members", (wall.data ?? []).some((c) => c.post?.id === pid));
  const wallAnon = await anon.rpc("noticeboard_feed", { p_limit: 120 });
  check("but not for signed-out visitors", !(wallAnon.data ?? []).some((c) => c.post?.id === pid));
  await admin.client.from("posts").update({ is_pinned: false }).eq("id", pid);
  const wallAfter = await alum.client.rpc("noticeboard_feed", { p_limit: 120 });
  check("unpinning takes it off the wall", !(wallAfter.data ?? []).some((c) => c.post?.id === pid));
  const suggestion = await alum.client.rpc("suggest_for_noticeboard", { p_post: pid });
  check("a member's suggestion waits for approval", suggestion.data === "pending", suggestion.error?.message ?? String(suggestion.data));
  check("a member cannot approve their own suggestion", blocked(await alum.client.from("notice_items").update({ status: "published" }).eq("post_id", pid).select("id")));
  check("an admin can hide the post", !(await admin.client.from("posts").update({ is_hidden: true }).eq("id", pid)).error);
  check("a hidden post disappears for other members", blocked(await student.client.from("posts").select("id").eq("id", pid)));
  await admin.client.from("posts").update({ is_hidden: false }).eq("id", pid);

  console.log("\nChapters");
  const ch = await admin.client.from("chapters").insert({ slug: `verify-${Date.now()}`, name: "[verify] Chapter", region: "Asia", join_policy: "request" }).select("id").single();
  check("an admin can create a chapter", !ch.error, ch.error?.message);
  made.chapter = ch.data?.id;
  check("a member cannot create a chapter", Boolean((await alum.client.from("chapters").insert({ slug: "verify-nope", name: "x", region: "Asia" })).error));
  check("a join request is pending on a by-request chapter", (await alum.client.rpc("join_chapter", { p_chapter: made.chapter })).data === "pending");
  check("a pending member cannot post in the chapter", Boolean((await alum.client.from("posts").insert({ author_id: alum.id, body: "x", chapter_id: made.chapter })).error));
  check("a member cannot approve themselves", Boolean((await alum.client.rpc("review_chapter_member", { p_chapter: made.chapter, p_profile: alum.id, p_approve: true })).error));
  check("an admin can appoint a chapter lead", !(await admin.client.rpc("admin_set_chapter_role", { p_chapter: made.chapter, p_profile: student.id, p_role: "lead" })).error);
  check("the lead can approve the request", !(await student.client.rpc("review_chapter_member", { p_chapter: made.chapter, p_profile: alum.id, p_approve: true })).error);
  const chPost = await alum.client.from("posts").insert({ author_id: alum.id, body: "[verify] chapter post", chapter_id: made.chapter }).select("id").single();
  check("an approved member can post in the chapter", !chPost.error, chPost.error?.message);
  if (chPost.data) made.posts.push(chPost.data.id);
  check("the lead can pin inside their chapter", !(await student.client.from("posts").update({ is_pinned: true }).eq("id", chPost.data?.id)).error);
  // RLS filters the row out, so the update matches nothing rather than erroring.
  await student.client.from("posts").update({ is_pinned: true }).eq("id", pid);
  const outside = await admin.client.from("posts").select("is_pinned").eq("id", pid).single();
  check("the lead cannot pin outside their chapter", outside.data?.is_pinned === false);
  check("a lead is not a site admin", Boolean((await student.client.rpc("admin_metrics", { p_days: 30 })).error));

  console.log("\nDirect messages");
  const thread = await alum.client.rpc("start_dm", { p_target: student.id });
  check("a member can start a conversation", !thread.error && Boolean(thread.data), thread.error?.message);
  const tid = thread.data;
  made.threads.push(tid);
  check("starting it twice returns the same conversation", (await student.client.rpc("start_dm", { p_target: alum.id })).data === tid);

  let live = null;
  const channel = student.client
    .channel(`verify:${tid}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `thread_id=eq.${tid}` }, (p) => (live = p.new))
    .subscribe();
  let leaked = null;
  const spy = admin.client
    .channel(`verify-spy:${tid}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, (p) => (leaked = p.new))
    .subscribe();
  await sleep(2500);

  const sent = await alum.client.from("dm_messages").insert({ thread_id: tid, sender_id: alum.id, body: "[verify] hello" }).select("id").single();
  check("the sender can send", !sent.error, sent.error?.message);
  for (let i = 0; i < 16 && !live; i++) await sleep(500);
  check("the recipient receives it live (Realtime)", live?.body === "[verify] hello");
  check("a third account receives nothing over Realtime", leaked === null);
  await student.client.removeChannel(channel);
  await admin.client.removeChannel(spy);

  check("the recipient can read the history", ((await student.client.from("dm_messages").select("body").eq("thread_id", tid)).data ?? []).some((m) => m.body === "[verify] hello"));
  check("unread count is 1 for the recipient", Number((await student.client.rpc("dm_unread_count")).data) === 1);
  await student.client.rpc("mark_thread_read", { p_thread: tid });
  check("marking read clears it", Number((await student.client.rpc("dm_unread_count")).data) === 0);
  const inbox = await student.client.rpc("dm_inbox");
  check("the inbox lists the conversation", (inbox.data ?? []).some((r) => r.thread_id === tid && r.last_preview === "[verify] hello"));
  check("even an admin cannot read the conversation", blocked(await admin.client.from("dm_messages").select("id").eq("thread_id", tid)));
  check("an outsider cannot see the thread", blocked(await admin.client.from("dm_threads").select("id").eq("id", tid)));
  check("an outsider cannot post into it", Boolean((await admin.client.from("dm_messages").insert({ thread_id: tid, sender_id: admin.id, body: "intrusion" })).error));
  check("a participant cannot send as the other person", Boolean((await alum.client.from("dm_messages").insert({ thread_id: tid, sender_id: student.id, body: "forged" })).error));
  check("a message cannot be edited afterwards", blocked(await alum.client.from("dm_messages").update({ body: "edited" }).eq("id", sent.data?.id).select("id")));

  await student.client.from("user_blocks").insert({ blocker_id: student.id, blocked_id: alum.id });
  check("a blocked member cannot send", Boolean((await alum.client.from("dm_messages").insert({ thread_id: tid, sender_id: alum.id, body: "after block" })).error));
  await student.client.from("user_blocks").delete().eq("blocker_id", student.id).eq("blocked_id", alum.id);
  await admin.client.from("profiles").update({ privacy: { dm: "nobody", show_work: true, show_location: true, show_linkedin: true } }).eq("id", admin.id);
  check("'nobody' privacy stops new conversations", Boolean((await alum.client.rpc("start_dm", { p_target: admin.id })).error));
  await admin.client.from("profiles").update({ privacy: { dm: "members", show_work: true, show_location: true, show_linkedin: true } }).eq("id", admin.id);

  console.log("\nStudent to alumni");
  const day = (offset) => new Date(Date.now() + 5.5 * 3600e3 + offset * 864e5).toISOString().slice(0, 10);
  check("a student cannot enter a past passing-out date", Boolean((await student.client.from("profiles").update({ passing_out_date: day(-1) }).eq("id", student.id)).error));
  check("a student can enter a future date", !(await student.client.from("profiles").update({ passing_out_date: day(40) }).eq("id", student.id)).error);
  check("a student cannot switch themselves to alumni", Boolean((await student.client.from("profiles").update({ user_type: "alumni" }).eq("id", student.id)).error));
  const ran0 = await admin.client.rpc("run_membership_lifecycle");
  const still = await student.client.from("profiles").select("user_type").eq("id", student.id).single();
  check("the job leaves a student alone before the date", ran0.data === 0 && still.data?.user_type === "student", `ran=${ran0.data}`);

  await admin.client.rpc("admin_set_membership", { p_profile: student.id, p_type: "student", p_hold: true, p_note: "[verify] postponed" });
  await admin.client.from("profiles").update({ passing_out_date: day(-1) }).eq("id", student.id);
  const ranHold = await admin.client.rpc("run_membership_lifecycle");
  check("a held student is not graduated even after the date", ranHold.data === 0);
  await admin.client.rpc("admin_set_membership", { p_profile: student.id, p_type: "student", p_hold: false, p_note: "[verify] hold released" });

  const ran1 = await admin.client.rpc("run_membership_lifecycle");
  const after = await student.client.from("profiles").select("user_type, verification_status").eq("id", student.id).single();
  check("the job graduates a student whose date has arrived", ran1.data === 1 && after.data?.user_type === "alumni", `ran=${ran1.data} type=${after.data?.user_type}`);
  check("the account stays verified", after.data?.verification_status === "verified");
  check("running the job again changes nothing", (await admin.client.rpc("run_membership_lifecycle")).data === 0);
  const kept = await student.client.from("dm_messages").select("id").eq("thread_id", tid);
  check("messages and history survive the transition", (kept.data ?? []).length >= 1);
  const log = await student.client.from("membership_events").select("reason, from_type, to_type").eq("profile_id", student.id).eq("reason", "auto_graduation");
  check("the transition is in the audit history", (log.data ?? []).length >= 1);
  const told = await student.client.from("notifications").select("id").eq("user_id", student.id).eq("type", "membership");
  check("the member is told", (told.data ?? []).length >= 1);

  const reverted = await admin.client.rpc("admin_set_passing_out_date", { p_profile: student.id, p_date: day(60), p_note: "[verify] graduation postponed" });
  const back = await student.client.from("profiles").select("user_type").eq("id", student.id).single();
  check("correcting to a future date reverses an automatic graduation", reverted.data === "reverted_to_student" && back.data?.user_type === "student", String(reverted.data ?? reverted.error?.message));
  const again = await admin.client.rpc("admin_set_passing_out_date", { p_profile: student.id, p_date: day(-2), p_note: "[verify] confirmed" });
  check("correcting to a past date graduates immediately", again.data === "graduated", String(again.data ?? again.error?.message));
  await admin.client.rpc("admin_set_membership", { p_profile: student.id, p_type: "alumni", p_hold: false, p_note: "[verify] manual" });
  await admin.client.rpc("admin_set_membership", { p_profile: student.id, p_type: "student", p_hold: false, p_note: "[verify] manual back" });
  await admin.client.rpc("admin_set_membership", { p_profile: student.id, p_type: "alumni", p_hold: false, p_note: "[verify] manual again" });
  const manual = await admin.client.rpc("admin_set_passing_out_date", { p_profile: student.id, p_date: day(90), p_note: "[verify] after manual" });
  const stays = await student.client.from("profiles").select("user_type").eq("id", student.id).single();
  check("a manual override is never reversed by a date", manual.data === "date_updated" && stays.data?.user_type === "alumni", String(manual.data));
  await admin.client.from("profiles").update({ passing_out_date: null }).eq("id", student.id);
  await admin.client.rpc("admin_set_membership", { p_profile: student.id, p_type: "student", p_hold: false, p_note: "[verify] reset" });
  const ranNull = await admin.client.rpc("run_membership_lifecycle");
  check("a student with no date is never graduated", ranNull.data === 0);
  const review = await admin.client.rpc("lifecycle_needs_review");
  check("and is flagged for an admin to review", (review.data ?? []).some((r) => r.id === student.id));

  console.log("\nSuspension");
  await admin.client.from("profiles").update({ suspended_at: new Date().toISOString(), suspended_reason: "[verify]" }).eq("id", alum.id);
  check("a suspended member cannot post", Boolean((await alum.client.from("posts").insert({ author_id: alum.id, body: "while suspended" })).error));
  check("a suspended member cannot message", Boolean((await alum.client.from("dm_messages").insert({ thread_id: tid, sender_id: alum.id, body: "while suspended" })).error));
  await admin.client.from("profiles").update({ suspended_at: null, suspended_reason: null }).eq("id", alum.id);
  check("restoring the account restores posting", !(await alum.client.from("post_comments").insert({ post_id: pid, author_id: alum.id, body: "[verify] back" })).error);

  console.log("\nNewsletter");
  const email = `verify.${Date.now()}@bmsce-alumni.test`;
  check("anyone can subscribe with a valid address", (await anon.rpc("newsletter_subscribe", { p_email: email, p_source: "verify" })).data === "subscribed");
  check("an invalid address is rejected", Boolean((await anon.rpc("newsletter_subscribe", { p_email: "not-an-email", p_source: "verify" })).error));
  const sub = await admin.client.from("newsletter_subscribers").select("id, unsubscribe_token").eq("email", email).single();
  check("a wrong token unsubscribes nobody", (await anon.rpc("newsletter_unsubscribe", { p_token: "00000000-0000-0000-0000-000000000000" })).data === false);
  check("the emailed token unsubscribes", (await anon.rpc("newsletter_unsubscribe", { p_token: sub.data?.unsubscribe_token })).data === true);
  check("a non-admin cannot claim a digest", Boolean((await alum.client.rpc("digest_claim", { p_secret: null, p_digest: null })).error));
  await admin.client.from("newsletter_subscribers").delete().eq("id", sub.data?.id);

  // The newer features, in a block of their own so names cannot clash with the checks above.
  {
  console.log("\nAsks, offers, polls and mentions");
  const adminName = (await admin.client.from("profiles").select("full_name").eq("id", admin.id).single()).data.full_name;
  const ask = await alum.client
    .from("posts")
    .insert({
      author_id: alum.id,
      kind: "ask",
      body: `[verify] Anyone hiring? @${adminName}`,
      poll_options: ["Yes", "No"],
      poll_counts: [99, 99],
      mentions: [{ id: admin.id }, { id: student.id }],
    })
    .select("id, kind, poll_counts, mentions")
    .single();
  if (ask.data) made.posts.push(ask.data.id);
  const askId = ask.data?.id;
  check("a member can post an ask", ask.data?.kind === "ask", ask.error?.message);
  check("poll totals start at zero whatever the browser sends", JSON.stringify(ask.data?.poll_counts) === "[0,0]");
  check("only people actually named in the text are kept as mentions", ask.data?.mentions?.length === 1 && ask.data.mentions[0].id === admin.id && ask.data.mentions[0].name === adminName);
  check("a poll with one option is refused", Boolean((await alum.client.from("posts").insert({ author_id: alum.id, body: "[verify] bad poll", poll_options: ["only"] })).error));
  const counts = async () => JSON.stringify((await admin.client.from("posts").select("poll_counts").eq("id", askId).single()).data?.poll_counts);
  await alum.client.from("poll_votes").upsert({ post_id: askId, user_id: alum.id, option_index: 1 });
  check("a vote is counted on the post", (await counts()) === "[0,1]");
  check("a vote for an option that does not exist is refused", Boolean((await student.client.from("poll_votes").upsert({ post_id: askId, user_id: student.id, option_index: 5 })).error));
  check("nobody can vote as someone else", Boolean((await student.client.from("poll_votes").upsert({ post_id: askId, user_id: admin.id, option_index: 0 })).error));
  await student.client.from("poll_votes").upsert({ post_id: askId, user_id: student.id, option_index: 0 });
  await student.client.from("poll_votes").upsert({ post_id: askId, user_id: student.id, option_index: 1 });
  check("changing a vote moves it rather than adding one", (await counts()) === "[0,2]");
  const seen = await student.client.from("poll_votes").select("user_id").eq("post_id", askId);
  check("a member can read only their own vote", (seen.data ?? []).length === 1 && seen.data[0].user_id === student.id);
  await alum.client.from("posts").update({ poll_counts: [50, 50], poll_options: ["Rigged", "No"] }).eq("id", askId);
  const pollAfter = await admin.client.from("posts").select("poll_counts, poll_options").eq("id", askId).single();
  check("the author cannot rewrite a poll or its totals", JSON.stringify(pollAfter.data?.poll_counts) === "[0,2]" && pollAfter.data?.poll_options?.[0] === "Yes");
  await sleep(400);
  const told = await admin.client.from("notifications").select("type, title").eq("link", `/community/${askId}`);
  check("the member who was mentioned is notified", (told.data ?? []).some((n) => n.type === "mention"));
  check("the member who was not named is not", ((await student.client.from("notifications").select("id").eq("link", `/community/${askId}`)).data ?? []).length === 0);

  console.log("\nPeople you may know");
  const people = await alum.client.rpc("people_you_may_know", { p_limit: 6 });
  check("suggestions come with a reason and never include the caller", !people.error && (people.data ?? []).every((p) => p.id !== alum.id && p.reasons.length > 0), people.error?.message);
  check("suggestions need a signed-in member", blocked(await anon.rpc("people_you_may_know", { p_limit: 3 })));

  console.log("\nPush notifications");
  const endpoint = `https://fcm.googleapis.com/fcm/send/verify-${Date.now()}`;
  const device = await alum.client.rpc("push_subscribe", { p_endpoint: endpoint, p_p256dh: "B".repeat(87), p_auth: "a".repeat(22) });
  check("a device can be registered for push", !device.error, device.error?.message);
  check("a member cannot see anyone else's devices", ((await student.client.from("push_subscriptions").select("endpoint").eq("endpoint", endpoint)).data ?? []).length === 0);
  check("the outbox cannot be collected without the server secret", Boolean((await alum.client.rpc("push_claim", { p_secret: "x".repeat(40), p_limit: 5 })).error));
  check("nor can devices be removed without it", Boolean((await alum.client.rpc("push_prune", { p_secret: "x".repeat(40), p_endpoints: [endpoint] })).error));
  await alum.client.rpc("push_unsubscribe", { p_endpoint: endpoint });
  check("a member can remove their own device", ((await alum.client.from("push_subscriptions").select("endpoint").eq("endpoint", endpoint)).data ?? []).length === 0);

  console.log("\nLive channels (typing, who is online)");
  const join = (client, topic) =>
    new Promise((resolve) => {
      const channel = client.channel(topic, { config: { private: true } });
      const timer = setTimeout(() => resolve("TIMED_OUT"), 9000);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR") {
          clearTimeout(timer);
          client.removeChannel(channel);
          resolve(status);
        }
      });
    });
  // The conversation this run already made is between the alum and the
  // student, so the admin is the outsider. (Starting another one here would
  // leave a thread behind and change the privacy check above on the next run.)
  await Promise.all([admin, alum, student].map((u) => u.client.realtime.setAuth()));
  check("someone in a conversation can join its live channel", (await join(alum.client, `dm:${tid}`)) === "SUBSCRIBED");
  check("someone outside the conversation is refused", (await join(admin.client, `dm:${tid}`)) === "CHANNEL_ERROR");
  check("a verified member can join the online room", (await join(alum.client, "online")) === "SUBSCRIBED");
  check("a visitor who is not signed in cannot", (await join(anon, "online")) === "CHANNEL_ERROR");

  console.log("\nBuilt-in logic");
  const { code39, decode39 } = await import("../src/lib/code39.ts");
  check("an ID card barcode reads back as the number it carries", decode39(code39("1BM19CS001").bars) === "1BM19CS001" && decode39(code39("bms-8cd785e5").bars) === "BMS-8CD785E5");
  const preview = await import("../src/lib/linkPreview.ts");
  const unsafe = ["127.0.0.1", "10.0.0.8", "169.254.169.254", "192.168.1.1", "172.20.0.1", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1", "not-an-ip"];
  check(
    "private and local addresses are never fetched for a link card",
    unsafe.every((ip) => preview.isPrivateAddress(ip)) && !preview.isPrivateAddress("93.184.216.34") && !preview.isPrivateAddress("2606:2800:220:1:248:1893:25c8:1946")
  );
  const refused = await Promise.all(
    ["http://example.com/", "https://127.0.0.1/", "https://localhost/", "https://user:pw@example.com/", "https://example.com:8443/", "ftp://example.com/x", "https://intranet/"].map((u) => preview.fetchLinkPreview(u))
  );
  check("unsafe links get no card (wrong scheme, bare address, credentials, odd port)", refused.every((r) => r === null));
  check(
    "the first link in a post is found and a page title is read",
    preview.firstUrl("see https://example.com/a?b=1, thanks") === "https://example.com/a?b=1" &&
      preview.parsePreview('<head><meta property="og:title" content="A &amp; B"><meta name="description" content="d"></head>', "https://e.com/")?.title === "A & B"
  );
  }
} finally {
  // Clean up everything this run created.
  for (const id of made.posts) await admin.client.from("posts").delete().eq("id", id);
  if (made.chapter) await admin.client.from("chapters").delete().eq("id", made.chapter);
  await alum.client.from("notifications").delete().eq("user_id", alum.id);
  await student.client.from("notifications").delete().eq("user_id", student.id);
  await admin.client.from("notifications").delete().eq("user_id", admin.id);
  await student.client.from("user_blocks").delete().eq("blocker_id", student.id);
  await admin.client.from("profiles").update({ suspended_at: null, suspended_reason: null }).eq("id", alum.id);
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (made.threads.length) console.log("Note: the test conversation is left in place (members cannot delete threads). It only involves the test accounts.");
if (failures.length) {
  console.log("\nFailed:\n- " + failures.join("\n- "));
  process.exit(1);
}
