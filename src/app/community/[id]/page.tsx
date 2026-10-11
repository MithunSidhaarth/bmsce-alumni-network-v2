import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Icon from "@/components/v2/Icon";
import PostCard from "@/components/v2/PostCard";
import Replies, { type Reply } from "@/components/v2/Replies";
import { requireMember } from "@/lib/me";
import { myReactions, normalizePosts, POST_SELECT } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Conversation: BMSCE Alumni Network",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, me, verified, isAdmin } = await requireMember(`/community/${id}`);
  if (!verified) notFound();

  const { data } = await supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle();
  const post = normalizePosts(data ? [data] : [])[0];
  if (!post) notFound();

  const [comments, likes, reactions, follow, lead] = await Promise.all([
    supabase
      .from("post_comments")
      .select("id, body, created_at, author_id, is_hidden, author:profiles!post_comments_author_id_fkey(id, full_name, photo_url, user_type, graduation_year)")
      .eq("post_id", id)
      .order("created_at"),
    supabase.from("comment_reactions").select("comment_id, user_id, comment:post_comments!inner(post_id)").eq("comment.post_id", id),
    myReactions(supabase, me.id, [id]),
    supabase.from("post_follows").select("post_id").eq("post_id", id).eq("user_id", me.id).maybeSingle(),
    post.chapter_id
      ? supabase.rpc("is_chapter_lead", { p_chapter: post.chapter_id })
      : Promise.resolve({ data: false }),
  ]);

  const likeCount: Record<string, number> = {};
  const likedByMe = new Set<string>();
  for (const l of likes.data ?? []) {
    likeCount[l.comment_id] = (likeCount[l.comment_id] ?? 0) + 1;
    if (l.user_id === me.id) likedByMe.add(l.comment_id);
  }
  const replies: Reply[] = (comments.data ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    created_at: c.created_at,
    author_id: c.author_id,
    author: Array.isArray(c.author) ? (c.author[0] ?? null) : c.author,
    likes: likeCount[c.id] ?? 0,
    liked: likedByMe.has(c.id),
  }));

  const back = post.chapter
    ? { href: `/chapters/${post.chapter.slug}`, label: post.chapter.name }
    : post.kind === "discussion"
    ? { href: "/community", label: "The forum" }
    : { href: "/", label: "Home" };

  return (
    <>
      <main className="mx-auto max-w-[760px] px-4 pb-16 pt-6 md:px-8">
        <Link href={back.href} className="inline-flex items-center gap-2 text-sm font-semibold text-ink/70 hover:text-ink">
          <Icon name="back" className="h-4 w-4" />
          {back.label}
        </Link>
        <div className="mt-5">
          <PostCard
            post={post}
            viewer={{ id: me.id, isAdmin, leadOf: lead.data && post.chapter_id ? [post.chapter_id] : [] }}
            myReaction={reactions[id] ?? null}
            full
          />
        </div>
        <Replies
          postId={id}
          replies={replies}
          me={{ id: me.id, full_name: me.full_name, photo_url: me.photo_url, isAdmin }}
          following={Boolean(follow.data)}
        />
      </main>
      <Footer />
    </>
  );
}
