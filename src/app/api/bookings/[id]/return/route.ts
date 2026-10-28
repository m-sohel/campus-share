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

  // Return inspection is conducted by manager, owner, or admin
  if (user.role !== "manager" && user.role !== "owner" && user.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Only designated technicians, owners, or administrators can sign off return inspections." },
      { status: 403 }
    );
  }

  const booking = await getBookingById(id);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  // Booking must currently be in use or checked in
  if (booking.status !== "in_use" && booking.status !== "checked_in") {
    return NextResponse.json(
      { error: `Cannot process return for booking with status "${booking.status}". Only active (in use) bookings can be returned.` },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const items = body.items as ChecklistItemRecord[];

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Condition checklist items are required to complete return inspection." },
        { status: 400 }
      );
    }

    const recordedByName = body.recorded_by_name?.trim() || `${user.full_name} (${user.role})`;

    const result = await saveConditionRecord({
      booking_id: id,
      stage: "return",
      recorded_by: user.id,
      recorded_by_name: recordedByName,
      items,
      notes: body.notes?.trim() || "Return inspection completed by facility staff.",
    });

    const updatedBooking = await getBookingById(id);

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      record: result.record,
      incident: result.incident,
      diffResult: result.diffResult,
      lateResult: result.lateResult,
      message: result.diffResult?.hasWorsened
        ? "Return recorded. Degradation detected: Draft incident auto-created for manager review."
        : "Return inspection passed cleanly. Equipment returned in good standing.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record return.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
