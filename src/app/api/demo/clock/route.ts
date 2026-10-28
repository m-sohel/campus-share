import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import {
  advanceAppClock,
  resetAppClock,
  getAppTime,
  getAppClockOffset,
  setAppClockOffset,
} from "@/lib/rules/clock";
import { runTimeBasedTriggers, logAuditEvent } from "@/lib/data/store";

export async function GET() {
  const currentAppTime = getAppTime();
  const offsetMs = getAppClockOffset();

  return NextResponse.json({
    appTime: currentAppTime.toISOString(),
    offsetMs,
    offsetHours: Math.round(offsetMs / (60 * 60 * 1000)),
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json().catch(() => ({}));
    const action = body.action || "advance_hour";

    const prevOffset = getAppClockOffset();
    let newAppTime: Date;

    if (action === "advance_hour") {
      newAppTime = advanceAppClock(60 * 60 * 1000); // +1 hour
    } else if (action === "advance_day") {
      newAppTime = advanceAppClock(24 * 60 * 60 * 1000); // +24 hours
    } else if (action === "reset") {
      newAppTime = resetAppClock();
    } else if (action === "set_offset" && typeof body.offsetMs === "number") {
      setAppClockOffset(body.offsetMs);
      newAppTime = getAppTime();
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const currentOffset = getAppClockOffset();

    // Run automated time triggers for the new simulated time
    const { createdCount, events } = await runTimeBasedTriggers(newAppTime);

    // Audit log clock change
    await logAuditEvent({
      actor_id: user ? user.id : "00000000-0000-0000-0000-000000000001",
      actor_role: user ? user.role : "admin",
      action: "CLOCK_ADVANCED" as any,
      resource_type: "system",
      resource_id: "demo-clock",
      previous_state: { offsetMs: prevOffset },
      new_state: {
        offsetMs: currentOffset,
        simulatedTime: newAppTime.toISOString(),
        triggersCreated: createdCount,
      },
      reason: `Demo clock fast-forward action '${action}'. Generated ${createdCount} time-based notifications.`,
    });

    const response = NextResponse.json({
      success: true,
      action,
      appTime: newAppTime.toISOString(),
      offsetMs: currentOffset,
      offsetHours: Math.round(currentOffset / (60 * 60 * 1000)),
      triggersCreated: createdCount,
      events,
    });

    // Save offset in cookie for client/server sync
    response.cookies.set("campus_clock_offset", currentOffset.toString(), {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update clock" },
      { status: 500 }
    );
  }
}
