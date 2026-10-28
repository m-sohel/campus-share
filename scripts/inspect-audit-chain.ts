import { config } from "dotenv";
config({ path: ".env.local" });
import { getSupabaseAdminClient } from "../src/backend/client";

async function main() {
  const sb = getSupabaseAdminClient();
  const { data: rows } = await sb.from("audit_log").select("id, action, prev_hash, hash, created_at").order("created_at", { ascending: true });
  console.log(`Total rows in audit_log: ${rows?.length}`);
  rows?.forEach((r, i) => {
    console.log(`${i}. [${r.action}] prev: ${r.prev_hash.slice(0, 10)}... | hash: ${r.hash.slice(0, 10)}... | date: ${r.created_at}`);
  });
}

main().catch(console.error);

