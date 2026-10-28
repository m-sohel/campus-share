import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { getAuditLogEntries } from "@/backend/services/audit";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Only admin or staff can view the full system audit log
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return NextResponse.json(
        { error: "Unauthorized: Administrator permissions required to inspect audit logs." },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const actorId = searchParams.get("actorId") || undefined;
    const action = searchParams.get("action") || undefined;
    const resourceType = searchParams.get("resourceType") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 100;

    const entries = await getAuditLogEntries({
      actorId,
      action,
      resourceType,
      startDate,
      endDate,
      limit,
    });

    return NextResponse.json({
      success: true,
      count: entries.length,
      entries,
    });
  } catch (err: any) {
    console.error("Audit query error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to query audit logs." },
      { status: 500 }
    );
  }
}

