import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import MemberPhoto from "@/components/MemberPhoto";
import ReportButton from "@/components/ReportButton";
import LikeButton from "./LikeButton";
import CommentForm from "./CommentForm";
import DeleteButton from "./DeleteButton";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Discussion — BMSCE Alumni Network",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Author = { full_name: string | null; photo_url: string | null } | null;

type PostRow = {
  id: string;
  author_id: string | null;
  title: string;
  body: string;
  created_at: string;
  author: Author;
  likes: { count: number }[];
};

type CommentRow = {
  id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  author: Author;
  likes: { count: number }[];
};

function initials(name: string | null) {
  const parts = (name || "?").trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")
  ).toUpperCase();
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Avatar({ author }: { author: Author }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/40 bg-ivory-dim font-display text-xs italic text-oxblood">
      {author?.photo_url ? (
        <MemberPhoto src={author.photo_url} />
      ) : (
        initials(author?.full_name ?? null)
      )}
    </span>
  );
}

export default async function DiscussionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/community/${id}`);

  const { data: me } = await supabase
    .from("profiles")
    .select("verification_status, role")
    .eq("id", user.id)
    .single();
  const isAdmin = me?.role === "admin";
  const canAccess = me?.verification_status === "verified" || isAdmin;
  if (!canAccess) redirect("/community"); // shows the verify-first state there

  const { data: post } = await supabase
    .from("discussion_posts")
    .select(
      `id, author_id, title, body, created_at,
       author:profiles!discussion_posts_author_id_fkey(full_name, photo_url),
       likes:discussion_likes(count)`
    )
    .eq("id", id)
    .maybeSingle<PostRow>();

  if (!post) {
    return (
      <>
        <Nav />
        <main>
          <div className="mx-auto max-w-2xl px-6 py-32 text-center">
            <p className="font-display text-2xl italic text-ink">
              This discussion isn&rsquo;t available.
            </p>
            <Link
              href="/community"
              className="mt-6 inline-block font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-oxblood underline decoration-accent underline-offset-4"
            >
              ← Back to community
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const [{ data: myLike }, { data: commentData }] = await Promise.all([
    supabase
      .from("discussion_likes")
      .select("post_id")
      .eq("post_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("discussion_comments")
      .select(
        `id, author_id, body, created_at,
         author:profiles!discussion_comments_author_id_fkey(full_name, photo_url),
         likes:discussion_comment_likes(count)`
      )
      .eq("post_id", id)
      .order("created_at", { ascending: true })
      .returns<CommentRow[]>(),
  ]);

  const comments = commentData ?? [];
  const likeCount = post.likes[0]?.count ?? 0;
  const liked = Boolean(myLike);
  const canDeletePost = post.author_id === user.id || isAdmin;

  // Which of these comments the current user has liked — a single bulk query
  // rather than one per comment.
  const commentIds = comments.map((c) => c.id);
  const { data: myCommentLikes } = commentIds.length
    ? await supabase
        .from("discussion_comment_likes")
        .select("comment_id")
        .eq("user_id", user.id)
        .in("comment_id", commentIds)
    : { data: [] as { comment_id: string }[] };
  const likedCommentIds = new Set(
    (myCommentLikes ?? []).map((r) => r.comment_id as string)
  );

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto max-w-3xl px-6 pb-24 pt-16 md:px-10 md:pt-24">
            <Link
              href="/community"
              className="font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
            >
              ← Community
            </Link>

            <article className="mt-8">
              <h1 className="font-display text-[clamp(1.9rem,5vw,3rem)] leading-[1.08] tracking-tight text-ink">
                {post.title}
              </h1>
              <div className="mt-5 flex items-center gap-3">
                <Avatar author={post.author} />
                <div>
                  <p className="font-sans text-sm text-ink/80">
                    {post.author?.full_name || "A member"}
                  </p>
                  <p className="font-sans text-xs text-ink/50">
                    {fmt(post.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-8 whitespace-pre-wrap font-sans text-base leading-relaxed text-ink/80">
                {post.body}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-gold/25 py-4">
                <LikeButton postId={post.id} liked={liked} count={likeCount} />
                <span className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
                  {comments.length}{" "}
                  {comments.length === 1 ? "comment" : "comments"}
                </span>
                <div className="ml-auto flex items-center gap-4">
                  <ReportButton targetType="discussion_post" targetId={post.id} />
                  {canDeletePost && (
                    <DeleteButton kind="post" id={post.id} postId={post.id} />
                  )}
                </div>
              </div>
            </article>

            {/* Comments */}
            <section className="mt-10">
              <Eyebrow>Replies</Eyebrow>
              {comments.length === 0 ? (
                <p className="mt-6 font-sans text-sm text-ink/55">
                  No replies yet — be the first.
                </p>
              ) : (
                <ul className="mt-6 flex flex-col gap-6">
                  {comments.map((c) => {
                    const canDelete = c.author_id === user.id || isAdmin;
                    const commentLikeCount = c.likes[0]?.count ?? 0;
                    const commentLiked = likedCommentIds.has(c.id);
                    return (
                      <li
                        key={c.id}
                        className="border-t border-gold/20 pt-6 first:border-t-0 first:pt-0"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar author={c.author} />
                          <div>
                            <p className="font-sans text-sm text-ink/80">
                              {c.author?.full_name || "A member"}
                            </p>
                            <p className="font-sans text-xs text-ink/50">
                              {fmt(c.created_at)}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink/80">
                          {c.body}
                        </p>
                        <div className="mt-3 flex items-center gap-4">
                          <LikeButton
                            commentId={c.id}
                            liked={commentLiked}
                            count={commentLikeCount}
                          />
                          <ReportButton
                            targetType="discussion_comment"
                            targetId={c.id}
                          />
                          {canDelete && (
                            <DeleteButton
                              kind="comment"
                              id={c.id}
                              postId={post.id}
                            />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-8">
                <CommentForm postId={post.id} />
              </div>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
