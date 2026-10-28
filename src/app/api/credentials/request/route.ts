import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { saveCredential, logAuditEvent } from "@/lib/data/store";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { credential_type, title, evidence_url, notes } = await req.json();

    if (!credential_type || !title) {
      return NextResponse.json(
        { error: "Credential type and title are required." },
        { status: 400 }
      );
    }

    const newCred = await saveCredential({
      user_id: user.id,
      credential_type,
      title,
      status: "pending",
      verification_notes: notes || "Requested by user. Awaiting staff review.",
      evidence_url: evidence_url || null,
      issued_at: new Date().toISOString(),
    });

    // Write to audit log
    await logAuditEvent({
      actor_id: user.id,
      actor_role: user.role,
      action: "CREDENTIAL_REQUESTED",
      resource_type: "credential",
      resource_id: newCred.id,
      new_state: { credential_type, title, user_id: user.id, status: "pending" },
      reason: `User submitted qualification request for "${title}" (${credential_type}).`,
    });

    return NextResponse.json({ success: true, credential: newCred });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit credential request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

