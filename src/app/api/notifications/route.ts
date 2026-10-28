import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import {
  getUserNotifications,
  markNotificationAsRead,
} from "@/backend/services/notifications";
import { getNotifications } from "@/lib/data/store";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get("userId") || user?.id;

    if (!userId) {
      return NextResponse.json({
        success: true,
        notifications: [],
        unreadCount: 0,
      });
    }

    let notifications: any[] = [];
    try {
      notifications = await getUserNotifications(userId);
    } catch {
      // Fallback to store
      notifications = await getNotifications(userId);
    }

    if (!notifications || notifications.length === 0) {
      try {
        const storeNotifs = await getNotifications(userId);
        if (storeNotifs && storeNotifs.length > 0) {
          notifications = storeNotifs;
        }
      } catch {
        // Ignore fallback error
      }
    }

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
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
