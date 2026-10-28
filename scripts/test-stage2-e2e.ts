import { getAllResources, getResourceById, saveResource, getCredentials, saveCredential, getAuditLogs } from "../src/lib/data/store";
import { checkEligibility } from "../src/lib/rules/eligibility";
import { calculateListingCompleteness } from "../src/lib/rules/completeness";
import { SEED_USERS } from "../src/lib/data/seed-data";

async function runStage2IntegrationTest() {
  console.log("==================================================");
  console.log("🚀 Stage 2: End-to-End Workflow Verification");
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

  // 1. Owner creates a new resource
  console.log("\n📦 1. Owner Resource Creation & Listing Completeness...");
  const owner = SEED_USERS.find((u) => u.role === "owner")!;

  const newResourceDraft = {
    name: "Formlabs Form 4 Precision Stereolithography 3D Printer",
    category: "fabrication" as const,
    location: "Campus Central Engineering Building, Room 145",
    institution: "university" as const,
    description: "Ultra-fast mSLA desktop 3D printer for medical and engineering prototypes.",
    rules: "Wear nitrile gloves when handling liquid resin. Wash prints in IPA for 10 minutes.",
    safety_notes: "UV light protection and chemical splash goggles mandatory.",
    requires_supervision: false,
    min_lead_time_hours: 2,
    max_duration_hours: 4,
    is_high_demand: false,
    deposit_required_cents: 0,
    status: "available" as const,
    image_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800",
    condition_checklist: [
      "Resin tank film free of tears or punctures",
      "Optical cassette clean",
      "Build platform washed and untainted",
    ],
    requirements: [
      {
        id: "req-sla",
        resource_id: "res-sla",
        credential_type: "3d_print_certified",
        min_experience_hours: 0,
        is_mandatory: true,
        explanation: "Required for SLA photopolymer resin handling and wash protocols.",
        created_at: new Date().toISOString(),
      },
    ],
  };

  const completeness = calculateListingCompleteness(newResourceDraft);
  assert(completeness.percentage >= 80, `Listing completeness is ${completeness.percentage}% (Ready to publish)`);

  const createdResource = await saveResource({
    ...newResourceDraft,
    owner_id: owner.id,
  });

  assert(createdResource.id !== undefined, "Resource successfully saved to store");
  const fetched = await getResourceById(createdResource.id);
  assert(fetched !== null && fetched.name === newResourceDraft.name, "Resource can be retrieved by ID");

  // 2. Fresh newcomer (Zoe Martinez) discovers the resource
  console.log("\n🔍 2. User Discovery & Eligibility Verification...");
  const newUser = SEED_USERS.find((u) => u.email === "user.new@campusshare.edu")!;
  const initialUserCreds = await getCredentials(newUser.id);

  const initialCheck = checkEligibility(createdResource.requirements, initialUserCreds);
  assert(initialCheck.isEligible === false, "New user with 0 credentials is INELIGIBLE for Formlabs Form 4");
  assert(initialCheck.checks[0].status === "fail", "Requirement status is 'fail'");
  assert(Boolean(initialCheck.checks[0].fixAction?.actionUrl.includes("3d_print_certified")), "Fix action directs to training request");

  // 3. User requests credential
  console.log("\n📝 3. Credential Request Submission...");
  const requestedCred = await saveCredential({
    user_id: newUser.id,
    credential_type: "3d_print_certified",
    title: "Advanced FDM & Resin 3D Printing Operator",
    status: "pending",
    verification_notes: "Completed online slicer safety module. Submitted exam ID #8841.",
  });
  assert(requestedCred.status === "pending", "Submitted credential status is 'pending'");

  // User checks eligibility while credential is pending
  const pendingUserCreds = await getCredentials(newUser.id);
  const pendingCheck = checkEligibility(createdResource.requirements, pendingUserCreds);
  assert(pendingCheck.isEligible === false, "While pending, user is still ineligible to book");
  assert(pendingCheck.checks[0].status === "pending-verification", "Requirement status updated to 'pending-verification'");

  // 4. Owner approves the credential in verification queue
  console.log("\n✅ 4. Owner Verification Sign-off...");
  const approvedCred = await saveCredential({
    ...requestedCred,
    status: "verified",
    verified_by: owner.id,
    verification_notes: "Reviewed quiz score 100%. Approved for SLA operation.",
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  });
  assert(approvedCred.status === "verified", "Owner approval updates credential status to 'verified'");

  // 5. User checks eligibility again
  console.log("\n🎉 5. Post-Verification Instant Clearance...");
  const updatedUserCreds = await getCredentials(newUser.id);
  const finalCheck = checkEligibility(createdResource.requirements, updatedUserCreds);
  assert(finalCheck.isEligible === true, "User is now IMMEDIATELY ELIGIBLE to book!");
  assert(finalCheck.checks[0].status === "pass", "Requirement status is 'pass'");

  console.log("\n==================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runStage2IntegrationTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
