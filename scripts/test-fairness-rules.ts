import {
  evaluateFairnessPolicy,
  calculateWaitlistPriority,
  rankWaitlistCandidates,
  selectTopWaitlistOffer,
  DEFAULT_FAIRNESS_SETTINGS,
} from "../src/lib/rules/fairness";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log("=== RUNNING PURE FAIRNESS & WAITLIST RULES UNIT TESTS ===\n");

// 1. Max active bookings test
const blockActive = evaluateFairnessPolicy({
  userId: "user-1",
  category: "fabrication",
  requestedDurationHours: 2,
  currentActiveBookingsCount: 3,
  hoursUsedThisWeekInCategory: 2,
});
assert(!blockActive.isAllowed, "Max active bookings (3/3) blocks new request");
assert(blockActive.violations[0].includes("Active booking limit reached"), "Explanation mentions active booking limit");

// 2. Weekly quota test
const blockQuota = evaluateFairnessPolicy({
  userId: "user-1",
  category: "fabrication",
  requestedDurationHours: 4,
  currentActiveBookingsCount: 1,
  hoursUsedThisWeekInCategory: 8, // 8 + 4 = 12 > 10
});
assert(!blockQuota.isAllowed, "Exceeding weekly category quota blocks request");
assert(blockQuota.violations[0].includes("exceeds your weekly fabrication quota"), "Explanation mentions weekly quota");

// 3. 80% Quota warning flag
const warnQuota = evaluateFairnessPolicy({
  userId: "user-1",
  category: "fabrication",
  requestedDurationHours: 2,
  currentActiveBookingsCount: 1,
  hoursUsedThisWeekInCategory: 6.5, // 8.5 / 10 = 85%
});
assert(warnQuota.isAllowed, "85% quota usage is allowed");
assert(warnQuota.isFlaggedWarning, "85% quota usage flags a warning");

// 4. Consecutive long booking cooldown
const blockCooldown = evaluateFairnessPolicy({
  userId: "user-1",
  category: "fabrication",
  requestedDurationHours: 2,
  currentActiveBookingsCount: 0,
  hoursUsedThisWeekInCategory: 4,
  recentConsecutiveHoursInCategory: 4.5, // >= 4.0 threshold
  hoursSinceLastBookingInCategory: 6, // < 24h cooldown
});
assert(!blockCooldown.isAllowed, "Recent 4.5h session triggers anti-monopoly cooldown");
assert(blockCooldown.cooldownActive, "Cooldown is marked active");
assert(blockCooldown.cooldownRemainingHours === 18, "Cooldown remaining is 18 hours (24 - 6)");

// 5. Manager review on strikes
const strikeCheck = evaluateFairnessPolicy({
  userId: "user-bad",
  category: "electronics",
  requestedDurationHours: 1,
  currentActiveBookingsCount: 0,
  hoursUsedThisWeekInCategory: 0,
  strikesCount: 2,
});
assert(strikeCheck.requiresManagerReview, "2 strikes triggers manager review requirement");

// 6. Waitlist priority: Light user vs Heavy user
const lightUser = calculateWaitlistPriority({
  waitingDays: 3,
  hoursUsedLast30Days: 2.0,
  deadlineDaysRemaining: 5,
  isDeadlineVerified: true,
  strikesCount: 0,
});

const heavyUser = calculateWaitlistPriority({
  waitingDays: 3,
  hoursUsedLast30Days: 24.0,
  deadlineDaysRemaining: 5,
  isDeadlineVerified: true,
  strikesCount: 1,
});

console.log("\n--- Priority Scores ---");
console.log(`Light User: ${lightUser.priorityScore} pts (Breakdown: ${lightUser.breakdown.rankSummary})`);
console.log(`Heavy User: ${heavyUser.priorityScore} pts (Breakdown: ${heavyUser.breakdown.rankSummary})`);

assert(lightUser.priorityScore > heavyUser.priorityScore, "Light user priority score > Heavy user priority score");
assert(lightUser.breakdown.usageScore === 36, "Light user receives 36/40 usage score (40 - 2*2)");
assert(heavyUser.breakdown.usageScore === 0, "Heavy user receives 0/40 usage score (40 - 2*24)");
assert(lightUser.breakdown.cleanRecordBonus === 10, "Light user gets 10 pts clean record bonus");
assert(heavyUser.breakdown.strikePenalties === 15, "Heavy user receives 15 pts strike penalty");

// 7. Queue Ranking & Offer Selection
const candidates = [
  {
    id: "entry-heavy",
    user_id: "user-heavy",
    resource_id: "res-laser",
    priority_score: heavyUser.priorityScore,
    status: "waiting" as const,
    created_at: "2026-10-25T10:00:00Z",
  },
  {
    id: "entry-light",
    user_id: "user-light",
    resource_id: "res-laser",
    priority_score: lightUser.priorityScore,
    status: "waiting" as const,
    created_at: "2026-10-25T10:00:00Z",
  },
];

const ranked = rankWaitlistCandidates(candidates);
assert(ranked[0].id === "entry-light", "Light user is ranked #1 in queue");
assert(ranked[1].id === "entry-heavy", "Heavy user is ranked #2 in queue");

const topOffer = selectTopWaitlistOffer(ranked);
assert(topOffer?.id === "entry-light", "Top offer candidate is Light user");

console.log("\n✨ ALL PURE FAIRNESS & WAITLIST RULES UNIT TESTS PASSED PERFECTION!\n");
