import { NextRequest, NextResponse } from "next/server";
import { getBookingWithWhy } from "@/backend/services/bookings";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;

    const data = await getBookingWithWhy(bookingId);

    if (!data) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      booking: data.booking,
      resource: data.resource,
      borrower: data.borrower,
      events: data.events,
      explanation: data.explanation,
    });
  } catch (error: any) {
    console.error("Booking why error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve booking explanation." },
      { status: 500 }
    );
  }
}
