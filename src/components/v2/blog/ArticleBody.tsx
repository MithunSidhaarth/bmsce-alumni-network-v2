import ReactMarkdown from "react-markdown";
import { safeUrl } from "@/lib/url";

// Articles are written in Markdown. react-markdown renders it to React
// elements and ignores raw HTML, so nothing an author types can inject markup
// or script. Typography is tuned for reading: a serif at a comfortable size,
// a ~65 character measure, and a drop cap on the opening paragraph.
export default function ArticleBody({ markdown }: { markdown: string }) {
  return (
    <div className="article-body font-serif text-[1.1875rem] leading-[1.72] text-ink/90">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h2 className="mb-3 mt-12 font-display text-[1.9rem] leading-tight text-ink">{children}</h2>,
          h2: ({ children }) => <h2 className="mb-3 mt-12 font-display text-[1.7rem] leading-tight text-ink">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-9 font-display text-[1.3rem] leading-tight text-ink">{children}</h3>,
          p: ({ children }) => <p className="mt-6">{children}</p>,
          a: ({ href, children }) => {
            const url = safeUrl(href) ?? (href?.startsWith("/") ? href : null);
            return url ? (
              <a href={url} {...(url.startsWith("/") ? {} : { target: "_blank", rel: "noreferrer" })} className="text-forest underline decoration-lime decoration-2 underline-offset-4 hover:decoration-forest">
                {children}
              </a>
            ) : (
              <>{children}</>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="my-9 border-l-4 border-lime pl-5 font-serif text-[1.45rem] italic leading-snug text-ink">{children}</blockquote>
          ),
          ul: ({ children }) => <ul className="mt-6 list-disc space-y-2 pl-6 marker:text-tangerine">{children}</ul>,
          ol: ({ children }) => <ol className="mt-6 list-decimal space-y-2 pl-6 marker:font-mono marker:text-sm marker:text-tangerine">{children}</ol>,
          hr: () => <hr className="mx-auto my-12 w-24 border-0 border-t-[3px] border-double border-ink/40" />,
          img: ({ src, alt }) => {
            const url = typeof src === "string" ? safeUrl(src) : null;
            return url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={alt ?? ""} loading="lazy" className="my-9 w-full" />
            ) : null;
          },
          code: ({ children }) => <code className="rounded bg-ink/[0.07] px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>,
          pre: ({ children }) => <pre className="my-7 overflow-x-auto rounded bg-ink p-4 font-mono text-sm leading-relaxed text-ivory [&_code]:bg-transparent [&_code]:p-0">{children}</pre>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
