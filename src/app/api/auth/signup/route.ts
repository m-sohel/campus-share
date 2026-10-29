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
    let userId: string | null = null;
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
      const msg = authError.message || "";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
        // Attempt password verification to automatically sign in existing user
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (!signInError && signInData?.user) {
            let role = signInData.user.user_metadata?.role || "user";
            let name = signInData.user.user_metadata?.full_name || full_name;

            try {
              const { data: prof } = await supabase
                .from("profiles")
                .select("id, role, full_name")
                .eq("id", signInData.user.id)
                .maybeSingle();
              if (prof?.role) role = prof.role;
              if (prof?.full_name) name = prof.full_name;
            } catch {
              // fallback to auth metadata
            }

            const response = NextResponse.json({
              success: true,
              message: "Account already exists; signed in successfully.",
              user: {
                id: signInData.user.id,
                email,
                full_name: name,
                role,
              },
              redirectUrl: `/dashboard/${role}`,
            });

            response.cookies.set("campus_demo_session", email, {
              path: "/",
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 60 * 60 * 24 * 7,
            });

            return response;
          }
        } catch {
          // fallback to 409
        }

        // If password was incorrect or sign-in failed
        let role = "user";
        try {
          const { data: existingUser } = await supabase
            .from("profiles")
            .select("id, role, full_name")
            .eq("email", email.toLowerCase().trim())
            .maybeSingle();
          if (existingUser?.role) role = existingUser.role;
        } catch {
          // ignore schema cache error
        }

        return NextResponse.json(
          {
            error: "An account with this email address already exists. Please switch to 'Sign In' or check your password.",
            alreadyExists: true,
            redirectUrl: `/dashboard/${role}`,
          },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    userId = authData.user.id;

    // 2. Insert or Upsert into public.profiles with safe retry
    let profileError: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { error: pErr } = await supabase.from("profiles").upsert(
          {
            id: userId,
            email: email.toLowerCase().trim(),
            full_name,
            role: "user",
            department: department || "General Campus",
            affiliation: affiliation || "university",
            reputation_score: 100.0,
          },
          { onConflict: "id" }
        );

        if (!pErr) {
          profileError = null;
          break;
        }
        profileError = pErr;
      } catch (err: any) {
        profileError = err;
      }

      // Small backoff before retry if schema cache is refreshing
      if (attempt === 0 && profileError) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    if (profileError) {
      console.warn("Notice: public.profiles sync warning:", profileError.message || profileError);
      // Even if profiles table is slow to reflect schema cache, user is created in auth
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

    // Set session cookie for instant login
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
