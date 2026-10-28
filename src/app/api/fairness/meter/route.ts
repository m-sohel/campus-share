import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { getUserFairUseStats } from "@/backend/services/fairness";
import { ResourceCategory } from "@/lib/rules/fairness";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const category = (req.nextUrl.searchParams.get("category") || "fabrication") as ResourceCategory;
    const stats = await getUserFairUseStats(user.id, category);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (err: any) {
    console.error("Fair use meter error:", err);
    return NextResponse.json({ error: err.message || "Failed to load fair use meter." }, { status: 500 });
  }
}
