import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { getFairnessSettings, updateFairnessSettings } from "@/backend/services/fairness";

export async function GET() {
  try {
    const settings = await getFairnessSettings();
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const updated = await updateFairnessSettings(body, user.id);

    return NextResponse.json({
      success: true,
      settings: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
