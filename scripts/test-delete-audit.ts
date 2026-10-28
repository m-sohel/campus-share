import { config } from "dotenv";
config({ path: ".env.local" });
import { getSupabaseAdminClient } from "../src/backend/client";

async function main() {
  const sb = getSupabaseAdminClient();
  const { data: latest } = await sb.from("audit_log").select("id").order("created_at", { ascending: false }).limit(1);
  if (!latest?.[0]) return;

  const { error } = await sb.from("audit_log").delete().eq("id", latest[0].id);
  console.log("Delete attempt result:", error);
}

main().catch(console.error);
