import { getSupabaseAdminClient } from "../client";
import { checkEligibility, EligibilityResult } from "@/lib/rules/eligibility";
import {
  checkConflicts,
  suggestNearestFreeSlots,
  ConflictCheckResult,
  SuggestedSlot,
} from "@/lib/rules/conflicts";
import {
  explainBookingDecision,
  DecisionExplanation,
} from "@/lib/rules/decision-explanation";
import { logAuditEvent } from "./audit";
import { createNotification } from "./notifications";
import {
  AvailabilitySlot,
  BlackoutDate,
  Booking,
  BookingEvent,
  BookingStatus,
  Credential,
  Profile,
  Resource,
  ResourceRequirement,
  UserRole,
} from "@/types";

export interface CreateBookingInput {
  userId: string;
  resourceId: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  purpose: string;
  teamSize?: number;
  supervisorName?: string | null;
  rulesAcknowledged: boolean;
}

export interface CreateBookingResponse {
  success: boolean;
  booking?: Booking;
  error?: string;
  eligibility?: EligibilityResult;
  conflicts?: ConflictCheckResult;
  suggestedSlots?: SuggestedSlot[];
}

export interface ReviewBookingInput {
  bookingId: string;
  actorId: string;
  action: "approve" | "reject" | "waitlist";
  reason: string;
}

export interface CancelBookingInput {
  bookingId: string;
  actorId: string;
  reason: string;
}

export interface EnrichedInboxItem {
  booking: Booking;
  resource: Resource;
  borrower: Profile;
  events: BookingEvent[];
  eligibility: EligibilityResult;
  conflicts: ConflictCheckResult;
  suggestedSlots: SuggestedSlot[];
  explanation: DecisionExplanation;
}

/**
 * 1. Creates a booking request after automatically running:
 *    - Rules acknowledgment verification
 *    - Strict eligibility checks (blocks submission if unmet mandatory credentials)
 *    - Conflict detection (overlapping bookings, blackout dates, operating hours)
 *    - 3 nearest free slot suggestions on conflict
 *    - Append-only audit logging & owner notifications
 */
export async function createBookingRequest(
  input: CreateBookingInput
): Promise<CreateBookingResponse> {
  const supabase = getSupabaseAdminClient();

  // 1. Digital acknowledgment check
  if (!input.rulesAcknowledged) {
    return {
      success: false,
      error: "You must digitally acknowledge and accept the equipment usage rules to proceed.",
    };
  }

  // 2. Fetch resource, requirements, blackout dates, and operating slots
  const { data: resource, error: rErr } = await supabase
    .from("resources")
    .select("*")
    .eq("id", input.resourceId)
    .single();

  if (rErr || !resource) {
    return { success: false, error: "Resource not found or inactive." };
  }

  const { data: requirements } = await supabase
    .from("resource_requirements")
    .select("*")
    .eq("resource_id", input.resourceId);

  const { data: availabilitySlots } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("resource_id", input.resourceId);

  const { data: blackoutDates } = await supabase
    .from("blackout_dates")
    .select("*")
    .eq("resource_id", input.resourceId);

  // 3. Fetch borrower profile and active credentials
  const { data: borrower, error: uErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", input.userId)
    .single();

  if (uErr || !borrower) {
    return { success: false, error: "Borrower profile not found." };
  }

  const { data: userCredentials } = await supabase
    .from("credentials")
    .select("*")
    .eq("user_id", input.userId);

  // 4. Run pure eligibility evaluation
  const eligibilityResult = checkEligibility(
    (requirements || []) as ResourceRequirement[],
    (userCredentials || []) as Credential[]
  );

  // Requirement: "On submit, the system auto-runs the eligibility check and records the result on the request. Failed requirements block submission with reasons."
  if (!eligibilityResult.isEligible) {
    return {
      success: false,
      error: "ELIGIBILITY_BLOCKED",
      eligibility: eligibilityResult,
    };
  }

  // 5. Fetch existing active reservations for conflict evaluation
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("resource_id", input.resourceId);

  const reqStart = new Date(input.startTime);
  const reqEnd = new Date(input.endTime);

  const conflictResult = checkConflicts({
    requestedStart: reqStart,
    requestedEnd: reqEnd,
    existingBookings: (existingBookings || []) as Booking[],
    blackoutDates: (blackoutDates || []) as BlackoutDate[],
    availabilitySlots: (availabilitySlots || []) as AvailabilitySlot[],
    minLeadTimeHours: resource.min_lead_time_hours || 2,
    maxDurationHours: resource.max_duration_hours || 4,
  });

  // If conflict detected, suggest 3 nearest free slots
  if (conflictResult.hasConflict) {
    const suggestedSlots = suggestNearestFreeSlots({
      requestedStart: reqStart,
      requestedEnd: reqEnd,
      existingBookings: (existingBookings || []) as Booking[],
      blackoutDates: (blackoutDates || []) as BlackoutDate[],
      availabilitySlots: (availabilitySlots || []) as AvailabilitySlot[],
      minLeadTimeHours: resource.min_lead_time_hours || 2,
      maxDurationHours: resource.max_duration_hours || 4,
      count: 3,
    });

    return {
      success: false,
      error: "SLOT_CONFLICT",
      conflicts: conflictResult,
      suggestedSlots,
    };
  }

  // 6. Concurrency & Database Double-Booking Prevention Check
  const { data: collisionCheck } = await supabase
    .from("bookings")
    .select("id, start_time, end_time, status")
    .eq("resource_id", input.resourceId)
    .in("status", ["approved", "confirmed", "checked_in", "pending_review"])
    .lt("start_time", input.endTime)
    .gt("end_time", input.startTime);

  if (collisionCheck && collisionCheck.length > 0) {
    const suggestedSlots = suggestNearestFreeSlots({
      requestedStart: reqStart,
      requestedEnd: reqEnd,
      existingBookings: (existingBookings || []) as Booking[],
      blackoutDates: (blackoutDates || []) as BlackoutDate[],
      availabilitySlots: (availabilitySlots || []) as AvailabilitySlot[],
      minLeadTimeHours: resource.min_lead_time_hours || 2,
      maxDurationHours: resource.max_duration_hours || 4,
      count: 3,
    });

    return {
      success: false,
      error: "SLOT_CONFLICT",
      conflicts: {
        hasConflict: true,
        reasons: [
          `This time window was just claimed by another borrower. Please select an alternative slot.`,
        ],
      },
      suggestedSlots,
    };
  }

  // 7. Insert Booking
  const bookingId = crypto.randomUUID();
  const purposeWithMeta = JSON.stringify({
    purpose: input.purpose,
    team_size: input.teamSize || 1,
    supervisor_name: input.supervisorName || null,
    rules_acknowledged: true,
  });

  const { data: newBooking, error: bErr } = await supabase
    .from("bookings")
    .insert({
      id: bookingId,
      resource_id: input.resourceId,
      user_id: input.userId,
      start_time: input.startTime,
      end_time: input.endTime,
      status: "pending_review",
      purpose: purposeWithMeta,
      fairness_score: 1.0,
    })
    .select()
    .single();

  if (bErr) {
    // If exclusion constraint caught a collision
    if (bErr.code === "23P01" || bErr.message.includes("prevent_overlapping_active_bookings")) {
      const suggestedSlots = suggestNearestFreeSlots({
        requestedStart: reqStart,
        requestedEnd: reqEnd,
        existingBookings: (existingBookings || []) as Booking[],
        blackoutDates: (blackoutDates || []) as BlackoutDate[],
        availabilitySlots: (availabilitySlots || []) as AvailabilitySlot[],
        minLeadTimeHours: resource.min_lead_time_hours || 2,
        maxDurationHours: resource.max_duration_hours || 4,
        count: 3,
      });

      return {
        success: false,
        error: "SLOT_CONFLICT",
        conflicts: {
          hasConflict: true,
          reasons: ["Double-booking blocked: slot already claimed concurrently."],
        },
        suggestedSlots,
      };
    }
    console.error("Booking insert error:", bErr);
    return { success: false, error: bErr.message };
  }

  // 8. Record State Transition Event
  await supabase.from("booking_events").insert({
    booking_id: bookingId,
    actor_id: input.userId,
    actor_role: borrower.role,
    from_status: "draft",
    to_status: "pending_review",
    reason: "Submitted booking reservation request",
    metadata: {
      team_size: input.teamSize || 1,
      supervisor_name: input.supervisorName || null,
      rules_acknowledged: true,
      eligibility_snapshot: eligibilityResult,
    },
  });

  // 9. Cryptographically Log to Audit Trail
  await logAuditEvent({
    actorId: input.userId,
    actorRole: borrower.role,
    action: "BOOKING_REQUESTED",
    resourceType: "booking",
    resourceId: bookingId,
    newState: {
      resource_id: input.resourceId,
      user_id: input.userId,
      start_time: input.startTime,
      end_time: input.endTime,
      status: "pending_review",
      eligibility_summary: eligibilityResult.summary,
    },
    reason: `Requested ${resource.name} from ${input.startTime} to ${input.endTime}.`,
  });

  // 10. Notify Resource Owner & Manager
  const notifyTargetIds = [resource.owner_id, resource.manager_id].filter(Boolean) as string[];
  for (const targetId of notifyTargetIds) {
    await createNotification({
      userId: targetId,
      title: "New Booking Request",
      message: `${borrower.full_name} requested ${resource.name} (${formatDatePreview(
        reqStart,
        reqEnd
      )}).`,
      type: "action_required",
      link: `/dashboard/owner?bookingId=${bookingId}`,
    });
  }

  return {
    success: true,
    booking: newBooking as Booking,
  };
}

/**
 * 2. Owner/Manager Review Workflow:
 *    - Actions: 'approve', 'reject', 'waitlist'
 *    - Rejection and waitlist REQUIRE a reason.
 *    - Re-checks conflicts upon approval.
 *    - Writes to booking_events, audit_log, and dispatches borrower notification.
 */
export async function reviewBookingRequest(
  input: ReviewBookingInput
): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  const supabase = getSupabaseAdminClient();

  // 1. Mandatory reason check for rejection and waitlisting
  if (["reject", "waitlist"].includes(input.action) && (!input.reason || input.reason.trim().length < 3)) {
    return {
      success: false,
      error: `A substantive reason is strictly required when selecting ${input.action.toUpperCase()}.`,
    };
  }

  // 2. Fetch booking and resource
  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", input.bookingId)
    .single();

  if (bErr || !booking) {
    return { success: false, error: "Booking not found." };
  }

  const { data: resource } = await supabase
    .from("resources")
    .select("*")
    .eq("id", booking.resource_id)
    .single();

  if (!resource) {
    return { success: false, error: "Associated resource not found." };
  }

  // 3. Verify actor permissions (Owner, Manager of resource, or Admin)
  const { data: actor } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", input.actorId)
    .single();

  if (!actor) {
    return { success: false, error: "Actor profile not found." };
  }

  const hasPermission =
    actor.role === "admin" ||
    resource.owner_id === actor.id ||
    resource.manager_id === actor.id;

  if (!hasPermission) {
    return {
      success: false,
      error: "Unauthorized: You do not have owner/manager permissions for this resource.",
    };
  }

  // 4. Map Action to Status
  let targetStatus: BookingStatus = "approved";
  if (input.action === "reject") targetStatus = "rejected";
  if (input.action === "waitlist") targetStatus = "waitlisted";

  // 5. If approving, re-check conflict collision
  if (targetStatus === "approved") {
    const { data: collisions } = await supabase
      .from("bookings")
      .select("id")
      .eq("resource_id", booking.resource_id)
      .neq("id", booking.id)
      .in("status", ["approved", "confirmed", "checked_in"])
      .lt("start_time", booking.end_time)
      .gt("end_time", booking.start_time);

    if (collisions && collisions.length > 0) {
      return {
        success: false,
        error: "Cannot approve: An approved booking already occupies this time slot.",
      };
    }
  }

  // 6. Update booking status
  const updateData: Partial<Booking> = {
    status: targetStatus,
    reviewed_by: input.actorId,
    updated_at: new Date().toISOString(),
  };

  if (targetStatus === "rejected") {
    updateData.rejection_reason = input.reason.trim();
  } else if (targetStatus === "waitlisted") {
    updateData.rejection_reason = input.reason.trim(); // store justification
  }

  const { data: updatedBooking, error: uErr } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", booking.id)
    .select()
    .single();

  if (uErr) {
    return { success: false, error: uErr.message };
  }

  // 7. If waitlisted, create entry in waitlist_entries
  if (targetStatus === "waitlisted") {
    await supabase.from("waitlist_entries").insert({
      resource_id: booking.resource_id,
      user_id: booking.user_id,
      requested_start: booking.start_time,
      requested_end: booking.end_time,
      priority_score: booking.fairness_score || 1.0,
      status: "waiting",
    });
  }

  // 8. Record state transition in booking_events
  await supabase.from("booking_events").insert({
    booking_id: booking.id,
    actor_id: input.actorId,
    actor_role: actor.role,
    from_status: booking.status,
    to_status: targetStatus,
    reason: input.reason.trim() || `Request ${targetStatus} by ${actor.full_name}`,
    metadata: {
      action: input.action,
      reviewer_name: actor.full_name,
    },
  });

  // 9. Append to Audit Trail
  await logAuditEvent({
    actorId: input.actorId,
    actorRole: actor.role,
    action: `BOOKING_${targetStatus.toUpperCase()}`,
    resourceType: "booking",
    resourceId: booking.id,
    previousState: { status: booking.status },
    newState: { status: targetStatus, reason: input.reason.trim() },
    reason: input.reason.trim() || `Request ${targetStatus} by ${actor.full_name}`,
  });

  // 10. Dispatch Borrower Notification
  const actionLabels: Record<string, string> = {
    approved: "approved! 🎉",
    rejected: "rejected.",
    waitlisted: "placed on the priority waitlist.",
  };

  await createNotification({
    userId: booking.user_id,
    title: `Booking Request ${targetStatus.toUpperCase()}`,
    message: `Your booking for "${resource.name}" was ${actionLabels[targetStatus]} Reason: "${input.reason.trim()}"`,
    type: targetStatus === "approved" ? "success" : targetStatus === "waitlisted" ? "warning" : "info",
    link: `/dashboard/user?bookingId=${booking.id}`,
  });

  return {
    success: true,
    booking: updatedBooking as Booking,
  };
}

/**
 * 3. Cancellation Flow for Users & Owners with Mandatory Reason:
 */
export async function cancelBooking(
  input: CancelBookingInput
): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  const supabase = getSupabaseAdminClient();

  if (!input.reason || input.reason.trim().length < 3) {
    return { success: false, error: "A cancellation reason is required." };
  }

  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", input.bookingId)
    .single();

  if (bErr || !booking) {
    return { success: false, error: "Booking not found." };
  }

  const { data: resource } = await supabase
    .from("resources")
    .select("*")
    .eq("id", booking.resource_id)
    .single();

  const { data: actor } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", input.actorId)
    .single();

  if (!actor) {
    return { success: false, error: "Actor profile not found." };
  }

  const isBorrower = booking.user_id === actor.id;
  const isOwner = resource?.owner_id === actor.id || resource?.manager_id === actor.id;
  const isAdmin = actor.role === "admin";

  if (!isBorrower && !isOwner && !isAdmin) {
    return {
      success: false,
      error: "Unauthorized: You do not have permission to cancel this booking.",
    };
  }

  // Update status to cancelled
  const { data: updatedBooking, error: uErr } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancellation_reason: input.reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", booking.id)
    .select()
    .single();

  if (uErr) {
    return { success: false, error: uErr.message };
  }

  // Record event
  await supabase.from("booking_events").insert({
    booking_id: booking.id,
    actor_id: actor.id,
    actor_role: actor.role,
    from_status: booking.status,
    to_status: "cancelled",
    reason: input.reason.trim(),
  });

  // Audit log
  await logAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    action: "BOOKING_CANCELLED",
    resourceType: "booking",
    resourceId: booking.id,
    previousState: { status: booking.status },
    newState: { status: "cancelled", cancellation_reason: input.reason.trim() },
    reason: input.reason.trim(),
  });

  // Notify opposite party
  const notifyRecipient = isBorrower ? resource?.owner_id : booking.user_id;
  if (notifyRecipient) {
    await createNotification({
      userId: notifyRecipient,
      title: "Booking Cancelled",
      message: `Reservation for "${resource?.name || "Equipment"}" was cancelled by ${
        actor.full_name
      }. Reason: "${input.reason.trim()}".`,
      type: "warning",
      link: `/dashboard/${isBorrower ? "owner" : "user"}`,
    });
  }

  return {
    success: true,
    booking: updatedBooking as Booking,
  };
}

/**
 * 4. Owner & Manager Request Inbox:
 *    Fetches all incoming requests for owned/managed equipment,
 *    attaches borrower credentials, live eligibility check, conflict detection,
 *    and explainability metadata.
 */
export async function getOwnerInbox(
  actorId: string,
  userRole: UserRole
): Promise<EnrichedInboxItem[]> {
  const supabase = getSupabaseAdminClient();

  // 1. Fetch resources managed by actor
  let resourcesQuery = supabase.from("resources").select("*");
  if (userRole !== "admin") {
    resourcesQuery = resourcesQuery.or(`owner_id.eq.${actorId},manager_id.eq.${actorId}`);
  }

  const { data: resources } = await resourcesQuery;
  if (!resources || resources.length === 0) return [];

  const resourceMap = new Map<string, Resource>(resources.map((r) => [r.id, r as Resource]));
  const resourceIds = Array.from(resourceMap.keys());

  // 2. Fetch bookings for these resources
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .in("resource_id", resourceIds)
    .order("created_at", { ascending: false });

  if (!bookings || bookings.length === 0) return [];

  // 3. Collect all user IDs, availability slots, blackout dates, requirements
  const userIds = Array.from(new Set(bookings.map((b) => b.user_id)));

  const [{ data: profiles }, { data: allCreds }, { data: allReqs }, { data: allSlots }, { data: allBlackouts }, { data: allEvents }] =
    await Promise.all([
      supabase.from("profiles").select("*").in("id", userIds),
      supabase.from("credentials").select("*").in("user_id", userIds),
      supabase.from("resource_requirements").select("*").in("resource_id", resourceIds),
      supabase.from("availability_slots").select("*").in("resource_id", resourceIds),
      supabase.from("blackout_dates").select("*").in("resource_id", resourceIds),
      supabase
        .from("booking_events")
        .select("*")
        .in("booking_id", bookings.map((b) => b.id)),
    ]);

  const profileMap = new Map<string, Profile>((profiles || []).map((p) => [p.id, p as Profile]));

  // Build enriched list
  const enrichedList: EnrichedInboxItem[] = [];

  for (const b of bookings as Booking[]) {
    const res = resourceMap.get(b.resource_id);
    const borrower = profileMap.get(b.user_id);
    if (!res || !borrower) continue;

    const bReqs = (allReqs || []).filter((r) => r.resource_id === b.resource_id) as ResourceRequirement[];
    const bCreds = (allCreds || []).filter((c) => c.user_id === b.user_id) as Credential[];
    const bSlots = (allSlots || []).filter((s) => s.resource_id === b.resource_id) as AvailabilitySlot[];
    const bBlackouts = (allBlackouts || []).filter((bo) => bo.resource_id === b.resource_id) as BlackoutDate[];
    const bEvents = (allEvents || []).filter((e) => e.booking_id === b.id) as BookingEvent[];

    // Calculate eligibility
    const eligibility = checkEligibility(bReqs, bCreds);

    // Calculate conflicts (against OTHER active bookings)
    const otherBookings = (bookings as Booking[]).filter((ob) => ob.id !== b.id);
    const conflicts = checkConflicts({
      requestedStart: new Date(b.start_time),
      requestedEnd: new Date(b.end_time),
      existingBookings: otherBookings,
      blackoutDates: bBlackouts,
      availabilitySlots: bSlots,
      minLeadTimeHours: res.min_lead_time_hours || 2,
      maxDurationHours: res.max_duration_hours || 4,
    });

    const suggestedSlots = conflicts.hasConflict
      ? suggestNearestFreeSlots({
          requestedStart: new Date(b.start_time),
          requestedEnd: new Date(b.end_time),
          existingBookings: otherBookings,
          blackoutDates: bBlackouts,
          availabilitySlots: bSlots,
          minLeadTimeHours: res.min_lead_time_hours || 2,
          maxDurationHours: res.max_duration_hours || 4,
          count: 3,
        })
      : [];

    const reviewerProfile = b.reviewed_by ? profileMap.get(b.reviewed_by) || null : null;
    const explanation = explainBookingDecision({
      booking: b,
      events: bEvents,
      resource: res,
      reviewer: reviewerProfile,
      eligibility,
      conflicts,
    });

    enrichedList.push({
      booking: b,
      resource: res,
      borrower,
      events: bEvents,
      eligibility,
      conflicts,
      suggestedSlots,
      explanation,
    });
  }

  return enrichedList;
}

/**
 * 5. Fetch single booking with 'Why' explanation panel
 */
export async function getBookingWithWhy(bookingId: string) {
  const supabase = getSupabaseAdminClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (error || !booking) return null;

  const [{ data: resource }, { data: borrower }, { data: events }, { data: reviewer }] =
    await Promise.all([
      supabase.from("resources").select("*").eq("id", booking.resource_id).single(),
      supabase.from("profiles").select("*").eq("id", booking.user_id).single(),
      supabase.from("booking_events").select("*").eq("booking_id", bookingId),
      booking.reviewed_by
        ? supabase.from("profiles").select("*").eq("id", booking.reviewed_by).single()
        : Promise.resolve({ data: null }),
    ]);

  const { data: reqs } = await supabase
    .from("resource_requirements")
    .select("*")
    .eq("resource_id", booking.resource_id);

  const { data: creds } = await supabase
    .from("credentials")
    .select("*")
    .eq("user_id", booking.user_id);

  const eligibility = checkEligibility(
    (reqs || []) as ResourceRequirement[],
    (creds || []) as Credential[]
  );

  const explanation = explainBookingDecision({
    booking: booking as Booking,
    events: (events || []) as BookingEvent[],
    resource: resource as Resource,
    reviewer: reviewer as Profile | null,
    eligibility,
  });

  return {
    booking: booking as Booking,
    resource: resource as Resource,
    borrower: borrower as Profile,
    events: (events || []) as BookingEvent[],
    explanation,
  };
}

function formatDatePreview(start: Date, end: Date): string {
  const d = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const st = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const et = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${d}, ${st} - ${et}`;
}

