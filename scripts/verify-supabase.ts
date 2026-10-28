import { config } from "dotenv";
config({ path: ".env.local" });
import { getSupabaseAdminClient } from "../src/backend/client";

async function verify() {
  const supabase = getSupabaseAdminClient();

  const { data: profiles, error: pErr } = await supabase.from("profiles").select("email, role, full_name");
  if (pErr) throw pErr;

  const { data: resources, error: rErr } = await supabase.from("resources").select("name, category, is_high_demand");
  if (rErr) throw rErr;

  const { data: audit, error: aErr } = await supabase.from("audit_log").select("action, hash, prev_hash");
  if (aErr) throw aErr;

  console.log("=== SUPABASE DATABASE LIVE STATUS ===");
  console.log(`✅ Profiles count: ${profiles.length}`);
  profiles.forEach(p => console.log(`   - [${p.role.toUpperCase()}] ${p.full_name} (${p.email})`));

  console.log(`\n✅ Resources count: ${resources.length}`);
  resources.forEach(r => console.log(`   - [${r.category}] ${r.name} ${r.is_high_demand ? "⭐ (HIGH DEMAND)" : ""}`));

  console.log(`\n✅ Audit chain initialized: ${audit.length} entries`);
  audit.forEach(a => console.log(`   - Action: ${a.action} | Hash: ${a.hash.slice(0, 16)}...`));
}

verify().catch(console.error);

