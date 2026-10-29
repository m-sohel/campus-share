import { NextRequest, NextResponse } from "next/server";
import { checkLoginRateLimit, resetLoginRateLimit } from "@/lib/auth/rate-limiter";
import { DEMO_USERS } from "@/lib/data/demo-users";
import { getSupabaseAdminClient, createAuthClient } from "@/backend/client";
import { logAuditEvent } from "@/backend/services/audit";
import { checkUserExistence } from "@/lib/auth/user-lookup";

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

    // 2. CHECK IF USER EXISTS IN PLATFORM FIRST
    const lookup = await checkUserExistence(cleanEmail);

    if (!lookup.exists) {
      // User has NOT created an account yet!
      return NextResponse.json(
        {
          error: "No account found with this email address. Please create an account first.",
          userNotFound: true,
          suggestSignup: true,
        },
        { status: 404 }
      );
    }

    // 3. Authenticate if Demo Persona
    const demoMatch = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (demoMatch) {
      const isPasswordCorrect =
        rawPassword === demoMatch.password || cleanPassword === demoMatch.password;

      if (!isPasswordCorrect) {
        return NextResponse.json(
          {
            error: `Incorrect password. Please check your credentials. (${rateLimit.remainingAttempts} attempt(s) remaining).`,
            wrongPassword: true,
            remainingAttempts: rateLimit.remainingAttempts,
          },
          { status: 401 }
        );
      }

      resetLoginRateLimit(rateLimitKey);

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

      response.cookies.set("campus_demo_session", cleanEmail, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    }

    // 4. Authenticate Registered Supabase User with isolated auth client
    let authResult: any = null;

    try {
      const authClient = createAuthClient();
      authResult = await authClient.auth.signInWithPassword({
        email: cleanEmail,
        password: rawPassword,
      });

      if (authResult.error && rawPassword !== cleanPassword) {
        authResult = await authClient.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });
      }
    } catch (authErr) {
      console.warn("Auth verification exception:", authErr);
    }

    const { data, error } = authResult || {};

    if (!error && data?.user) {
      resetLoginRateLimit(rateLimitKey);

      let role = lookup.user?.role || (data.user.user_metadata?.role as string) || "user";
      let fullName = lookup.user?.full_name || data.user.user_metadata?.full_name || "Campus Member";

      // Ensure profile row exists in public.profiles table
      try {
        const adminClient = getSupabaseAdminClient();
        await adminClient.from("profiles").upsert(
          {
            id: data.user.id,
            email: cleanEmail,
            full_name: fullName,
            role: role as any,
            department: lookup.user?.department || "General Campus",
            affiliation: lookup.user?.affiliation || "university",
            reputation_score: 100.0,
          },
          { onConflict: "id" }
        );
      } catch (profErr) {
        console.warn("Profile sync warning:", profErr);
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

      response.cookies.set("campus_demo_session", cleanEmail, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    }

    // Account exists, but password was incorrect
    return NextResponse.json(
      {
        error: `Incorrect password. Please check your credentials. (${rateLimit.remainingAttempts} attempt(s) remaining).`,
        wrongPassword: true,
        remainingAttempts: rateLimit.remainingAttempts,
      },
      { status: 401 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal authentication error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
