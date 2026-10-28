import { BlackoutDate, Booking } from "@/types";

export interface ConflictCheckInput {
  requestedStart: Date;
  requestedEnd: Date;
  existingBookings: Booking[];
  blackoutDates: BlackoutDate[];
  minLeadTimeHours: number;
  maxDurationHours: number;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  reasons: string[];
}

/**
 * Pure business rule: checks for time-slot overlaps, minimum lead times, and duration limits.
 */
export function checkConflicts(input: ConflictCheckInput): ConflictCheckResult {
  const reasons: string[] = [];
  const now = new Date();

  // 1. Minimum lead time check
  const leadTimeMs = input.requestedStart.getTime() - now.getTime();
  const leadTimeHours = leadTimeMs / (1000 * 60 * 60);

  if (leadTimeHours < input.minLeadTimeHours) {
    reasons.push(
      `Insufficient notice: Requires at least ${input.minLeadTimeHours}h advance booking (requested with ${Math.max(
        0,
        Math.round(leadTimeHours * 10) / 10
      )}h notice).`
    );
  }

  // 2. Maximum duration check
  const durationMs = input.requestedEnd.getTime() - input.requestedStart.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  if (durationHours <= 0) {
    reasons.push("Booking end time must be after start time.");
  } else if (durationHours > input.maxDurationHours) {
    reasons.push(
      `Exceeds maximum duration: Single reservation capped at ${input.maxDurationHours}h (requested ${Math.round(
        durationHours * 10
      ) / 10}h).`
    );
  }

  // 3. Overlap with existing approved/active bookings
  const activeStatuses = ["approved", "confirmed", "checked_in", "pending_review"];
  for (const b of input.existingBookings) {
    if (!activeStatuses.includes(b.status)) continue;

    const bStart = new Date(b.start_time);
    const bEnd = new Date(b.end_time);

    // Standard interval overlap condition: (StartA < EndB) and (EndA > StartB)
    if (input.requestedStart < bEnd && input.requestedEnd > bStart) {
      reasons.push(
        `Overlaps with an active reservation from ${bStart.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })} to ${bEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
      );
    }
  }

  // 4. Overlap with blackout dates / scheduled maintenance
  for (const bo of input.blackoutDates) {
    const boStart = new Date(bo.start_time);
    const boEnd = new Date(bo.end_time);

    if (input.requestedStart < boEnd && input.requestedEnd > boStart) {
      reasons.push(
        `Time slot blocked for scheduled maintenance or campus holiday: "${bo.reason}".`
      );
    }
  }

  return {
    hasConflict: reasons.length > 0,
    reasons,
  };
}

