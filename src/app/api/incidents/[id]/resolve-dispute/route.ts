import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { resolveIncidentDispute } from "@/lib/data/store";
import { validateAdminResolution } from "@/lib/rules/incidents";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only Campus Administrators can arbitrate and resolve disputes." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const validation = validateAdminResolution(body.resolution, body.notes);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }

    const updated = await resolveIncidentDispute({
      incidentId: id,
      adminId: user.id,
      resolution: body.resolution,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, incident: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to resolve dispute" },
      { status: 500 }
    );
  }
}

