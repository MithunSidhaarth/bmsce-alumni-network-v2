import type { Metadata } from "next";
import AddSocialPost from "./AddSocialPost";
import { createClient } from "@/lib/supabase/server";
import type { SocialPost } from "@/lib/types";

export const metadata: Metadata = {
  title: "Admin · Social posts: BMSCE Alumni Network",
};

export const dynamic = "force-dynamic";

export default async function AdminSocialPage() {
  const supabase = await createClient();

  const { data: recent } = await supabase
    .from("social_posts")
    .select(
      "id, post_id, short_code, caption, image_url, video_url, post_type, posted_at, likes_count, comments_count, permalink, hashtags, created_at"
    )
    .eq("post_type", "Manual")
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<SocialPost[]>();

  return (
    <>
      <h1 className="slash font-display text-[clamp(2rem,5vw,3rem)] leading-[1.02] tracking-tight text-ink">
        Add an Instagram post.
      </h1>
      <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-ink/70">
        Paste a post&rsquo;s Instagram link (and optionally an image and
        caption). It appears in the &ldquo;From our Instagram&rdquo; section
        on the Events page. The 168 historical posts are already imported and
        aren&rsquo;t listed here.
      </p>
      <div className="mt-10">
        <AddSocialPost recent={recent ?? []} />
      </div>
    </>
  );
}
