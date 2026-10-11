import { NextResponse } from "next/server";
import { sendDigest } from "@/lib/newsletter";
import { isCronRequest, serverClient, serverSecret } from "@/lib/server/cron";

// Sends email digests whose scheduled time has passed. Runs daily from
// vercel.json; each run drains every digest that is due.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const secret = serverSecret();
  if (!secret) {
    return NextResponse.json({ error: "APP_SERVER_SECRET is not set" }, { status: 500 });
  }
  const supabase = serverClient();
  const outcomes: unknown[] = [];
  try {
    for (let i = 0; i < 5; i++) {
      const outcome = await sendDigest(supabase, { secret, digestId: null });
      if (!outcome.sent && outcome.reason === "Nothing to send.") break;
      outcomes.push(outcome);
    }
    return NextResponse.json({ processed: outcomes.length, outcomes });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error", outcomes }, { status: 500 });
  }
}
