import Nav from "./Nav";
import Footer from "./Footer";

// Skeleton shown while a force-dynamic page awaits its Supabase queries, so the
// user sees structured placeholders instead of a blank screen.
export default function LoadingScreen({
  variant = "list",
}: {
  variant?: "list" | "grid" | "detail";
}) {
  return (
    <>
      <Nav />
      <main aria-busy="true" aria-label="Loading">
        <section id="top">
          <div className="mx-auto max-w-7xl px-6 pb-20 pt-16 md:px-10 md:pt-24">
            {/* Heading skeleton */}
            <div className="h-3 w-24 animate-pulse rounded bg-gold/20" />
            <div className="mt-6 h-12 w-2/3 max-w-lg animate-pulse rounded bg-ink/10" />
            <div className="mt-5 h-4 w-1/2 max-w-md animate-pulse rounded bg-ink/10" />

            {variant === "detail" ? (
              <div className="mt-12 flex flex-col gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-4 animate-pulse rounded bg-ink/10"
                    style={{ width: `${90 - i * 8}%` }}
                  />
                ))}
              </div>
            ) : (
              <div
                className={`mt-12 grid gap-6 ${
                  variant === "grid"
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    : "grid-cols-1 md:grid-cols-2"
                }`}
              >
                {Array.from({ length: variant === "grid" ? 8 : 4 }).map(
                  (_, i) => (
                    <div
                      key={i}
                      className="h-48 animate-pulse rounded-2xl border border-gold/20 bg-ivory-dim/50"
                    />
                  )
                )}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
