import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { reviewBookingRequest } from "@/backend/services/bookings";
import { getBookingById, reviewBooking } from "@/lib/data/store";
import { UserRole } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const user = await getCurrentUser();
    const body = await req.json();

    const actorId = body.actorId || user?.id;

    if (!actorId) {
      return NextResponse.json(
        { error: "Authentication required to review this reservation." },
        { status: 401 }
      );
    }

    // Role check if user profile is present
    if (user && user.role !== "owner" && user.role !== "manager" && user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only resource owners and technicians can review booking requests." },
        { status: 403 }
      );
    }

    const rawAction = body.action || body.decision;
    if (!rawAction) {
      return NextResponse.json(
        { error: "Invalid review decision. Must be 'approve'/'approved', 'reject'/'rejected', or 'waitlist'/'waitlisted'." },
        { status: 400 }
      );
    }

    const actionMap: Record<string, "approve" | "reject" | "waitlist"> = {
      approve: "approve",
      approved: "approve",
      reject: "reject",
      rejected: "reject",
      waitlist: "waitlist",
      waitlisted: "waitlist",
    };

    const decisionMap: Record<string, "approved" | "rejected" | "waitlisted"> = {
      approve: "approved",
      approved: "approved",
      reject: "rejected",
      rejected: "rejected",
      waitlist: "waitlisted",
      waitlisted: "waitlisted",
    };

    const action = actionMap[rawAction];
    const decision = decisionMap[rawAction];

    if (!action || !decision) {
      return NextResponse.json(
        { error: "Invalid review decision. Must be 'approve'/'approved', 'reject'/'rejected', or 'waitlist'/'waitlisted'." },
        { status: 400 }
      );
    }

    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    // Rejection and waitlist strictly require a justification reason
    if (["reject", "waitlist"].includes(action) && reason.length < 3) {
      return NextResponse.json(
        {
          error: `A substantive reason is strictly required when choosing to ${action.toUpperCase()} a booking request.`,
        },
        { status: 422 }
      );
    }

    const finalReason = reason || "Approved after staff review.";
    let resultBooking: any = null;
    let serviceError: string | null = null;

    // 1. Try Supabase service (with DB constraints, audit hash chain, notifications)
    try {
      const res = await reviewBookingRequest({
        bookingId,
        actorId,
        action,
        reason: finalReason,
      });
      if (res.success && res.booking) {
        resultBooking = res.booking;
      } else if (res.error) {
        serviceError = res.error;
      }
    } catch (err: any) {
      serviceError = err?.message || "Service error";
    }

    // 2. Also sync in-memory store for demo reactivity / fallback
    try {
      const storeBooking = await getBookingById(bookingId);
      if (storeBooking) {
        const updated = await reviewBooking({
          booking_id: bookingId,
          decision,
          reason: finalReason,
          reviewer_id: actorId,
          reviewer_role: (user?.role || "owner") as UserRole,
        });
        if (!resultBooking) {
          resultBooking = updated;
        }
      }
    } catch {
      // In-memory sync best-effort
    }

    if (!resultBooking) {
      return NextResponse.json(
        { error: serviceError || "Booking not found or review failed." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: resultBooking,
      message: `Reservation #${bookingId} has been marked as ${decision}.`,
    });
  } catch (error: any) {
    console.error("Booking review error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process review." },
      { status: 500 }
    );
  }
}
