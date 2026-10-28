/**
 * Stage 8 End-to-End Workflow Integration Test
 * Verifies full incident lifecycle: report -> respond -> decide -> dispute -> arbitrate,
 * and demo clock fast-forward triggering overdue notifications.
 */

import {
  getIncidents,
  getIncidentById,
  createIncident,
  respondToIncident,
  decideIncident,
  disputeIncident,
  resolveIncidentDispute,
  runTimeBasedTriggers,
  getNotifications,
  getAuditLogs,
  resetDemoStore,
} from "../src/lib/data/store";
import {
  advanceAppClock,
  resetAppClock,
  getAppTime,
  getAppClockOffset,
} from "../src/lib/rules/clock";
import { verifyAuditChain } from "../src/lib/rules/audit-verifier";

async function runStage8Tests() {
  console.log("==================================================");
  console.log("🚀 STAGE 8: INCIDENTS, DUE PROCESS & TIME FLOWS E2E");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASSED: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${msg}`);
      failed++;
    }
  }

  // Ensure clean starting baseline
  resetDemoStore();

  // --- 1. Report Damage ---
  console.log("\n--- 1. Testing Incident Reporting (Damage) ---");
  const reportPayload = {
    booking_id: "b-in-use-scope",
    reporter_id: "00000000-0000-0000-0000-000000000004", // Jordan Taylor (Technician)
    type: "damage" as const,
    severity: "medium" as const,
    title: "Ch1 BNC Input Connector Loose",
    description: "Channel 1 BNC connector port feels physically loose with intermittent signal trace during inspection.",
    evidence_text: "Signal attenuation tests show 3dB drop on Channel 1 when coaxial cable is moved.",
    evidence_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800",
  };

  const newIncident = await createIncident(reportPayload);
  assert(Boolean(newIncident.id), `Incident created with ID ${newIncident.id}`);
  assert(newIncident.status === "open", "Initial status is 'open'");
  assert(newIncident.timeline?.length === 1, "Initial timeline event created");
  assert(newIncident.timeline?.[0].action === "incident_opened", "First event is 'incident_opened'");

  // --- 2. Borrower Responds ---
  console.log("\n--- 2. Testing Borrower Response Statement ---");
  const statement = "The BNC connector was slightly wobbly when I received it at station check-in; I did not force the cable.";
  const respondedIncident = await respondToIncident({
    incidentId: newIncident.id,
    userId: "00000000-0000-0000-0000-000000000008", // David Kim (Borrower)
    statement,
  });

  assert(respondedIncident.status === "under_review", "Status transitioned to 'under_review'");
  assert(respondedIncident.user_response === statement, "Borrower statement stored");
  assert(respondedIncident.timeline?.length === 2, "Timeline has 2 events");
  assert(respondedIncident.timeline?.[1].action === "user_responded", "Second event is 'user_responded'");

  // --- 3. Manager Records Decision ---
  console.log("\n--- 3. Testing Station Manager Adjudication ---");
  const managerDecisionNotes = "Station logs confirm previous user reported mild wobble. Determining equipment defect with no borrower penalty.";
  const decidedIncident = await decideIncident({
    incidentId: newIncident.id,
    managerId: "00000000-0000-0000-0000-000000000004",
    decision: "fault_equipment",
    notes: managerDecisionNotes,
    penaltyApplied: "None (Station Maintenance Fund)",
  });

  assert(decidedIncident.status === "resolved", "Status transitioned to 'resolved'");
  assert(decidedIncident.manager_decision === "fault_equipment", "Decision is 'fault_equipment'");
  assert(decidedIncident.timeline?.length === 3, "Timeline has 3 events");
  assert(decidedIncident.timeline?.[2].action === "manager_decided", "Third event is 'manager_decided'");

  // --- 4. User Disputes (Appeal) ---
  console.log("\n--- 4. Testing User Dispute Appeal ---");
  const disputeAppeal = "Station technician noted no penalty, but my account still lists an active variance inquiry. Requesting full formal clearing.";
  const disputedIncident = await disputeIncident({
    incidentId: newIncident.id,
    userId: "00000000-0000-0000-0000-000000000008",
    reason: disputeAppeal,
  });

  assert(disputedIncident.status === "disputed", "Status transitioned to 'disputed'");
  assert(disputedIncident.dispute_reason === disputeAppeal, "Dispute grounds recorded");
  assert(disputedIncident.timeline?.length === 4, "Timeline has 4 events");
  assert(disputedIncident.timeline?.[3].action === "dispute_raised", "Fourth event is 'dispute_raised'");

  // --- 5. Admin Issues Binding Arbitration ---
  console.log("\n--- 5. Testing Campus Governance Admin Arbitration ---");
  const adminArbitrationNotes = "Campus Council reviewed telemetry and bench logs. Equipment fatigue verified; borrower fully exonerated.";
  const arbitratedIncident = await resolveIncidentDispute({
    incidentId: newIncident.id,
    adminId: "00000000-0000-0000-0000-000000000001", // Dr. Arthur Vance (Admin)
    resolution: "overturned",
    notes: adminArbitrationNotes,
  });

  assert(arbitratedIncident.status === "resolved", "Status resolved after binding arbitration");
  assert(arbitratedIncident.admin_resolution === "overturned", "Ruling is 'overturned'");
  assert(arbitratedIncident.timeline?.length === 5, "Timeline has 5 complete lifecycle events");
  assert(arbitratedIncident.timeline?.[4].action === "admin_resolved", "Fifth event is 'admin_resolved'");

  // --- 6. Demo Clock Fast-Forward & Overdue Triggers ---
  console.log("\n--- 6. Testing Demo Clock Fast-Forward & Overdue Triggers ---");
  const initialOffset = getAppClockOffset();
  assert(initialOffset === 0, "Initial clock offset is 0");

  // Advance clock forward by 1 day (+24 hours)
  const oneDayMs = 24 * 60 * 60 * 1000;
  const newAppTime = advanceAppClock(oneDayMs);
  assert(getAppClockOffset() === oneDayMs, "App clock offset is now +24 hours");

  // Run time-based triggers
  const triggerResult = await runTimeBasedTriggers(newAppTime);
  assert(triggerResult.createdCount > 0, `Triggered ${triggerResult.createdCount} new time-based notifications`);

  // Verify overdue notifications exist
  const overdueEvents = triggerResult.events.filter((e) => e.type === "overdue");
  assert(overdueEvents.length > 0, `Detected ${overdueEvents.length} overdue reservations`);
  assert(Boolean(overdueEvents[0].action_url?.includes("late_return")), "Overdue notification contains action link to open incident");

  // Verify notifications in store
  const allNotifs = await getNotifications();
  const overdueNotifs = allNotifs.filter((n) => n.category === "overdue");
  assert(overdueNotifs.length > 0, `Store has ${overdueNotifs.length} overdue notifications`);

  // Reset clock
  resetAppClock();
  assert(getAppClockOffset() === 0, "Clock safely reset back to 0");

  // --- 7. Cryptographic Audit Chain Verification ---
  console.log("\n--- 7. Verifying Tamper-Evident SHA-256 Audit Trail ---");
  const logs = getAuditLogs();
  assert(logs.length >= 5, `Audit log contains ${logs.length} immutable entries`);

  const incidentActions = logs.map((l) => l.action);
  assert(incidentActions.includes("INCIDENT_REPORTED" as any), "Audit log contains INCIDENT_REPORTED");
  assert(incidentActions.includes("INCIDENT_USER_RESPONDED" as any), "Audit log contains INCIDENT_USER_RESPONDED");
  assert(incidentActions.includes("INCIDENT_DECIDED" as any), "Audit log contains INCIDENT_DECIDED");
  assert(incidentActions.includes("INCIDENT_DISPUTED" as any), "Audit log contains INCIDENT_DISPUTED");
  assert(incidentActions.includes("INCIDENT_DISPUTE_RESOLVED" as any), "Audit log contains INCIDENT_DISPUTE_RESOLVED");

  const chainResult = verifyAuditChain(logs);
  assert(chainResult.isValid, "Entire cryptographic SHA-256 hash chain is 100% UNBROKEN and VALID");

  console.log("==================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runStage8Tests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
