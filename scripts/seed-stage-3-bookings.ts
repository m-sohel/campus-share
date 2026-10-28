import { config } from "dotenv";
config({ path: ".env.local" });
import { getSupabaseAdminClient } from "../src/backend/client";
import { createBookingRequest, reviewBookingRequest } from "../src/backend/services/bookings";

async function seedStage3Bookings() {
  console.log("Seeding Stage 3 sample bookings for live UI testing...");
  const supabase = getSupabaseAdminClient();

  const { data: profiles } = await supabase.from("profiles").select("*");
  const { data: resources } = await supabase.from("resources").select("*");

  const sarah = profiles?.find((p) => p.email === "user.researcher@campusshare.edu");
  const amara = profiles?.find((p) => p.email === "user.pending@campusshare.edu");
  const elena = profiles?.find((p) => p.email === "owner.lab@campusshare.edu");
  const marcus = profiles?.find((p) => p.email === "owner.makerspace@campusshare.edu");

  const laser = resources?.find((r) => r.name.includes("Laser Cutter"));
  const prusa = resources?.find((r) => r.name.includes("Prusa"));

  if (!sarah || !elena || !laser || !prusa) {
    console.error("Missing seed data.");
    return;
  }

  // 1. Pending Request for Elena (Laser Cutter by Sarah)
  const date1 = new Date();
  date1.setDate(date1.getDate() + 3);
  date1.setHours(14, 0, 0, 0); // 3 days in future at 2:00 PM
  const end1 = new Date(date1.getTime() + 2 * 3600000);

  const req1 = await createBookingRequest({
    userId: sarah.id,
    resourceId: laser.id,
    startTime: date1.toISOString(),
    endTime: end1.toISOString(),
    purpose: "Precision cutting of acrylic mounts for robotics competition chassis.",
    teamSize: 3,
    supervisorName: "Dr. Arthur Vance",
    rulesAcknowledged: true,
  });

  if (req1.success && req1.booking) {
    console.log(`✅ Created Pending Request for Laser Cutter (Sarah Jenkins) - ID: ${req1.booking.id}`);
  }

  // 2. Approved Booking for Elena (Laser Cutter by Sarah, earlier slot)
  const date2 = new Date();
  date2.setDate(date2.getDate() + 4);
  date2.setHours(10, 0, 0, 0); // 4 days in future at 10:00 AM
  const end2 = new Date(date2.getTime() + 2 * 3600000);

  const req2 = await createBookingRequest({
    userId: sarah.id,
    resourceId: laser.id,
    startTime: date2.toISOString(),
    endTime: end2.toISOString(),
    purpose: "Laser calibration tests for optical alignment paper.",
    teamSize: 1,
    rulesAcknowledged: true,
  });

  if (req2.success && req2.booking) {
    await reviewBookingRequest({
      bookingId: req2.booking.id,
      actorId: elena.id,
      action: "approve",
      reason: "Approved: Valid Level 2 Laser Safety cert verified with clean safety record.",
    });
    console.log(`✅ Created Approved Booking for Laser Cutter (Sarah Jenkins) - ID: ${req2.booking.id}`);
  }

  // 3. Waitlisted Request for 3D Printer (Prusa MK4)
  const date3 = new Date();
  date3.setDate(date3.getDate() + 5);
  date3.setHours(11, 0, 0, 0);
  const end3 = new Date(date3.getTime() + 3 * 3600000);

  const req3 = await createBookingRequest({
    userId: sarah.id,
    resourceId: prusa.id,
    startTime: date3.toISOString(),
    endTime: end3.toISOString(),
    purpose: "Rapid prototyping of drone landing gear components.",
    teamSize: 2,
    rulesAcknowledged: true,
  });

  if (req3.success && req3.booking) {
    const ownerId = prusa.owner_id || marcus?.id || elena.id;
    await reviewBookingRequest({
      bookingId: req3.booking.id,
      actorId: ownerId,
      action: "waitlist",
      reason: "High demand slot currently reserved by Architecture Studio. Placed in position #1 on waitlist.",
    });
    console.log(`✅ Created Waitlisted Booking for 3D Printer - ID: ${req3.booking.id}`);
  }

  console.log("\n🎉 Live sample bookings seeded successfully!");
}

seedStage3Bookings().catch(console.error);
