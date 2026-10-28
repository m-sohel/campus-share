import { NextRequest, NextResponse } from "next/server";
import { checkLoginRateLimit, resetLoginRateLimit } from "@/lib/auth/rate-limiter";
import { DEMO_USERS } from "@/lib/data/demo-users";
import { createClientServer } from "@/lib/supabase/server";
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

    // 1. Check Rate Limit
    const clientIp = req.headers.get("x-forwarded-for") || "local-client";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const rateLimitKey = `${clientIp}::${email.toLowerCase()}`;
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
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (demoMatch && password === demoMatch.password) {
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

    // 3. Fallback: Authenticate via Supabase Auth if connected
    try {
      const supabase = await createClientServer();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.user) {
        resetLoginRateLimit(rateLimitKey);

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", data.user.id)
          .single();

        const role = profile?.role || "user";

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

        return NextResponse.json({
          success: true,
          user: data.user,
          redirectUrl: `/dashboard/${role}`,
        });
      }
    } catch {
      // Supabase connection unavailable or failed
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
