import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import Reveal from "@/components/Reveal";
import GalleryGrid from "@/components/GalleryGrid";
import { createClient } from "@/lib/supabase/server";
import type { GalleryPhoto } from "@/lib/types";
import { GALLERY_PAGE_SIZE } from "@/lib/gallery";

export const metadata: Metadata = {
  title: "Gallery — BMSCE Alumni Network",
  description: "Photos from the BMS campus and the alumni network worldwide.",
};

export const dynamic = "force-dynamic";

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

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-7xl px-6 pb-10 pt-16 md:px-10 md:pb-14 md:pt-24">
            <Reveal>
              <Eyebrow>Gallery</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] tracking-tight text-ink">
                Moments from the network.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-ink/70 md:text-lg">
                Campus, chapters, reunions, and everything in between — click
                any photo for a closer look.
              </p>
            </Reveal>
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
