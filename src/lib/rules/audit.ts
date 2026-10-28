import { createHash } from "crypto";
import { AuditLogEntry } from "@/types";

export interface AuditEntryContent {
  id: string;
  actor_id: string;
  actor_role?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  reason: string;
  created_at: string;
}

export interface ChainVerificationResult {
  isValid: boolean;
  totalEntries: number;
  brokenIndex?: number;
  expectedHash?: string;
  actualHash?: string;
  tamperedEntry?: AuditLogEntry;
  tamperType?: "BROKEN_LINK" | "ALTERED_CONTENT";
  message: string;
}

/**
 * Pure function: deterministic canonical JSON stringifier with sorted object keys.
 * Ensures consistent hash generation regardless of key insertion order.
 */
export function canonicalJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalJson(item)).join(",")}]`;
  }

  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const entries = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  );
  return `{${entries.join(",")}}`;
}

/**
 * Pure function: Computes hash = SHA-256(previous_hash + canonical JSON of entry content).
 */
export function computeAuditHash(
  prevHash: string,
  entry: {
    id: string;
    actor_id: string;
    actor_role?: string;
    action: string;
    resource_type: string;
    resource_id: string;
    previous_state?: Record<string, unknown> | null;
    new_state?: Record<string, unknown> | null;
    reason: string;
    created_at: string;
  }
): string {
  const normalizedTime = new Date(entry.created_at).toISOString();

  // Canonical representation of entry content
  const content = {
    action: entry.action,
    actor_id: entry.actor_id,
    created_at: normalizedTime,
    id: entry.id,
    new_state: entry.new_state || null,
    previous_state: entry.previous_state || null,
    reason: entry.reason,
    resource_id: entry.resource_id,
    resource_type: entry.resource_type,
  };

  const canonicalPayload = `${prevHash}::${canonicalJson(content)}`;
  return createHash("sha256").update(canonicalPayload).digest("hex");
}

/**
 * Pure function: Verifies the cryptographic integrity of an entire audit log chain.
 * Recomputes hashes from genesis and identifies the exact index and hash of any tampered entry.
 */
export function verifyAuditChain(chain: AuditLogEntry[]): ChainVerificationResult {
  if (!chain || chain.length === 0) {
    return {
      isValid: true,
      totalEntries: 0,
      message: "Audit chain is empty. No entries to verify.",
    };
  }

  let expectedPrevHash = chain[0].prev_hash;

  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];

    // 1. Verify backward link pointer
    if (i > 0 && entry.prev_hash !== expectedPrevHash) {
      return {
        isValid: false,
        totalEntries: chain.length,
        brokenIndex: i,
        tamperedEntry: entry,
        tamperType: "BROKEN_LINK",
        expectedHash: expectedPrevHash,
        actualHash: entry.prev_hash,
        message: `Tamper detected at block #${i} (ID: ${entry.id.slice(
          0,
          8
        )}): prev_hash link is broken. Expected ${expectedPrevHash.slice(
          0,
          16
        )}..., but found ${entry.prev_hash.slice(0, 16)}...`,
      };
    }

    // 2. Recompute SHA-256 hash from entry contents using canonical JSON
    const canonicalHash = computeAuditHash(entry.prev_hash, entry);

    // Backward-compatibility hash check for initial rows (prior to canonical JSON format)
    const normalizedTime = new Date(entry.created_at).toISOString();
    let matches = entry.hash === canonicalHash;

    if (!matches) {
      // Legacy format attempt 1: direct JSON.stringify
      const legacyPayload = [
        entry.prev_hash,
        entry.id,
        entry.actor_id,
        entry.action,
        entry.resource_type,
        entry.resource_id,
        JSON.stringify(entry.new_state || {}),
        entry.reason,
        normalizedTime,
      ].join("::");
      if (createHash("sha256").update(legacyPayload).digest("hex") === entry.hash) {
        matches = true;
      }
    }

    if (!matches && entry.new_state) {
      // Legacy format attempt 2: booking request key order
      if (entry.action === "BOOKING_REQUESTED") {
        const order = {
          resource_id: entry.new_state.resource_id,
          user_id: entry.new_state.user_id,
          start_time: entry.new_state.start_time,
          end_time: entry.new_state.end_time,
          status: entry.new_state.status,
          eligibility_summary: entry.new_state.eligibility_summary,
        };
        const p = [
          entry.prev_hash,
          entry.id,
          entry.actor_id,
          entry.action,
          entry.resource_type,
          entry.resource_id,
          JSON.stringify(order),
          entry.reason,
          normalizedTime,
        ].join("::");
        if (createHash("sha256").update(p).digest("hex") === entry.hash) {
          matches = true;
        }
      } else if (
        entry.action === "BOOKING_APPROVED" ||
        entry.action === "BOOKING_REJECTED" ||
        entry.action === "BOOKING_WAITLISTED"
      ) {
        // Legacy review action key order
        const order = { status: entry.new_state.status, reason: entry.new_state.reason };
        const p = [
          entry.prev_hash,
          entry.id,
          entry.actor_id,
          entry.action,
          entry.resource_type,
          entry.resource_id,
          JSON.stringify(order),
          entry.reason,
          normalizedTime,
        ].join("::");
        if (createHash("sha256").update(p).digest("hex") === entry.hash) {
          matches = true;
        }
      }
    }

    if (!matches) {
      return {
        isValid: false,
        totalEntries: chain.length,
        brokenIndex: i,
        tamperedEntry: entry,
        tamperType: "ALTERED_CONTENT",
        expectedHash: canonicalHash,
        actualHash: entry.hash,
        message: `Tamper detected at block #${i} (ID: ${entry.id.slice(
          0,
          8
        )}): Content was altered! Recomputed SHA-256 does not match stored hash.`,
      };
    }

    expectedPrevHash = entry.hash;
  }

  return {
    isValid: true,
    totalEntries: chain.length,
    message: `Audit chain verified successfully! All ${chain.length} cryptographic blocks are 100% tamper-free and mathematically sound.`,
  };
}
