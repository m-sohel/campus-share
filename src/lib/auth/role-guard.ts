import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Profile, UserRole } from "@/types";
import { createClientServer } from "@/lib/supabase/server";
import { DEMO_USERS } from "@/lib/data/demo-users";

/**
 * Retrieves the currently logged-in user profile from Supabase Auth or active demo session.
 */
export async function getCurrentUser(): Promise<Profile | null> {
  const cookieStore = await cookies();
  const demoCookie = cookieStore.get("campus_demo_session")?.value;

  // 1. Check for active demo session (useful for instant evaluation & local tests)
  if (demoCookie) {
    const demoUser = DEMO_USERS.find((u) => u.email === demoCookie);
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
  }

  // 2. Otherwise check Supabase Auth
  try {
    const supabase = await createClientServer();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profile) {
      return profile as Profile;
    }

    // Fallback if profile row is pending creation
    return {
      id: session.user.id,
      email: session.user.email || "",
      full_name: session.user.user_metadata?.full_name || "Campus Member",
      role: (session.user.user_metadata?.role as UserRole) || "user",
      department: session.user.user_metadata?.department || null,
      affiliation: session.user.user_metadata?.affiliation || "university",
      avatar_url: null,
      reputation_score: 100,
      created_at: session.user.created_at,
      updated_at: session.user.created_at,
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
