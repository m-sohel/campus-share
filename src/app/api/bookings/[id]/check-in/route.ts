import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { getBookingById, saveConditionRecord } from "@/lib/data/store";
import { ChecklistItemRecord } from "@/lib/rules/condition";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
  }

  // Check-in is conducted by manager, owner, or admin
  if (user.role !== "manager" && user.role !== "owner" && user.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Only designated technicians, owners, or administrators can sign off check-in inspections." },
      { status: 403 }
    );
  }

  const booking = await getBookingById(id);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  // Must be in an approved or confirmed state
  if (booking.status !== "approved" && booking.status !== "confirmed" && booking.status !== "in_use") {
    return NextResponse.json(
      { error: `Cannot check in booking with status "${booking.status}". Only approved bookings can be checked in.` },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const items = body.items as ChecklistItemRecord[];

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Condition checklist items are required to complete handover sign-off." },
        { status: 400 }
      );
    }

    const recordedByName = body.recorded_by_name?.trim() || `${user.full_name} (${user.role})`;

    const result = await saveConditionRecord({
      booking_id: id,
      stage: "check_in",
      recorded_by: user.id,
      recorded_by_name: recordedByName,
      items,
      notes: body.notes?.trim() || "Physical handover inspection signed off with no critical safety faults.",
    });

    const updatedBooking = await getBookingById(id);

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      record: result.record,
      message: "Check-in completed successfully. Resource status updated to In Use.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record check-in.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
