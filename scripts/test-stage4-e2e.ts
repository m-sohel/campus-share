import {
  getBookingById,
  saveConditionRecord,
  getConditionRecords,
  getIncidents,
  getAuditLogs,
} from "../src/lib/data/store";
import { ChecklistItemRecord } from "../src/lib/rules/condition";
import { verifyAuditChain } from "../src/lib/rules/audit-verifier";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

async function runStage4E2ETest() {
  console.log("\n🧪 RUNNING STAGE 4 END-TO-END WORKFLOW INTEGRATION TESTS...\n");

  // ==========================================
  // Test 1: Check-in Handover for b-approved-laser
  // ==========================================
  console.log("--- 1. Testing Step 7 Check-in Handover ---");
  const approvedBooking = await getBookingById("b-approved-laser");
  assert(Boolean(approvedBooking), "Found approved laser cutter booking b-approved-laser");
  assert(approvedBooking?.status === "approved", "Initial status is 'approved'");

  const checkInChecklist: ChecklistItemRecord[] = [
    { item: "Clean and free of debris", state: "ok", notes: "Honeycomb bed spotless" },
    { item: "No visible structural cracks or damage", state: "ok", notes: "Mirror optics aligned" },
    { item: "Safety emergency stop / interlock functional", state: "ok", notes: "Lid interlock triggered safely" },
    { item: "All included accessories and cables present", state: "ok" },
    { item: "Operational self-test passed", state: "ok", notes: "Test pulse fired" },
  ];

  const checkInRes = await saveConditionRecord({
    booking_id: "b-approved-laser",
    stage: "check_in",
    recorded_by: "00000000-0000-0000-0000-000000000004", // Jordan Taylor
    recorded_by_name: "Jordan Taylor (Makerspace Technician)",
    items: checkInChecklist,
    notes: "Lid safety interlock tested. Eyewear provided. Handover complete.",
  });

  assert(Boolean(checkInRes.record), "Check-in condition record was created");
  assert(checkInRes.record.stage === "check_in", "Stage is 'check_in'");

  const afterCheckInBooking = await getBookingById("b-approved-laser");
  assert(afterCheckInBooking?.status === "in_use", "Booking status successfully transitioned to 'in_use'");

  // ==========================================
  // Test 2: Return with Degradation for b-in-use-scope
  // ==========================================
  console.log("\n--- 2. Testing Step 8 Return with Degradation & Draft Incident ---");
  const inUseBooking = await getBookingById("b-in-use-scope");
  assert(Boolean(inUseBooking), "Found in-use oscilloscope booking b-in-use-scope");
  assert(inUseBooking?.status === "in_use", "Initial status is 'in_use'");

  const initialRecords = await getConditionRecords("b-in-use-scope");
  assert(initialRecords.length > 0, "Initial check-in baseline condition record exists on file");

  // Technicians inspect return and discover 1 degraded probe item!
  const degradedReturnItems: ChecklistItemRecord[] = [
    {
      item: "Power and interface cords functional",
      state: "damaged", // DEGRADED FROM OK -> DAMAGED
      notes: "Channel 2 differential probe tip bent, intermittent signal contact",
    },
    { item: "No physical cracks, burns, or structural defects", state: "ok" },
    { item: "Operational self-test passed", state: "ok" },
    { item: "Clean and free of debris", state: "ok" },
  ];

  const returnRes = await saveConditionRecord({
    booking_id: "b-in-use-scope",
    stage: "return",
    recorded_by: "00000000-0000-0000-0000-000000000004",
    recorded_by_name: "Jordan Taylor (Makerspace Technician)",
    items: degradedReturnItems,
    notes: "Return inspection: Ch2 probe tip was damaged during testing. Oscilloscope unit itself is intact.",
  });

  assert(Boolean(returnRes.diffResult), "Condition diff was calculated");
  assert(Boolean(returnRes.diffResult?.hasWorsened), "Diff correctly detected condition degradation");
  assert(returnRes.diffResult?.worsenedItemsCount === 1, "Exactly 1 worsened item detected");
  assert(
    returnRes.diffResult?.suggestedIncidentDraft?.severity === "medium",
    "Single damaged probe suggested 'medium' severity incident"
  );

  // Verify late return detection (booking scheduled end was 30m ago)
  assert(Boolean(returnRes.lateResult?.isLate), "Late return was detected (+30m > 15m grace)");

  // Verify auto-DRAFT incident creation (No automated penalty principle!)
  assert(Boolean(returnRes.incident), "Draft incident was automatically created");
  assert(returnRes.incident?.status === "draft", "Incident status is 'draft' for human manager review");
  assert(returnRes.incident?.penalty_applied === undefined, "Zero automated penalties were applied");

  const afterReturnBooking = await getBookingById("b-in-use-scope");
  assert(afterReturnBooking?.status === "flagged_incident", "Booking status set to 'flagged_incident'");

  // ==========================================
  // Test 3: Clean On-Time Return for b-in-use-prusa
  // ==========================================
  console.log("\n--- 3. Testing Clean On-Time Return ---");
  const cleanBooking = await getBookingById("b-in-use-prusa");
  assert(Boolean(cleanBooking), "Found in-use Prusa booking b-in-use-prusa");

  const cleanReturnItems: ChecklistItemRecord[] = [
    { item: "Clean and free of debris", state: "ok", notes: "Bed wiped clean" },
    { item: "No visible structural cracks or damage", state: "ok" },
    { item: "Safety emergency stop / interlock functional", state: "ok" },
    { item: "All included accessories and cables present", state: "ok" },
    { item: "Operational self-test passed", state: "ok" },
  ];

  const cleanReturnRes = await saveConditionRecord({
    booking_id: "b-in-use-prusa",
    stage: "return",
    recorded_by: "00000000-0000-0000-0000-000000000004",
    recorded_by_name: "Jordan Taylor (Makerspace Technician)",
    items: cleanReturnItems,
    notes: "Perfect print session. No residue on nozzle. Clean return.",
  });

  assert(!cleanReturnRes.diffResult?.hasWorsened, "Clean return diff has hasWorsened=false");
  assert(cleanReturnRes.incident === undefined, "No incident created for clean return");

  const afterCleanBooking = await getBookingById("b-in-use-prusa");
  assert(afterCleanBooking?.status === "returned", "Clean return booking status is 'returned'");

  // ==========================================
  // Test 4: Cryptographic Audit Trail Verification
  // ==========================================
  console.log("\n--- 4. Verifying Cryptographic Audit Trail ---");
  const auditLogs = getAuditLogs();
  assert(auditLogs.length >= 3, `Logged ${auditLogs.length} audit entries across check-in and returns`);

  const hasCheckInAudit = auditLogs.some((l) => l.action === "CHECK_IN_COMPLETED" && l.resource_id === "b-approved-laser");
  assert(hasCheckInAudit, "Audit trail contains CHECK_IN_COMPLETED event");

  const hasIncidentAudit = auditLogs.some((l) => l.action === "INCIDENT_DRAFTED");
  assert(hasIncidentAudit, "Audit trail contains INCIDENT_DRAFTED event");

  const hasReturnAudit = auditLogs.some((l) => l.action === "RETURN_COMPLETED" && l.resource_id === "b-in-use-scope");
  assert(hasReturnAudit, "Audit trail contains RETURN_COMPLETED event with degradation note");

  const isChainValid = verifyAuditChain(auditLogs);
  assert(isChainValid.isValid, "All audit log entries maintain unbroken SHA-256 cryptographic chain");

  console.log("\n🎉 ALL STAGE 4 END-TO-END WORKFLOW TESTS PASSED 100%!\n");
}

runStage4E2ETest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
