import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { cancelBooking } from "@/backend/services/bookings";

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
        { error: "Authentication required to cancel a reservation." },
        { status: 401 }
      );
    }

    const { reason } = body;

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json(
        { error: "A cancellation reason is strictly required." },
        { status: 422 }
      );
    }

    const result = await cancelBooking({
      bookingId,
      actorId,
      reason: reason.trim(),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
      message: "Reservation successfully cancelled.",
    });
  } catch (error: any) {
    console.error("Booking cancellation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel reservation." },
      { status: 500 }
    );
  }
}

