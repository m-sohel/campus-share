import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Profile, UserRole } from "@/types";
import { createClientServer } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/backend/client";
import { DEMO_USERS } from "@/lib/data/demo-users";

/**
 * Retrieves the currently logged-in user profile from Supabase Auth or active session cookie.
 */
export async function getCurrentUser(): Promise<Profile | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("campus_demo_session")?.value;

  // 1. Check for active session cookie (demo users or registered platform users)
  if (sessionCookie) {
    let cleanEmail = sessionCookie.trim().toLowerCase();
    try {
      cleanEmail = decodeURIComponent(cleanEmail);
    } catch {
      // fallback to raw value
    }

    const demoUser = DEMO_USERS.find((u) => u.email.toLowerCase() === cleanEmail);
    if (demoUser) {
      return {
        id: demoUser.id,
        email: demoUser.email,
        full_name: demoUser.full_name,
        role: demoUser.role,
        department: demoUser.department,
        affiliation: demoUser.affiliation,
        avatar_url: null,
        reputation_score: demoUser.reputation_score,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    // Look up registered user profile from Supabase DB
    try {
      const adminClient = getSupabaseAdminClient();
      const { data: dbProfile } = await adminClient
        .from("profiles")
        .select("*")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (dbProfile) {
        return dbProfile as Profile;
      }
    } catch (err) {
      console.warn("DB profile session lookup notice:", err);
    }
  }

  // 2. Otherwise check Supabase Auth using secure getUser()
  try {
    const supabase = await createClientServer();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (profile) {
      return profile as Profile;
    }

    // Fallback if profile row is pending creation
    return {
      id: authUser.id,
      email: authUser.email || "",
      full_name: authUser.user_metadata?.full_name || "Campus Member",
      role: (authUser.user_metadata?.role as UserRole) || "user",
      department: authUser.user_metadata?.department || null,
      affiliation: authUser.user_metadata?.affiliation || "university",
      avatar_url: null,
      reputation_score: 100,
      created_at: authUser.created_at,
      updated_at: authUser.created_at,
    };
  } catch {
    return null;
  }
}

/**
 * Server-side permission helper: ensures the user has one of the allowed roles.
 * If unauthenticated -> redirects to /login.
 * If unauthorized -> redirects to their home dashboard with reason.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<Profile> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?error=auth_required");
  }

  if (!allowedRoles.includes(user.role)) {
    redirect(`/dashboard/${user.role}?error=unauthorized_role_access`);
  }

  return user;
}

/**
 * Ensures user is authenticated regardless of specific role.
 */
export async function requireAuth(): Promise<Profile> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?error=auth_required");
  }

  return user;
}
