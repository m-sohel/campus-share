import { BookingStatus, UserRole } from "@/types";

export interface TransitionRule {
  allowedActors: UserRole[];
  requiresConditionRecord?: "check_in" | "return";
  requiresReason?: boolean;
  description: string;
}

export const BOOKING_TRANSITIONS: Record<
  BookingStatus,
  Partial<Record<BookingStatus, TransitionRule>>
> = {
  draft: {
    pending_verification: {
      allowedActors: ["user", "admin"],
      description: "User submits draft request for automated requirement verification.",
    },
    cancelled: {
      allowedActors: ["user", "admin"],
      description: "User cancels request before submission.",
    },
  },
  pending_verification: {
    pending_review: {
      allowedActors: ["user", "owner", "manager", "admin"],
      description: "Automated verification passed. Awaiting human owner/technician review.",
    },
    rejected: {
      allowedActors: ["owner", "manager", "admin"],
      requiresReason: true,
      description: "Automated verification failed mandatory requirements or owner rejected.",
    },
    cancelled: {
      allowedActors: ["user", "admin"],
      description: "User withdrew request during verification.",
    },
  },
  pending_review: {
    approved: {
      allowedActors: ["owner", "manager", "admin"],
      requiresReason: true,
      description: "Owner or manager reviewed and approved the booking request.",
    },
    waitlisted: {
      allowedActors: ["owner", "manager", "admin"],
      requiresReason: true,
      description: "Contested resource slot. User placed on fair-share priority waitlist.",
    },
    rejected: {
      allowedActors: ["owner", "manager", "admin"],
      requiresReason: true,
      description: "Request declined with plain-language explanation.",
    },
    cancelled: {
      allowedActors: ["user", "admin"],
      description: "User cancelled request before owner decision.",
    },
  },
  waitlisted: {
    pending_review: {
      allowedActors: ["owner", "manager", "admin"],
      description: "Slot opened up; waitlist promoted to active review.",
    },
    approved: {
      allowedActors: ["owner", "manager", "admin"],
      requiresReason: true,
      description: "Promoted directly to approved after higher priority drop.",
    },
    rejected: {
      allowedActors: ["owner", "manager", "admin"],
      requiresReason: true,
      description: "Waitlist closed or expired.",
    },
    cancelled: {
      allowedActors: ["user", "admin"],
      description: "User withdrew from waitlist.",
    },
  },
  approved: {
    confirmed: {
      allowedActors: ["user", "admin"],
      description: "Borrower reviewed conditions, signed safety waiver, and confirmed booking.",
    },
    cancelled: {
      allowedActors: ["user", "owner", "manager", "admin"],
      requiresReason: true,
      description: "Booking cancelled prior to handover.",
    },
  },
  confirmed: {
    checked_in: {
      allowedActors: ["owner", "manager", "admin", "user"],
      requiresConditionRecord: "check_in",
      description: "Physical handover completed with initial condition inspection recorded.",
    },
    cancelled: {
      allowedActors: ["owner", "manager", "admin", "user"],
      requiresReason: true,
      description: "No-show or last-minute cancellation before handover.",
    },
  },
  checked_in: {
    returned: {
      allowedActors: ["owner", "manager", "admin", "user"],
      requiresConditionRecord: "return",
      description: "Resource returned; post-session inspection recorded.",
    },
    flagged_incident: {
      allowedActors: ["owner", "manager", "admin", "user"],
      requiresReason: true,
      description: "Damage, safety breach, or malfunction reported during active period.",
    },
  },
  returned: {
    completed: {
      allowedActors: ["owner", "manager", "admin"],
      description: "Post-return inspection cleared with zero issues. Transaction completed.",
    },
    flagged_incident: {
      allowedActors: ["owner", "manager", "admin"],
      requiresReason: true,
      description: "Damage or missing components discovered during final inspection.",
    },
  },
  flagged_incident: {
    completed: {
      allowedActors: ["owner", "manager", "admin"],
      requiresReason: true,
      description: "Incident resolved through repair fee, replacement, or waiver.",
    },
    rejected: {
      allowedActors: ["admin"],
      requiresReason: true,
      description: "Severe violation escalated and closed with penalties.",
    },
  },
  completed: {},
  rejected: {},
  cancelled: {},
};

export interface CanTransitionResult {
  canTransition: boolean;
  reason: string;
  rule?: TransitionRule;
}

export function validateStateTransition(
  from: BookingStatus,
  to: BookingStatus,
  actorRole: UserRole,
  hasReason: boolean,
  hasConditionRecord: boolean
): CanTransitionResult {
  const fromRules = BOOKING_TRANSITIONS[from];
  if (!fromRules) {
    return { canTransition: false, reason: `Unknown starting status: ${from}` };
  }

  const rule = fromRules[to];
  if (!rule) {
    return {
      canTransition: false,
      reason: `Transition from "${from}" to "${to}" is not allowed in the lifecycle state machine.`,
    };
  }

  if (!rule.allowedActors.includes(actorRole)) {
    return {
      canTransition: false,
      reason: `Role "${actorRole}" does not have permission to transition from "${from}" to "${to}". Allowed roles: ${rule.allowedActors.join(", ")}.`,
    };
  }

  if (rule.requiresReason && !hasReason) {
    return {
      canTransition: false,
      reason: `A plain-language reason is mandatory for transition to "${to}".`,
    };
  }

  if (rule.requiresConditionRecord && !hasConditionRecord) {
    return {
      canTransition: false,
      reason: `A signed ${rule.requiresConditionRecord} condition record is required to transition to "${to}".`,
    };
  }

  return {
    canTransition: true,
    reason: rule.description,
    rule,
  };
}

