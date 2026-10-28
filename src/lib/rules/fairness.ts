/**
 * CampusShare - Fairness Rules Engine & Waitlist Priority Calculator
 * 
 * Pure, unit-tested functions for:
 * 1. Fair use quota evaluation (max active bookings, weekly hours, cooldown)
 * 2. Multi-factor waitlist priority score calculation with full breakdown
 * 3. Offer window determination & queue ranking
 */

export type ResourceCategory = "fabrication" | "labs_spaces" | "electronics" | "media";

export interface FairnessSettings {
  maxActiveBookingsPerUser: number;
  maxHoursPerWeekPerCategory: Record<ResourceCategory, number>;
  cooldownThresholdHours: number;
  cooldownPeriodHours: number;
  offerWindowHours: number;
  managerReviewStrikeThreshold: number;
}

export const DEFAULT_FAIRNESS_SETTINGS: FairnessSettings = {
  maxActiveBookingsPerUser: 3,
  maxHoursPerWeekPerCategory: {
    fabrication: 10.0,
    labs_spaces: 15.0,
    electronics: 12.0,
    media: 10.0,
  },
  cooldownThresholdHours: 4.0,
  cooldownPeriodHours: 24,
  offerWindowHours: 2,
  managerReviewStrikeThreshold: 2,
};

export interface FairnessEvaluationInput {
  userId: string;
  category: ResourceCategory;
  requestedDurationHours: number;
  currentActiveBookingsCount: number;
  hoursUsedThisWeekInCategory: number;
  recentConsecutiveHoursInCategory?: number; // hours completed in last 48h
  hoursSinceLastBookingInCategory?: number | null; // hours since last ended booking
  strikesCount?: number;
  settings?: FairnessSettings;
}

export interface FairnessEvaluationResult {
  isAllowed: boolean;
  isFlaggedWarning: boolean;
  requiresManagerReview: boolean;
  cooldownActive: boolean;
  cooldownRemainingHours: number;
  violations: string[];
  explanation: string;
  fairUseMeter: {
    activeBookings: { current: number; max: number; percentage: number };
    weeklyCategoryHours: {
      category: ResourceCategory;
      current: number;
      requested: number;
      max: number;
      percentage: number;
    };
    cooldownRemainingHours: number;
  };
}

/**
 * Pure function: Evaluates a user's booking request against fairness policies.
 * Enforces max active bookings, weekly category quotas, and anti-monopoly cooldowns.
 */
export function evaluateFairnessPolicy(
  input: FairnessEvaluationInput
): FairnessEvaluationResult {
  const settings = input.settings || DEFAULT_FAIRNESS_SETTINGS;
  const violations: string[] = [];
  let isAllowed = true;
  let isFlaggedWarning = false;
  let cooldownActive = false;
  let cooldownRemainingHours = 0;

  // 1. Max active bookings check (Hard block)
  if (input.currentActiveBookingsCount >= settings.maxActiveBookingsPerUser) {
    isAllowed = false;
    violations.push(
      `Active booking limit reached (${input.currentActiveBookingsCount}/${settings.maxActiveBookingsPerUser}). Please complete or cancel an existing reservation before booking more.`
    );
  }

  // 2. Weekly category quota check
  const categoryQuota =
    settings.maxHoursPerWeekPerCategory[input.category] ?? 10.0;
  const totalWeeklyHoursWithRequest =
    input.hoursUsedThisWeekInCategory + input.requestedDurationHours;

  if (totalWeeklyHoursWithRequest > categoryQuota) {
    isAllowed = false;
    violations.push(
      `Requested duration (${input.requestedDurationHours.toFixed(1)}h) exceeds your weekly ${input.category.replace("_", " ")} quota (${input.hoursUsedThisWeekInCategory.toFixed(1)}h used + ${input.requestedDurationHours.toFixed(1)}h requested > ${categoryQuota.toFixed(1)}h limit).`
    );
  } else if (totalWeeklyHoursWithRequest >= categoryQuota * 0.8) {
    // 80% threshold triggers a non-blocking warning flag
    isFlaggedWarning = true;
  }

  // 3. Consecutive booking cooldown check (Anti-equipment hoarding)
  const recentHours = input.recentConsecutiveHoursInCategory || 0;
  const hoursSinceLast = input.hoursSinceLastBookingInCategory;

  if (recentHours >= settings.cooldownThresholdHours) {
    if (hoursSinceLast !== null && hoursSinceLast !== undefined && hoursSinceLast < settings.cooldownPeriodHours) {
      cooldownActive = true;
      cooldownRemainingHours = Math.max(0, Math.ceil(settings.cooldownPeriodHours - hoursSinceLast));
      isAllowed = false;
      violations.push(
        `Anti-monopoly cooling-off active: You completed ${recentHours.toFixed(1)} hours of consecutive reservations on this equipment. A mandatory ${cooldownRemainingHours}h break remains before new bookings are permitted.`
      );
    }
  }

  // 4. Manager review strike check (Does NOT auto-ban, but flags for manager audit)
  const strikes = input.strikesCount || 0;
  const requiresManagerReview = strikes >= settings.managerReviewStrikeThreshold;

  // 5. Build human-readable summary explanation
  let explanation = "Fairness check passed. Your account is within active quota limits.";
  if (!isAllowed) {
    explanation = violations.join(" ");
  } else if (isFlaggedWarning) {
    explanation = `Approved with notice: You have utilized ${(
      (totalWeeklyHoursWithRequest / categoryQuota) *
      100
    ).toFixed(0)}% of your weekly ${input.category.replace("_", " ")} quota.`;
  }

  // 6. Compute visual Fair Use Meter percentages
  const activePct = Math.min(
    100,
    Math.round((input.currentActiveBookingsCount / settings.maxActiveBookingsPerUser) * 100)
  );
  const weeklyPct = Math.min(
    100,
    Math.round((totalWeeklyHoursWithRequest / categoryQuota) * 100)
  );

  return {
    isAllowed,
    isFlaggedWarning,
    requiresManagerReview,
    cooldownActive,
    cooldownRemainingHours,
    violations,
    explanation,
    fairUseMeter: {
      activeBookings: {
        current: input.currentActiveBookingsCount,
        max: settings.maxActiveBookingsPerUser,
        percentage: activePct,
      },
      weeklyCategoryHours: {
        category: input.category,
        current: input.hoursUsedThisWeekInCategory,
        requested: input.requestedDurationHours,
        max: categoryQuota,
        percentage: weeklyPct,
      },
      cooldownRemainingHours,
    },
  };
}

export interface WaitlistPriorityInput {
  waitingDays: number;
  hoursUsedLast30Days: number;
  deadlineDaysRemaining?: number | null;
  isDeadlineVerified?: boolean;
  strikesCount?: number;
}

export interface WaitlistFactorBreakdown {
  usageScore: number;
  maxUsageScore: number;
  hoursUsedLast30Days: number;
  waitScore: number;
  maxWaitScore: number;
  daysWaiting: number;
  urgencyScore: number;
  maxUrgencyScore: number;
  deadlineDaysRemaining?: number | null;
  isDeadlineVerified: boolean;
  cleanRecordBonus: number;
  maxCleanRecordBonus: number;
  strikePenalties: number;
  strikesCount: number;
  totalScore: number;
  rankSummary: string;
}

/**
 * Pure function: Computes the comprehensive multi-factor waitlist priority score (0 to 100).
 * Weighted formula:
 *   UsageScore (0-40): Less use = Higher priority
 *   WaitScore (0-25): Longer wait = Higher priority
 *   UrgencyScore (0-25): Closer project deadline (verified by faculty/owner) = Higher priority
 *   CleanRecordBonus (0-10): 0 strikes bonus
 *   StrikePenalties: -15 pts per late return / -25 pts per no-show
 */
export function calculateWaitlistPriority(
  input: WaitlistPriorityInput
): { priorityScore: number; breakdown: WaitlistFactorBreakdown } {
  const maxUsage = 40;
  const maxWait = 25;
  const maxUrgency = 25;
  const maxClean = 10;

  // 1. Past 30-Day Usage Factor (0 to 40 pts)
  // Each hour used subtracts 2 points from the 40 point baseline
  const usageScore = Math.max(0, Math.min(maxUsage, Math.round(maxUsage - input.hoursUsedLast30Days * 2)));

  // 2. Waiting Time Factor (0 to 25 pts)
  // Each 24 hours (1 day) waiting accrues 5 points, capped at 25 points
  const waitScore = Math.max(0, Math.min(maxWait, Math.round(input.waitingDays * 5)));

  // 3. Project Deadline Urgency Factor (0 to 25 pts)
  let rawUrgency = 0;
  if (input.deadlineDaysRemaining !== null && input.deadlineDaysRemaining !== undefined) {
    if (input.deadlineDaysRemaining <= 3) {
      rawUrgency = 25;
    } else if (input.deadlineDaysRemaining <= 7) {
      rawUrgency = 18;
    } else if (input.deadlineDaysRemaining <= 14) {
      rawUrgency = 10;
    } else {
      rawUrgency = 0;
    }
  }

  // If deadline is unverified, apply a 50% discount to incentivize verified academic deadlines
  const urgencyScore = input.isDeadlineVerified
    ? rawUrgency
    : Math.round(rawUrgency * 0.5);

  // 4. Clean Record Bonus (0 or 10 pts)
  const strikes = input.strikesCount || 0;
  const cleanRecordBonus = strikes === 0 ? maxClean : 0;

  // 5. Strike Penalties (deductions)
  const strikePenalties = strikes * 15;

  // Total Priority Score (Normalized between 0 and 100)
  const rawTotal = usageScore + waitScore + urgencyScore + cleanRecordBonus - strikePenalties;
  const totalScore = Math.max(0, Math.min(100, Math.round(rawTotal)));

  // Human-readable factor summary
  const summaryParts: string[] = [];
  summaryParts.push(
    `Fair Share: ${usageScore}/${maxUsage} pts (${input.hoursUsedLast30Days.toFixed(1)}h in last 30d)`
  );
  summaryParts.push(`Wait Duration: ${waitScore}/${maxWait} pts (${input.waitingDays.toFixed(1)}d queue)`);
  if (input.deadlineDaysRemaining !== null && input.deadlineDaysRemaining !== undefined) {
    summaryParts.push(
      `Deadline Urgency: ${urgencyScore}/${maxUrgency} pts (${input.deadlineDaysRemaining}d remaining${
        input.isDeadlineVerified ? ", verified" : ", unverified"
      })`
    );
  }
  if (cleanRecordBonus > 0) {
    summaryParts.push(`Reliability: +${cleanRecordBonus} pts clean record`);
  }
  if (strikePenalties > 0) {
    summaryParts.push(`Penalty: -${strikePenalties} pts (${strikes} incident strikes)`);
  }

  return {
    priorityScore: totalScore,
    breakdown: {
      usageScore,
      maxUsageScore: maxUsage,
      hoursUsedLast30Days: input.hoursUsedLast30Days,
      waitScore,
      maxWaitScore: maxWait,
      daysWaiting: input.waitingDays,
      urgencyScore,
      maxUrgencyScore: maxUrgency,
      deadlineDaysRemaining: input.deadlineDaysRemaining,
      isDeadlineVerified: Boolean(input.isDeadlineVerified),
      cleanRecordBonus,
      maxCleanRecordBonus: maxClean,
      strikePenalties,
      strikesCount: strikes,
      totalScore,
      rankSummary: summaryParts.join(" | "),
    },
  };
}

export interface CandidateWaitlistEntry {
  id: string;
  user_id: string;
  resource_id: string;
  requested_start?: string;
  requested_end?: string;
  priority_score: number;
  status: "waiting" | "offered" | "expired" | "fulfilled" | "cancelled";
  created_at: string;
  breakdown?: WaitlistFactorBreakdown;
}

/**
 * Pure function: Sorts waitlist candidates by priority score descending.
 * In case of tie, earlier created_at takes precedence.
 */
export function rankWaitlistCandidates<T extends CandidateWaitlistEntry>(
  entries: T[]
): T[] {
  return [...entries].sort((a, b) => {
    if (b.priority_score !== a.priority_score) {
      return b.priority_score - a.priority_score;
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

/**
 * Pure function: Determines the next eligible candidate to receive a slot offer.
 */
export function selectTopWaitlistOffer<T extends CandidateWaitlistEntry>(
  rankedEntries: T[]
): T | null {
  const eligible = rankedEntries.filter((e) => e.status === "waiting");
  return eligible.length > 0 ? eligible[0] : null;
}

// -------------------------------------------------------------
// Legacy Stage 1 compatibility function
// -------------------------------------------------------------
export interface FairnessInput {
  userReputationScore: number;
  recentUsageHoursLast14Days: number;
  unresolvedIncidentsCount: number;
  isHighDemandResource: boolean;
  isFirstTimeUser: boolean;
}

export interface FairnessScoreResult {
  score: number;
  breakdown: {
    baseScore: number;
    usageDeduction: number;
    incidentPenalty: number;
    newcomerBoost: number;
    highDemandWeight: number;
  };
  explanation: string;
}

export function calculateFairnessScore(input: FairnessInput): FairnessScoreResult {
  let score = 5.0;
  const repNormalized = Math.max(0, Math.min(100, input.userReputationScore));
  const repAdjustment = ((repNormalized - 75) / 25) * 1.5;
  score += repAdjustment;
  const usageDeduction = Math.min(3.5, input.recentUsageHoursLast14Days * 0.3);
  score -= usageDeduction;
  const incidentPenalty = input.unresolvedIncidentsCount * 2.0;
  score -= incidentPenalty;
  const newcomerBoost = input.isFirstTimeUser ? 1.5 : 0.0;
  score += newcomerBoost;
  const highDemandWeight = input.isHighDemandResource ? 1.2 : 1.0;
  score = score * highDemandWeight;
  const finalScore = Math.round(Math.max(0.1, Math.min(10.0, score)) * 100) / 100;

  return {
    score: finalScore,
    breakdown: {
      baseScore: 5.0,
      usageDeduction,
      incidentPenalty,
      newcomerBoost,
      highDemandWeight,
    },
    explanation: "Standard fair allocation score",
  };
}
