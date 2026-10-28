export type ItemConditionState = "ok" | "minor_issue" | "damaged";

const SEVERITY_MAP: Record<ItemConditionState, number> = {
  ok: 0,
  minor_issue: 1,
  damaged: 2,
};

export interface ChecklistItemRecord {
  item: string;
  state: ItemConditionState;
  notes?: string;
}

export interface ConditionDiffItem {
  item: string;
  initialState: ItemConditionState;
  returnState: ItemConditionState;
  worsened: boolean;
  initialNotes?: string;
  returnNotes?: string;
  explanation: string;
}

export interface IncidentDraftSuggestion {
  type: "damage" | "missing_item" | "misuse" | "late_return";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  worsenedItems: string[];
}

export interface ConditionDiffResult {
  hasWorsened: boolean;
  worsenedItemsCount: number;
  items: ConditionDiffItem[];
  summary: string;
  suggestedIncidentDraft?: IncidentDraftSuggestion;
}

export interface LateReturnCheckResult {
  isLate: boolean;
  minutesLate: number;
  explanation: string;
}

/**
 * Pure business rule: compares check-in vs return condition records item by item.
 * Flags any item that worsened in severity (e.g. OK -> minor_issue or minor_issue -> damaged).
 */
export function computeConditionDiff(
  checkInItems: ChecklistItemRecord[] = [],
  returnItems: ChecklistItemRecord[] = []
): ConditionDiffResult {
  const diffItems: ConditionDiffItem[] = [];
  let worsenedCount = 0;
  const worsenedNames: string[] = [];
  const visitedKeys = new Set<string>();

  // Map check-in items by normalized name
  const checkInMap = new Map<string, ChecklistItemRecord>();
  checkInItems.forEach((item) => {
    checkInMap.set(item.item.trim().toLowerCase(), item);
  });

  returnItems.forEach((ret) => {
    const key = ret.item.trim().toLowerCase();
    visitedKeys.add(key);

    const initial = checkInMap.get(key) || { item: ret.item, state: "ok" as ItemConditionState };

    const initialSeverity = SEVERITY_MAP[initial.state] ?? 0;
    const returnSeverity = SEVERITY_MAP[ret.state] ?? 0;

    const worsened = returnSeverity > initialSeverity;

    if (worsened) {
      worsenedCount++;
      worsenedNames.push(ret.item);
    }

    let explanation = "";
    if (worsened) {
      explanation = `Condition degraded from ${formatState(initial.state)} to ${formatState(ret.state)} during reservation.`;
    } else if (returnSeverity < initialSeverity) {
      explanation = `Condition improved or cleaned (was ${formatState(initial.state)}, now ${formatState(ret.state)}).`;
    } else {
      explanation = `No change: maintained at ${formatState(ret.state)}.`;
    }

    diffItems.push({
      item: ret.item,
      initialState: initial.state,
      returnState: ret.state,
      worsened,
      initialNotes: initial.notes,
      returnNotes: ret.notes,
      explanation,
    });
  });

  // Check for any items present at check-in that are missing in return checklist
  checkInItems.forEach((init) => {
    const key = init.item.trim().toLowerCase();
    if (!visitedKeys.has(key)) {
      worsenedCount++;
      worsenedNames.push(init.item);
      diffItems.push({
        item: init.item,
        initialState: init.state,
        returnState: "damaged",
        worsened: true,
        initialNotes: init.notes,
        returnNotes: "Missing from return inspection checklist",
        explanation: `Item was present during check-in (${formatState(init.state)}) but was omitted or missing during return inspection.`,
      });
    }
  });

  const hasWorsened = worsenedCount > 0;

  let suggestedIncidentDraft: IncidentDraftSuggestion | undefined;

  if (hasWorsened) {
    const hasDamaged = diffItems.some((d) => d.worsened && d.returnState === "damaged");
    const severity = hasDamaged ? (worsenedCount > 1 ? "high" : "medium") : "low";

    suggestedIncidentDraft = {
      type: "damage",
      severity,
      worsenedItems: worsenedNames,
      description: `Automated condition diff detected ${worsenedCount} degraded item(s): ${worsenedNames.join(
        ", "
      )}. Review inspection notes and photos before taking any action.`,
    };
  }

  const summary = hasWorsened
    ? `${worsenedCount} checklist item(s) degraded during use. Auto-drafted incident created for manager review.`
    : "Return inspection passed with no degradation. All checkpoints match or exceed check-in condition.";

  return {
    hasWorsened,
    worsenedItemsCount: worsenedCount,
    items: diffItems,
    summary,
    suggestedIncidentDraft,
  };
}

/**
 * Pure business rule: detects if actual return timestamp passed scheduled booking end.
 */
export function checkLateReturn(
  scheduledEndTime: string | Date,
  actualReturnTime: string | Date
): LateReturnCheckResult {
  const scheduled = typeof scheduledEndTime === "string" ? new Date(scheduledEndTime) : scheduledEndTime;
  const actual = typeof actualReturnTime === "string" ? new Date(actualReturnTime) : actualReturnTime;

  const diffMs = actual.getTime() - scheduled.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes > 15) {
    // 15-minute grace period
    return {
      isLate: true,
      minutesLate: diffMinutes,
      explanation: `Resource returned ${diffMinutes} minutes past scheduled reservation window (exceeded 15-minute grace period).`,
    };
  }

  return {
    isLate: false,
    minutesLate: Math.max(0, diffMinutes),
    explanation: diffMinutes > 0
      ? `Returned within standard 15-minute grace period (+${diffMinutes}m).`
      : "Returned on or before scheduled reservation time.",
  };
}

export function formatState(state: ItemConditionState): string {
  switch (state) {
    case "ok":
      return "OK (Good)";
    case "minor_issue":
      return "Minor Issue / Cosmetic Wear";
    case "damaged":
      return "Damaged / Missing";
    default:
      return state;
  }
}
