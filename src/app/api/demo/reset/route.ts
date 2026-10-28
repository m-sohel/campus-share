import { NextResponse } from "next/server";
import { resetDemoStore, logAuditEvent } from "@/lib/data/store";
import { getCurrentUser } from "@/lib/auth/role-guard";

export async function POST() {
  try {
    resetDemoStore();

    const user = await getCurrentUser();
    await logAuditEvent({
      actor_id: user?.id || "demo-reset-actor",
      actor_role: user?.role || "admin",
      action: "DEMO_DATA_RESET",
      resource_type: "system",
      resource_id: "demo-store",
      reason: "Judge evaluation triggered demo store reset to pristine baseline.",
    });

    return NextResponse.json({
      success: true,
      message: "Demo reservations, condition records, and notifications reset to pristine initial state.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reset demo data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

