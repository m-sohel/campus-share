import { NextRequest, NextResponse } from "next/server";
import { checkLoginRateLimit, resetLoginRateLimit } from "@/lib/auth/rate-limiter";
import { DEMO_USERS } from "@/lib/data/demo-users";
import { createClientServer } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/backend/client";
import { logAuditEvent } from "@/backend/services/audit";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const rawPassword = String(password);
    const cleanPassword = rawPassword.trim();

    // 1. Check Rate Limit
    const clientIp = req.headers.get("x-forwarded-for") || "local-client";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const rateLimitKey = `${clientIp}::${cleanEmail}`;
    const rateLimit = checkLoginRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: rateLimit.message || "Too many failed attempts. Please slow down.",
          resetInSeconds: rateLimit.resetInSeconds,
        },
        { status: 429 }
      );
    }

    // 2. Check Seeded / Demo Users
    const demoMatch = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (demoMatch && (rawPassword === demoMatch.password || cleanPassword === demoMatch.password)) {
      resetLoginRateLimit(rateLimitKey);

      // Log login event to tamper-evident audit trail
      try {
        await logAuditEvent({
          actorId: demoMatch.id,
          actorRole: demoMatch.role,
          action: "USER_LOGGED_IN",
          resourceType: "session",
          resourceId: demoMatch.id,
          ipAddress: clientIp,
          userAgent,
          reason: `User signed in successfully as ${demoMatch.role} persona.`,
        });
      } catch (e) {
        console.warn("Audit logging warning on login:", e);
      }

      const response = NextResponse.json({
        success: true,
        user: {
          id: demoMatch.id,
          email: demoMatch.email,
          full_name: demoMatch.full_name,
          role: demoMatch.role,
        },
        redirectUrl: `/dashboard/${demoMatch.role}`,
      });

      // Set cookie for session persistence
      response.cookies.set("campus_demo_session", demoMatch.email, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    // 3. Fallback: Authenticate via Supabase Auth
    try {
      const supabase = await createClientServer();
      
      // Try with raw password first
      let authResult = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: rawPassword,
      });

      // If failed and password has spaces, try trimmed password
      if (authResult.error && rawPassword !== cleanPassword) {
        authResult = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });
      }

      const { data, error } = authResult;

      if (!error && data.user) {
        resetLoginRateLimit(rateLimitKey);

        let role = "user";
        let fullName = data.user.user_metadata?.full_name || "Campus Member";

        // Query profiles table safely with admin client to bypass RLS
        try {
          const adminClient = getSupabaseAdminClient();
          const { data: profile } = await adminClient
            .from("profiles")
            .select("role, full_name")
            .eq("id", data.user.id)
            .maybeSingle();

          if (profile?.role) role = profile.role;
          if (profile?.full_name) fullName = profile.full_name;
        } catch (profErr) {
          console.warn("Profile fetch warning on login:", profErr);
        }

        try {
          await logAuditEvent({
            actorId: data.user.id,
            actorRole: role,
            action: "USER_LOGGED_IN",
            resourceType: "session",
            resourceId: data.user.id,
            ipAddress: clientIp,
            userAgent,
            reason: `User authenticated via Supabase credentials as ${role}.`,
          });
        } catch (e) {
          console.warn("Audit logging warning on Supabase login:", e);
        }

        const response = NextResponse.json({
          success: true,
          user: {
            ...data.user,
            full_name: fullName,
            role,
          },
          redirectUrl: `/dashboard/${role}`,
        });

        // Set session cookie for seamless server-side authorization in role-guard
        response.cookies.set("campus_demo_session", cleanEmail, {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return response;
      } else if (error) {
        console.warn("Supabase signIn attempt failed:", error.message);
      }
    } catch (supabaseErr: any) {
      console.warn("Supabase connection exception:", supabaseErr?.message || supabaseErr);
    }

    // Invalid credentials
    return NextResponse.json(
      {
        error: `Invalid email or password. (${rateLimit.remainingAttempts} attempt(s) remaining before temporary lockout).`,
        remainingAttempts: rateLimit.remainingAttempts,
      },
      { status: 401 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal authentication error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
