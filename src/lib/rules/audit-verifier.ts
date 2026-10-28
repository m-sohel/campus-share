import { createHash } from "crypto";
import { AuditLogEntry } from "@/types";

/**
 * Computes a deterministic SHA-256 hash for an audit log entry chained to its predecessor.
 */
export function computeAuditHash(
  prevHash: string,
  entry: {
    id: string;
    actor_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    new_state?: Record<string, unknown> | null;
    reason: string;
    created_at: string;
  }
): string {
  const payload = [
    prevHash,
    entry.id,
    entry.actor_id,
    entry.action,
    entry.resource_type,
    entry.resource_id,
    JSON.stringify(entry.new_state || {}),
    entry.reason,
    entry.created_at,
  ].join("::");

  return createHash("sha256").update(payload).digest("hex");
}

export interface ChainVerificationResult {
  isValid: boolean;
  brokenIndex?: number;
  expectedHash?: string;
  actualHash?: string;
  message: string;
}

/**
 * Verifies the integrity of an audit chain.
 * Any altered or dropped record will cause validation to fail.
 */
export function verifyAuditChain(chain: AuditLogEntry[]): ChainVerificationResult {
  if (chain.length === 0) {
    return { isValid: true, message: "Audit chain is empty and valid." };
  }

  let currentPrevHash = "GENESIS_HASH";

  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];

    if (entry.prev_hash !== currentPrevHash) {
      return {
        isValid: false,
        brokenIndex: i,
        expectedHash: currentPrevHash,
        actualHash: entry.prev_hash,
        message: `Tamper detected at index ${i}: prev_hash does not match expected chain value.`,
      };
    }

    const computed = computeAuditHash(currentPrevHash, entry);
    if (computed !== entry.hash) {
      return {
        isValid: false,
        brokenIndex: i,
        expectedHash: computed,
        actualHash: entry.hash,
        message: `Tamper detected at index ${i}: record hash mismatch. Entry contents were modified.`,
      };
    }

    currentPrevHash = entry.hash;
  }

  return {
    isValid: true,
    message: `Audit chain verified successfully. All ${chain.length} entries are tamper-free.`,
  };
}
