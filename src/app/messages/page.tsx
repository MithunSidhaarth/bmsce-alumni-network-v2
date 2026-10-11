import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/me";

export const dynamic = "force-dynamic";

// /messages            -> the inbox (and an empty right pane on desktop)
// /messages?to=<id>    -> open, or start, the conversation with that member
export default async function MessagesIndex({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  const { supabase, verified } = await requireMember("/messages");

  let problem: string | null = null;
  if (to && /^[0-9a-f-]{36}$/i.test(to) && verified) {
    // start_dm checks eligibility, blocks and the other member's privacy
    // setting in the database, then returns the (new or existing) thread.
    const { data, error } = await supabase.rpc("start_dm", { p_target: to });
    if (data) redirect(`/messages/${data}`);
    problem = error?.message ?? "That conversation could not be opened.";
  }

  return (
    <section className="hidden min-w-0 flex-1 flex-col items-center justify-center px-8 text-center md:flex">
      {problem ? (
        <>
          <p className="hand text-[1.7rem] text-pin">Could not open that conversation</p>
          <p className="mt-2 max-w-sm text-sm text-ink/70">{problem}</p>
        </>
      ) : (
        <>
          <p className="hand text-[1.9rem] text-forest">Pick a conversation</p>
          <p className="mt-2 max-w-sm text-sm text-ink/65">
            Or start one from any member&rsquo;s profile in the{" "}
            <Link href="/directory" className="font-semibold text-forest underline underline-offset-4">
              Alumni Network
            </Link>
            . Messages are private between the two of you.
          </p>
        </>
      )}
    </section>
  );
}
