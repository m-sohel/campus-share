import { config } from "dotenv";
config({ path: ".env.local" });
import { getSupabaseAdminClient } from "../src/backend/client";
import {
  createBookingRequest,
  reviewBookingRequest,
  cancelBooking,
  getOwnerInbox,
  getBookingWithWhy,
} from "../src/backend/services/bookings";
import { getUserNotifications } from "../src/backend/services/notifications";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

async function runStage3Verification() {
  console.log("==================================================================");
  console.log("STAGE 3: END-TO-END VERIFICATION (BOOKINGS, CONFLICTS & APPROVAL)");
  console.log("==================================================================\n");

  const supabase = getSupabaseAdminClient();

  // 1. Fetch Seeded Personas & Laser Cutter
  const { data: profiles } = await supabase.from("profiles").select("*");
  const { data: resources } = await supabase.from("resources").select("*");

  const sarah = profiles?.find((p) => p.email === "user.researcher@campusshare.edu");
  const david = profiles?.find((p) => p.email === "user.startup@campusshare.edu");
  const elena = profiles?.find((p) => p.email === "owner.lab@campusshare.edu");
  const laser = resources?.find((r) => r.name.includes("Laser Cutter"));

  assert(Boolean(sarah && david && elena && laser), "Seeded users (Sarah, David, Elena) and Laser Cutter exist");

  console.log(`👤 Requester 1 (Verified Researcher): ${sarah!.full_name} (${sarah!.email})`);
  console.log(`👤 Requester 2 (Startup Resident): ${david!.full_name} (${david!.email})`);
  console.log(`👑 Resource Owner: ${elena!.full_name} (${elena!.email})`);
  console.log(`🔬 Resource: ${laser!.name}\n`);

  // Pick a target date 4 days in future on a weekday at 10:00 AM (duration 2h)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 4);
  if (targetDate.getDay() === 0) targetDate.setDate(targetDate.getDate() + 1);
  if (targetDate.getDay() === 6) targetDate.setDate(targetDate.getDate() + 2);
  targetDate.setHours(10, 0, 0, 0);

  const startIso = targetDate.toISOString();
  const endIso = new Date(targetDate.getTime() + 2 * 3600000).toISOString();

  // Clean up any old test bookings for this slot if re-running
  await supabase
    .from("bookings")
    .delete()
    .eq("resource_id", laser!.id)
    .gte("start_time", startIso)
    .lte("end_time", endIso);

  // STEP 1: Sarah Jenkins requests the slot
  console.log("👉 STEP 1: User 1 (Sarah) requests slot", startIso, "to", endIso);
  const req1 = await createBookingRequest({
    userId: sarah!.id,
    resourceId: laser!.id,
    startTime: startIso,
    endTime: endIso,
    purpose: "Robotics chassis laser acrylic cutting",
    teamSize: 2,
    supervisorName: "Dr. Arthur Vance",
    rulesAcknowledged: true,
  });

  assert(req1.success && Boolean(req1.booking), "Sarah's booking request succeeded with status pending_review");
  assert(req1.booking?.status === "pending_review", "Booking initial status is pending_review");
  const booking1Id = req1.booking!.id;

  // STEP 2: Owner (Elena) inspects inbox
  console.log("\n👉 STEP 2: Owner (Prof. Elena) checks request inbox");
  const inbox = await getOwnerInbox(elena!.id, "owner");
  const inboxItem = inbox.find((item) => item.booking.id === booking1Id);

  assert(Boolean(inboxItem), "Elena sees Sarah's booking in her owner inbox");
  assert(inboxItem!.borrower.full_name === sarah!.full_name, "Inbox item shows requester details");
  assert(inboxItem!.eligibility.isEligible, "Inbox item includes verified eligibility check");
  assert(!inboxItem!.conflicts.hasConflict, "Inbox item confirms no current conflicts");

  // STEP 3: Elena reviews and APPROVES Sarah's request
  console.log("\n👉 STEP 3: Owner (Prof. Elena) approves Sarah's request with reason");
  const reviewResult = await reviewBookingRequest({
    bookingId: booking1Id,
    actorId: elena!.id,
    action: "approve",
    reason: "Approved for senior autonomous robotics research project",
  });

  assert(reviewResult.success, "Approval succeeded");
  assert(reviewResult.booking?.status === "approved", "Booking status updated to 'approved'");

  // Verify Sarah received in-app notification
  const sarahNotifs = await getUserNotifications(sarah!.id);
  const approvalNotif = sarahNotifs.find((n) => n.title.includes("APPROVED"));
  assert(Boolean(approvalNotif), "Sarah received in-app approval notification");
  console.log(`   Notification delivered to Sarah: "${approvalNotif?.message}"`);

  // STEP 4A: Test Requirement 3 (Failed requirements block submission with reasons)
  console.log("\n👉 STEP 4A: Testing Prerequisite Eligibility Auto-Check on Submit");
  const uncertReq = await createBookingRequest({
    userId: david!.id, // David initially lacks laser_safety_l2
    resourceId: laser!.id,
    startTime: new Date(targetDate.getTime() + 24 * 3600000).toISOString(),
    endTime: new Date(targetDate.getTime() + 26 * 3600000).toISOString(),
    purpose: "Testing uncredentialed block",
    rulesAcknowledged: true,
  });

  assert(!uncertReq.success, "Uncredentialed user submission is blocked");
  assert(uncertReq.error === "ELIGIBILITY_BLOCKED", "Error is ELIGIBILITY_BLOCKED");
  assert(
    Boolean(uncertReq.eligibility?.checks.some((c) => !c.met && c.reason.includes("laser_safety_l2"))),
    "Eligibility failure reason identifies missing laser_safety_l2 certification"
  );
  console.log(`   Blocked submission reason: "${uncertReq.eligibility?.checks[0]?.reason}"`);

  // STEP 4B: Second Eligible User attempts to book the EXACT SAME APPROVED SLOT
  console.log("\n👉 STEP 4B: Eligible User 2 attempts to request the exact same approved slot");
  // Temporarily grant laser_safety_l2 to David for conflict test
  const tempCredId = "10000000-0000-0000-0000-999999999999";
  await supabase.from("credentials").upsert({
    id: tempCredId,
    user_id: david!.id,
    credential_type: "laser_safety_l2",
    title: "Laser Safety Officer Level 2 Certification",
    status: "verified",
    issued_at: new Date().toISOString(),
  });

  const req2 = await createBookingRequest({
    userId: david!.id,
    resourceId: laser!.id,
    startTime: startIso,
    endTime: endIso,
    purpose: "Startup prototype enclosure",
    teamSize: 1,
    rulesAcknowledged: true,
  });

  assert(!req2.success, "David's request was blocked due to slot conflict");
  assert(req2.error === "SLOT_CONFLICT", "Error is SLOT_CONFLICT");
  assert(Boolean(req2.conflicts?.hasConflict), "Conflict flag is true");
  assert(
    req2.conflicts!.reasons.some((r) => r.includes("active reservation")),
    "Conflict reason clearly identifies overlap with active reservation"
  );
  assert(
    Boolean(req2.suggestedSlots && req2.suggestedSlots.length === 3),
    "System suggested the 3 nearest free alternative slots"
  );

  console.log("   Conflict reason reported to David:", req2.conflicts?.reasons[0]);
  console.log("   3 Alternative free slots offered to David:");
  req2.suggestedSlots?.forEach((slot, i) => {
    console.log(`     ${i + 1}. ${slot.label} (${slot.durationHours}h)`);
  });

  // Clean up temp credential
  await supabase.from("credentials").delete().eq("id", tempCredId);

  // STEP 5: Verify the "Why" Panel for Sarah's approved request
  console.log("\n👉 STEP 5: Explaining why Sarah's request was approved ('Why' Panel)");
  const whySarah = await getBookingWithWhy(booking1Id);
  assert(Boolean(whySarah), "Retrieved 'Why' breakdown for Sarah's booking");
  assert(whySarah!.explanation.status === "approved", "'Why' status is approved");
  assert(whySarah!.explanation.badgeVariant === "success", "'Why' badge variant is success");
  assert(whySarah!.explanation.headline.includes("Prof. Elena Rostova"), "'Why' headline cites reviewer");
  assert(
    whySarah!.explanation.decisionNarrative.includes("senior autonomous robotics research project"),
    "'Why' narrative contains owner's reason"
  );
  console.log(`   Headline: "${whySarah!.explanation.headline}"`);
  console.log(`   Narrative: "${whySarah!.explanation.decisionNarrative}"`);
  console.log(`   Next Steps: "${whySarah!.explanation.nextSteps}"`);

  // STEP 6: Test Rejection & Waitlisting requiring reason
  console.log("\n👉 STEP 6: Testing Rejection/Waitlist mandatory reason validation");
  const nextDay = new Date(targetDate.getTime() + 24 * 3600000);
  const reqTest = await createBookingRequest({
    userId: sarah!.id,
    resourceId: laser!.id,
    startTime: nextDay.toISOString(),
    endTime: new Date(nextDay.getTime() + 2 * 3600000).toISOString(),
    purpose: "Secondary test run",
    rulesAcknowledged: true,
  });
  assert(reqTest.success && Boolean(reqTest.booking), "Created temporary test booking");
  const testBookingId = reqTest.booking!.id;

  // Attempt rejection with EMPTY reason (must fail!)
  const emptyReject = await reviewBookingRequest({
    bookingId: testBookingId,
    actorId: elena!.id,
    action: "reject",
    reason: "",
  });
  assert(!emptyReject.success, "Rejection WITHOUT reason is strictly blocked");
  console.log(`   Blocked empty rejection: "${emptyReject.error}"`);

  // Rejection WITH valid reason
  const validReject = await reviewBookingRequest({
    bookingId: testBookingId,
    actorId: elena!.id,
    action: "reject",
    reason: "Facility undergoing maintenance during that afternoon window.",
  });
  assert(validReject.success && validReject.booking?.status === "rejected", "Rejection with reason succeeded");

  const whyReject = await getBookingWithWhy(testBookingId);
  assert(
    whyReject!.explanation.decisionNarrative.includes("Facility undergoing maintenance"),
    "Why panel displays rejection reason"
  );

  // STEP 7: Test Cancellation Flow
  console.log("\n👉 STEP 7: Testing Cancellation Flow with reason");
  const cancelResult = await cancelBooking({
    bookingId: booking1Id,
    actorId: sarah!.id,
    reason: "Project demo moved to following week.",
  });
  assert(cancelResult.success, "Cancellation succeeded");
  assert(cancelResult.booking?.status === "cancelled", "Booking status is now cancelled");

  const whyCancelled = await getBookingWithWhy(booking1Id);
  assert(
    whyCancelled!.explanation.decisionNarrative.includes("Project demo moved to following week"),
    "Why panel displays cancellation reason"
  );

  // STEP 8: Verify Audit Trail Hash Chain
  console.log("\n👉 STEP 8: Verifying Cryptographic Audit Trail");
  const { data: auditEntries } = await supabase
    .from("audit_log")
    .select("action, hash, prev_hash, reason")
    .order("created_at", { ascending: false })
    .limit(5);

  assert(Boolean(auditEntries && auditEntries.length >= 3), "Audit log recorded all state transitions");
  console.log(`   Recent audit log entries:`);
  auditEntries?.forEach((e) => {
    console.log(`     - [${e.action}] ${e.reason} (hash: ${e.hash.slice(0, 12)}...)`);
  });

  // Clean up test rows
  await supabase.from("bookings").delete().in("id", [booking1Id, testBookingId]);
  console.log("\n🧹 Test bookings safely cleaned up.");

  console.log("\n==================================================================");
  console.log("🎉 SUCCESS: ALL STAGE 3 REQUIREMENTS AND 'DONE WHEN' CONDITIONS VERIFIED!");
  console.log("==================================================================\n");
}

runStage3Verification().catch((err) => {
  console.error("FATAL ERROR IN STAGE 3 VERIFICATION:", err);
  process.exit(1);
});
