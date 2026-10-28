import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { respondToWaitlistOffer } from "@/backend/services/waitlist";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { action } = await req.json();

    if (action !== "accept" && action !== "decline") {
      return NextResponse.json({ error: "Action must be 'accept' or 'decline'" }, { status: 400 });
    }

    const result = await respondToWaitlistOffer(id, user.id, action);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Waitlist offer response error:", err);
    return NextResponse.json({ error: err.message || "Failed to respond to offer" }, { status: 500 });
  }
}

