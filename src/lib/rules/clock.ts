/**
 * CampusShare App Clock & Time-Based Logic Engine
 * Pure TypeScript functions - handles simulated demo clock, overdue detection,
 * return reminders, and upcoming reservation alerts.
 */

import { Booking, Notification } from "@/types";

// Runtime in-memory clock offset (in milliseconds)
// Defaults to 0 (real time)
let runtimeClockOffsetMs = 0;

/**
 * Computes simulated App Time given a base timestamp and an offset.
 */
export function computeAppTime(baseRealTimeMs: number, offsetMs: number): Date {
  return new Date(baseRealTimeMs + offsetMs);
}

/**
 * Returns the current simulated App Time.
 * All time-based application logic should read this rather than raw new Date().
 */
export function getAppTime(): Date {
  return new Date(Date.now() + runtimeClockOffsetMs);
}

/**
 * Returns current simulated App Time as ISO string.
 */
export function getAppTimeISO(): string {
  return getAppTime().toISOString();
}

/**
 * Returns current offset in milliseconds.
 */
export function getAppClockOffset(): number {
  return runtimeClockOffsetMs;
}

/**
 * Directly sets the clock offset in milliseconds.
 */
export function setAppClockOffset(offsetMs: number): void {
  runtimeClockOffsetMs = offsetMs;
}

/**
 * Advances the app clock forward by a specified duration in milliseconds.
 */
export function advanceAppClock(offsetMs: number): Date {
  runtimeClockOffsetMs += offsetMs;
  return getAppTime();
}

/**
 * Resets the app clock back to real system time.
 */
export function resetAppClock(): Date {
  runtimeClockOffsetMs = 0;
  return getAppTime();
}

/**
 * Checks if an active booking is overdue relative to the simulated app time.
 * Grace period defaults to 0 minutes for strict overdue notification triggers.
 */
export function isBookingOverdue(
  booking: { status: string; end_time: string },
  appTime: Date,
  graceMinutes: number = 0
): { isOverdue: boolean; overdueMinutes: number } {
  // Only bookings in active / handed-over statuses can be overdue
  if (booking.status !== "in_use" && booking.status !== "checked_in") {
    return { isOverdue: false, overdueMinutes: 0 };
  }

  const endMs = new Date(booking.end_time).getTime();
  const currentMs = appTime.getTime();
  const diffMinutes = Math.floor((currentMs - endMs) / (60 * 1000));

  if (diffMinutes > graceMinutes) {
    return { isOverdue: true, overdueMinutes: diffMinutes };
  }

  return { isOverdue: false, overdueMinutes: 0 };
}

/**
 * Checks if a return is due soon (e.g. within 60 minutes).
 */
export function isReturnDueSoon(
  booking: { status: string; end_time: string },
  appTime: Date,
  thresholdMinutes: number = 60
): { isDueSoon: boolean; minutesRemaining: number } {
  if (booking.status !== "in_use" && booking.status !== "checked_in") {
    return { isDueSoon: false, minutesRemaining: 0 };
  }

  const endMs = new Date(booking.end_time).getTime();
  const currentMs = appTime.getTime();
  const minutesRemaining = Math.floor((endMs - currentMs) / (60 * 1000));

  if (minutesRemaining > 0 && minutesRemaining <= thresholdMinutes) {
    return { isDueSoon: true, minutesRemaining };
  }

  return { isDueSoon: false, minutesRemaining: 0 };
}

/**
 * Checks if an upcoming booking reminder is due (e.g. within 120 minutes of start).
 */
export function isUpcomingReminderDue(
  booking: { status: string; start_time: string },
  appTime: Date,
  thresholdMinutes: number = 120
): { isReminderDue: boolean; minutesUntilStart: number } {
  if (booking.status !== "approved" && booking.status !== "confirmed") {
    return { isReminderDue: false, minutesUntilStart: 0 };
  }

  const startMs = new Date(booking.start_time).getTime();
  const currentMs = appTime.getTime();
  const minutesUntilStart = Math.floor((startMs - currentMs) / (60 * 1000));

  if (minutesUntilStart > 0 && minutesUntilStart <= thresholdMinutes) {
    return { isReminderDue: true, minutesUntilStart };
  }

  return { isReminderDue: false, minutesUntilStart: 0 };
}

export interface TriggeredTimeEvent {
  type: "overdue" | "return_due" | "reminder_before_booking";
  booking_id: string;
  user_id: string;
  resource_id: string;
  title: string;
  message: string;
  severity: "warning" | "action_required" | "info";
  link: string;
  action_label?: string;
  action_url?: string;
  notify_owner?: boolean;
}

/**
 * Scans a list of bookings against current App Time and returns new time-triggered notifications
 * that have not yet been generated in existingNotifs.
 */
export function detectTimeTriggerEvents(
  bookings: Booking[],
  appTime: Date,
  existingNotifs: Notification[] = []
): TriggeredTimeEvent[] {
  const events: TriggeredTimeEvent[] = [];

  for (const b of bookings) {
    // 1. Check Overdue
    const overdueCheck = isBookingOverdue(b, appTime, 0);
    if (overdueCheck.isOverdue) {
      // Check if user already has an overdue notification for this booking
      const alreadyNotifiedUser = existingNotifs.some(
        (n) => n.user_id === b.user_id && n.category === "overdue" && n.link?.includes(b.id)
      );

      if (!alreadyNotifiedUser) {
        events.push({
          type: "overdue",
          booking_id: b.id,
          user_id: b.user_id,
          resource_id: b.resource_id,
          title: "🚨 Return Overdue Alert",
          message: `Your booking #${b.id} was scheduled to end at ${new Date(
            b.end_time
          ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. You are currently ${
            overdueCheck.overdueMinutes
          }m overdue. Return equipment immediately to avoid suspension.`,
          severity: "action_required",
          link: `/bookings/${b.id}`,
          notify_owner: true,
          action_label: "Open Late Return Incident",
          action_url: `/incidents/new?booking_id=${b.id}&type=late_return`,
        });
      }
    }

    // 2. Check Return Due Soon (<60m)
    const dueSoonCheck = isReturnDueSoon(b, appTime, 60);
    if (dueSoonCheck.isDueSoon) {
      const alreadyNotified = existingNotifs.some(
        (n) => n.user_id === b.user_id && n.category === "return_due" && n.link?.includes(b.id)
      );
      if (!alreadyNotified) {
        events.push({
          type: "return_due",
          booking_id: b.id,
          user_id: b.user_id,
          resource_id: b.resource_id,
          title: "⏰ Equipment Return Due Soon",
          message: `Booking #${b.id} is due in ${dueSoonCheck.minutesRemaining} minutes. Please prepare for inspection and check-out.`,
          severity: "warning",
          link: `/bookings/${b.id}`,
        });
      }
    }

    // 3. Check Upcoming Reminder (<120m)
    const upcomingCheck = isUpcomingReminderDue(b, appTime, 120);
    if (upcomingCheck.isReminderDue) {
      const alreadyNotified = existingNotifs.some(
        (n) =>
          n.user_id === b.user_id &&
          n.category === "reminder_before_booking" &&
          n.link?.includes(b.id)
      );
      if (!alreadyNotified) {
        events.push({
          type: "reminder_before_booking",
          booking_id: b.id,
          user_id: b.user_id,
          resource_id: b.resource_id,
          title: "📅 Upcoming Reservation Reminder",
          message: `Your reservation #${b.id} begins in ${upcomingCheck.minutesUntilStart} minutes. Bring your digital handover pass to check in.`,
          severity: "info",
          link: `/bookings/${b.id}`,
        });
      }
    }
  }

  return events;
}
