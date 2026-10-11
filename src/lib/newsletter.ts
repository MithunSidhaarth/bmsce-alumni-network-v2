import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Email digests. A digest is a hand-picked list of *published blog articles*:
// there is no separate newsletter content. Delivery goes through Resend's
// HTTP API (https://resend.com). Without RESEND_API_KEY and NEWSLETTER_FROM
// nothing is sent and the digest is marked failed with that reason, so the
// dashboard never shows a delivery that did not happen.
// ---------------------------------------------------------------------------

export type DigestArticle = {
  slug: string;
  title: string;
  excerpt: string | null;
  cover: string | null;
  category: string;
  author: string | null;
  minutes: number;
};

export type DigestContent = {
  subject: string;
  preheader: string | null;
  intro: string | null;
  articles: DigestArticle[];
};

type Claimed = DigestContent & {
  id: string;
  subscribers: { id: string; email: string; token: string }[];
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function mailerConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.NEWSLETTER_FROM);
}

/** The email body, as HTML and as plain text. Also used for the admin preview. */
export function renderDigest(d: DigestContent, unsubscribeUrl: string) {
  const base = siteUrl();
  const items = d.articles
    .map(
      (a) => `
      <tr><td style="padding:22px 0;border-top:1px solid #cdc3a5;">
        ${a.cover ? `<a href="${base}/blog/${a.slug}"><img src="${esc(a.cover)}" alt="" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;margin-bottom:14px;"></a>` : ""}
        <div style="font:500 11px/1.4 'Courier New',monospace;letter-spacing:.14em;text-transform:uppercase;color:#e8501f;">${esc(a.category)}</div>
        <a href="${base}/blog/${a.slug}" style="display:block;margin-top:6px;font:400 24px/1.2 Georgia,'Times New Roman',serif;color:#131a15;text-decoration:none;">${esc(a.title)}</a>
        ${a.excerpt ? `<div style="margin-top:8px;font:400 15px/1.55 Helvetica,Arial,sans-serif;color:#3f463f;">${esc(a.excerpt)}</div>` : ""}
        <div style="margin-top:10px;font:400 13px/1.4 Helvetica,Arial,sans-serif;color:#6b716a;">${a.author ? `${esc(a.author)} · ` : ""}${a.minutes} min read · <a href="${base}/blog/${a.slug}" style="color:#0f3b2a;font-weight:bold;">Read it</a></div>
      </td></tr>`
    )
    .join("");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.subject)}</title></head>
<body style="margin:0;background:#f4eedd;">
<div style="display:none;max-height:0;overflow:hidden;">${esc(d.preheader ?? "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4eedd;"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fcf9f0;border:1px solid #cdc3a5;">
    <tr><td style="padding:26px 32px;background:#0f3b2a;">
      <div style="font:500 11px/1.4 'Courier New',monospace;letter-spacing:.16em;text-transform:uppercase;color:#c8f53c;">BMSCE Alumni Network · Blog &amp; Insights</div>
      <div style="margin-top:10px;font:bold 28px/1.1 Helvetica,Arial,sans-serif;color:#f4eedd;">${esc(d.subject)}</div>
    </td></tr>
    <tr><td style="padding:8px 32px 6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${d.intro ? `<tr><td style="padding:20px 0 22px;font:400 16px/1.6 Helvetica,Arial,sans-serif;color:#131a15;white-space:pre-line;">${esc(d.intro)}</td></tr>` : ""}
        ${items}
      </table>
    </td></tr>
    <tr><td style="padding:22px 32px 28px;border-top:1px solid #cdc3a5;font:400 12px/1.6 Helvetica,Arial,sans-serif;color:#6b716a;">
      You are receiving this because you subscribed to the BMSCE Alumni Network digest.<br>
      <a href="${unsubscribeUrl}" style="color:#0f3b2a;">Unsubscribe</a> · <a href="${base}/blog" style="color:#0f3b2a;">Read online</a>
    </td></tr>
  </table>
</td></tr></table></body></html>`;

  const text = [
    d.subject,
    "",
    d.intro ?? "",
    ...d.articles.flatMap((a) => ["", `${a.category.toUpperCase()}: ${a.title}`, a.excerpt ?? "", `${base}/blog/${a.slug}`]),
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");

  return { html, text };
}

async function sendOne(d: DigestContent, to: { email: string; token: string }) {
  const unsubscribe = `${siteUrl()}/unsubscribe?token=${to.token}`;
  const { html, text } = renderDigest(d, unsubscribe);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.NEWSLETTER_FROM,
      to: [to.email],
      subject: d.subject,
      html,
      text,
      headers: {
        "List-Unsubscribe": `<${unsubscribe}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
    signal: AbortSignal.timeout(20000),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
  if (!res.ok) {
    const error = json.message ?? `HTTP ${res.status}`;
    // A rejected address is a bounce; anything else is retried next send.
    return { ok: false as const, error, bounced: res.status === 422 && /invalid|address/i.test(error), retry: res.status === 429 || res.status >= 500 };
  }
  return { ok: true as const, id: json.id ?? null };
}

/**
 * Send one digest: a specific draft (admin "send now") or, with digestId
 * null, the next scheduled digest that is due (the cron route).
 */
export async function sendDigest(supabase: SupabaseClient, opts: { secret: string | null; digestId: string | null }) {
  const { data, error } = await supabase.rpc("digest_claim", { p_secret: opts.secret, p_digest: opts.digestId });
  if (error) throw new Error(error.message);
  const digest = data as Claimed | null;
  if (!digest) return { sent: false as const, reason: "Nothing to send." };

  const finish = async (results: unknown[], err: string | null) => {
    const { error: finishError } = await supabase.rpc("digest_finish", {
      p_secret: opts.secret,
      p_digest: digest.id,
      p_results: results,
      p_error: err,
    });
    if (finishError) throw new Error(finishError.message);
  };

  if (!mailerConfigured()) {
    const reason = "Email is not configured: set RESEND_API_KEY and NEWSLETTER_FROM. Nothing was sent.";
    await finish([], reason);
    return { sent: false as const, reason };
  }
  if (digest.articles.length === 0) {
    const reason = "None of the selected articles is published any more. Nothing was sent.";
    await finish([], reason);
    return { sent: false as const, reason };
  }

  const results: { id: string; status: "sent" | "failed"; provider_id?: string | null; error?: string; bounced?: boolean }[] = [];
  // Small batches keep well inside the provider's rate limit.
  for (let i = 0; i < digest.subscribers.length; i += 4) {
    const batch = digest.subscribers.slice(i, i + 4);
    const sent = await Promise.all(
      batch.map(async (s) => {
        try {
          let r = await sendOne(digest, s);
          if (!r.ok && r.retry) {
            await new Promise((res) => setTimeout(res, 1500));
            r = await sendOne(digest, s);
          }
          return r.ok
            ? { id: s.id, status: "sent" as const, provider_id: r.id }
            : { id: s.id, status: "failed" as const, error: r.error, bounced: r.bounced };
        } catch (e) {
          return { id: s.id, status: "failed" as const, error: e instanceof Error ? e.message : "Send failed" };
        }
      })
    );
    results.push(...sent);
    await new Promise((res) => setTimeout(res, 600));
  }

  const failed = results.filter((r) => r.status === "failed");
  await finish(results, failed.length === results.length && results.length > 0 ? (failed[0].error ?? "All sends failed") : null);
  return { sent: true as const, delivered: results.length - failed.length, failed: failed.length };
}
