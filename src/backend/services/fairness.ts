import { getSupabaseAdminClient } from "../client";
import {
  evaluateFairnessPolicy,
  FairnessSettings,
  DEFAULT_FAIRNESS_SETTINGS,
  FairnessEvaluationResult,
  ResourceCategory,
} from "@/lib/rules/fairness";

let inMemorySettings: FairnessSettings = { ...DEFAULT_FAIRNESS_SETTINGS };

/**
 * Returns active fairness policy configuration settings.
 */
export async function getFairnessSettings(): Promise<FairnessSettings> {
  const supabase = getSupabaseAdminClient();
  try {
    const { data } = await supabase
      .from("fairness_settings")
      .select("*")
      .limit(1)
      .single();

    if (data) {
      return {
        maxActiveBookingsPerUser: data.max_active_bookings_per_user,
        maxHoursPerWeekPerCategory: {
          fabrication: Number(data.max_hours_per_week_fabrication) || 10.0,
          labs_spaces: Number(data.max_hours_per_week_labs) || 15.0,
          electronics: Number(data.max_hours_per_week_electronics) || 12.0,
          media: Number(data.max_hours_per_week_media) || 10.0,
        },
        cooldownThresholdHours: Number(data.cooldown_threshold_hours) || 4.0,
        cooldownPeriodHours: data.cooldown_period_hours || 24,
        offerWindowHours: data.offer_window_hours || 2,
        managerReviewStrikeThreshold: 2,
      };
    }
  } catch {
    // Fallback to in-memory/default settings if table not available
  }
  return inMemorySettings;
}

/**
 * Updates fairness settings (Admin restricted).
 */
export async function updateFairnessSettings(
  newSettings: Partial<FairnessSettings>,
  updatedBy?: string
): Promise<FairnessSettings> {
  const merged: FairnessSettings = {
    ...inMemorySettings,
    ...newSettings,
    maxHoursPerWeekPerCategory: {
      ...inMemorySettings.maxHoursPerWeekPerCategory,
      ...(newSettings.maxHoursPerWeekPerCategory || {}),
    },
  };
  inMemorySettings = merged;

  const supabase = getSupabaseAdminClient();
  try {
    await supabase.from("fairness_settings").upsert({
      id: "70000000-0000-0000-0000-000000000001",
      max_active_bookings_per_user: merged.maxActiveBookingsPerUser,
      max_hours_per_week_fabrication: merged.maxHoursPerWeekPerCategory.fabrication,
      max_hours_per_week_labs: merged.maxHoursPerWeekPerCategory.labs_spaces,
      max_hours_per_week_electronics: merged.maxHoursPerWeekPerCategory.electronics,
      max_hours_per_week_media: merged.maxHoursPerWeekPerCategory.media,
      cooldown_threshold_hours: merged.cooldownThresholdHours,
      cooldown_period_hours: merged.cooldownPeriodHours,
      offer_window_hours: merged.offerWindowHours,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy || null,
    });
  } catch {
    // Persisted in memory
  }

  return merged;
}

/**
 * Computes real-time fairness statistics and fair-use meter for a user.
 */
export async function getUserFairUseStats(
  userId: string,
  category: ResourceCategory = "fabrication",
  requestedHours: number = 0
): Promise<FairnessEvaluationResult> {
  const supabase = getSupabaseAdminClient();
  const settings = await getFairnessSettings();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 3600 * 1000).toISOString();

  // 1. Fetch active bookings (for max active count)
  const { data: activeBookings } = await supabase
    .from("bookings")
    .select("id, resource_id, start_time, end_time, status")
    .eq("user_id", userId)
    .in("status", ["pending_review", "approved", "confirmed", "checked_in"]);

  const currentActiveCount = activeBookings?.length || 0;

  // 2. Fetch past 7 days bookings to calculate category hours
  const { data: pastWeekBookings } = await supabase
    .from("bookings")
    .select("id, resource_id, start_time, end_time, status, resources(category)")
    .eq("user_id", userId)
    .in("status", ["approved", "confirmed", "checked_in", "completed"])
    .gte("end_time", sevenDaysAgo);

  let hoursUsedThisWeek = 0;
  pastWeekBookings?.forEach((b: any) => {
    const resCat = b.resources?.category;
    if (resCat === category) {
      const dur =
        (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) /
        3600000;
      hoursUsedThisWeek += dur;
    }
  });

  // 3. Consecutive recent bookings check (last 48 hours)
  const { data: recentBookings } = await supabase
    .from("bookings")
    .select("id, start_time, end_time, status, resources(category)")
    .eq("user_id", userId)
    .in("status", ["approved", "confirmed", "checked_in", "completed"])
    .gte("end_time", fortyEightHoursAgo)
    .order("end_time", { ascending: false });

  let recentHours = 0;
  let hoursSinceLast: number | null = null;

  if (recentBookings && recentBookings.length > 0) {
    const latestEnded = new Date(recentBookings[0].end_time);
    hoursSinceLast = Math.max(0, (now.getTime() - latestEnded.getTime()) / 3600000);

    recentBookings.forEach((b: any) => {
      if (b.resources?.category === category) {
        const dur =
          (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) /
          3600000;
        recentHours += dur;
      }
    });
  }

  // 4. Fetch incident strikes for user
  const { data: incidents } = await supabase
    .from("incidents")
    .select("id, type")
    .eq("reporter_id", userId) // or incidents attributed to user
    .in("type", ["late_return", "conflict"]);

  const strikesCount = incidents?.length || 0;

  return evaluateFairnessPolicy({
    userId,
    category,
    requestedDurationHours: requestedHours,
    currentActiveBookingsCount: currentActiveCount,
    hoursUsedThisWeekInCategory: hoursUsedThisWeek,
    recentConsecutiveHoursInCategory: recentHours,
    hoursSinceLastBookingInCategory: hoursSinceLast,
    strikesCount,
    settings,
  });
}
