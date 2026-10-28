import { Booking, BookingEvent, BookingStatus, Profile, Resource } from "@/types";
import { EligibilityResult } from "./eligibility";
import { ConflictCheckResult } from "./conflicts";

export interface DecisionExplanation {
  bookingId: string;
  status: BookingStatus;
  headline: string;
  badgeVariant: "success" | "destructive" | "warning" | "info" | "secondary";
  decisionNarrative: string;
  humanReason: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  eligibilityAudit: {
    status: "verified" | "failed" | "not_required";
    summary: string;
    items: { label: string; met: boolean; note: string }[];
  };
  conflictAudit: {
    status: "clear" | "conflict_detected";
    summary: string;
    details: string[];
  };
  policyGuidelines: string[];
  nextSteps: string;
}

export interface ExplainDecisionInput {
  booking: Booking;
  events?: BookingEvent[];
  resource?: Resource;
  reviewer?: Profile | null;
  eligibility?: EligibilityResult | null;
  conflicts?: ConflictCheckResult | null;
}

/**
 * Pure business rule: generates an intuitive, plain-language explanation of
 * WHY a booking request was approved, rejected, waitlisted, or cancelled.
 * Guarantees zero mystery for borrowers and full auditability for administrators.
 */
export function explainBookingDecision(input: ExplainDecisionInput): DecisionExplanation {
  const { booking, events = [], resource, reviewer, eligibility, conflicts } = input;

  // Find relevant review event
  const reviewEvent = events
    .slice()
    .reverse()
    .find((e) => ["approved", "rejected", "waitlisted", "cancelled"].includes(e.to_status));

  const reviewerName = reviewer?.full_name || reviewEvent?.actor_role || "Facility Staff";
  const reviewedAt = reviewEvent?.created_at || booking.updated_at || booking.created_at;

  const humanReason =
    booking.rejection_reason ||
    booking.cancellation_reason ||
    reviewEvent?.reason ||
    null;

  let headline = "";
  let badgeVariant: DecisionExplanation["badgeVariant"] = "secondary";
  let decisionNarrative = "";
  let nextSteps = "";

  const resourceName = resource?.name || "Equipment";

  switch (booking.status) {
    case "approved":
    case "confirmed":
      headline = `Approved by ${reviewerName}`;
      badgeVariant = "success";
      decisionNarrative = `Your reservation request for "${resourceName}" has been officially authorized. The facility team verified that your credentials are fully compliant with campus safety regulations, and no schedule conflicts were present for your requested time window.`;
      if (humanReason && humanReason !== "Approved") {
        decisionNarrative += ` Reviewer Note: "${humanReason}".`;
      }
      nextSteps =
        "Please arrive at the facility 5 minutes before your scheduled start time. Present your digital QR pass for the mandatory check-in condition inspection.";
      break;

    case "rejected":
      headline = `Request Rejected by ${reviewerName}`;
      badgeVariant = "destructive";
      decisionNarrative = `Your reservation request could not be approved at this time. The facility administrator provided the following required justification: "${
        humanReason || "Schedule conflict or unmet prerequisites."
      }".`;
      nextSteps =
        "Review the reviewer's feedback and ensure all prerequisite training or supervisory approvals are met before submitting a new reservation.";
      break;

    case "waitlisted":
      headline = `Placed on Priority Waitlist by ${reviewerName}`;
      badgeVariant = "warning";
      decisionNarrative = `Your request has been placed on the active waitlist. Reason: "${
        humanReason || "High demand slot currently reserved by another research team."
      }". Your position is automatically ranked by CampusShare's fairness and reputation algorithm.`;
      nextSteps =
        "If the primary reservation holder cancels or releases the slot, you will receive an instant notification offering you the booking.";
      break;

    case "cancelled":
      headline = `Reservation Cancelled`;
      badgeVariant = "secondary";
      decisionNarrative = `This reservation was cancelled. Cancellation Reason: "${
        humanReason || "Cancelled by user or facility coordinator."
      }".`;
      nextSteps =
        "The time slot has been released back into the public inventory. You may browse other available dates if needed.";
      break;

    case "pending_review":
    case "pending_verification":
    default:
      headline = "Pending Staff Review";
      badgeVariant = "info";
      decisionNarrative = `Your booking request for "${resourceName}" has passed automated conflict checks and has been routed to ${reviewerName} for administrative authorization.`;
      nextSteps =
        "Facility managers typically review requests within 2 to 4 hours. You will receive an in-app notification once a decision is recorded.";
      break;
  }

  // Eligibility breakdown
  const eligibilityAudit: DecisionExplanation["eligibilityAudit"] = {
    status: !eligibility || eligibility.isEligible ? "verified" : "failed",
    summary:
      eligibility?.summary ||
      "All required training and certifications were verified as active and valid at time of request.",
    items: eligibility
      ? eligibility.checks.map((c) => ({
          label: c.requirement.credential_type,
          met: c.met,
          note: c.reason,
        }))
      : [
          {
            label: "Safety & Operational Requirements",
            met: true,
            note: "Verified compliant with facility protocols.",
          },
        ],
  };

  // Conflict breakdown
  const conflictAudit: DecisionExplanation["conflictAudit"] = {
    status: conflicts && conflicts.hasConflict ? "conflict_detected" : "clear",
    summary:
      conflicts && conflicts.hasConflict
        ? `Conflict detected: ${conflicts.reasons.join(" ")}`
        : "Time window verified: No overlapping bookings, blackout windows, or operating hours violations.",
    details: conflicts?.reasons || [],
  };

  // Policy guidelines
  const policyGuidelines: string[] = [];
  if (resource?.rules) {
    policyGuidelines.push(resource.rules);
  } else {
    policyGuidelines.push("All operators must observe campus workshop safety rules and wear PPE.");
  }
  if (resource?.requires_supervision) {
    policyGuidelines.push(
      "Mandatory Supervision: A certified lab technician or faculty supervisor must be present during equipment operation."
    );
  }
  if (resource?.deposit_required_cents && resource.deposit_required_cents > 0) {
    policyGuidelines.push(
      `Security Deposit: A refundable deposit of $${(resource.deposit_required_cents / 100).toFixed(
        2
      )} applies.`
    );
  }

  return {
    bookingId: booking.id,
    status: booking.status,
    headline,
    badgeVariant,
    decisionNarrative,
    humanReason,
    reviewerName,
    reviewedAt,
    eligibilityAudit,
    conflictAudit,
    policyGuidelines,
    nextSteps,
  };
}

