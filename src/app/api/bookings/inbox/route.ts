import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { getOwnerInbox } from "@/backend/services/bookings";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = req.nextUrl.searchParams;
    const actorId = searchParams.get("actorId") || user?.id;

    if (!actorId) {
      return NextResponse.json(
        { error: "Authentication required to view owner/manager inbox." },
        { status: 401 }
      );
    }

    const role = user?.role || "owner";
    const inboxItems = await getOwnerInbox(actorId, role);

    return NextResponse.json({
      success: true,
      count: inboxItems.length,
      inbox: inboxItems,
    });
  } catch (error: any) {
    console.error("Owner inbox fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch owner inbox." },
      { status: 500 }
    );
  }
}

