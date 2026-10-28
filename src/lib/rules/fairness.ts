export interface FairnessInput {
  userReputationScore: number; // 0-100, default 100
  recentUsageHoursLast14Days: number;
  unresolvedIncidentsCount: number;
  isHighDemandResource: boolean;
  isFirstTimeUser: boolean;
}

export interface FairnessScoreResult {
  score: number; // Scaled 0.0 to 10.0 (higher = higher queue priority)
  breakdown: {
    baseScore: number;
    usageDeduction: number;
    incidentPenalty: number;
    newcomerBoost: number;
    highDemandWeight: number;
  };
  explanation: string;
}

/**
 * Pure business rule: computes fairness score for queue and review priority.
 * Every modifier is explained in plain language.
 */
export function calculateFairnessScore(input: FairnessInput): FairnessScoreResult {
  let score = 5.0; // neutral base

  // 1. Reputation component (0 to +2.5)
  const repNormalized = Math.max(0, Math.min(100, input.userReputationScore));
  const repAdjustment = ((repNormalized - 75) / 25) * 1.5;
  score += repAdjustment;

  // 2. Recent usage anti-monopoly deduction
  // Deduct 0.3 points per hour used in last 14 days
  const usageDeduction = Math.min(3.5, input.recentUsageHoursLast14Days * 0.3);
  score -= usageDeduction;

  // 3. Incident penalties
  const incidentPenalty = input.unresolvedIncidentsCount * 2.0;
  score -= incidentPenalty;

  // 4. Newcomer equity boost
  const newcomerBoost = input.isFirstTimeUser ? 1.5 : 0.0;
  score += newcomerBoost;

  // 5. High-demand amplification
  const highDemandWeight = input.isHighDemandResource ? 1.2 : 1.0;
  score = score * highDemandWeight;

  // Bound score between 0.1 and 10.0
  const finalScore = Math.round(Math.max(0.1, Math.min(10.0, score)) * 100) / 100;

  const reasons: string[] = [];
  if (input.userReputationScore >= 90) {
    reasons.push("High trust record (+bonus)");
  }
  if (input.recentUsageHoursLast14Days > 10) {
    reasons.push(`${input.recentUsageHoursLast14Days}hrs recently used (-monopoly control)`);
  } else if (input.recentUsageHoursLast14Days === 0) {
    reasons.push("No recent usage (+priority)");
  }
  if (input.isFirstTimeUser) {
    reasons.push("First-time user fairness boost (+1.5)");
  }
  if (input.unresolvedIncidentsCount > 0) {
    reasons.push(`${input.unresolvedIncidentsCount} active incident(s) (-penalty)`);
  }
  if (input.isHighDemandResource) {
    reasons.push("High-demand resource allocation formula applied");
  }

  return {
    score: finalScore,
    breakdown: {
      baseScore: 5.0,
      usageDeduction,
      incidentPenalty,
      newcomerBoost,
      highDemandWeight,
    },
    explanation: reasons.length > 0 ? reasons.join(", ") : "Standard fair allocation score",
  };
}
