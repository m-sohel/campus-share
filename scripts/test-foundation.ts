import { checkEligibility } from "../src/lib/rules/eligibility";
import { calculateFairnessScore } from "../src/lib/rules/fairness";
import { checkConflicts } from "../src/lib/rules/conflicts";
import { validateStateTransition } from "../src/lib/rules/state-machine";
import { verifyAuditChain, computeAuditHash } from "../src/lib/rules/audit-verifier";
import { SEED_USERS, SEED_RESOURCES, SEED_CREDENTIALS } from "../src/lib/data/seed-data";

async function runTests() {
  console.log("==========================================");
  console.log("🧪 CampusShare: Stage 1 Verification Suite");
  console.log("==========================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}${detail ? ` - ${detail}` : ""}`);
      failed++;
    }
  }

  // 1. HTTP Endpoint & Auth Tests
  const BASE_URL = "http://localhost:3005";

  console.log("\n🌐 Testing HTTP Endpoints & Auth API...");
  try {
    const homeRes = await fetch(`${BASE_URL}/`);
    assert(homeRes.status === 200, "GET / returns HTTP 200");
    const homeHtml = await homeRes.text();
    assert(homeHtml.includes("CampusShare"), "Home page renders 'CampusShare' branding");
    assert(homeHtml.includes("Epilog Fusion Pro 48"), "Home page displays high-demand resource");

    const loginRes = await fetch(`${BASE_URL}/login`);
    assert(loginRes.status === 200, "GET /login returns HTTP 200");

    const privacyRes = await fetch(`${BASE_URL}/privacy`);
    assert(privacyRes.status === 200, "GET /privacy returns HTTP 200");

    // Test Login for 4 roles
    const rolesToTest = [
      { email: "admin@campusshare.edu", expectedUrl: "/dashboard/admin", role: "admin" },
      { email: "owner.lab@campusshare.edu", expectedUrl: "/dashboard/owner", role: "owner" },
      { email: "manager.tech@campusshare.edu", expectedUrl: "/dashboard/manager", role: "manager" },
      { email: "user.researcher@campusshare.edu", expectedUrl: "/dashboard/user", role: "user" },
    ];

    for (const item of rolesToTest) {
      const authRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: item.email, password: "Password123!" }),
      });
      const data = await authRes.json();
      assert(
        authRes.status === 200 && data.redirectUrl === item.expectedUrl,
        `Login as ${item.role} (${item.email}) redirects to ${item.expectedUrl}`
      );
    }

    // Test Invalid Password & Rate Limiting
    const testEmail = "random.test@campusshare.edu";
    const badRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "WrongPassword" }),
    });
    assert(badRes.status === 401, "Invalid password returns HTTP 401");

    // Spam 5 more times to trigger rate limit (429)
    let rateLimited = false;
    for (let i = 0; i < 5; i++) {
      const spamRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, password: "WrongPassword" }),
      });
      if (spamRes.status === 429) {
        rateLimited = true;
        break;
      }
    }
    assert(rateLimited, "Rate limiter successfully triggers HTTP 429 after excessive attempts");
  } catch (err) {
    console.error("HTTP test error:", err);
    failed++;
  }

  // 2. Pure Rules: Eligibility Tests
  console.log("\n📐 Testing Pure TypeScript Rules: Eligibility...");
  const laserCutter = SEED_RESOURCES.find((r) => r.id === "20000000-0000-0000-0000-000000000001")!;
  const requirements = laserCutter.requirements.map((r, i) => ({
    id: `req-${i}`,
    resource_id: laserCutter.id,
    credential_type: r.credential_type,
    min_experience_hours: 0,
    is_mandatory: r.is_mandatory,
    explanation: r.explanation,
    created_at: new Date().toISOString(),
  }));

  // Sarah Jenkins (has valid Laser Safety L2)
  const sarahCreds = SEED_CREDENTIALS.filter((c) => c.user_id === "00000000-0000-0000-0000-000000000005").map((c) => ({
    ...c,
    expires_at: c.expires_at || null,
    created_at: c.issued_at,
  }));
  const sarahCheck = checkEligibility(requirements, sarahCreds);
  assert(sarahCheck.isEligible === true, "Sarah Jenkins (verified) is ELIGIBLE for Laser Cutter");

  // Liam Patel (has expired Laser Safety L2)
  const liamCreds = SEED_CREDENTIALS.filter((c) => c.user_id === "00000000-0000-0000-0000-000000000006").map((c) => ({
    ...c,
    expires_at: c.expires_at || null,
    created_at: c.issued_at,
  }));
  const liamCheck = checkEligibility(requirements, liamCreds);
  assert(liamCheck.isEligible === false, "Liam Patel (expired) is INELIGIBLE for Laser Cutter");
  assert(liamCheck.checks[0].status === "expired", "Liam Patel failure reason correctly flagged as 'expired'");

  // Zoe Martinez (no credentials)
  const zoeCheck = checkEligibility(requirements, []);
  assert(zoeCheck.isEligible === false, "Zoe Martinez (no creds) is INELIGIBLE for Laser Cutter");
  assert(zoeCheck.checks[0].status === "missing", "Zoe Martinez reason correctly flagged as 'missing'");

  // 3. Pure Rules: Fairness Scoring
  console.log("\n⚖️ Testing Pure TypeScript Rules: Fairness Scoring...");
  const newcomerScore = calculateFairnessScore({
    userReputationScore: 100,
    recentUsageHoursLast14Days: 0,
    unresolvedIncidentsCount: 0,
    isHighDemandResource: true,
    isFirstTimeUser: true,
  });
  const heavyUserScore = calculateFairnessScore({
    userReputationScore: 90,
    recentUsageHoursLast14Days: 12,
    unresolvedIncidentsCount: 1,
    isHighDemandResource: true,
    isFirstTimeUser: false,
  });
  assert(newcomerScore.score > heavyUserScore.score, "Newcomer with zero usage gets higher priority than heavy user with active incident");

  // 4. Pure Rules: State Machine Transitions
  console.log("\n🔄 Testing Pure TypeScript Rules: State Machine...");
  const validTransition = validateStateTransition("pending_review", "approved", "owner", true, false);
  assert(validTransition.canTransition === true, "Owner can transition pending_review -> approved with reason");

  const invalidActor = validateStateTransition("pending_review", "approved", "user", true, false);
  assert(invalidActor.canTransition === false, "User CANNOT approve booking request (unauthorized actor)");

  const missingReason = validateStateTransition("pending_review", "approved", "owner", false, false);
  assert(missingReason.canTransition === false, "Approval fails if mandatory reason is missing");

  // 5. Pure Rules: Audit Log Cryptographic Chain
  console.log("\n⛓️ Testing Pure TypeScript Rules: Audit Log Hash Chain...");
  const entry1 = {
    id: "entry-1",
    actor_id: "user-1",
    action: "CREATED",
    resource_type: "resource",
    resource_id: "res-1",
    reason: "Seeded resource",
    created_at: "2026-10-28T12:00:00Z",
  };
  const hash1 = computeAuditHash("GENESIS_HASH", entry1);

  const entry2 = {
    id: "entry-2",
    actor_id: "user-1",
    action: "MODIFIED",
    resource_type: "resource",
    resource_id: "res-1",
    reason: "Updated safety rules",
    created_at: "2026-10-28T12:05:00Z",
  };
  const hash2 = computeAuditHash(hash1, entry2);

  const validChain = [
    { ...entry1, actor_role: "admin", prev_hash: "GENESIS_HASH", hash: hash1 },
    { ...entry2, actor_role: "admin", prev_hash: hash1, hash: hash2 },
  ];
  const validChainCheck = verifyAuditChain(validChain);
  assert(validChainCheck.isValid === true, "Cryptographic audit chain passes verification");

  // Tamper test: modify entry 1's reason
  const tamperedChain = [
    { ...entry1, reason: "TAMPERED_CONTENT", actor_role: "admin", prev_hash: "GENESIS_HASH", hash: hash1 },
    { ...entry2, actor_role: "admin", prev_hash: hash1, hash: hash2 },
  ];
  const tamperedCheck = verifyAuditChain(tamperedChain);
  assert(tamperedCheck.isValid === false, "Tampered chain correctly detected and rejected by verifier");

  console.log("\n==========================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

