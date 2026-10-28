import { getSupabaseAdminClient } from "../client";
import { computeAuditHash } from "@/lib/rules/audit-verifier";

export interface LogAuditParams {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  newState?: Record<string, unknown> | null;
  reason: string;
}

/**
 * Appends a tamper-evident entry to the audit_log table.
 * Computes hash = SHA-256(previous_hash + canonical data).
 */
export async function logAuditEvent(params: LogAuditParams) {
  const supabase = getSupabaseAdminClient();

  // 1. Fetch latest audit entry to get previous_hash
  const { data: latestEntry } = await supabase
    .from("audit_log")
    .select("hash")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const prevHash = latestEntry?.hash || "GENESIS_ROOT_HASH";
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const hash = computeAuditHash(prevHash, {
    id,
    actor_id: params.actorId,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    new_state: params.newState,
    reason: params.reason,
    created_at: createdAt,
  });

  const { data, error } = await supabase
    .from("audit_log")
    .insert({
      id,
      actor_id: params.actorId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      previous_hash: prevHash,
      hash,
      new_state: params.newState || {},
      reason: params.reason,
      created_at: createdAt,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to write audit log entry:", error);
    throw error;
  }

  return data;
}

