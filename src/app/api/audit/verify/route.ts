import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { verifyAuditTrailIntegrity } from "@/backend/services/audit";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: Only administrators can trigger audit chain verification." },
        { status: 403 }
      );
    }

    const result = await verifyAuditTrailIntegrity();

    return NextResponse.json({
      success: true,
      verification: result,
    });
  } catch (err: any) {
    console.error("Audit verification error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to verify audit trail integrity." },
      { status: 500 }
    );
  }
}
