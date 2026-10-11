import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { code39 } from "@/lib/code39";
import { deptLine, idLines } from "@/lib/dept";
import { initials } from "@/lib/format";
import { ogFonts, ogPicture } from "@/lib/og";
import { createClient } from "@/lib/supabase/server";

// The signed-in member's own ID card as a picture they can save and share.
// It is only ever drawn for the person asking.
export const dynamic = "force-dynamic";

const W = 648;
const H = 1028;
const NAVY = "#23297a";
const u = (cqw: number) => (cqw * W) / 100;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Sign in to save your ID card.", { status: 401 });
  const { data: p } = await supabase
    .from("profiles")
    .select("id, full_name, photo_url, branch, usn, graduation_year, user_type")
    .eq("id", user.id)
    .maybeSingle();
  if (!p) return new Response("Finish your profile first.", { status: 404 });

  const name = p.full_name || "BMS member";
  const dept = deptLine(p.branch);
  const { idLine, code } = idLines(p);
  const [photo, crestPng, fonts] = await Promise.all([ogPicture(p.photo_url, 700), readFile(join(process.cwd(), "public", "bmsce-crest.png")), ogFonts()]);
  const { bars, width } = code39(code);
  const barBox = W - u(18);
  const unit = barBox / width;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", background: "#fdfdfa", borderRadius: u(5.2), fontFamily: "Arimo", color: "#141414" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: u(6.5) }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={`data:image/png;base64,${crestPng.toString("base64")}`} width={u(37)} height={u(37)} />
          <span style={{ fontSize: u(21), lineHeight: 1, letterSpacing: u(1), color: NAVY, marginLeft: u(2.5) }}>BMS</span>
        </div>
        <div style={{ display: "flex", fontSize: u(6.1), lineHeight: 1, color: NAVY, marginTop: u(2.4) }}>COLLEGE OF ENGINEERING</div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: u(51), height: u(53.5), marginTop: u(4), background: "#c7282d", overflow: "hidden" }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img src={photo} width={u(51)} height={u(53.5)} style={{ objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: u(20), color: "#ffffff" }}>{initials(name)}</span>
          )}
        </div>

        <div style={{ display: "flex", fontSize: u(5.4), color: NAVY, marginTop: u(4.2) }}>{name.slice(0, 30)}</div>
        {dept ? <div style={{ display: "flex", fontSize: u(5.7), marginTop: u(1.6) }}>{dept.slice(0, 30)}</div> : null}
        <div style={{ display: "flex", fontSize: u(4.9), letterSpacing: 1, marginTop: u(1.4) }}>{idLine}</div>

        <div style={{ position: "absolute", left: u(9), bottom: u(4.6), width: barBox, height: u(10.5), display: "flex" }}>
          {bars.map((b) => (
            <div key={b.x} style={{ position: "absolute", left: b.x * unit, top: 0, width: Math.max(1, b.w * unit), height: "100%", background: "#111111" }} />
          ))}
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts,
      headers: { "content-disposition": 'attachment; filename="bms-id-card.png"', "cache-control": "private, no-store" },
    }
  );
}
