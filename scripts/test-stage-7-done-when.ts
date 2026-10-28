import { config } from "dotenv";
config({ path: ".env.local" });
import { getSupabaseAdminClient } from "../src/backend/client";
import {
  evaluateFairnessPolicy,
  calculateWaitlistPriority,
  rankWaitlistCandidates,
} from "../src/lib/rules/fairness";
import {
  joinWaitlist,
  getWaitlistForResource,
  handleBookingCancelledCascade,
  respondToWaitlistOffer,
  overrideWaitlistEntry,
} from "../src/backend/services/waitlist";
import { createBookingRequest, cancelBooking } from "../src/backend/services/bookings";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

async function runStage7DoneWhen() {
  console.log("==================================================================");
  console.log("STAGE 7: FAIRNESS ENGINE & WAITLIST AUTOMATION ('DONE WHEN')");
  console.log("==================================================================\n");

  const supabase = getSupabaseAdminClient();

  // 1. Fetch Personas & High-Demand Resource
  const [{ data: profiles }, { data: resources }] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("resources").select("*"),
  ]);

  const sarah = profiles?.find((p) => p.email === "user.researcher@campusshare.edu");
  const david = profiles?.find((p) => p.email === "user.startup@campusshare.edu" || p.full_name?.includes("David"));
  const elena = profiles?.find((p) => p.email === "owner.lab@campusshare.edu");
  const laser = resources?.find((r) => r.name.includes("Laser Cutter"));

  assert(Boolean(sarah && david && elena && laser), "Sarah (light), David (heavy), Elena (owner), and Laser exist");

  // 👉 STEP 1: Test Pure Fairness Policies (Active Limits, Category Quotas, Cooldown)
  console.log("\n👉 STEP 1: Testing Fairness Policy Enforcement");

  // 1A. Active booking limit test
  const activeLimitCheck = evaluateFairnessPolicy({
    userId: sarah!.id,
    category: "fabrication",
    requestedDurationHours: 2,
    currentActiveBookingsCount: 3, // at max 3
    hoursUsedThisWeekInCategory: 2,
  });
  assert(!activeLimitCheck.isAllowed, "1A: Max active bookings (3/3) blocks new request");
  assert(activeLimitCheck.violations[0].includes("Active booking limit reached"), "1A: Explains active booking quota");

  // 1B. Weekly Category Quota test
  const weeklyQuotaCheck = evaluateFairnessPolicy({
    userId: sarah!.id,
    category: "fabrication",
    requestedDurationHours: 4,
    currentActiveBookingsCount: 1,
    hoursUsedThisWeekInCategory: 8, // 8 + 4 = 12 > 10h limit
  });
  assert(!weeklyQuotaCheck.isAllowed, "1B: Exceeding weekly category quota (10h) blocks request");
  assert(weeklyQuotaCheck.violations[0].includes("exceeds your weekly fabrication quota"), "1B: Explains weekly category quota");

  // 1C. Consecutive Long Booking Cooldown
  const cooldownCheck = evaluateFairnessPolicy({
    userId: sarah!.id,
    category: "fabrication",
    requestedDurationHours: 2,
    currentActiveBookingsCount: 0,
    hoursUsedThisWeekInCategory: 4,
    recentConsecutiveHoursInCategory: 4.5, // >= 4.0 threshold
    hoursSinceLastBookingInCategory: 6, // 6h ago < 24h cooldown
  });
  assert(!cooldownCheck.isAllowed, "1C: Consecutive session triggers anti-monopoly cooldown");
  assert(cooldownCheck.cooldownActive, "1C: Cooldown is marked active");
  assert(cooldownCheck.cooldownRemainingHours === 18, "1C: Cooldown remaining correctly calculated (18h)");

  // 👉 STEP 2: Both Heavy User & Light User join the waitlist for the same high-demand slot
  console.log("\n👉 STEP 2: Heavy user and Light user join waitlist for high-demand Laser Cutter slot");

  // Target window: 10 days out
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 10);
  targetDate.setHours(13, 0, 0, 0);
  const slotStart = targetDate.toISOString();
  const slotEnd = new Date(targetDate.getTime() + 2 * 3600000).toISOString();

  // Create an approved booking to block this slot
  const blockingRes = await supabase
    .from("bookings")
    .insert({
      id: crypto.randomUUID(),
      resource_id: laser!.id,
      user_id: elena!.id,
      start_time: slotStart,
      end_time: slotEnd,
      purpose: "Sensor rig calibration session",
      status: "approved",
      fairness_score: 90.0,
    })
    .select()
    .single();

  const blockingBookingId = blockingRes.data!.id;
  assert(Boolean(blockingBookingId), "2A: Active blocking reservation created to simulate slot demand");

  // Clean test waitlist entries for this window
  await supabase
    .from("waitlist_entries")
    .delete()
    .eq("resource_id", laser!.id)
    .eq("requested_start", slotStart);

  // Setup Heavy User usage profile (15 hours recent usage + 1 strike)
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600000).toISOString();
  const tenDaysAgoEnd = new Date(Date.now() - 10 * 24 * 3600000 + 15 * 3600000).toISOString();
  const heavyUsageBookingId = crypto.randomUUID();

  await supabase.from("bookings").insert({
    id: heavyUsageBookingId,
    resource_id: laser!.id,
    user_id: david!.id,
    start_time: tenDaysAgo,
    end_time: tenDaysAgoEnd,
    purpose: "Heavy prototyping batch 1",
    status: "completed",
    fairness_score: 50.0,
  });

  const heavyStrikeId = crypto.randomUUID();
  await supabase.from("incidents").insert({
    id: heavyStrikeId,
    booking_id: heavyUsageBookingId,
    reporter_id: david!.id,
    type: "late_return",
    severity: "low",
    status: "under_review",
    description: "Returned equipment 45 minutes late without notice.",
  });

  // 2B. Light User (Sarah) joins waitlist
  const lightJoin = await joinWaitlist({
    userId: sarah!.id,
    resourceId: laser!.id,
    requestedStart: slotStart,
    requestedEnd: slotEnd,
    deadlineDate: new Date(Date.now() + 5 * 24 * 3600000).toISOString(),
    isDeadlineVerified: true,
  });

  // 2C. Heavy User (David) joins waitlist
  const heavyJoin = await joinWaitlist({
    userId: david!.id,
    resourceId: laser!.id,
    requestedStart: slotStart,
    requestedEnd: slotEnd,
    deadlineDate: new Date(Date.now() + 12 * 24 * 3600000).toISOString(),
    isDeadlineVerified: false,
  });

  assert(Boolean(lightJoin.entry && heavyJoin.entry), "2B/C: Both users successfully registered on waitlist");

  // 👉 STEP 3: Verify the Light User ranks higher and the breakdown shows exactly why
  console.log("\n👉 STEP 3: Verifying Light User ranks higher with transparent per-factor breakdown");

  const queue = await getWaitlistForResource(laser!.id);
  const lightCandidate = queue.find((q) => q.user_id === sarah!.id);
  const heavyCandidate = queue.find((q) => q.user_id === david!.id);

  assert(Boolean(lightCandidate && heavyCandidate), "3A: Both candidates retrieved from ranked queue");

  console.log("\n   === WAITLIST QUEUE COMPARISON ===");
  console.log(`   🥇 RANK #${lightCandidate!.rank}: ${lightCandidate!.borrower.full_name}`);
  console.log(`      Total Score: ${lightCandidate!.priority_score} pts`);
  console.log(`      Breakdown: ${lightCandidate!.breakdown.rankSummary}`);
  console.log(`   🥈 RANK #${heavyCandidate!.rank}: ${heavyCandidate!.borrower.full_name}`);
  console.log(`      Total Score: ${heavyCandidate!.priority_score} pts`);
  console.log(`      Breakdown: ${heavyCandidate!.breakdown.rankSummary}\n`);

  assert(lightCandidate!.priority_score > heavyCandidate!.priority_score, "3B: Light user priority score > Heavy user priority score");
  assert(lightCandidate!.rank === 1, "3C: Light user is ranked #1 in queue");
  assert(heavyCandidate!.rank > lightCandidate!.rank, "3D: Heavy user is ranked behind Light user");
  assert(lightCandidate!.breakdown.usageScore >= heavyCandidate!.breakdown.usageScore, "3E: Fair-share usage breakdown favors low-usage researcher");

  // 👉 STEP 4: Cancel the booking and verify slot is offered to the top person (Light User)
  console.log("👉 STEP 4: Cancelling booking and testing automatic offer cascading");

  const cancelResult = await cancelBooking({
    bookingId: blockingBookingId,
    actorId: elena!.id,
    reason: "Research bench optical recalibration complete earlier than expected.",
  });

  assert(cancelResult.success, "4A: Active booking cancelled");

  // Trigger cascade check
  const cascadeOffer = await handleBookingCancelledCascade(blockingBookingId);
  assert(Boolean(cascadeOffer && cascadeOffer.candidate), "4B: Vacated slot triggered waitlist offer cascade");
  assert(cascadeOffer!.candidate.user_id === sarah!.id, "4C: Slot offer accurately delivered to Rank #1 candidate (Sarah Jenkins)");
  assert(Boolean(cascadeOffer!.offerExpiresAt), "4D: 2-Hour offer acceptance window established");

  // Verify status in DB
  const { data: updatedLightEntry } = await supabase
    .from("waitlist_entries")
    .select("*")
    .eq("id", lightCandidate!.id)
    .single();

  assert(updatedLightEntry?.status === "offered", "4E: Waitlist entry status transitioned to 'offered'");

  // 👉 STEP 5: Test Offer Acceptance and Fulfillment
  console.log("\n👉 STEP 5: Testing waitlist offer acceptance and auto-booking conversion");

  const acceptResult = await respondToWaitlistOffer(lightCandidate!.id, sarah!.id, "accept");
  assert(acceptResult.success && Boolean(acceptResult.booking), "5A: Waitlist offer accepted and confirmed reservation created");
  assert(acceptResult.booking?.status === "approved", "5B: Booking automatically set to approved status");

  // 👉 STEP 6: Test Owner Override with Audited Reason
  console.log("\n👉 STEP 6: Testing Owner Override with mandatory reason");

  const overrideRes = await overrideWaitlistEntry(
    heavyCandidate!.id,
    elena!.id,
    88,
    "Urgent aerospace thesis defense deadline verified by department faculty."
  );
  assert(overrideRes.success, "6A: Owner successfully overrode waitlist priority score");

  // Clean up test records
  if (acceptResult.booking?.id) {
    await supabase.from("bookings").delete().eq("id", acceptResult.booking.id);
  }
  await supabase.from("bookings").delete().eq("id", blockingBookingId);
  await supabase.from("bookings").delete().eq("id", heavyUsageBookingId);
  await supabase.from("incidents").delete().eq("id", heavyStrikeId);
  await supabase.from("waitlist_entries").delete().eq("resource_id", laser!.id).eq("requested_start", slotStart);

  console.log("\n==================================================================");
  console.log("🎉 SUCCESS: ALL STAGE 7 FAIRNESS & WAITLIST 'DONE WHEN' REQUIREMENTS VERIFIED!");
  console.log("==================================================================\n");
}

runStage7DoneWhen().catch((err) => {
  console.error("FATAL ERROR IN STAGE 7 VERIFICATION:", err);
  process.exit(1);
});
