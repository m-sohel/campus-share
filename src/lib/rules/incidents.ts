/**
 * CampusShare Incident & Dispute Rules Engine
 * Pure TypeScript functions - zero UI, zero DB dependencies.
 * Governs incident creation, response, manager decision, user dispute, and admin resolution.
 */

import {
  Incident,
  IncidentStatus,
  IncidentType,
  IncidentSeverity,
  UserRole,
} from "@/types";

export interface IncidentTransitionCheck {
  allowed: boolean;
  reason?: string;
  nextStatus?: IncidentStatus;
}

/**
 * Validates whether an actor with a given role can transition an incident from currentStatus to nextStatus.
 */
export function canTransitionIncident(
  currentStatus: IncidentStatus,
  nextStatus: IncidentStatus,
  actorRole: UserRole,
  isAffectedUser: boolean = false
): IncidentTransitionCheck {
  // 1. Draft -> Open (Only manager, owner, or admin can publish draft)
  if (currentStatus === "draft" && nextStatus === "open") {
    if (actorRole === "manager" || actorRole === "owner" || actorRole === "admin") {
      return { allowed: true, nextStatus };
    }
    return {
      allowed: false,
      reason: "Only a station manager, owner, or administrator can open a draft incident for investigation.",
    };
  }

  // 1b. Draft -> Resolved (Dismissed as no-fault wear & tear)
  if (currentStatus === "draft" && nextStatus === "resolved") {
    if (actorRole === "manager" || actorRole === "owner" || actorRole === "admin") {
      return { allowed: true, nextStatus };
    }
    return {
      allowed: false,
      reason: "Only a station manager or owner can dismiss a draft incident as acceptable wear and tear.",
    };
  }

  // 2. Open -> Under Review (Affected user submits statement, or manager starts formal review)
  if (currentStatus === "open" && nextStatus === "under_review") {
    if (isAffectedUser || actorRole === "manager" || actorRole === "owner" || actorRole === "admin") {
      return { allowed: true, nextStatus };
    }
    return {
      allowed: false,
      reason: "Only the affected borrower or station manager can advance an open incident into formal review.",
    };
  }

  // 3. Under Review (or Open) -> Resolved (Manager records finding & decision)
  if ((currentStatus === "under_review" || currentStatus === "open") && nextStatus === "resolved") {
    if (actorRole === "manager" || actorRole === "owner" || actorRole === "admin") {
      return { allowed: true, nextStatus };
    }
    return {
      allowed: false,
      reason: "Only station managers, owners, or administrators can record a binding incident decision.",
    };
  }

  // 4. Resolved -> Disputed (Affected user files formal appeal within dispute window)
  if (currentStatus === "resolved" && nextStatus === "disputed") {
    if (isAffectedUser || actorRole === "admin") {
      return { allowed: true, nextStatus };
    }
    return {
      allowed: false,
      reason: "Only the affected borrower can file a formal dispute against a manager finding.",
    };
  }

  // 5. Disputed -> Resolved (Only Campus Administrator can arbitrate and resolve disputes)
  if (currentStatus === "disputed" && nextStatus === "resolved") {
    if (actorRole === "admin") {
      return { allowed: true, nextStatus };
    }
    return {
      allowed: false,
      reason: "Only the Campus Administrator has authority to arbitrate and resolve contested disputes.",
    };
  }

  return {
    allowed: false,
    reason: `Invalid incident state transition from '${currentStatus}' to '${nextStatus}' by role '${actorRole}'.`,
  };
}

/**
 * Validates incident creation payload.
 */
export function validateIncidentReport(data: {
  booking_id: string;
  type: string;
  severity: string;
  description: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.booking_id || data.booking_id.trim() === "") {
    errors.push("Linked booking ID is required.");
  }

  const validTypes: IncidentType[] = [
    "damage",
    "late_return",
    "no_show",
    "misuse",
    "safety",
    "safety_violation",
    "missing_item",
    "conflict",
  ];
  if (!validTypes.includes(data.type as IncidentType)) {
    errors.push(`Invalid incident type '${data.type}'. Must be one of: ${validTypes.join(", ")}`);
  }

  const validSeverities: IncidentSeverity[] = ["low", "medium", "high", "critical"];
  if (!validSeverities.includes(data.severity as IncidentSeverity)) {
    errors.push(`Invalid severity '${data.severity}'. Must be one of: ${validSeverities.join(", ")}`);
  }

  if (!data.description || data.description.trim().length < 10) {
    errors.push("Description must provide at least 10 characters detailing the physical or operational issue.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates user statement response.
 */
export function validateUserResponse(response: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!response || response.trim().length < 10) {
    errors.push("Borrower statement must be at least 10 characters to provide meaningful context.");
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates manager finding & decision.
 */
export function validateManagerDecision(
  decision: string,
  notes: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validDecisions = [
    "fault_user",
    "fault_equipment",
    "no_fault_wear_and_tear",
    "warning_issued",
    "cost_share",
    "dismissed",
  ];

  if (!validDecisions.includes(decision)) {
    errors.push(`Decision '${decision}' is not recognized. Must be one of: ${validDecisions.join(", ")}`);
  }

  if (!notes || notes.trim().length < 10) {
    errors.push("Manager decision requires at least 10 characters of explanatory justification.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates user dispute appeal.
 */
export function validateDispute(reason: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!reason || reason.trim().length < 15) {
    errors.push("Formal dispute appeal must provide at least 15 characters articulating grounds for dispute.");
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates admin final binding arbitration.
 */
export function validateAdminResolution(
  resolution: string,
  notes: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validResolutions = ["upheld", "overturned", "compromise", "dismissed"];

  if (!validResolutions.includes(resolution)) {
    errors.push(`Admin resolution '${resolution}' is not recognized. Must be one of: ${validResolutions.join(", ")}`);
  }

  if (!notes || notes.trim().length < 15) {
    errors.push("Administrative arbitration ruling requires at least 15 characters of formal council notes.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Returns plain-language description for an incident status.
 */
export function getIncidentStatusDescription(status: IncidentStatus): string {
  switch (status) {
    case "draft":
      return "Auto-drafted by condition engine upon return; awaiting manager physical review before opening.";
    case "open":
      return "Active incident opened. Awaiting borrower's written response and statement.";
    case "under_review":
      return "Borrower response received. Station manager is reviewing evidence to record a finding.";
    case "disputed":
      return "Manager finding contested by borrower. Escalated to Campus Administrator for binding arbitration.";
    case "resolved":
      return "Incident completed and formally resolved with audited notes and findings.";
    case "reported":
      return "Incident reported by community member; pending manager intake.";
    case "escalated":
      return "Incident escalated to safety committee.";
    default:
      return "Incident status pending review.";
  }
}

/**
 * Human-readable plain language explanation for manager decisions.
 */
export function getManagerDecisionLabel(decision: string): { label: string; explanation: string } {
  switch (decision) {
    case "fault_user":
      return {
        label: "User Misuse / Negligence",
        explanation: "Evidence indicates improper handling or disregard for standard operating protocols.",
      };
    case "fault_equipment":
      return {
        label: "Equipment Defect / Failure",
        explanation: "Defect originated from pre-existing tool fatigue, calibration drift, or component wear.",
      };
    case "no_fault_wear_and_tear":
      return {
        label: "Normal Wear & Tear",
        explanation: "Acceptable degradation consistent with reasonable, approved usage patterns. No liability.",
      };
    case "warning_issued":
      return {
        label: "Formal Advisory Warning",
        explanation: "First-time protocol discrepancy. Clear guidance provided without financial penalty.",
      };
    case "cost_share":
      return {
        label: "Mutual Cost-Share",
        explanation: "Shared responsibility between station maintenance fund and user project budget.",
      };
    case "dismissed":
      return {
        label: "Incident Dismissed",
        explanation: "Investigation concluded no actionable breach or damage occurred.",
      };
    default:
      return { label: decision, explanation: "Manager operational finding recorded." };
  }
}

/**
 * Human-readable plain language explanation for admin arbitrations.
 */
export function getAdminResolutionLabel(resolution: string): { label: string; explanation: string } {
  switch (resolution) {
    case "upheld":
      return {
        label: "Manager Finding Upheld",
        explanation: "Campus Council verified station manager finding was consistent with campus policies.",
      };
    case "overturned":
      return {
        label: "Finding Overturned (User Exonerated)",
        explanation: "Council accepted user appeal; borrower cleared of all fault and penalties.",
      };
    case "compromise":
      return {
        label: "Equitable Compromise",
        explanation: "Council determined partial shared responsibility; adjusted terms equitably.",
      };
    case "dismissed":
      return {
        label: "Case Dismissed",
        explanation: "Council dismissed dispute as resolved through mutual stakeholder agreement.",
      };
    default:
      return { label: resolution, explanation: "Campus Governance binding arbitration completed." };
  }
}

