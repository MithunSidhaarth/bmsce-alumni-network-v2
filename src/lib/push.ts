// Sending push notifications. Server only.
//
// Anything that tells a member something (a notification, a direct message)
// leaves a row in a database outbox. This collects the outbox, presenting the
// server secret, and delivers each row to that member's devices. Devices the
// push service reports as gone are removed.
import webpush from "web-push";
import { serverClient, serverSecret } from "@/lib/server/cron";

type Claimed = { endpoint: string; p256dh: string; auth_key: string; title: string; body: string | null; link: string | null };

export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && serverSecret());
}

function vapid() {
  const subject = process.env.VAPID_SUBJECT || process.env.NEXT_PUBLIC_SITE_URL || "";
  webpush.setVapidDetails(/^(https:|mailto:)/.test(subject) ? subject : "https://bmsce-alumni-network-v2.vercel.app", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
}

/** Send one message to one device. Returns "gone" when the device no longer exists. */
export async function sendPush(
  device: { endpoint: string; p256dh: string; auth_key: string },
  message: { title: string; body?: string | null; link?: string | null }
): Promise<"sent" | "gone" | "failed"> {
  vapid();
  try {
    await webpush.sendNotification(
      { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth_key } },
      JSON.stringify({ title: message.title, body: message.body ?? "", link: message.link ?? "/notifications" }),
      { TTL: 3600, urgency: "normal" }
    );
    return "sent";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? "gone" : "failed";
  }
}

/** Deliver everything waiting in the outbox. Safe to call often; never throws. */
export async function dispatchPush(): Promise<{ configured: boolean; sent: number; gone: number; failed: number }> {
  const result = { configured: pushConfigured(), sent: 0, gone: 0, failed: 0 };
  if (!result.configured) return result;
  try {
    const supabase = serverClient();
    const secret = serverSecret()!;
    const { data, error } = await supabase.rpc("push_claim", { p_secret: secret, p_limit: 100 });
    if (error || !data) return result;
    const gone: string[] = [];
    await Promise.all(
      (data as Claimed[]).map(async (row) => {
        const outcome = await sendPush(row, row);
        if (outcome === "sent") result.sent += 1;
        else if (outcome === "gone") gone.push(row.endpoint);
        else result.failed += 1;
      })
    );
    result.gone = gone.length;
    if (gone.length) await supabase.rpc("push_prune", { p_secret: secret, p_endpoints: [...new Set(gone)] });
  } catch {
    // Delivery is best effort: the notification itself is already stored.
  }
  return result;
}
