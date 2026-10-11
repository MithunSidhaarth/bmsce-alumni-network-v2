"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Icon from "./Icon";

/**
 * "Someone just posted." Listens for new posts over Realtime (which applies
 * the same access rules as the feed) and pins a small note under the top bar.
 * Nothing in the feed moves until the member asks for it: tapping the note
 * loads the new posts and returns to the top.
 */
export default function LiveFeedPin({ meId }: { meId: string }) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [who, setWho] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`feed:${meId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, async (payload) => {
        const row = payload.new as { author_id: string | null; is_hidden?: boolean };
        if (!row.author_id || row.author_id === meId || row.is_hidden) return;
        setCount((n) => n + 1);
        const { data } = await supabase.from("profiles").select("full_name").eq("id", row.author_id).maybeSingle();
        setWho(data?.full_name?.split(" ")[0] ?? null);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [meId]);

  if (count === 0) return null;
  return (
    <div className="pointer-events-none sticky top-[calc(var(--topbar)+0.75rem)] z-20 -mb-11 flex h-11 justify-center">
      <button
        type="button"
        onClick={() => {
          setCount(0);
          setWho(null);
          router.refresh();
          window.scrollTo({ top: 0 });
        }}
        className="stickynote pointer-events-auto relative inline-flex -rotate-1 items-center gap-2 px-4 py-2 text-sm font-semibold motion-ok:animate-[var(--animate-pin-drop)]"
        style={{ ["--note" as string]: "#dadde2", ["--tilt" as string]: "-1deg" }}
      >
        <span className="pin" aria-hidden="true" />
        <Icon name="spark" className="h-4 w-4" />
        <span role="status">
          {count === 1 ? `${who ?? "Someone"} just posted` : `${count} new posts`}
          <span className="font-normal"> · show</span>
        </span>
      </button>
    </div>
  );
}
