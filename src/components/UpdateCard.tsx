import { safeUrl } from "@/lib/url";

export type CampusUpdate = {
  id: string;
  title: string;
  body: string | null;
  category: string;
  image_url: string | null;
  link_url: string | null;
  published_at: string;
};

export const UPDATE_COLUMNS =
  "id, title, body, category, image_url, link_url, published_at";

export default function UpdateCard({ u }: { u: CampusUpdate }) {
  const img = safeUrl(u.image_url);
  const link = safeUrl(u.link_url);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gold/25 bg-ivory shadow-sm transition-shadow hover:shadow-[0_24px_48px_-24px_rgba(20,34,64,0.5)]">
      <div className="aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-maroon to-oxblood">
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col px-6 py-6">
        <p className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
          {u.category} ·{" "}
          {new Date(u.published_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
        <h3 className="mt-3 font-display text-xl leading-snug text-ink">
          {u.title}
        </h3>
        {u.body && (
          <p className="mt-2 line-clamp-4 font-sans text-sm leading-relaxed text-ink/70">
            {u.body}
          </p>
        )}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="mt-auto pt-5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-oxblood underline decoration-accent underline-offset-4 hover:text-maroon"
          >
            Read more →
          </a>
        )}
      </div>
    </article>
  );
}
