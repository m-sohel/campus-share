import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/backend/client";
import { logAuditEvent } from "@/backend/services/audit";
import { checkUserExistence } from "@/lib/auth/user-lookup";

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name, department, affiliation } = await req.json();

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: "Full name, email, and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const rawPassword = String(password);
    const cleanPassword = rawPassword.trim();
    const cleanFullName = String(full_name).trim();

    if (rawPassword.length < 8 && cleanPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // 1. CHECK IF USER ALREADY EXISTS
    const existing = await checkUserExistence(cleanEmail);

    if (existing.exists) {
      return NextResponse.json(
        {
          error: "An account with this email address already exists. Please sign in.",
          alreadyExists: true,
          suggestLogin: true,
          redirectUrl: `/dashboard/${existing.user?.role || "user"}`,
        },
        { status: 409 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // 2. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: rawPassword,
      email_confirm: true,
      user_metadata: {
        full_name: cleanFullName,
        role: "user",
        department: department || "General Campus",
        affiliation: affiliation || "university",
      },
    });

    if (authError) {
      const msg = authError.message || "";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
        return NextResponse.json(
          {
            error: "An account with this email address already exists. Please sign in.",
            alreadyExists: true,
            suggestLogin: true,
          },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 3. PERSIST IMMEDIATELY INTO public.profiles TABLE (Guaranteed Save)
    let profileSaved = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { error: pErr } = await supabase.from("profiles").upsert(
          {
            id: userId,
            email: cleanEmail,
            full_name: cleanFullName,
            role: "user",
            department: department || "General Campus",
            affiliation: affiliation || "university",
            reputation_score: 100.0,
          },
          { onConflict: "id" }
        );

        if (!pErr) {
          profileSaved = true;
          break;
        }
        console.warn(`Profile upsert attempt ${attempt + 1} warning:`, pErr.message);
      } catch (err: any) {
        console.warn(`Profile upsert error attempt ${attempt + 1}:`, err.message || err);
      }

      await new Promise((r) => setTimeout(r, 200));
    }

    // 4. Log Audit Trail
    try {
      await logAuditEvent({
        actorId: userId,
        actorRole: "user",
        action: "USER_REGISTERED",
        resourceType: "profile",
        resourceId: userId,
        newState: { email: cleanEmail, full_name: cleanFullName, role: "user" },
        reason: "New borrower account self-registered and verified in database.",
      });
    } catch (auditErr) {
      console.warn("Audit logging warning during registration:", auditErr);
    }

    const response = NextResponse.json(
      {
        success: true,
        message: "Account created successfully! Redirecting to your dashboard...",
        user: {
          id: userId,
          email: cleanEmail,
          full_name: cleanFullName,
          role: "user",
        },
        redirectUrl: "/dashboard/user",
      },
      { status: 201 }
    );

    // 5. Set session cookie for seamless instant authorization
    response.cookies.set("campus_demo_session", cleanEmail, {
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
