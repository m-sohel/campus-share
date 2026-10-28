import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { getNotifications } from "@/lib/data/store";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  const notifications = await getNotifications(user.id);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return NextResponse.json({
    notifications,
    unreadCount,
  });
}

