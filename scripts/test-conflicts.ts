import { checkConflicts, suggestNearestFreeSlots } from "../src/lib/rules/conflicts";
import { Booking, BlackoutDate, AvailabilitySlot } from "../src/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log("=== RUNNING PURE CONFLICTS & SLOTS UNIT TESTS ===\n");

const baseDate = new Date();
baseDate.setDate(baseDate.getDate() + 3); // 3 days in future to easily pass lead time
baseDate.setHours(10, 0, 0, 0);

const testBooking: Booking = {
  id: "b1",
  resource_id: "res-1",
  user_id: "user-1",
  start_time: new Date(baseDate.getTime() + 2 * 3600000).toISOString(), // 12:00 to 14:00
  end_time: new Date(baseDate.getTime() + 4 * 3600000).toISOString(),
  status: "approved",
  purpose: "Senior Project",
  fairness_score: 1.0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const testBlackout: BlackoutDate = {
  id: "bo1",
  resource_id: "res-1",
  start_time: new Date(baseDate.getTime() + 24 * 3600000).toISOString(), // Tomorrow
  end_time: new Date(baseDate.getTime() + 28 * 3600000).toISOString(),
  reason: "Campus Laser Calibration",
  created_at: new Date().toISOString(),
};

const availabilitySlots: AvailabilitySlot[] = [
  {
    id: "slot-weekday",
    resource_id: "res-1",
    day_of_week: baseDate.getDay(),
    start_time: "09:00:00",
    end_time: "18:00:00",
    slot_interval_minutes: 60,
    created_at: new Date().toISOString(),
  },
];

// Test 1: Clean non-overlapping booking within operating hours
{
  const result = checkConflicts({
    requestedStart: new Date(baseDate.getTime()), // 10:00 to 12:00
    requestedEnd: new Date(baseDate.getTime() + 2 * 3600000),
    existingBookings: [testBooking],
    blackoutDates: [testBlackout],
    minLeadTimeHours: 2,
    maxDurationHours: 4,
    availabilitySlots,
  });
  assert(!result.hasConflict, "Clean request has no conflict");
}

// Test 2: Overlapping with active booking
{
  const result = checkConflicts({
    requestedStart: new Date(baseDate.getTime() + 3 * 3600000), // 13:00 to 15:00 (overlaps 12:00-14:00)
    requestedEnd: new Date(baseDate.getTime() + 5 * 3600000),
    existingBookings: [testBooking],
    blackoutDates: [testBlackout],
    minLeadTimeHours: 2,
    maxDurationHours: 4,
    availabilitySlots,
  });
  assert(result.hasConflict, "Overlapping booking detected as conflict");
  assert(result.reasons[0].includes("Overlaps with an active reservation"), "Provides overlap reason");
}

// Test 3: Blackout date overlap
{
  const result = checkConflicts({
    requestedStart: new Date(baseDate.getTime() + 25 * 3600000),
    requestedEnd: new Date(baseDate.getTime() + 27 * 3600000),
    existingBookings: [],
    blackoutDates: [testBlackout],
    minLeadTimeHours: 2,
    maxDurationHours: 4,
  });
  assert(result.hasConflict, "Blackout date detected as conflict");
  assert(result.reasons[0].includes("Campus Laser Calibration"), "Provides blackout reason");
}

// Test 4: Exceeds max duration
{
  const result = checkConflicts({
    requestedStart: new Date(baseDate.getTime()),
    requestedEnd: new Date(baseDate.getTime() + 6 * 3600000), // 6 hours (max 4)
    existingBookings: [],
    blackoutDates: [],
    minLeadTimeHours: 2,
    maxDurationHours: 4,
  });
  assert(result.hasConflict, "Exceeding max duration detected");
  assert(result.reasons.some((r) => r.includes("Exceeds maximum duration")), "Mentions max duration in reason");
}

// Test 5: Insufficient lead time
{
  const result = checkConflicts({
    requestedStart: new Date(Date.now() + 30 * 60000), // 30 mins notice (min 2h)
    requestedEnd: new Date(Date.now() + 90 * 60000),
    existingBookings: [],
    blackoutDates: [],
    minLeadTimeHours: 2,
    maxDurationHours: 4,
  });
  assert(result.hasConflict, "Insufficient lead time detected");
  assert(result.reasons.some((r) => r.includes("Insufficient notice")), "Mentions advance booking requirement");
}

// Test 6: Outside operating hours
{
  const lateDate = new Date(baseDate.getTime());
  lateDate.setHours(21, 0, 0, 0); // 21:00 (closes at 18:00)
  const result = checkConflicts({
    requestedStart: lateDate,
    requestedEnd: new Date(lateDate.getTime() + 2 * 3600000),
    existingBookings: [],
    blackoutDates: [],
    minLeadTimeHours: 2,
    maxDurationHours: 4,
    availabilitySlots,
  });
  assert(result.hasConflict, "Outside operating hours detected");
  assert(result.reasons.some((r) => r.includes("operating hours")), "Mentions operating hours");
}

// Test 7: Suggest 3 nearest free slots on conflict
{
  const suggestions = suggestNearestFreeSlots({
    requestedStart: new Date(baseDate.getTime() + 2 * 3600000), // Conflicting slot (12:00-14:00)
    requestedEnd: new Date(baseDate.getTime() + 4 * 3600000),
    existingBookings: [testBooking],
    blackoutDates: [testBlackout],
    minLeadTimeHours: 2,
    maxDurationHours: 4,
    availabilitySlots,
    count: 3,
  });

  assert(suggestions.length === 3, "Returns exactly 3 suggested slots");
  suggestions.forEach((slot, idx) => {
    assert(Boolean(slot.start && slot.end && slot.label), `Slot ${idx + 1} has start, end, and formatted label`);
    // Ensure no suggestion overlaps with testBooking (12:00-14:00)
    const sStart = new Date(slot.start);
    const sEnd = new Date(slot.end);
    const bStart = new Date(testBooking.start_time);
    const bEnd = new Date(testBooking.end_time);
    const overlaps = sStart < bEnd && sEnd > bStart;
    assert(!overlaps, `Slot ${idx + 1} does not overlap with existing booking`);
  });
  console.log("   Suggested slots:", suggestions.map((s) => s.label));
}

console.log("\n✨ ALL 7 CONFLICT & SUGGESTION UNIT TESTS PASSED PERFECTION!\n");

