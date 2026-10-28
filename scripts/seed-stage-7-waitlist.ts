import { config } from "dotenv";
config({ path: ".env.local" });
import { getSupabaseAdminClient } from "../src/backend/client";
import { calculateWaitlistPriority } from "../src/lib/rules/fairness";
import { logAuditEvent } from "../src/backend/services/audit";

async function seedStage7Waitlist() {
  console.log("=== SEEDING STAGE 7 HIGH-DEMAND RESOURCE & WAITLIST (FOR JUDGES) ===\n");
  const supabase = getSupabaseAdminClient();

  // 1. Fetch High-Demand Resource
  const { data: resources } = await supabase.from("resources").select("*");
  const laser = resources?.find((r) => r.name.includes("Laser Cutter"));

  if (!laser) {
    throw new Error("Laser cutter resource not found in database.");
  }

  // Ensure is_high_demand is true
  await supabase
    .from("resources")
    .update({ is_high_demand: true })
    .eq("id", laser.id);
  console.log(`✅ Configured "${laser.name}" as high-demand resource.`);

  // 2. Fetch Users
  const { data: profiles } = await supabase.from("profiles").select("id, email, full_name, role");
  const sarah = profiles?.find((p) => p.email === "user.researcher@campusshare.edu");
  const david = profiles?.find((p) => p.email === "user.startup@campusshare.edu" || p.full_name?.includes("David"));
  const elena = profiles?.find((p) => p.email === "owner.lab@campusshare.edu");

  if (!sarah || !david || !elena) {
    throw new Error("Required seed user profiles (Sarah, David, Elena) not found.");
  }

  // 3. Ensure an active blocking booking exists for tomorrow afternoon
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);
  const blockStart = tomorrow.toISOString();
  const blockEnd = new Date(tomorrow.getTime() + 3 * 3600000).toISOString();

  // Clean existing test bookings for this window
  await supabase
    .from("bookings")
    .delete()
    .eq("resource_id", laser.id)
    .eq("start_time", blockStart);

  const blockingBookingId = crypto.randomUUID();
  const { data: blockingBooking, error: bErr } = await supabase
    .from("bookings")
    .insert({
      id: blockingBookingId,
      resource_id: laser.id,
      user_id: elena.id,
      start_time: blockStart,
      end_time: blockEnd,
      purpose: "Precision optics optical alignment (Faculty verified research)",
      status: "approved",
      fairness_score: 95.0,
    })
    .select()
    .single();

  if (bErr) throw bErr;
  console.log(`✅ Created active blocking reservation (${blockStart} to ${blockEnd}).`);

  // 4. Calculate Priority Scores
  // Light User: Sarah
  const lightPriority = calculateWaitlistPriority({
    waitingDays: 3,
    hoursUsedLast30Days: 2.0,
    deadlineDaysRemaining: 5,
    isDeadlineVerified: true,
    strikesCount: 0,
  });

  // Heavy User: Alex
  const heavyPriority = calculateWaitlistPriority({
    waitingDays: 3,
    hoursUsedLast30Days: 24.0,
    deadlineDaysRemaining: 5,
    isDeadlineVerified: true,
    strikesCount: 1,
  });

  // Clean old waitlist entries for this laser cutter
  await supabase.from("waitlist_entries").delete().eq("resource_id", laser.id);

  // 5. Insert Waitlist Entries
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600000).toISOString();

  const { data: lightEntry } = await supabase
    .from("waitlist_entries")
    .insert({
      resource_id: laser.id,
      user_id: sarah.id,
      requested_start: blockStart,
      requested_end: blockEnd,
      priority_score: lightPriority.priorityScore,
      status: "waiting",
      created_at: threeDaysAgo,
    })
    .select()
    .single();

  const { data: heavyEntry } = await supabase
    .from("waitlist_entries")
    .insert({
      resource_id: laser.id,
      user_id: david.id,
      requested_start: blockStart,
      requested_end: blockEnd,
      priority_score: heavyPriority.priorityScore,
      status: "waiting",
      created_at: threeDaysAgo,
    })
    .select()
    .single();

  console.log(`✅ Seeded Light User (Sarah Jenkins): Priority Score ${lightPriority.priorityScore} pts (Rank #1)`);
  console.log(`✅ Seeded Heavy User (${david.full_name}): Priority Score ${heavyPriority.priorityScore} pts (Rank #2)`);

  // Write audit entries
  if (lightEntry && heavyEntry) {
    await logAuditEvent({
      actorId: sarah.id,
      actorRole: "user",
      action: "WAITLIST_JOINED",
      resourceType: "waitlist_entry",
      resourceId: lightEntry.id,
      newState: { priority_score: lightPriority.priorityScore, breakdown: lightPriority.breakdown },
      reason: `Sarah Jenkins joined waitlist for ${laser.name} (Priority ${lightPriority.priorityScore}: ${lightPriority.breakdown.rankSummary})`,
    });

    await logAuditEvent({
      actorId: david.id,
      actorRole: "user",
      action: "WAITLIST_JOINED",
      resourceType: "waitlist_entry",
      resourceId: heavyEntry.id,
      newState: { priority_score: heavyPriority.priorityScore, breakdown: heavyPriority.breakdown },
      reason: `${david.full_name} joined waitlist for ${laser.name} (Priority ${heavyPriority.priorityScore}: ${heavyPriority.breakdown.rankSummary})`,
    });
  }

  console.log("\n🎉 STAGE 7 SEED DATA COMPLETE: High-demand equipment with ranked waitlist is live for judges!\n");
}

seedStage7Waitlist().catch(console.error);
