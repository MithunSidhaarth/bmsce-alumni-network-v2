import type { Metadata } from "next";
import type { ReactNode } from "react";
import Inbox, { type InboxRow } from "@/components/v2/messages/Inbox";
import { requireMember } from "@/lib/me";

export const metadata: Metadata = {
  title: "Messages: BMSCE Alumni Network",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

// Two panes on desktop (conversations, then the open one). On phones the
// Inbox component shows one pane at a time based on the route.
export default async function MessagesLayout({ children }: { children: ReactNode }) {
  const { supabase, me, verified } = await requireMember("/messages");
  const { data } = verified ? await supabase.rpc("dm_inbox") : { data: [] };

  return (
    <main className="mx-auto flex h-[calc(100dvh-var(--topbar)-var(--tabbar))] max-w-[1180px] md:h-[calc(100dvh-var(--topbar))] md:px-6 md:py-5">
      <div className="flex min-h-0 w-full overflow-hidden border-ink/12 bg-paper md:rounded-box md:border md:shadow-[var(--shadow-sheet)]">
        <Inbox rows={(data ?? []) as InboxRow[]} meId={me.id} verified={verified} />
        {children}
      </div>
    </main>
  );
}
