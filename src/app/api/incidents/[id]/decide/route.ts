import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { decideIncident } from "@/lib/data/store";
import { validateManagerDecision } from "@/lib/rules/incidents";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "manager" && user.role !== "owner" && user.role !== "admin")) {
      return NextResponse.json(
        { error: "Forbidden: Only managers, owners or admins can record incident decisions." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const validation = validateManagerDecision(body.decision, body.notes);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }

    const updated = await decideIncident({
      incidentId: id,
      managerId: user.id,
      decision: body.decision,
      notes: body.notes,
      penaltyApplied: body.penalty_applied,
    });

    return NextResponse.json({ success: true, incident: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to record decision" },
      { status: 500 }
    );
  }
}

