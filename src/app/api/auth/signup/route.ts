import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/backend/client";
import { logAuditEvent } from "@/backend/services/audit";

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name, department, affiliation } = await req.json();

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: "Full name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: "user",
        department: department || "General",
        affiliation: affiliation || "university",
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Insert into public.profiles
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      email,
      full_name,
      role: "user",
      department: department || "General Campus",
      affiliation: affiliation || "university",
      reputation_score: 100.0,
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 3. Write to Audit Log (Tamper-proof event)
    try {
      await logAuditEvent({
        actorId: userId,
        action: "USER_REGISTERED",
        resourceType: "profile",
        resourceId: userId,
        newState: { email, full_name, role: "user" },
        reason: "New user self-registration via signup portal.",
      });
    } catch (auditErr) {
      console.warn("Audit logging warning during signup:", auditErr);
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        full_name,
        role: "user",
      },
      redirectUrl: "/dashboard/user",
    });

    // Set session cookie for instant demo/eval login
    response.cookies.set("campus_demo_session", email, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal signup error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
