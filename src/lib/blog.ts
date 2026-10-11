// Blog & Insights categories. Stored as text on each article, so adding one
// here is all it takes: no migration.
export const BLOG_CATEGORIES = [
  "Alumni Stories",
  "Industry Insights",
  "Startups",
  "Career Advice",
  "Higher Studies",
  "Technology",
  "Finance & Consulting",
  "Campus Memories",
  "Achievements",
  "Community",
] as const;

export const ARTICLE_CARD =
  "id, slug, title, excerpt, cover_url, category, author_name, author_title, author_id, published_at, reading_minutes, is_featured";

export type ArticleCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  category: string;
  author_name: string | null;
  author_title: string | null;
  author_id: string | null;
  published_at: string | null;
  reading_minutes: number;
  is_featured: boolean;
};
