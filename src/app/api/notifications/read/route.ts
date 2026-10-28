import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/data/store";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, all } = await req.json();

    if (all) {
      await markAllNotificationsAsRead(user.id);
      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }

    if (id) {
      await markNotificationAsRead(id);
      return NextResponse.json({ success: true, message: "Notification marked as read." });
    }

    return NextResponse.json({ error: "Either 'id' or 'all: true' is required." }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update notification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

