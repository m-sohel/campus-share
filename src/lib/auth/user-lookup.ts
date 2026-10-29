import { getSupabaseAdminClient } from "@/backend/client";
import { DEMO_USERS } from "@/lib/data/demo-users";

export interface UserLookupResult {
  exists: boolean;
  source?: "demo" | "profile" | "auth";
  user?: {
    id: string;
    email: string;
    full_name?: string;
    role: string;
    department?: string | null;
    affiliation?: string;
  };
}

/**
 * Checks whether an email address is already registered in the platform
 * (either as a seeded Demo user, a database profile, or Supabase Auth).
 */
export async function checkUserExistence(email: string): Promise<UserLookupResult> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Check Demo personas
  const demoMatch = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === cleanEmail
  );
  if (demoMatch) {
    return {
      exists: true,
      source: "demo",
      user: {
        id: demoMatch.id,
        email: demoMatch.email,
        full_name: demoMatch.full_name,
        role: demoMatch.role,
        department: demoMatch.department,
        affiliation: demoMatch.affiliation,
      },
    };
  }

  const supabase = getSupabaseAdminClient();

  // 2. Check public.profiles
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, department, affiliation")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (profile) {
      return {
        exists: true,
        source: "profile",
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          department: profile.department,
          affiliation: profile.affiliation,
        },
      };
    }
  } catch (err) {
    console.warn("Profiles lookup notice:", err);
  }

  // 3. Fallback: Check Supabase Auth users list
  try {
    const { data: authList } = await supabase.auth.admin.listUsers();
    const authUser = authList?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );
    if (authUser) {
      return {
        exists: true,
        source: "auth",
        user: {
          id: authUser.id,
          email: authUser.email || cleanEmail,
          full_name: authUser.user_metadata?.full_name,
          role: authUser.user_metadata?.role || "user",
          department: authUser.user_metadata?.department,
          affiliation: authUser.user_metadata?.affiliation,
        },
      };
    }
  } catch (err) {
    console.warn("Auth list lookup notice:", err);
  }

  return { exists: false };
}
