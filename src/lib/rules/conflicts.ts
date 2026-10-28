import { AvailabilitySlot, BlackoutDate, Booking } from "@/types";

export interface ConflictCheckInput {
  requestedStart: Date;
  requestedEnd: Date;
  existingBookings: Booking[];
  blackoutDates: BlackoutDate[];
  minLeadTimeHours: number;
  maxDurationHours: number;
  availabilitySlots?: AvailabilitySlot[];
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  reasons: string[];
}

export interface SuggestedSlot {
  start: string; // ISO String
  end: string;   // ISO String
  label: string; // E.g. "Thu, Oct 29 • 2:00 PM – 4:00 PM"
  durationHours: number;
}

export interface SuggestSlotsInput {
  requestedStart: Date;
  requestedEnd: Date;
  existingBookings: Booking[];
  blackoutDates: BlackoutDate[];
  minLeadTimeHours: number;
  maxDurationHours: number;
  availabilitySlots?: AvailabilitySlot[];
  count?: number; // Default 3
}

const ACTIVE_BOOKING_STATUSES = [
  "approved",
  "confirmed",
  "checked_in",
  "pending_review",
];

/**
 * Pure business rule: checks for time-slot overlaps, operating hours, blackout dates,
 * minimum lead times, and maximum duration limits.
 */
export function checkConflicts(input: ConflictCheckInput): ConflictCheckResult {
  const reasons: string[] = [];
  const now = new Date();

  // 1. Basic time boundary validation
  if (isNaN(input.requestedStart.getTime()) || isNaN(input.requestedEnd.getTime())) {
    return {
      hasConflict: true,
      reasons: ["Invalid date format provided for booking request."],
    };
  }

  const durationMs = input.requestedEnd.getTime() - input.requestedStart.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  if (durationHours <= 0) {
    reasons.push("Booking end time must be after start time.");
    return { hasConflict: true, reasons };
  }

  // 2. Minimum lead time check
  const leadTimeMs = input.requestedStart.getTime() - now.getTime();
  const leadTimeHours = leadTimeMs / (1000 * 60 * 60);

  if (leadTimeHours < input.minLeadTimeHours) {
    const roundedLead = Math.max(0, Math.round(leadTimeHours * 10) / 10);
    reasons.push(
      `Insufficient notice: Requires at least ${input.minLeadTimeHours}h advance booking (requested with ${roundedLead}h notice).`
    );
  }

  // 3. Maximum duration check
  if (durationHours > input.maxDurationHours) {
    reasons.push(
      `Exceeds maximum duration: Single reservation capped at ${input.maxDurationHours}h (requested ${
        Math.round(durationHours * 10) / 10
      }h).`
    );
  }

  // 4. Availability slots check (Operating hours per day of week)
  if (input.availabilitySlots && input.availabilitySlots.length > 0) {
    const dayOfWeek = input.requestedStart.getDay(); // 0 = Sunday
    const matchingSlots = input.availabilitySlots.filter((s) => s.day_of_week === dayOfWeek);

    if (matchingSlots.length === 0) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      reasons.push(`Outside availability: Resource is closed on ${days[dayOfWeek]}s.`);
    } else {
      // Check if requested range falls cleanly within at least one slot window
      const reqStartMinutes = input.requestedStart.getHours() * 60 + input.requestedStart.getMinutes();
      const reqEndMinutes = input.requestedEnd.getHours() * 60 + input.requestedEnd.getMinutes();

      const fitsInSlot = matchingSlots.some((slot) => {
        const [slotStartH, slotStartM] = slot.start_time.split(":").map(Number);
        const [slotEndH, slotEndM] = slot.end_time.split(":").map(Number);
        const slotStartTotal = slotStartH * 60 + slotStartM;
        const slotEndTotal = slotEndH * 60 + slotEndM;

        return reqStartMinutes >= slotStartTotal && reqEndMinutes <= slotEndTotal;
      });

      if (!fitsInSlot) {
        const slotsFormatted = matchingSlots
          .map((s) => `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`)
          .join(", ");
        reasons.push(
          `Outside operating hours: Scheduled hours for this day are ${slotsFormatted}.`
        );
      }
    }
  }

  // 5. Overlap with existing approved or pending reservations
  for (const b of input.existingBookings) {
    if (!ACTIVE_BOOKING_STATUSES.includes(b.status)) continue;

    const bStart = new Date(b.start_time);
    const bEnd = new Date(b.end_time);

    // Standard interval overlap: (StartA < EndB) and (EndA > StartB)
    if (input.requestedStart < bEnd && input.requestedEnd > bStart) {
      const formattedStart = bStart.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const formattedEnd = bEnd.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      reasons.push(
        `Overlaps with an active reservation (${b.status}) from ${formattedStart} to ${formattedEnd}.`
      );
    }
  }

  // 6. Overlap with blackout dates / scheduled maintenance
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

/**
 * Pure business rule: suggests the N nearest free slots when a conflict is detected.
 * Searches forward starting from the requested time (or earliest allowed lead time),
 * ensuring candidates respect operating hours, blackout dates, and active bookings.
 */
export function suggestNearestFreeSlots(input: SuggestSlotsInput): SuggestedSlot[] {
  const count = input.count || 3;
  const suggestions: SuggestedSlot[] = [];
  const now = new Date();

  // Requested duration in ms (capped at maxDuration)
  const requestedDurationMs = Math.min(
    Math.max(input.requestedEnd.getTime() - input.requestedStart.getTime(), 30 * 60 * 1000),
    input.maxDurationHours * 60 * 60 * 1000
  );

  // Minimum allowed start time
  const minAllowedStart = new Date(now.getTime() + input.minLeadTimeHours * 60 * 60 * 1000);

  // Initial candidate start time aligned to next 30-min boundary
  let candidateStart = new Date(
    Math.max(input.requestedStart.getTime(), minAllowedStart.getTime())
  );
  candidateStart.setMinutes(Math.ceil(candidateStart.getMinutes() / 30) * 30, 0, 0);

  // Look ahead up to 14 days
  const maxSearchTime = new Date(candidateStart.getTime() + 14 * 24 * 60 * 60 * 1000);

  // Use availability slots or default to standard 09:00 - 18:00 if none provided
  const operatingSlots =
    input.availabilitySlots && input.availabilitySlots.length > 0
      ? input.availabilitySlots
      : [
          { day_of_week: 1, start_time: "09:00:00", end_time: "18:00:00" },
          { day_of_week: 2, start_time: "09:00:00", end_time: "18:00:00" },
          { day_of_week: 3, start_time: "09:00:00", end_time: "18:00:00" },
          { day_of_week: 4, start_time: "09:00:00", end_time: "18:00:00" },
          { day_of_week: 5, start_time: "09:00:00", end_time: "18:00:00" },
        ];

  while (candidateStart < maxSearchTime && suggestions.length < count) {
    const candidateEnd = new Date(candidateStart.getTime() + requestedDurationMs);

    // Skip the exact original conflicting window
    const isOriginalSlot =
      Math.abs(candidateStart.getTime() - input.requestedStart.getTime()) < 5 * 60 * 1000;

    if (!isOriginalSlot) {
      // Check operating hours for day of week
      const dayOfWeek = candidateStart.getDay();
      const daySlots = operatingSlots.filter((s) => s.day_of_week === dayOfWeek);

      const withinHours = daySlots.some((slot) => {
        const [sh, sm] = slot.start_time.split(":").map(Number);
        const [eh, em] = slot.end_time.split(":").map(Number);
        const sMins = sh * 60 + sm;
        const eMins = eh * 60 + em;

        const candStartMins = candidateStart.getHours() * 60 + candidateStart.getMinutes();
        const candEndMins = candidateEnd.getHours() * 60 + candidateEnd.getMinutes();

        return (
          candidateStart.toDateString() === candidateEnd.toDateString() &&
          candStartMins >= sMins &&
          candEndMins <= eMins
        );
      });

      if (withinHours) {
        // Check overlap with active bookings
        const overlapsBooking = input.existingBookings.some((b) => {
          if (!ACTIVE_BOOKING_STATUSES.includes(b.status)) return false;
          return candidateStart < new Date(b.end_time) && candidateEnd > new Date(b.start_time);
        });

        // Check overlap with blackout dates
        const overlapsBlackout = input.blackoutDates.some((bo) => {
          return candidateStart < new Date(bo.end_time) && candidateEnd > new Date(bo.start_time);
        });

        if (!overlapsBooking && !overlapsBlackout) {
          const durationHours = requestedDurationMs / (1000 * 60 * 60);
          suggestions.push({
            start: candidateStart.toISOString(),
            end: candidateEnd.toISOString(),
            label: formatSlotLabel(candidateStart, candidateEnd),
            durationHours: Math.round(durationHours * 10) / 10,
          });

          // Jump ahead by the duration to avoid overlapping suggestions
          candidateStart = new Date(candidateEnd.getTime());
          continue;
        }
      }
    }

    // Advance by 30 minutes
    candidateStart = new Date(candidateStart.getTime() + 30 * 60 * 1000);
  }

  return suggestions;
}

function formatSlotLabel(start: Date, end: Date): string {
  const dateStr = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startStr = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const endStr = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateStr} • ${startStr} – ${endStr}`;
}
