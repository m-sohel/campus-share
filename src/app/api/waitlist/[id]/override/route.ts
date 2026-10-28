import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { overrideWaitlistEntry } from "@/backend/services/waitlist";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "owner" && user.role !== "manager" && user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized: Lab Owner or Staff permissions required." }, { status: 403 });
    }

    const { id } = await params;
    const { newPriorityScore, reason } = await req.json();

    if (newPriorityScore === undefined || !reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "newPriorityScore and an explanation reason (minimum 5 characters) are required." },
        { status: 400 }
      );
    }

    const result = await overrideWaitlistEntry(id, user.id, Number(newPriorityScore), reason.trim());
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Owner override error:", err);
    return NextResponse.json({ error: err.message || "Failed to process override" }, { status: 500 });
  }
}
