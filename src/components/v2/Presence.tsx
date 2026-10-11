"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// Who is online right now, shared by every component on the page.
let online: ReadonlySet<string> = new Set();
const EMPTY: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useOnline(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => online, () => EMPTY);
}

/**
 * Joins the members-only "online" room once for the whole app (mounted in the
 * app chrome). The room is a private Realtime channel: the database only lets
 * verified members in. A member who has switched "show when I am online" off
 * still sees others but is not announced.
 */
// ponytail: one room for everyone. Split by chapter if thousands are online at once.
export default function Presence({ meId, announce }: { meId: string; announce: boolean }) {
  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      const room = supabase.channel("online", { config: { private: true, presence: { key: meId } } });
      channel = room;
      room
        .on("presence", { event: "sync" }, () => {
          online = new Set(Object.keys(room.presenceState()));
          listeners.forEach((l) => l());
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED" && announce) room.track({ since: Date.now() });
        });
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      online = EMPTY;
      listeners.forEach((l) => l());
    };
  }, [meId, announce]);
  return null;
}

/** A small green dot on someone's avatar while they are online. Place inside a relative parent. */
export function OnlineDot({ id, className = "" }: { id: string; className?: string }) {
  const here = useOnline().has(id);
  if (!here) return null;
  return (
    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-paper bg-[#016ed2] ${className}`}>
      <span className="sr-only">Online now</span>
    </span>
  );
}
