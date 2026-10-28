import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { getIncidents, createIncident } from "@/lib/data/store";
import { validateIncidentReport } from "@/lib/rules/incidents";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("booking_id") || undefined;
  const status = (searchParams.get("status") as any) || undefined;
  const userId = searchParams.get("user_id") || undefined;

  const incidents = await getIncidents({ bookingId, status, userId });
  return NextResponse.json({ incidents });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = validateIncidentReport(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }

    const newIncident = await createIncident({
      booking_id: body.booking_id,
      reporter_id: user.id,
      type: body.type,
      severity: body.severity,
      title: body.title,
      description: body.description,
      evidence_text: body.evidence_text,
      evidence_url: body.evidence_url,
      status: body.status || "open",
    });

    return NextResponse.json({ success: true, incident: newIncident });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create incident" },
      { status: 500 }
    );
  }
}

