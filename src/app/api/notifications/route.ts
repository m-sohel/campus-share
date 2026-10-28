import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import {
  getUserNotifications,
  markNotificationAsRead,
} from "@/backend/services/notifications";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get("userId") || user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required to fetch notifications." },
        { status: 401 }
      );
    }

    const notifications = await getUserNotifications(userId);

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const userId = body.userId || user?.id;
    const notificationId = body.id;

    if (!userId || !notificationId) {
      return NextResponse.json(
        { error: "Missing notification id or user identification." },
        { status: 400 }
      );
    }

    const ok = await markNotificationAsRead(notificationId, userId);

    return NextResponse.json({ success: ok });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update notification." },
      { status: 500 }
    );
  }
}
