import { notFound } from "next/navigation";
import Thread, { type Message } from "@/components/v2/messages/Thread";
import { requireMember } from "@/lib/me";

export const dynamic = "force-dynamic";
const PAGE = 40;

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, me } = await requireMember(`/messages/${id}`);

  // RLS only returns the thread to its two participants, so a guessed or
  // edited URL resolves to a 404 for anyone else.
  const { data: thread } = await supabase
    .from("dm_threads")
    .select("id, user_a, user_b")
    .eq("id", id)
    .maybeSingle();
  if (!thread) notFound();
  const otherId = thread.user_a === me.id ? thread.user_b : thread.user_a;

  const [other, messages, myBlock, blocked] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, photo_url, user_type, graduation_year, job_title, company")
      .eq("id", otherId)
      .maybeSingle(),
    supabase
      .from("dm_messages")
      .select("id, sender_id, body, created_at, read_at")
      .eq("thread_id", id)
      .order("id", { ascending: false })
      .limit(PAGE + 1),
    supabase.from("user_blocks").select("blocked_id").eq("blocker_id", me.id).eq("blocked_id", otherId).maybeSingle(),
    supabase.rpc("dm_blocked", { p_thread: id }),
  ]);
  await supabase.rpc("mark_thread_read", { p_thread: id });

  const rows = (messages.data ?? []) as Message[];
  return (
    <Thread
      threadId={id}
      meId={me.id}
      other={
        other.data ?? { id: otherId, full_name: null, photo_url: null, user_type: "alumni", graduation_year: null, job_title: null, company: null }
      }
      initial={rows.slice(0, PAGE).reverse()}
      hasEarlier={rows.length > PAGE}
      blockedByMe={Boolean(myBlock.data)}
      blocked={Boolean(blocked.data)}
    />
  );
}
