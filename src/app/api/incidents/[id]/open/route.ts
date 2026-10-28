import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { openDraftIncident } from "@/lib/data/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "manager" && user.role !== "owner" && user.role !== "admin")) {
      return NextResponse.json(
        { error: "Forbidden: Only managers, owners or admins can open draft incidents." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const updated = await openDraftIncident({
      incidentId: id,
      managerId: user.id,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, incident: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to open incident" },
      { status: 500 }
    );
  }
}
