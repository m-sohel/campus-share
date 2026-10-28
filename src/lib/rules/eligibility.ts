import { Credential, ResourceRequirement } from "@/types";

export type RequirementCheckStatus = "pass" | "fail" | "expired" | "pending-verification";

export interface FixAction {
  label: string;
  credential_type: string;
  actionUrl: string;
  description: string;
}

export interface EligibilityRequirementCheck {
  requirement: ResourceRequirement;
  met: boolean;
  status: RequirementCheckStatus;
  reason: string;
  fixAction?: FixAction;
}

export interface EligibilityResult {
  isEligible: boolean;
  summary: string;
  checks: EligibilityRequirementCheck[];
  unmetMandatoryCount: number;
}

/**
 * Pure business rule: evaluates if a user's credentials satisfy resource requirements.
 * Returns per-requirement status (pass / fail / expired / pending-verification),
 * plain-language reasons, and actionable "how to fix" steps.
 */
export function checkEligibility(
  requirements: ResourceRequirement[] = [],
  userCredentials: Credential[] = []
): EligibilityResult {
  if (requirements.length === 0) {
    return {
      isEligible: true,
      summary: "This resource has no special certification or safety prerequisites.",
      checks: [],
      unmetMandatoryCount: 0,
    };
  }

  const now = new Date();
  const checks: EligibilityRequirementCheck[] = [];
  let unmetMandatory = 0;

  for (const req of requirements) {
    // Find matching credential by credential_type (case-insensitive)
    const matched = userCredentials.find(
      (c) => c.credential_type.toLowerCase() === req.credential_type.toLowerCase()
    );

    // 1. Missing
    if (!matched) {
      if (req.is_mandatory) unmetMandatory++;
      checks.push({
        requirement: req,
        met: false,
        status: "fail",
        reason: `${formatCredentialName(req.credential_type)}: missing. ${req.explanation}`,
        fixAction: {
          label: `Request ${formatCredentialName(req.credential_type)} Training`,
          credential_type: req.credential_type,
          actionUrl: `/credentials/request?type=${encodeURIComponent(req.credential_type)}`,
          description: "Submit a request to attend the safety workshop or upload third-party certification.",
        },
      });
      continue;
    }

    // 2. Revoked
    if (matched.status === "revoked") {
      if (req.is_mandatory) unmetMandatory++;
      checks.push({
        requirement: req,
        met: false,
        status: "fail",
        reason: `Credential "${matched.title}" has been revoked by institutional safety review.${
          matched.verification_notes ? ` Reason: ${matched.verification_notes}` : ""
        }`,
        fixAction: {
          label: "Contact Campus Safety Council",
          credential_type: req.credential_type,
          actionUrl: `/credentials/request?type=${encodeURIComponent(req.credential_type)}&appeal=true`,
          description: "Submit an appeal or request reinstatement after safety refresher.",
        },
      });
      continue;
    }

    // 3. Pending
    if (matched.status === "pending") {
      if (req.is_mandatory) unmetMandatory++;
      checks.push({
        requirement: req,
        met: false,
        status: "pending-verification",
        reason: `Credential "${matched.title}" was submitted and is currently in the staff verification queue.`,
        fixAction: {
          label: "Awaiting Staff Sign-off",
          credential_type: req.credential_type,
          actionUrl: "/dashboard/user",
          description: "Staff typically verify equipment credentials within 24 hours.",
        },
      });
      continue;
    }

    // 4. Expired
    if (matched.expires_at && new Date(matched.expires_at) < now) {
      if (req.is_mandatory) unmetMandatory++;
      const expiryDate = new Date(matched.expires_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      checks.push({
        requirement: req,
        met: false,
        status: "expired",
        reason: `Credential "${matched.title}" expired on ${expiryDate}. Annual safety renewal required.`,
        fixAction: {
          label: "Request Recertification",
          credential_type: req.credential_type,
          actionUrl: `/credentials/request?type=${encodeURIComponent(req.credential_type)}&renewal=true`,
          description: "Complete the annual safety renewal quiz or submit updated documentation.",
        },
      });
      continue;
    }

    // 5. Pass / Verified
    checks.push({
      requirement: req,
      met: true,
      status: "pass",
      reason: `Verified: "${matched.title}" is active and in good standing.`,
    });
  }

  const isEligible = unmetMandatory === 0;

  return {
    isEligible,
    summary: isEligible
      ? "All mandatory safety qualifications are satisfied. You are eligible to book."
      : `Cannot request access: ${unmetMandatory} required qualification(s) missing, expired, or pending.`,
    checks,
    unmetMandatoryCount: unmetMandatory,
  };
}

function formatCredentialName(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
