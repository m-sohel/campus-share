import { NextRequest, NextResponse } from "next/server";
import { DEMO_USERS } from "@/lib/data/demo-users";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, email, redirectTo } = body;

    let targetUser = DEMO_USERS.find((u) => u.email.toLowerCase() === email?.toLowerCase());

    if (!targetUser && role) {
      targetUser = DEMO_USERS.find((u) => u.role === role);
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: `Demo account for role "${role || email}" not found.` },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        full_name: targetUser.full_name,
        role: targetUser.role,
        department: targetUser.department,
        affiliation: targetUser.affiliation,
      },
      redirectTo: redirectTo || `/dashboard/${targetUser.role}`,
    });

    // Set cookie for session persistence
    response.cookies.set("campus_demo_session", targetUser.email, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to execute demo login";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

