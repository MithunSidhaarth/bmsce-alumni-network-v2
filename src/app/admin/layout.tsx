import type { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import { requireAdmin } from "@/lib/me";

export const dynamic = "force-dynamic";

// The admin console is a separate area with its own navigation. Non-admins
// are redirected before anything renders, and every query below still runs
// under Row Level Security as the signed-in user.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { supabase, me } = await requireAdmin();

  const [pending, reports, wall, failures] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("verification_status", "unverified").eq("user_type", "alumni"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("notice_items").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("ig_sync_failures").select("id", { count: "exact", head: true }).is("resolved_at", null),
  ]);

  return (
    <main className="mx-auto grid max-w-[1320px] grid-cols-1 gap-6 px-4 pb-20 pt-6 md:grid-cols-[13.5rem_minmax(0,1fr)] md:gap-10 md:px-8">
      <AdminSidebar
        adminName={me.full_name}
        badges={{
          "/admin/review": pending.count ?? 0,
          "/admin/reports": reports.count ?? 0,
          "/admin/noticeboard": wall.count ?? 0,
          "/admin/instagram": failures.count ?? 0,
        }}
      />
      <div className="min-w-0">{children}</div>
    </main>
  );
}
