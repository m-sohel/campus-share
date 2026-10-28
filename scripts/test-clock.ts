/**
 * Unit Tests for Stage 8 App Clock & Time-based Triggers
 */

import {
  computeAppTime,
  isBookingOverdue,
  isReturnDueSoon,
  isUpcomingReminderDue,
  detectTimeTriggerEvents,
  advanceAppClock,
  resetAppClock,
  getAppTime,
} from "../src/lib/rules/clock";
import { Booking } from "../src/types";

function runTests() {
  console.log("==================================================");
  console.log("🧪 Stage 8: App Clock & Time-Based Logic Tests");
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

  // 1. Clock Computation
  const base = new Date("2026-10-28T10:00:00Z").getTime();
  const oneHour = 60 * 60 * 1000;
  const plusOneHour = computeAppTime(base, oneHour);
  assert(plusOneHour.toISOString() === "2026-10-28T11:00:00.000Z", "computeAppTime accurately adds offset");

  // 2. Overdue Detection
  const mockInUseBooking: Partial<Booking> = {
    id: "b-overdue-test",
    status: "in_use",
    end_time: "2026-10-28T12:00:00Z",
  };

  const beforeEnd = new Date("2026-10-28T11:59:00Z");
  const checkBefore = isBookingOverdue(mockInUseBooking as any, beforeEnd);
  assert(!checkBefore.isOverdue, "Booking before end time is not overdue");

  const afterEnd = new Date("2026-10-28T12:30:00Z");
  const checkAfter = isBookingOverdue(mockInUseBooking as any, afterEnd);
  assert(checkAfter.isOverdue, "Booking 30m past end time is detected as overdue");
  assert(checkAfter.overdueMinutes === 30, "Accurately computes 30 overdue minutes");

  // 3. Return Due Soon (<60m)
  const dueSoonTime = new Date("2026-10-28T11:15:00Z"); // 45m before 12:00
  const dueSoonCheck = isReturnDueSoon(mockInUseBooking as any, dueSoonTime, 60);
  assert(dueSoonCheck.isDueSoon, "Detected booking due in 45 minutes");
  assert(dueSoonCheck.minutesRemaining === 45, "Returns 45 minutes remaining");

  // 4. Upcoming Reminder (<120m)
  const mockApprovedBooking: Partial<Booking> = {
    id: "b-upcoming-test",
    status: "approved",
    start_time: "2026-10-28T14:00:00Z",
  };
  const reminderTime = new Date("2026-10-28T12:30:00Z"); // 90m before 14:00
  const reminderCheck = isUpcomingReminderDue(mockApprovedBooking as any, reminderTime, 120);
  assert(reminderCheck.isReminderDue, "Detected upcoming reservation in 90 minutes");
  assert(reminderCheck.minutesUntilStart === 90, "Returns 90 minutes until start");

  // 5. detectTimeTriggerEvents
  const bookings: Booking[] = [
    {
      id: "b-active-1",
      user_id: "user-1",
      resource_id: "res-1",
      start_time: "2026-10-28T10:00:00Z",
      end_time: "2026-10-28T12:00:00Z",
      status: "in_use",
      purpose: "PCB testing and measurement",
      fairness_score: 50,
      created_at: "2026-10-28T09:00:00Z",
      updated_at: "2026-10-28T09:00:00Z",
    },
  ];

  const appTimePastEnd = new Date("2026-10-28T12:15:00Z");
  const events = detectTimeTriggerEvents(bookings, appTimePastEnd, []);
  assert(events.length === 1, "Detected 1 time-triggered event");
  assert(events[0].type === "overdue", "Triggered event is overdue alert");
  assert(events[0].notify_owner === true, "Flags owner for overdue notification");
  assert(Boolean(events[0].action_url?.includes("late_return")), "Action URL deep links to late_return incident");

  // 6. Fast-forward clock controls
  resetAppClock();
  const initial = getAppTime().getTime();
  advanceAppClock(oneHour);
  const advanced = getAppTime().getTime();
  assert(advanced - initial >= oneHour - 100 && advanced - initial <= oneHour + 100, "advanceAppClock advances simulated clock by 1 hour");
  resetAppClock();
  assert(Math.abs(getAppTime().getTime() - Date.now()) < 50, "resetAppClock safely returns to real time");

  console.log("==================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runTests();
