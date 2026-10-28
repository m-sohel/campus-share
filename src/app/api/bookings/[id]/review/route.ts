import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { getBookingById, reviewBooking } from "@/lib/data/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only owner, manager, or admin can review requests
  if (user.role !== "owner" && user.role !== "manager" && user.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Only resource owners and technicians can review booking requests." },
      { status: 403 }
    );
  }

  const booking = await getBookingById(id);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { decision, reason } = body;

    if (!decision || (decision !== "approved" && decision !== "rejected" && decision !== "waitlisted")) {
      return NextResponse.json(
        { error: "Invalid review decision. Must be 'approved', 'rejected', or 'waitlisted'." },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "A plain-language explanation (at least 5 characters) is required for any decision." },
        { status: 400 }
      );
    }

    const updated = await reviewBooking({
      booking_id: id,
      decision,
      reason: reason.trim(),
      reviewer_id: user.id,
      reviewer_role: user.role,
    });

    return NextResponse.json({
      success: true,
      booking: updated,
      message: `Reservation #${id} has been marked as ${decision}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to review booking";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

