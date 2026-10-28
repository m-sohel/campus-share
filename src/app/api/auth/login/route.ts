import { NextRequest, NextResponse } from "next/server";
import { checkLoginRateLimit, resetLoginRateLimit } from "@/lib/auth/rate-limiter";
import { DEMO_USERS } from "@/lib/data/demo-users";
import { createClientServer } from "@/lib/supabase/server";

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
          .select("role")
          .eq("id", data.user.id)
          .single();

        const role = profile?.role || "user";

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
    const message = err instanceof Error ? err.message : "Internal login error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

