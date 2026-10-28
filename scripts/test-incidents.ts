/**
 * Unit Tests for Stage 8 Incident Rules Engine
 */

import {
  canTransitionIncident,
  validateIncidentReport,
  validateUserResponse,
  validateManagerDecision,
  validateDispute,
  validateAdminResolution,
  getIncidentStatusDescription,
  getManagerDecisionLabel,
  getAdminResolutionLabel,
} from "../src/lib/rules/incidents";

function runTests() {
  console.log("==================================================");
  console.log("🧪 Stage 8: Incidents & Disputes Rule Tests");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // 1. Transition Tests: Draft -> Open
  const draftToOpenManager = canTransitionIncident("draft", "open", "manager");
  assert(draftToOpenManager.allowed, "Manager can open draft incident");

  const draftToOpenUser = canTransitionIncident("draft", "open", "user");
  assert(!draftToOpenUser.allowed, "Regular user cannot open draft incident");

  // 2. Transition Tests: Open -> Under Review
  const openToUnderReviewAffectedUser = canTransitionIncident("open", "under_review", "user", true);
  assert(openToUnderReviewAffectedUser.allowed, "Affected user statement advances status to under_review");

  const openToUnderReviewNonAffected = canTransitionIncident("open", "under_review", "user", false);
  assert(!openToUnderReviewNonAffected.allowed, "Unaffected user cannot advance status to under_review");

  // 3. Transition Tests: Under Review -> Resolved (Manager Decision)
  const underReviewToResolvedManager = canTransitionIncident("under_review", "resolved", "manager");
  assert(underReviewToResolvedManager.allowed, "Manager can resolve incident with decision");

  const underReviewToResolvedUser = canTransitionIncident("under_review", "resolved", "user", true);
  assert(!underReviewToResolvedUser.allowed, "User cannot resolve incident");

  // 4. Transition Tests: Resolved -> Disputed (User Appeal)
  const resolvedToDisputedUser = canTransitionIncident("resolved", "disputed", "user", true);
  assert(resolvedToDisputedUser.allowed, "Affected user can dispute resolved incident");

  const resolvedToDisputedManager = canTransitionIncident("resolved", "disputed", "manager");
  assert(!resolvedToDisputedManager.allowed, "Manager cannot dispute their own resolution");

  // 5. Transition Tests: Disputed -> Resolved (Admin Arbitration)
  const disputedToResolvedAdmin = canTransitionIncident("disputed", "resolved", "admin");
  assert(disputedToResolvedAdmin.allowed, "Campus Admin can issue binding resolution on dispute");

  const disputedToResolvedManager = canTransitionIncident("disputed", "resolved", "manager");
  assert(!disputedToResolvedManager.allowed, "Manager CANNOT arbitrate disputed incident (Admin only)");

  // 6. Validation tests
  const validReport = validateIncidentReport({
    booking_id: "b-test",
    type: "damage",
    severity: "medium",
    description: "Dropped optical lens on concrete bench",
  });
  assert(validReport.valid, "Valid incident report passes validation");

  const invalidReportShort = validateIncidentReport({
    booking_id: "b-test",
    type: "damage",
    severity: "medium",
    description: "short",
  });
  assert(!invalidReportShort.valid, "Short description fails validation");

  const validResponse = validateUserResponse("I used the lens cap and placed it inside the padded case as instructed.");
  assert(validResponse.valid, "Valid user response passes validation");

  const shortResponse = validateUserResponse("nope");
  assert(!shortResponse.valid, "Short user response fails validation");

  const validDecision = validateManagerDecision("fault_user", "Physical impact marks verify external drop damage.");
  assert(validDecision.valid, "Valid manager decision passes validation");

  const validDisputeAppeal = validateDispute("I have photos showing the lens cap was already cracked prior to checkout.");
  assert(validDisputeAppeal.valid, "Valid dispute appeal passes validation");

  const validAdminResolution = validateAdminResolution("compromise", "Both parties share replacement cost equitably.");
  assert(validAdminResolution.valid, "Valid admin resolution passes validation");

  // 7. Plain-language labels
  const label = getManagerDecisionLabel("fault_user");
  assert(label.label.includes("Misuse"), "Manager decision returns human label");

  const adminLabel = getAdminResolutionLabel("compromise");
  assert(adminLabel.label.includes("Compromise"), "Admin resolution returns human label");

  console.log("==================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runTests();

