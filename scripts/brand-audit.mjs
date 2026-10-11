// Checks rendered pages against the parts of the Brand Guidelines (Edition 2)
// that the site follows: the logo and gear mark, underlined links, alt text,
// named controls, and naming. It opens real pages in headless Chrome, at
// desktop and phone width, by day and by night.
//
//   node scripts/brand-audit.mjs                 public pages
//   node scripts/brand-audit.mjs ALUM            the signed-in app as the test alum
//   node scripts/brand-audit.mjs STUDENT /profile /events
//
// BASE=http://localhost:3210 by default. Exit code 1 if anything fails.
// (Colours, fonts and type sizes are deliberately not checked: the site keeps
// its own.)
import { launch, signIn, readEnv } from "./lib/browser.mjs";

const args = process.argv.slice(2);
const who = args[0] && /^[A-Z]+$/.test(args[0]) ? args.shift() : null;
const base = process.env.BASE ?? "http://localhost:3210";
const PUBLIC = ["/", "/about", "/chapters", "/events", "/blog", "/gallery", "/noticeboard", "/campus", "/faqs", "/notable-alumni", "/login", "/join", "/privacy", "/terms", "/press", "/leadership", "/give-back", "/this-page-does-not-exist"];
const APP = ["/", "/directory", "/messages", "/events", "/blog", "/profile", "/profile/edit", "/noticeboard", "/campus", "/chapters", "/notifications", "/search?q=test"];
const routes = args.length ? args : who ? APP : PUBLIC;

const AUDIT = String.raw`
const name = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 4).join(".") : "");
const sample = (el) => (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
const visible = (el) => {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    if (n.hasAttribute("inert")) return false;
  }
  return true;
};
const fails = [];
const add = (rule, el, detail) => { const key = rule + name(el) + detail; if (!fails.some((f) => f.key === key)) fails.push({ key, rule, el: name(el), text: sample(el), detail }); };

// Links inside running text are underlined (p. 26).
for (const a of document.querySelectorAll("#main p a, #main li a, #main dd a")) {
  if (!visible(a) || a.closest("nav, header, footer, svg, .idcard-hang")) continue;
  const around = [...a.parentElement.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
  if (around.length < 12) continue;
  if (!getComputedStyle(a).textDecorationLine.includes("underline")) add("link", a, "a link in running text is not underlined");
}
// Alt text on every image (p. 23). An empty alt is only for decoration that
// is hidden from assistive technology, or the gear mark beside its own name.
let pictures = 0;
for (const img of document.querySelectorAll("img")) {
  pictures++;
  const alt = img.getAttribute("alt");
  const src = (img.getAttribute("src") || "").slice(0, 60);
  if (alt === null) add("alt", img, "no alt attribute: " + src);
  else if (alt === "" && !img.closest("[aria-hidden=true]") && !/gear-on-ink/.test(src) && visible(img)) add("alt", img, "empty alt on a content image: " + src);
}
// Every control has a name (icons carry words, shown or spoken).
for (const el of document.querySelectorAll("a[href], button")) {
  if (!visible(el) || el.closest(".idcard-hang")) continue;
  const words = (el.innerText || "").trim() || el.getAttribute("aria-label") || el.getAttribute("title") || [...el.querySelectorAll("img[alt]")].map((i) => i.alt).join("") || (el.querySelector(".sr-only")?.textContent ?? "");
  if (!words.trim()) add("name", el, "control has no name");
}
// The logo (pp. 8 to 11): never stretched; the gear mark at least 32 px,
// with the full name by it.
const marks = [...document.querySelectorAll("img[src*='/brand/']")].filter(visible).map((i) => ({ src: i.getAttribute("src").split("/").pop(), h: Math.round(i.getBoundingClientRect().height), w: Math.round(i.getBoundingClientRect().width), nw: i.naturalWidth, nh: i.naturalHeight, el: i }));
for (const m of marks) {
  // The guide asks for 75 px; the site owner chose a 52 px header logo. Anything smaller is a mistake.
  if (/logo/.test(m.src) && m.h < 50) add("logo", m.el, m.src + " shown at " + m.h + "px");
  if (/gear/.test(m.src) && m.h < 32) add("logo", m.el, m.src + " shown at " + m.h + "px, under the 32 px minimum");
  if (m.nw && Math.abs(m.w / m.h - m.nw / m.nh) > 0.03) add("logo", m.el, m.src + " is stretched");
  if (/gear/.test(m.src) && !/BMSCE Alumni Network/.test(m.el.parentElement.textContent)) add("logo", m.el, "gear mark without the full name beside it");
}
if (!marks.length) add("logo", document.body, "no logo or gear mark on the page");
if (document.querySelector("img[src*='bmsce-crest']") && !document.querySelector(".idcard-hang")) add("logo", document.body, "the college crest is shown outside the ID card");
// Naming (p. 7).
// Members' posts, archived Instagram captions and the map's label for the College of Architecture are not the site's own words.
const own = document.body.cloneNode(true);
own.querySelectorAll("script, style, .wall-item, .wall-dialog, .campus, article, [data-user-content]").forEach((n) => n.remove());
const copy = own.textContent;
for (const bad of ["Alumni Association", "BMS College", "BMSCEAN", "Batch of "]) if (copy.includes(bad)) add("naming", document.body, "“" + bad + "” appears on the page");
return { fails: fails.map(({ key, ...f }) => f), notes: { pictures, marks: marks.map((m) => m.src + "@" + m.h).join(" ") } };
`;

const env = readEnv();
const b = await launch();
let bad = 0;
try {
  for (const device of ["desktop", "mobile"]) {
    for (const theme of ["day", "night"]) {
      const page = await b.page({ mobile: device === "mobile" });
      if (who) await signIn(page, base, env[`TEST_${who}_EMAIL`], env[`TEST_${who}_PASSWORD`]);
      await page.goto(`${base}/faqs`, 300);
      await page.eval(`document.cookie = "theme=${theme}; path=/; max-age=3600"; return true`);
      for (const route of routes) {
        await page.goto(base + route, 1800);
        const res = await page.eval(AUDIT);
        const tag = `${device}/${theme} ${route}`;
        if (res.fails.length) {
          bad += res.fails.length;
          console.log(`\n✗ ${tag}  (${res.notes.marks})`);
          for (const f of res.fails.slice(0, 12)) console.log(`   ${f.rule}: ${f.detail}  ← ${f.el} “${f.text}”`);
          if (res.fails.length > 12) console.log(`   … and ${res.fails.length - 12} more`);
        } else {
          console.log(`✓ ${tag}  (${res.notes.pictures} pictures; ${res.notes.marks})`);
        }
      }
      await page.close();
    }
  }
} finally {
  await b.close();
}
console.log(bad ? `\n${bad} finding(s).` : "\nAll pages pass.");
process.exit(bad ? 1 : 0);
