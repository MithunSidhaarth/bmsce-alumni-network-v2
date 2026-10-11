import type { Metadata } from "next";
import Link from "next/link";
import GalleryAdmin from "./GalleryAdmin";
import { createClient } from "@/lib/supabase/server";
import type { GalleryPhoto } from "@/lib/types";

export const metadata: Metadata = {
  title: "Admin · Gallery: BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

// How many recent photos the admin management list shows/lets you delete
// from here. The public gallery itself has no such cap — it paginates
// through everything via infinite scroll.
const RECENT_LIMIT = 60;

export default async function AdminGalleryPage() {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("gallery_photos")
    .select("id, image_url, thumbnail_url, caption, uploaded_by, uploaded_at")
    .order("uploaded_at", { ascending: false })
    .limit(RECENT_LIMIT)
    .returns<GalleryPhoto[]>();

  return (
    <>
      <h1 className="slash font-display text-[clamp(2rem,5vw,3rem)] leading-[1.02] tracking-tight text-ink">
        Upload photos.
      </h1>
      <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-ink/70">
        Select or drag in as many photos as you like. They&rsquo;re resized
        and compressed in your browser before upload, so large batches upload
        reliably. They appear on the public{" "}
        <Link
          href="/gallery"
          className="text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
        >
          Gallery page
        </Link>{" "}
        right away.
      </p>
      <div className="mt-10">
        <GalleryAdmin existing={existing ?? []} />
      </div>
    </>
  );
}
