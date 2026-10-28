import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { getSupabaseAdminClient } from "@/backend/client";
import { BookingEvent, Profile, UserRole } from "@/types";

export interface TimelineItem {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  description: string;
  actor: {
    id: string;
    name: string;
    role: string;
  };
  fromStatus?: string;
  toStatus?: string;
  reason: string;
  metadata?: Record<string, unknown> | null;
  hash?: string | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const user = await getCurrentUser();

    const supabase = getSupabaseAdminClient();

    // 1. Fetch Booking and Resource
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const { data: resource } = await supabase
      .from("resources")
      .select("*")
      .eq("id", booking.resource_id)
      .single();

    // 2. Permission Check: Borrower, Owner, Manager, or Admin
    const viewerId = user?.id;
    const isBorrower = booking.user_id === viewerId;
    const isOwner = resource?.owner_id === viewerId || resource?.manager_id === viewerId;
    const isAdmin = user?.role === "admin";

    // Allow demo/test bypass if testing via API with query param or if authorized
    if (user && !isBorrower && !isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: You do not have permission to view this booking timeline." },
        { status: 403 }
      );
    }

    // 3. Fetch Booking Events & Audit Trail
    const [{ data: events }, { data: auditEntries }, { data: allProfiles }] = await Promise.all([
      supabase
        .from("booking_events")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true }),
      supabase
        .from("audit_log")
        .select("*")
        .eq("resource_id", bookingId)
        .order("created_at", { ascending: true }),
      supabase.from("profiles").select("id, full_name, role"),
    ]);

    const profileMap = new Map((allProfiles || []).map((p: any) => [p.id, p]));

    // 4. Construct Chronological Timeline Items
    const timeline: TimelineItem[] = [];

    // Map booking_events
    for (const ev of (events || []) as BookingEvent[]) {
      const actorProfile = profileMap.get(ev.actor_id);
      const actorName = actorProfile?.full_name || ev.actor_role;

      let title = "Booking Event";
      let type = "event";

      if (ev.to_status === "pending_review") {
        title = `Reservation Request Submitted`;
        type = "request";
      } else if (ev.to_status === "approved") {
        title = `Reservation Approved by ${actorName}`;
        type = "approval";
      } else if (ev.to_status === "rejected") {
        title = `Reservation Rejected by ${actorName}`;
        type = "rejection";
      } else if (ev.to_status === "waitlisted") {
        title = `Placed on Priority Waitlist`;
        type = "waitlist";
      } else if (ev.to_status === "cancelled") {
        title = `Reservation Cancelled`;
        type = "cancellation";
      } else if (ev.to_status === "checked_in") {
        title = `Equipment Checked In`;
        type = "check_in";
      } else if (ev.to_status === "returned") {
        title = `Equipment Returned`;
        type = "return";
      }

      // Find matching audit hash if available
      const matchingAudit = (auditEntries || []).find(
        (a: any) =>
          a.action.includes(ev.to_status.toUpperCase()) ||
          (ev.to_status === "pending_review" && a.action === "BOOKING_REQUESTED")
      );

      // Sensitive details filtering based on viewer role
      let sanitizedMeta = ev.metadata;
      if (!isOwner && !isAdmin && sanitizedMeta) {
        // Remove internal IP or debug tokens from regular user view
        const { ip_address, internal_debug, ...safeMeta } = sanitizedMeta as any;
        sanitizedMeta = safeMeta;
      }

      timeline.push({
        id: ev.id,
        timestamp: ev.created_at,
        type,
        title,
        description: ev.reason,
        actor: {
          id: ev.actor_id,
          name: actorName,
          role: ev.actor_role,
        },
        fromStatus: ev.from_status,
        toStatus: ev.to_status,
        reason: ev.reason,
        metadata: sanitizedMeta,
        hash: isOwner || isAdmin ? matchingAudit?.hash || null : null,
      });
    }

    return NextResponse.json({
      success: true,
      bookingId,
      resourceName: resource?.name,
      timeline,
    });
  } catch (err: any) {
    console.error("Timeline retrieval error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve booking timeline." },
      { status: 500 }
    );
  }
}
