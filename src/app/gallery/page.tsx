import type { Metadata } from "next";
import Image from "next/image";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import Reveal from "@/components/Reveal";
import GalleryGrid from "@/components/GalleryGrid";
import { createClient } from "@/lib/supabase/server";
import type { GalleryPhoto } from "@/lib/types";
import { GALLERY_PAGE_SIZE } from "@/lib/gallery";

export const metadata: Metadata = {
  title: "Gallery: BMSCE Alumni Network",
  description: "Photos from the BMSCE campus and from the Network around the world.",
};

export const dynamic = "force-dynamic";

// Where each cover print sits (back to front) and how far it is turned.
const PRINT_SPOTS = [
  "left-0 top-[6%] h-[62%] w-[58%] z-0",
  "right-0 top-0 h-[70%] w-[50%] z-10",
  "left-[22%] bottom-0 h-[58%] w-[56%] z-20",
];
const PRINT_TILTS = [-5, 4, -1.5];

export default async function GalleryPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("id, image_url, thumbnail_url, caption, uploaded_by, uploaded_at")
    .order("uploaded_at", { ascending: false })
    .range(0, GALLERY_PAGE_SIZE - 1)
    .returns<GalleryPhoto[]>();

  // Surfaced instead of silently swallowed — an empty array from a query
  // error looks identical to a genuinely empty gallery otherwise.
  if (error) console.error("gallery_photos fetch failed:", error.message);

  const initialPhotos = data ?? [];
  const cover = initialPhotos.slice(0, 3);

  return (
    <>
      <Nav />
      <main>
        <section id="top" className="overflow-hidden">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-10 pt-16 md:px-10 md:pb-14 md:pt-24 lg:grid-cols-[1fr_minmax(0,30rem)]">
            <div>
              <Reveal>
                <Eyebrow>Gallery</Eyebrow>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="slash mt-6 max-w-3xl font-display text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] tracking-tight text-ink">
                  Moments from the Network.
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-ink/70 md:text-lg">
                  From the 1946 gate to this year&rsquo;s festival day: campus,
                  chapters, reunions, and everything in between. Tap any photo
                  for a closer look.
                </p>
              </Reveal>
            </div>

            {/* The three newest photos, laid on the page as pinned prints. */}
            {cover.length === 3 && (
              <Reveal delay={240}>
                <div aria-hidden="true" className="relative mx-auto aspect-[5/4] w-full max-w-[30rem]">
                  {cover.map((photo, i) => (
                    <figure
                      key={photo.id}
                      className={`pinned absolute rounded-print bg-white p-2.5 pb-8 shadow-[0_22px_38px_-18px_rgb(33_37_41/0.55)] ${PRINT_SPOTS[i]}`}
                      style={{ ["--tilt" as string]: `${PRINT_TILTS[i]}deg` }}
                    >
                      <span className={`tape ${i === 1 ? "tape-lime" : ""}`} />
                      <div className="relative h-full w-full overflow-hidden bg-ivory-dim">
                        <Image src={photo.thumbnail_url} alt="" fill sizes="(max-width: 1024px) 60vw, 18rem" className="object-cover" priority />
                      </div>
                    </figure>
                  ))}
                </div>
              </Reveal>
            )}
          </div>
        </section>

        <section className="border-t border-gold/30">
          <div className="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-16">
            <GalleryGrid
              initialPhotos={initialPhotos}
              initialHasMore={initialPhotos.length === GALLERY_PAGE_SIZE}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
