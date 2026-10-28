import { getSupabaseAdminClient } from "../client";
import {
  computeAuditHash,
  verifyAuditChain,
  ChainVerificationResult,
} from "@/lib/rules/audit";
import { AuditLogEntry } from "@/types";

export interface LogAuditParams {
  actorId: string;
  actorRole?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  newState?: Record<string, unknown> | null;
  previousState?: Record<string, unknown> | null;
  reason: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditFilters {
  actorId?: string;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * Appends a tamper-evident entry to the audit_log table.
 * Computes hash = SHA-256(previous_hash + canonical JSON of entry content).
 */
export async function logAuditEvent(params: LogAuditParams): Promise<AuditLogEntry> {
  const supabase = getSupabaseAdminClient();

  // 1. Fetch latest audit entry to obtain chain link (previous_hash)
  const { data: latestEntry } = await supabase
    .from("audit_log")
    .select("hash")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevHash = latestEntry?.hash || "GENESIS_ROOT_HASH";
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const actorRole = params.actorRole || "user";

  const hash = computeAuditHash(prevHash, {
    id,
    actor_id: params.actorId,
    actor_role: actorRole,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    previous_state: params.previousState,
    new_state: params.newState,
    reason: params.reason,
    created_at: createdAt,
  });

  const { data, error } = await supabase
    .from("audit_log")
    .insert({
      id,
      actor_id: params.actorId,
      actor_role: actorRole,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      prev_hash: prevHash,
      hash,
      previous_state: params.previousState || null,
      new_state: params.newState || {},
      reason: params.reason,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      created_at: createdAt,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to append to audit log:", error);
    throw error;
  }

  return data as AuditLogEntry;
}

/**
 * Fetches audit log entries with optional filters for the Admin Audit Log UI.
 */
export async function getAuditLogEntries(filters?: AuditFilters): Promise<AuditLogEntry[]> {
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.actorId) {
    query = query.eq("actor_id", filters.actorId);
  }
  if (filters?.action && filters.action !== "ALL") {
    query = query.eq("action", filters.action);
  }
  if (filters?.resourceType && filters.resourceType !== "ALL") {
    query = query.eq("resource_type", filters.resourceType);
  }
  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  const limit = filters?.limit || 100;
  query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to query audit log entries:", error);
    return [];
  }

  return (data || []) as AuditLogEntry[];
}

/**
 * Recomputes and verifies the complete cryptographic hash chain from Genesis.
 */
export async function verifyAuditTrailIntegrity(): Promise<ChainVerificationResult> {
  const supabase = getSupabaseAdminClient();

  // Fetch all entries in chronological order (oldest to newest) to verify chain
  const { data: entries, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return {
      isValid: false,
      totalEntries: 0,
      message: `Database error querying audit log: ${error.message}`,
    };
  }

  return verifyAuditChain((entries || []) as AuditLogEntry[]);
}

/**
 * Retrieves the complete chronological audit history for a specific booking.
 */
export async function getBookingAuditHistory(bookingId: string): Promise<AuditLogEntry[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .eq("resource_id", bookingId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch booking audit history:", error);
    return [];
  }

  return (data || []) as AuditLogEntry[];
}
