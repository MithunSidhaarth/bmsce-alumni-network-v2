import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Record a sensitive admin/owner action in `admin_audit_log`.
 *
 * Best-effort: a logging failure must never block the underlying action, so
 * this swallows errors. `supabase` must be the caller's authenticated server
 * client — `admin_id` is taken from the current session, and RLS requires the
 * inserted `admin_id` to equal `auth.uid()`.
 */
export async function logAdminAction(
  supabase: SupabaseClient,
  action: string,
  target: string | null
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("admin_audit_log")
      .insert({ admin_id: user.id, action, target });
  } catch {
    // Auditing is observability, not a control — never let it break the action.
  }
}
