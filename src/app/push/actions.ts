"use server";

import { after } from "next/server";
import { actionMember } from "@/lib/me";
import { rateLimit } from "@/lib/rateLimit";
import { dispatchPush, pushConfigured, sendPush } from "@/lib/push";

/**
 * Ask the server to deliver any push notifications that are waiting. Called
 * after something that may have created one (a direct message, for example)
 * and when the app opens. It runs after the response, so nothing waits on it.
 */
export async function flushPush(): Promise<void> {
  await actionMember();
  after(() => dispatchPush());
}

/** Send a test notification to the signed-in member's own devices. */
export async function sendTestPush(): Promise<{ sent: number; devices: number; configured: boolean }> {
  const { supabase, user } = await actionMember();
  if (!pushConfigured()) return { sent: 0, devices: 0, configured: false };
  await rateLimit(supabase, `pushtest:${user.id}`, 6, 3600);
  // Row Level Security returns only this member's own devices.
  const { data } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth_key");
  const devices = data ?? [];
  const outcomes = await Promise.all(
    devices.map((d) => sendPush(d, { title: "Notifications are on", body: "This is how messages and replies will reach you.", link: "/notifications" }))
  );
  const gone = devices.filter((_, i) => outcomes[i] === "gone");
  await Promise.all(gone.map((d) => supabase.rpc("push_unsubscribe", { p_endpoint: d.endpoint })));
  return { sent: outcomes.filter((o) => o === "sent").length, devices: devices.length, configured: true };
}
