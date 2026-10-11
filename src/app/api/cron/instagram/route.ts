import { NextResponse } from "next/server";
import { runInstagramSync } from "@/lib/instagram";
import { isCronRequest, serverClient, serverSecret } from "@/lib/server/cron";

// Scheduled Instagram import. The schedule lives in vercel.json; this route
// only runs when called with the cron secret. A failure is recorded in
// ig_sync_runs and returned as JSON: it never affects the public site.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const secret = serverSecret();
  if (!secret) {
    return NextResponse.json({ error: "APP_SERVER_SECRET is not set" }, { status: 500 });
  }
  try {
    const result = await runInstagramSync(serverClient(), { trigger: "schedule", secret });
    return NextResponse.json(result, { status: result.status === "failed" ? 502 : 200 });
  } catch (e) {
    return NextResponse.json({ status: "failed", error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
