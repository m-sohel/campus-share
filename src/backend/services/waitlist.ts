import { getSupabaseAdminClient } from "../client";
import {
  calculateWaitlistPriority,
  rankWaitlistCandidates,
  selectTopWaitlistOffer,
  WaitlistFactorBreakdown,
  CandidateWaitlistEntry,
} from "@/lib/rules/fairness";
import { logAuditEvent } from "./audit";
import { createNotification } from "./notifications";
import { Booking, Profile, Resource } from "@/types";

export interface JoinWaitlistInput {
  userId: string;
  resourceId: string;
  requestedStart: string;
  requestedEnd: string;
  deadlineDate?: string | null;
  isDeadlineVerified?: boolean;
  notes?: string;
}

export interface EnrichedWaitlistEntry extends CandidateWaitlistEntry {
  borrower: Profile;
  resource?: Resource;
  breakdown: WaitlistFactorBreakdown;
  rank: number;
  offerExpiresAt?: string | null;
}

/**
 * Calculates a user's past 30 days total equipment usage in hours.
 */
async function getUserUsageHoursLast30Days(userId: string): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("start_time, end_time, status")
    .eq("user_id", userId)
    .in("status", ["approved", "confirmed", "checked_in", "completed"])
    .gte("end_time", thirtyDaysAgo);

  let totalHours = 0;
  bookings?.forEach((b) => {
    const dur =
      (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) /
      3600000;
    totalHours += Math.max(0, dur);
  });

  return totalHours;
}

/**
 * Adds a user to the resource waitlist with transparent priority score computation.
 */
export async function joinWaitlist(input: JoinWaitlistInput) {
  const supabase = getSupabaseAdminClient();

  // 1. Fetch user & resource details
  const [{ data: borrower }, { data: resource }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", input.userId).single(),
    supabase.from("resources").select("*").eq("id", input.resourceId).single(),
  ]);

  if (!borrower || !resource) {
    throw new Error("Invalid borrower or resource specified for waitlist registration.");
  }

  // 2. Fetch past 30 days usage & strikes
  const past30DayHours = await getUserUsageHoursLast30Days(input.userId);

  const { data: incidents } = await supabase
    .from("incidents")
    .select("id")
    .eq("reporter_id", input.userId)
    .in("type", ["late_return", "conflict"]);
  const strikesCount = incidents?.length || 0;

  // 3. Compute deadline days remaining
  let deadlineDays: number | null = null;
  if (input.deadlineDate) {
    const diffMs = new Date(input.deadlineDate).getTime() - Date.now();
    deadlineDays = Math.max(0, Math.ceil(diffMs / (24 * 3600 * 1000)));
  }

  // 4. Calculate initial waitlist priority score (0 days waiting initially)
  const { priorityScore, breakdown } = calculateWaitlistPriority({
    waitingDays: 0,
    hoursUsedLast30Days: past30DayHours,
    deadlineDaysRemaining: deadlineDays,
    isDeadlineVerified: Boolean(input.isDeadlineVerified),
    strikesCount,
  });

  const entryId = crypto.randomUUID();

  // 5. Insert waitlist entry
  const { data: entry, error } = await supabase
    .from("waitlist_entries")
    .insert({
      id: entryId,
      resource_id: input.resourceId,
      user_id: input.userId,
      requested_start: input.requestedStart,
      requested_end: input.requestedEnd,
      priority_score: priorityScore,
      status: "waiting",
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to insert waitlist entry:", error);
    throw error;
  }

  // 6. Write to tamper-evident audit log
  await logAuditEvent({
    actorId: borrower.id,
    actorRole: borrower.role,
    action: "WAITLIST_JOINED",
    resourceType: "waitlist_entry",
    resourceId: entryId,
    newState: {
      resource_id: input.resourceId,
      priority_score: priorityScore,
      factor_breakdown: breakdown,
    },
    reason: `Joined waitlist for ${resource.name} with Priority Score ${priorityScore} (${breakdown.rankSummary})`,
  });

  // 7. Dispatch user notification
  await createNotification({
    userId: borrower.id,
    title: "Waitlist Joined",
    message: `You've joined the waitlist for ${resource.name}. Initial Priority Score: ${priorityScore} pts. You'll be notified immediately if a slot opens!`,
    type: "info",
    link: `/dashboard/user`,
  });

  return {
    entry,
    priorityScore,
    breakdown,
  };
}

/**
 * Returns all waitlist entries for a resource, ranked by priority with full factor breakdowns.
 */
export async function getWaitlistForResource(
  resourceId: string
): Promise<EnrichedWaitlistEntry[]> {
  const supabase = getSupabaseAdminClient();

  // Fetch entries and profiles
  const { data: rawEntries } = await supabase
    .from("waitlist_entries")
    .select("*, profiles(*)")
    .eq("resource_id", resourceId)
    .in("status", ["waiting", "offered"])
    .order("created_at", { ascending: true });

  if (!rawEntries || rawEntries.length === 0) return [];

  // Compute live up-to-date priority score for each candidate
  const enrichedPromises = rawEntries.map(async (item: any) => {
    const waitingDays = Math.max(
      0,
      (Date.now() - new Date(item.created_at).getTime()) / (24 * 3600 * 1000)
    );
    const past30DayHours = await getUserUsageHoursLast30Days(item.user_id);

    const { data: incidents } = await supabase
      .from("incidents")
      .select("id")
      .eq("reporter_id", item.user_id)
      .in("type", ["late_return", "conflict"]);
    const strikes = incidents?.length || 0;

    const { priorityScore: recomputedScore, breakdown } = calculateWaitlistPriority({
      waitingDays,
      hoursUsedLast30Days: past30DayHours,
      strikesCount: strikes,
    });

    const finalPriorityScore =
      item.priority_score !== undefined && item.priority_score !== null
        ? Number(item.priority_score)
        : recomputedScore;

    return {
      id: item.id,
      user_id: item.user_id,
      resource_id: item.resource_id,
      requested_start: item.requested_start,
      requested_end: item.requested_end,
      priority_score: finalPriorityScore,
      status: item.status,
      created_at: item.created_at,
      borrower: item.profiles as Profile,
      breakdown: {
        ...breakdown,
        totalScore: finalPriorityScore,
      },
      rank: 0,
    };
  });

  const enriched = await Promise.all(enrichedPromises);
  const ranked = rankWaitlistCandidates(enriched);

  // Assign 1-based ranks
  return ranked.map((candidate, idx) => ({
    ...candidate,
    rank: idx + 1,
  }));
}

/**
 * Cascades an open slot to the top-ranked waitlisted user with a 2-hour offer window.
 */
export async function handleBookingCancelledCascade(bookingId: string) {
  const supabase = getSupabaseAdminClient();

  // 1. Fetch cancelled booking
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, resources(*)")
    .eq("id", bookingId)
    .single();

  if (!booking) return null;

  // 2. Fetch ranked waitlist entries for this equipment
  const queue = await getWaitlistForResource(booking.resource_id);
  const topCandidate = selectTopWaitlistOffer(queue);

  if (!topCandidate) {
    return null; // No one on the waitlist
  }

  // 3. Set offer status and 2-hour expiration window
  const offerExpiresAt = new Date(Date.now() + 2 * 3600 * 1000).toISOString();

  await supabase
    .from("waitlist_entries")
    .update({
      status: "offered",
    })
    .eq("id", topCandidate.id);

  // 4. Log audit event
  await logAuditEvent({
    actorId: topCandidate.user_id,
    actorRole: topCandidate.borrower.role,
    action: "WAITLIST_SLOT_OFFERED",
    resourceType: "waitlist_entry",
    resourceId: topCandidate.id,
    newState: {
      status: "offered",
      offer_expires_at: offerExpiresAt,
      resource_id: booking.resource_id,
      cancelled_booking_id: bookingId,
    },
    reason: `Offered newly vacated slot on ${booking.resources?.name} to rank #1 candidate ${topCandidate.borrower.full_name} (Priority Score: ${topCandidate.priority_score}) with 2-hour accept window.`,
  });

  // 5. Notify the top waitlisted candidate
  await createNotification({
    userId: topCandidate.user_id,
    title: "Slot Available: Action Required!",
    message: `A slot on ${booking.resources?.name} has just opened up! You have 2 hours to accept or decline this reservation before it cascades to the next person.`,
    type: "action_required",
    link: `/dashboard/user`,
  });

  return {
    candidate: topCandidate,
    offerExpiresAt,
  };
}

/**
 * Responds to a waitlist offer (Accept or Decline).
 * If declined or expired, automatically cascades to the next candidate in the queue.
 */
export async function respondToWaitlistOffer(
  entryId: string,
  userId: string,
  action: "accept" | "decline"
) {
  const supabase = getSupabaseAdminClient();

  const { data: entry } = await supabase
    .from("waitlist_entries")
    .select("*, resources(*), profiles(*)")
    .eq("id", entryId)
    .single();

  if (!entry) {
    throw new Error("Waitlist offer not found.");
  }

  if (entry.user_id !== userId) {
    throw new Error("Unauthorized to respond to another user's waitlist offer.");
  }

  if (action === "accept") {
    // 1. Mark entry fulfilled
    await supabase
      .from("waitlist_entries")
      .update({ status: "fulfilled" })
      .eq("id", entryId);

    // 2. Generate approved booking
    const bookingId = crypto.randomUUID();
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        id: bookingId,
        resource_id: entry.resource_id,
        user_id: userId,
        start_time: entry.requested_start,
        end_time: entry.requested_end,
        purpose: "Fulfilled from Waitlist Offer",
        status: "approved",
        fairness_score: entry.priority_score,
      })
      .select()
      .single();

    if (bookingErr) throw bookingErr;

    // 3. Write booking event & audit
    await supabase.from("booking_events").insert({
      booking_id: bookingId,
      actor_id: userId,
      actor_role: entry.profiles.role,
      from_status: "waitlisted",
      to_status: "approved",
      reason: "Accepted waitlist slot offer within 2-hour acceptance window.",
    });

    await logAuditEvent({
      actorId: userId,
      actorRole: entry.profiles.role,
      action: "WAITLIST_OFFER_ACCEPTED",
      resourceType: "booking",
      resourceId: bookingId,
      newState: { status: "approved", waitlist_entry_id: entryId },
      reason: `Accepted waitlist offer for ${entry.resources?.name}. Reservation confirmed.`,
    });

    return { success: true, booking };
  } else {
    // Decline: Mark expired/cancelled and cascade to the next person
    await supabase
      .from("waitlist_entries")
      .update({ status: "cancelled" })
      .eq("id", entryId);

    await logAuditEvent({
      actorId: userId,
      actorRole: entry.profiles.role,
      action: "WAITLIST_OFFER_DECLINED",
      resourceType: "waitlist_entry",
      resourceId: entryId,
      newState: { status: "cancelled" },
      reason: `Declined waitlist offer for ${entry.resources?.name}. Slot cascaded to next candidate.`,
    });

    // Cascade offer to next candidate!
    const cascadeResult = await handleBookingCancelledCascade(entry.resource_id);

    return {
      success: true,
      cascadedTo: cascadeResult?.candidate || null,
    };
  }
}

/**
 * Lab Owner Manual Override: Can adjust priority score or force-offer a waitlist slot.
 * Enforces mandatory reason and writes an immutable audit log entry.
 */
export async function overrideWaitlistEntry(
  entryId: string,
  actorId: string,
  newPriorityScore: number,
  reason: string
) {
  if (!reason || reason.trim().length < 5) {
    throw new Error("A valid explanation of at least 5 characters is required for an owner override.");
  }

  const supabase = getSupabaseAdminClient();

  const [{ data: entry }, { data: actor }] = await Promise.all([
    supabase.from("waitlist_entries").select("*, resources(*)").eq("id", entryId).single(),
    supabase.from("profiles").select("*").eq("id", actorId).single(),
  ]);

  if (!entry || !actor) {
    throw new Error("Entry or authorized actor not found.");
  }

  // Update entry priority score
  await supabase
    .from("waitlist_entries")
    .update({ priority_score: newPriorityScore })
    .eq("id", entryId);

  // Write tamper-evident audit log entry
  await logAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    action: "WAITLIST_OVERRIDDEN",
    resourceType: "waitlist_entry",
    resourceId: entryId,
    previousState: { priority_score: entry.priority_score },
    newState: { priority_score: newPriorityScore },
    reason: `Owner Override: ${reason.trim()} (Score adjusted from ${entry.priority_score} to ${newPriorityScore})`,
  });

  return { success: true };
}

/**
 * Returns all active waitlist entries for a specific user, enriched with resource details and breakdown.
 */
export async function getUserWaitlistEntries(
  userId: string
): Promise<EnrichedWaitlistEntry[]> {
  const supabase = getSupabaseAdminClient();

  const { data: rawEntries } = await supabase
    .from("waitlist_entries")
    .select("*, resources(*), profiles(*)")
    .eq("user_id", userId)
    .in("status", ["waiting", "offered"])
    .order("created_at", { ascending: true });

  if (!rawEntries || rawEntries.length === 0) return [];

  const results: EnrichedWaitlistEntry[] = [];

  for (const item of rawEntries) {
    const queue = await getWaitlistForResource(item.resource_id);
    const candidate = queue.find((q) => q.id === item.id);
    if (candidate) {
      results.push({
        ...candidate,
        resource: item.resources,
      });
    }
  }

  return results;
}
