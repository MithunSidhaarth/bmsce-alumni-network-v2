// Writes the migrations recorded in the database to supabase/migrations/.
// Run as an admin account: node scripts/export-migrations.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { error: authError } = await supabase.auth.signInWithPassword({ email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD });
if (authError) throw authError;
const { data, error } = await supabase.rpc("admin_export_migrations");
if (error) throw error;
const dir = new URL("../supabase/migrations/", import.meta.url);
mkdirSync(dir, { recursive: true });
for (const m of data) {
  const file = `${m.version}_${m.name}.sql`;
  writeFileSync(new URL(file, dir), m.sql.trimEnd() + "\n");
  console.log(file, m.sql.length);
}
