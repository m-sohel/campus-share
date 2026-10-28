import { computeConditionDiff, checkLateReturn, ChecklistItemRecord } from "../src/lib/rules/condition";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

console.log("\n🧪 RUNNING CONDITION ENGINE & DIFF UNIT TESTS...\n");

// Test 1: All items unchanged (OK -> OK)
const baselineCheckIn: ChecklistItemRecord[] = [
  { item: "Lens clean and free of dust", state: "ok", notes: "Spotless" },
  { item: "Battery health normal", state: "ok" },
  { item: "Sensor cap attached", state: "ok" },
];

const passReturn: ChecklistItemRecord[] = [
  { item: "Lens clean and free of dust", state: "ok" },
  { item: "Battery health normal", state: "ok" },
  { item: "Sensor cap attached", state: "ok" },
];

const diffPass = computeConditionDiff(baselineCheckIn, passReturn);
assert(!diffPass.hasWorsened, "Clean return has hasWorsened=false");
assert(diffPass.worsenedItemsCount === 0, "Clean return has 0 worsened items");
assert(diffPass.suggestedIncidentDraft === undefined, "Clean return does not suggest incident");

// Test 2: Exactly 1 item degraded (OK -> minor_issue)
const minorReturn: ChecklistItemRecord[] = [
  { item: "Lens clean and free of dust", state: "minor_issue", notes: "Slight smudge on outer edge" },
  { item: "Battery health normal", state: "ok" },
  { item: "Sensor cap attached", state: "ok" },
];

const diffMinor = computeConditionDiff(baselineCheckIn, minorReturn);
assert(diffMinor.hasWorsened, "Minor degradation sets hasWorsened=true");
assert(diffMinor.worsenedItemsCount === 1, "Exactly 1 item degraded");
assert(diffMinor.items[0].worsened, "First item flagged as worsened");
assert(diffMinor.suggestedIncidentDraft !== undefined, "Incident draft is suggested");
assert(diffMinor.suggestedIncidentDraft?.severity === "low", "Minor degradation suggests 'low' severity");

// Test 3: Damaged item degradation (OK -> damaged)
const damagedReturn: ChecklistItemRecord[] = [
  { item: "Lens clean and free of dust", state: "damaged", notes: "Deep scratch across front element" },
  { item: "Battery health normal", state: "ok" },
  { item: "Sensor cap attached", state: "ok" },
];

const diffDamaged = computeConditionDiff(baselineCheckIn, damagedReturn);
assert(diffDamaged.hasWorsened, "Damaged item sets hasWorsened=true");
assert(diffDamaged.worsenedItemsCount === 1, "Exactly 1 item damaged");
assert(diffDamaged.suggestedIncidentDraft?.severity === "medium", "Single damaged item suggests 'medium' severity");

// Test 4: Multiple damaged items -> high severity
const multiDamagedReturn: ChecklistItemRecord[] = [
  { item: "Lens clean and free of dust", state: "damaged" },
  { item: "Battery health normal", state: "damaged" },
  { item: "Sensor cap attached", state: "ok" },
];

const diffMulti = computeConditionDiff(baselineCheckIn, multiDamagedReturn);
assert(diffMulti.worsenedItemsCount === 2, "2 items degraded");
assert(diffMulti.suggestedIncidentDraft?.severity === "high", "Multiple damaged items suggest 'high' severity");

// Test 5: Missing item detection (item in checkIn but omitted in return)
const missingReturn: ChecklistItemRecord[] = [
  { item: "Lens clean and free of dust", state: "ok" },
  { item: "Battery health normal", state: "ok" },
];

const diffMissing = computeConditionDiff(baselineCheckIn, missingReturn);
assert(diffMissing.hasWorsened, "Missing item triggers hasWorsened=true");
assert(diffMissing.items.some((i) => i.item === "Sensor cap attached" && i.worsened), "Omitted sensor cap flagged as worsened");

// Test 6: Late return detection
const scheduledEnd = new Date("2026-10-28T14:00:00Z");

// 6a: On-time return
const onTimeActual = new Date("2026-10-28T13:55:00Z");
const onTimeResult = checkLateReturn(scheduledEnd, onTimeActual);
assert(!onTimeResult.isLate, "On-time return is not late");

// 6b: Returned within 15-minute grace period
const graceActual = new Date("2026-10-28T14:10:00Z"); // +10m
const graceResult = checkLateReturn(scheduledEnd, graceActual);
assert(!graceResult.isLate, "Return within 15m grace is not flagged as late");
assert(graceResult.minutesLate === 10, "Records 10 minutes late accurately");

// 6c: Returned past grace period (Late!)
const lateActual = new Date("2026-10-28T14:45:00Z"); // +45m
const lateResult = checkLateReturn(scheduledEnd, lateActual);
assert(lateResult.isLate, "Return 45m late is flagged as late");
assert(lateResult.minutesLate === 45, "Records 45 minutes late");

console.log("\n🎉 ALL CONDITION & RETURN PURE RULE TESTS PASSED!\n");
