import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { saveResource, getAllResources, logAuditEvent } from "@/lib/data/store";
import { ResourceCategory } from "@/types";

export async function GET() {
  const resources = await getAllResources();
  return NextResponse.json({ resources });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "owner" && user.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Only resource owners and administrators can create or edit resources." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();

    if (!body.name || body.name.trim().length < 3) {
      return NextResponse.json({ error: "Resource name is required (min 3 characters)." }, { status: 400 });
    }

    if (!body.category) {
      return NextResponse.json({ error: "Category selection is required." }, { status: 400 });
    }

    const saved = await saveResource({
      ...body,
      owner_id: body.owner_id || user.id,
      category: body.category as ResourceCategory,
    });

    // Write to audit log
    await logAuditEvent({
      actor_id: user.id,
      actor_role: user.role,
      action: body.id ? "RESOURCE_UPDATED" : "RESOURCE_CREATED",
      resource_type: "resource",
      resource_id: saved.id,
      new_state: { name: saved.name, category: saved.category, location: saved.location },
      reason: body.id
        ? `Owner updated specifications and rules for ${saved.name}.`
        : `Owner listed new resource: ${saved.name} in category ${saved.category}.`,
    });

    return NextResponse.json({ success: true, resource: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save resource";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

