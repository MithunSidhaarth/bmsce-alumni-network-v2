import archive from "@/data/instagram-archive.json";
import sizes from "@/data/instagram-sizes.json";
import { BLANK_SHOTS } from "@/data/instagram-blank";
import { chapters, CHAPTER_COUNT, COUNTRY_COUNT } from "@/data/chapters";
import Testimonials from "@/components/Testimonials";
import { stampDate } from "@/lib/format";
import BigCta from "./landing/BigCta";
import CampusTeaser from "./landing/CampusTeaser";
import HeroDesk from "./landing/HeroDesk";
import InsideStack from "./landing/InsideStack";
import NotableAlumni from "./landing/NotableAlumni";
import Numbers from "./landing/Numbers";
import Rewind, { type RewindYear } from "./landing/Rewind";
import VelocityMarquee from "./landing/VelocityMarquee";
import WallTeaser from "./landing/WallTeaser";

type ArchiveRow = { short_code: string; image_url: string | null; posted_at: string | null };

// Every picture on this page is a real photograph from the alumni
// association's own Instagram archive, newest first, with its true proportions.
const SIZES = sizes as Record<string, number[]>;
const ALL = (archive as ArchiveRow[])
  .filter((p) => p.image_url && p.posted_at && SIZES[p.short_code] && !BLANK_SHOTS.has(p.short_code))
  .sort((a, b) => (a.posted_at! < b.posted_at! ? 1 : -1))
  .map((p) => ({
    src: p.image_url!,
    stamp: stampDate(p.posted_at!),
    code: p.short_code,
    year: new Date(p.posted_at!).getFullYear(),
    ratio: Math.round((SIZES[p.short_code][0] / SIZES[p.short_code][1]) * 1000) / 1000,
  }));

// The hero frames are square, so they only hold square pictures: nothing is cropped.
const HERO = ALL.filter((p) => Math.abs(p.ratio - 1) < 0.02).slice(0, 9);
const used = new Set(HERO.map((p) => p.code));
const TEASER = ALL.filter((p) => !used.has(p.code) && p.ratio > 0.7).slice(0, 6);
TEASER.forEach((p) => used.add(p.code));

// "Rewind": up to six photographs for each year, newest year first. Very tall
// frames are left out so the strip keeps an even rhythm. 2023 and 2024 are
// not shown here (their photographs are still on The Wall).
const REWIND_SKIPS = new Set([2023, 2024]);
const YEARS: RewindYear[] = [...new Set(ALL.map((p) => p.year))]
  .filter((year) => !REWIND_SKIPS.has(year))
  .sort((a, b) => b - a)
  .map((year) => {
    const ofYear = ALL.filter((p) => p.year === year);
    const photos = ofYear.filter((p) => !used.has(p.code) && p.ratio >= 0.74).slice(0, 6);
    return { year, count: ofYear.length, photos };
  })
  .filter((y) => y.photos.length >= 3);

const POSTCARDS = ["Bengaluru", "London", "San Francisco"]
  .map((name) => chapters.find((c) => c.name === name))
  .filter((c): c is (typeof chapters)[number] => Boolean(c))
  .map((c) => ({ name: c.name, image: c.image }));

export default function Landing({ signedIn }: { signedIn: boolean }) {
  const cta = signedIn ? { href: "/onboarding", label: "Finish your profile" } : { href: "/join", label: "Join the Network" };
  const figures = [
    { value: CHAPTER_COUNT, label: "chapters", note: "City and region communities, each with its own page." },
    { value: COUNTRY_COUNT, label: "countries", note: "Where those chapters are, outside the regional ones." },
    { value: new Date().getFullYear() - 1946, label: "years of BMSCE", note: "Since the college opened in Basavanagudi in 1946." },
  ];

  return (
    <>
      {/* If scripts never run, nothing stays hidden waiting for an entrance. */}
      <noscript>
        <style>{`.hero-pre{visibility:visible!important}`}</style>
      </noscript>
      <HeroDesk prints={HERO} cta={cta} />
      <VelocityMarquee items={chapters.map((c) => c.name)} />
      <Numbers figures={figures} />
      <Rewind years={YEARS} total={ALL.length} />
      <InsideStack chapters={CHAPTER_COUNT} countries={COUNTRY_COUNT} postcards={POSTCARDS} />
      <WallTeaser photos={TEASER} />
      <NotableAlumni />
      <Testimonials />
      <CampusTeaser />
      <BigCta cta={cta} />
    </>
  );
}
