import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { getCredentials, saveCredential, logAuditEvent } from "@/lib/data/store";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only owners and admins can approve/reject credentials
  if (user.role !== "owner" && user.role !== "admin" && user.role !== "manager") {
    return NextResponse.json(
      { error: "Forbidden: Only staff, owners, and managers can verify qualifications." },
      { status: 403 }
    );
  }

  try {
    const { credential_id, decision, reason } = await req.json();

    if (!credential_id || !decision) {
      return NextResponse.json(
        { error: "Credential ID and decision ('approve' | 'reject') are required." },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "A plain-language reason is mandatory for any qualification decision." },
        { status: 400 }
      );
    }

    const allCreds = await getCredentials();
    const target = allCreds.find((c) => c.id === credential_id);

    if (!target) {
      return NextResponse.json({ error: "Credential not found." }, { status: 404 });
    }

    const prevStatus = target.status;
    const now = new Date();
    const expiry = new Date(now);
    expiry.setFullYear(expiry.getFullYear() + 1); // 1 year validity

    const newStatus = decision === "approve" ? "verified" : "revoked";

    const updated = await saveCredential({
      ...target,
      status: newStatus,
      verified_by: user.id,
      verification_notes: reason,
      issued_at: decision === "approve" ? now.toISOString() : target.issued_at,
      expires_at: decision === "approve" ? expiry.toISOString() : target.expires_at,
    });

    // Write to audit log
    await logAuditEvent({
      actor_id: user.id,
      actor_role: user.role,
      action: decision === "approve" ? "CREDENTIAL_APPROVED" : "CREDENTIAL_REJECTED",
      resource_type: "credential",
      resource_id: target.id,
      previous_state: { status: prevStatus },
      new_state: { status: newStatus, verified_by: user.id, reason },
      reason: `${user.full_name} (${user.role}) ${decision === "approve" ? "approved" : "rejected"} credential "${target.title}": ${reason}`,
    });

    return NextResponse.json({ success: true, credential: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify credential";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

