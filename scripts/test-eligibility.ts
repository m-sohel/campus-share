import { checkEligibility } from "../src/lib/rules/eligibility";
import { ResourceRequirement, Credential } from "../src/types";

function runEligibilityTests() {
  console.log("==================================================");
  console.log("🧪 Stage 2: Eligibility Engine Pure Unit Tests");
  console.log("==================================================");

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

  // 1. Resource with zero requirements
  const zeroReqs: ResourceRequirement[] = [];
  const emptyCheck = checkEligibility(zeroReqs, []);
  assert(emptyCheck.isEligible === true, "Resource with 0 requirements returns isEligible: true");
  assert(emptyCheck.unmetMandatoryCount === 0, "Unmet mandatory count is 0");

  // 2. Resource with mandatory Laser Safety L2 requirement
  const laserReq: ResourceRequirement = {
    id: "req-laser",
    resource_id: "res-laser",
    credential_type: "laser_safety_l2",
    min_experience_hours: 0,
    is_mandatory: true,
    explanation: "Class 4 CO2 laser optical safety certification.",
    created_at: new Date().toISOString(),
  };

  // 2a. Active & Verified
  const activeCred: Credential = {
    id: "c-active",
    user_id: "u-1",
    credential_type: "laser_safety_l2",
    title: "Laser Safety Officer Level 2",
    status: "verified",
    issued_at: "2026-01-01T00:00:00Z",
    expires_at: "2027-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
  };
  const activeCheck = checkEligibility([laserReq], [activeCred]);
  assert(activeCheck.isEligible === true, "Active & verified credential passes eligibility");
  assert(activeCheck.checks[0].status === "pass", "Status is 'pass'");

  // 2b. Missing Credential
  const missingCheck = checkEligibility([laserReq], []);
  assert(missingCheck.isEligible === false, "Missing mandatory credential returns isEligible: false");
  assert(missingCheck.checks[0].status === "fail", "Status is 'fail'");
  assert(missingCheck.checks[0].fixAction !== undefined, "Fix action is provided for missing credential");
  assert(Boolean(missingCheck.checks[0].fixAction?.actionUrl.includes("laser_safety_l2")), "Fix action URL links to request flow");

  // 2c. Expired Credential
  const expiredCred: Credential = {
    id: "c-expired",
    user_id: "u-2",
    credential_type: "laser_safety_l2",
    title: "Laser Safety Officer Level 2",
    status: "verified",
    issued_at: "2025-01-01T00:00:00Z",
    expires_at: "2026-01-01T00:00:00Z", // Past date
    created_at: "2025-01-01T00:00:00Z",
  };
  const expiredCheck = checkEligibility([laserReq], [expiredCred]);
  assert(expiredCheck.isEligible === false, "Expired credential returns isEligible: false");
  assert(expiredCheck.checks[0].status === "expired", "Status is 'expired'");
  assert(Boolean(expiredCheck.checks[0].fixAction?.label.includes("Recertification")), "Fix action suggests recertification");

  // 2d. Pending Verification Credential
  const pendingCred: Credential = {
    id: "c-pending",
    user_id: "u-3",
    credential_type: "laser_safety_l2",
    title: "Laser Safety Officer Level 2",
    status: "pending",
    issued_at: "2026-10-25T00:00:00Z",
    created_at: "2026-10-25T00:00:00Z",
  };
  const pendingCheck = checkEligibility([laserReq], [pendingCred]);
  assert(pendingCheck.isEligible === false, "Pending credential blocks access until verified");
  assert(pendingCheck.checks[0].status === "pending-verification", "Status is 'pending-verification'");

  // 2e. Revoked Credential
  const revokedCred: Credential = {
    id: "c-revoked",
    user_id: "u-4",
    credential_type: "laser_safety_l2",
    title: "Laser Safety Officer Level 2",
    status: "revoked",
    verification_notes: "Safety interlock override attempt.",
    issued_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
  };
  const revokedCheck = checkEligibility([laserReq], [revokedCred]);
  assert(revokedCheck.isEligible === false, "Revoked credential returns isEligible: false");
  assert(revokedCheck.checks[0].status === "fail", "Status is 'fail'");
  assert(Boolean(revokedCheck.checks[0].fixAction?.actionUrl.includes("appeal=true")), "Fix action provides appeal link");

  // 3. Optional Requirement Test
  const optionalReq: ResourceRequirement = {
    id: "req-opt",
    resource_id: "res-laser",
    credential_type: "3d_print_certified",
    min_experience_hours: 0,
    is_mandatory: false,
    explanation: "Recommended for combined laser & 3D print projects.",
    created_at: new Date().toISOString(),
  };
  const optionalCheck = checkEligibility([laserReq, optionalReq], [activeCred]);
  assert(optionalCheck.isEligible === true, "Missing optional requirement DOES NOT block overall eligibility");
  assert(optionalCheck.unmetMandatoryCount === 0, "unmetMandatoryCount remains 0 when only optional is missing");
  assert(optionalCheck.checks[1].met === false, "Individual optional check marks met: false");

  // 4. Verification State Change Test (Simulation)
  console.log("\n🔄 Testing Credential Verification Transition...");
  let userCreds = [pendingCred];
  let preVerify = checkEligibility([laserReq], userCreds);
  assert(preVerify.isEligible === false, "Before verification: user is ineligible");

  // Staff approves credential:
  userCreds = [
    {
      ...pendingCred,
      status: "verified",
      expires_at: "2027-10-28T00:00:00Z",
      verified_by: "admin-1",
    },
  ];
  let postVerify = checkEligibility([laserReq], userCreds);
  assert(postVerify.isEligible === true, "After verification: user is IMMEDIATELY eligible to book!");

  console.log("==================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runEligibilityTests();
