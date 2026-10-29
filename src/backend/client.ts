import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getBackendConfig } from "./config";

/**
 * Privileged Admin Supabase Client
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass Row Level Security.
 * STRICTLY for server-side / backend use only.
 * Always enforces the service-role authorization header to prevent session pollution.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  const { supabaseUrl, supabaseServiceRoleKey } = getBackendConfig();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase backend credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local."
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        apikey: supabaseServiceRoleKey,
      },
    },
  });
}

/**
 * Dedicated, disposable client specifically for verifying user passwords.
 * Uses anon key so it never interferes with the admin client.
 */
export function createAuthClient(): SupabaseClient {
  const { supabaseUrl, supabaseAnonKey } = getBackendConfig();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Server Component / Server Action Client
 * Respects session cookies and Row Level Security for authenticated user requests.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonKey } = getBackendConfig();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Can happen in Server Components; safe to ignore when middleware handles refresh
        }
      },
    },
  });
}
