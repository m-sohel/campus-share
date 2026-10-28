import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { createBookingRequest } from "@/backend/services/bookings";
import { getSupabaseAdminClient } from "@/backend/client";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const userId = body.userId || user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to submit a booking request." },
        { status: 401 }
      );
    }

    const {
      resourceId,
      startTime,
      endTime,
      purpose,
      teamSize,
      supervisorName,
      rulesAcknowledged,
    } = body;

    if (!resourceId || !startTime || !endTime || !purpose) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: resourceId, startTime, endTime, and purpose are mandatory.",
        },
        { status: 400 }
      );
    }

    const result = await createBookingRequest({
      userId,
      resourceId,
      startTime,
      endTime,
      purpose,
      teamSize: Number(teamSize) || 1,
      supervisorName: supervisorName || null,
      rulesAcknowledged: Boolean(rulesAcknowledged),
    });

    if (!result.success) {
      if (result.error === "ELIGIBILITY_BLOCKED") {
        return NextResponse.json(
          {
            error: "ELIGIBILITY_BLOCKED",
            message:
              "Cannot request booking: Your profile does not meet the mandatory prerequisites.",
            eligibility: result.eligibility,
          },
          { status: 403 }
        );
      }

      if (result.error === "SLOT_CONFLICT") {
        return NextResponse.json(
          {
            error: "SLOT_CONFLICT",
            message: "The requested time slot has schedule conflicts.",
            conflicts: result.conflicts,
            suggestedSlots: result.suggestedSlots || [],
          },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        booking: result.booking,
        message: "Booking request submitted successfully for owner review.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Booking creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process booking request." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = req.nextUrl.searchParams;
    const resourceId = searchParams.get("resourceId");
    const userId = searchParams.get("userId") || user?.id;

    const supabase = getSupabaseAdminClient();
    let query = supabase.from("bookings").select("*").order("created_at", { ascending: false });

    if (resourceId) {
      query = query.eq("resource_id", resourceId);
    } else if (userId && user?.role !== "admin") {
      query = query.eq("user_id", userId);
    }

    const { data: bookings, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, bookings: bookings || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

