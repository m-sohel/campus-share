import { Credential, ResourceRequirement } from "@/types";

export interface EligibilityRequirementCheck {
  requirement: ResourceRequirement;
  met: boolean;
  status: "verified" | "expired" | "missing" | "revoked" | "pending";
  reason: string;
}

export interface EligibilityResult {
  isEligible: boolean;
  summary: string;
  checks: EligibilityRequirementCheck[];
  unmetMandatoryCount: number;
}

/**
 * Pure business rule: evaluates if a user's credentials satisfy resource requirements.
 * Every check produces a plain-language explanation of WHY.
 */
export function checkEligibility(
  requirements: ResourceRequirement[],
  userCredentials: Credential[]
): EligibilityResult {
  if (requirements.length === 0) {
    return {
      isEligible: true,
      summary: "This resource has no special certification or training requirements.",
      checks: [],
      unmetMandatoryCount: 0,
    };
  }

  const now = new Date();
  const checks: EligibilityRequirementCheck[] = [];
  let unmetMandatory = 0;

  for (const req of requirements) {
    // Find matching credential
    const matched = userCredentials.find(
      (c) => c.credential_type.toLowerCase() === req.credential_type.toLowerCase()
    );

    if (!matched) {
      if (req.is_mandatory) unmetMandatory++;
      checks.push({
        requirement: req,
        met: false,
        status: "missing",
        reason: `Missing mandatory credential: "${req.credential_type}". ${req.explanation}`,
      });
      continue;
    }

    if (matched.status === "revoked") {
      if (req.is_mandatory) unmetMandatory++;
      checks.push({
        requirement: req,
        met: false,
        status: "revoked",
        reason: `Your credential "${matched.title}" has been revoked by administration.`,
      });
      continue;
    }

    if (matched.status === "pending") {
      if (req.is_mandatory) unmetMandatory++;
      checks.push({
        requirement: req,
        met: false,
        status: "pending",
        reason: `Credential "${matched.title}" is pending staff verification.`,
      });
      continue;
    }

    if (matched.expires_at && new Date(matched.expires_at) < now) {
      if (req.is_mandatory) unmetMandatory++;
      checks.push({
        requirement: req,
        met: false,
        status: "expired",
        reason: `Credential "${matched.title}" expired on ${new Date(
          matched.expires_at
        ).toLocaleDateString()}. Please recertify.`,
      });
      continue;
    }

    // Verified and valid
    checks.push({
      requirement: req,
      met: true,
      status: "verified",
      reason: `Verified: "${matched.title}" is active and in good standing.`,
    });
  }

  const isEligible = unmetMandatory === 0;

  return {
    isEligible,
    summary: isEligible
      ? "All safety and certification requirements are satisfied."
      : `Cannot request access: ${unmetMandatory} required qualification(s) missing or expired.`,
    checks,
    unmetMandatoryCount: unmetMandatory,
  };
}
