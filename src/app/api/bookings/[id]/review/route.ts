import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { reviewBookingRequest } from "@/backend/services/bookings";

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

    const { action, reason } = body;

    if (!["approve", "reject", "waitlist"].includes(action)) {
      return NextResponse.json(
        {
          error:
            "Invalid action. Expected one of: 'approve', 'reject', or 'waitlist'.",
        },
        { status: 400 }
      );
    }

    // Rejection and waitlist strictly require a justification reason
    if (["reject", "waitlist"].includes(action) && (!reason || reason.trim().length < 3)) {
      return NextResponse.json(
        {
          error: `A substantive reason is strictly required when choosing to ${action.toUpperCase()} a booking request.`,
        },
        { status: 422 }
      );
    }

    const result = await reviewBookingRequest({
      bookingId,
      actorId,
      action,
      reason: reason ? reason.trim() : "Approved after staff review.",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
      message: `Booking request successfully ${action}d.`,
    });
  } catch (error: any) {
    console.error("Booking review error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process review." },
      { status: 500 }
    );
  }
}

