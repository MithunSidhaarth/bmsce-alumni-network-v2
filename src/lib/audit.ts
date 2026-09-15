import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Record a sensitive admin/owner action in `admin_audit_log`.
 *
 * Best-effort: a logging failure must never block the underlying action, so
 * this swallows errors. Writes go through the `log_admin_action` SECURITY
 * DEFINER function (not a direct table insert) — it re-checks `is_admin()`
 * itself server-side, so this can't be used by a non-admin to spam the log
 * even if they call it directly from the browser console instead of through
 * the app's UI.
 */
export async function logAdminAction(
  supabase: SupabaseClient,
  action: string,
  target: string | null
): Promise<void> {
  try {
    await supabase.rpc("log_admin_action", {
      p_action: action,
      p_target: target,
    });
  } catch {
    // Auditing is observability, not a control — never let it break the action.
  }
}
