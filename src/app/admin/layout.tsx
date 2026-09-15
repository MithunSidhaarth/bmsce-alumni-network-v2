import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import AdminSidebar from "./AdminSidebar";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (me?.role !== "admin") {
    return (
      <>
        <Nav />
        <main>
          <section id="top">
            <div className="mx-auto max-w-2xl px-6 py-32 text-center">
              <Eyebrow align="center">Admin</Eyebrow>
              <h1 className="mt-6 font-display text-4xl text-ink">
                Not authorized.
              </h1>
              <p className="mt-4 font-sans text-base text-ink/70">
                This area is for network administrators only.
              </p>
              <Link
                href="/"
                className="mt-8 inline-flex items-center justify-center rounded-sm bg-oxblood px-7 py-3 font-sans text-[12px] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-maroon"
              >
                Back home
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  const [{ count: pendingCount }, { count: reportsCount }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "unverified")
        .eq("user_type", "alumni"),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
    ]);

  return (
    <>
      <Nav />
      <main>
        <section id="top">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 pb-24 pt-10 md:flex-row md:gap-12 md:px-10 md:pt-16">
            <AdminSidebar
              adminName={me?.full_name ?? null}
              pendingCount={pendingCount ?? 0}
              reportsCount={reportsCount ?? 0}
            />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
