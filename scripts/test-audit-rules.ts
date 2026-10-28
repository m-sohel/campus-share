import {
  canonicalJson,
  computeAuditHash,
  verifyAuditChain,
} from "../src/lib/rules/audit";
import { AuditLogEntry } from "../src/types";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log("=== RUNNING PURE AUDIT HASH CHAIN UNIT TESTS ===\n");

// Test 1: Canonical JSON key sorting
{
  const objA = { z: 1, a: 2, m: { y: "test", b: 4 } };
  const objB = { a: 2, m: { b: 4, y: "test" }, z: 1 };
  const strA = canonicalJson(objA);
  const strB = canonicalJson(objB);
  assert(strA === strB, "Canonical JSON produces identical string regardless of key insertion order");
  assert(strA.startsWith('{"a":2,"m":{"b":4,"y":"test"},"z":1}'), "Keys are alphabetically sorted at all levels");
}

// Test 2: Hash computation is deterministic
{
  const entry = {
    id: "e-1",
    actor_id: "u-1",
    actor_role: "user",
    action: "BOOKING_REQUESTED",
    resource_type: "booking",
    resource_id: "b-1",
    new_state: { status: "pending_review", hours: 2 },
    reason: "Senior capstone laser cutting",
    created_at: "2026-10-28T12:00:00Z",
  };

  const hash1 = computeAuditHash("GENESIS_HASH", entry);
  const hash2 = computeAuditHash("GENESIS_HASH", entry);
  assert(hash1 === hash2, "Repeated hash computation is strictly deterministic");
  assert(hash1.length === 64, "Generated valid 64-character SHA-256 hex string");
}

// Test 3: Valid 3-block audit chain verification
const genesisEntry: AuditLogEntry = {
  id: "block-0",
  actor_id: "admin-1",
  actor_role: "admin",
  action: "SYSTEM_INITIALIZED",
  resource_type: "system",
  resource_id: "genesis",
  reason: "System bootstrap",
  prev_hash: "GENESIS_ROOT_HASH",
  hash: "",
  created_at: "2026-10-28T10:00:00Z",
};
genesisEntry.hash = computeAuditHash("GENESIS_ROOT_HASH", genesisEntry);

const block1: AuditLogEntry = {
  id: "block-1",
  actor_id: "user-1",
  actor_role: "user",
  action: "BOOKING_REQUESTED",
  resource_type: "booking",
  resource_id: "b-100",
  new_state: { status: "pending_review" },
  reason: "Research slot request",
  prev_hash: genesisEntry.hash,
  hash: "",
  created_at: "2026-10-28T10:05:00Z",
};
block1.hash = computeAuditHash(genesisEntry.hash, block1);

const block2: AuditLogEntry = {
  id: "block-2",
  actor_id: "owner-1",
  actor_role: "owner",
  action: "BOOKING_APPROVED",
  resource_type: "booking",
  resource_id: "b-100",
  previous_state: { status: "pending_review" },
  new_state: { status: "approved" },
  reason: "Approved by lab supervisor",
  prev_hash: block1.hash,
  hash: "",
  created_at: "2026-10-28T10:15:00Z",
};
block2.hash = computeAuditHash(block1.hash, block2);

const validChain: AuditLogEntry[] = [genesisEntry, block1, block2];

{
  const result = verifyAuditChain(validChain);
  assert(result.isValid, "Valid 3-block chain verified successfully");
  assert(result.totalEntries === 3, "Verified count equals 3");
}

// Test 4: Tamper Detection (Altered reason content in block 1)
{
  const tamperedChain = JSON.parse(JSON.stringify(validChain)) as AuditLogEntry[];
  tamperedChain[1].reason = "TAMPERED: Illegally altered reason string";

  const result = verifyAuditChain(tamperedChain);
  assert(!result.isValid, "Tampered chain correctly flagged as INVALID");
  assert(result.brokenIndex === 1, "Accurately identified tampered block at index 1");
  assert(result.tamperType === "ALTERED_CONTENT", "Detected tamper type is ALTERED_CONTENT");
}

// Test 5: Tamper Detection (Broken link pointer in block 2)
{
  const tamperedChain = JSON.parse(JSON.stringify(validChain)) as AuditLogEntry[];
  tamperedChain[2].prev_hash = "fake_prev_hash_000000000000000000000000000000000000000000000000";

  const result = verifyAuditChain(tamperedChain);
  assert(!result.isValid, "Broken link pointer correctly flagged as INVALID");
  assert(result.brokenIndex === 2, "Accurately identified broken link at index 2");
  assert(result.tamperType === "BROKEN_LINK", "Detected tamper type is BROKEN_LINK");
}

// Test 6: Empty chain handling
{
  const result = verifyAuditChain([]);
  assert(result.isValid, "Empty chain handled gracefully without throwing");
}

console.log("\n✨ ALL 6 PURE AUDIT RULES UNIT TESTS PASSED PERFECTION!\n");

