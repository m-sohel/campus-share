import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import {
  joinWaitlist,
  getWaitlistForResource,
} from "@/backend/services/waitlist";
import { getSupabaseAdminClient } from "@/backend/client";

export async function GET(req: NextRequest) {
  try {
    const resourceId = req.nextUrl.searchParams.get("resourceId");
    if (!resourceId) {
      return NextResponse.json({ error: "resourceId is required" }, { status: 400 });
    }

    const waitlist = await getWaitlistForResource(resourceId);
    return NextResponse.json({ success: true, waitlist });
  } catch (err: any) {
    console.error("Waitlist fetch error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch waitlist" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { resourceId, requestedStart, requestedEnd, deadlineDate, isDeadlineVerified, notes } = body;

    if (!resourceId || !requestedStart || !requestedEnd) {
      return NextResponse.json(
        { error: "resourceId, requestedStart, and requestedEnd are required" },
        { status: 400 }
      );
    }

    const result = await joinWaitlist({
      userId: user.id,
      resourceId,
      requestedStart,
      requestedEnd,
      deadlineDate,
      isDeadlineVerified,
      notes,
    });

    return NextResponse.json({
      success: true,
      entry: result.entry,
      priorityScore: result.priorityScore,
      breakdown: result.breakdown,
    });
  } catch (err: any) {
    console.error("Join waitlist error:", err);
    return NextResponse.json({ error: err.message || "Failed to join waitlist" }, { status: 500 });
  }
}
