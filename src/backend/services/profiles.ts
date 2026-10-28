import { getSupabaseAdminClient } from "../client";
import { Profile, Credential } from "@/types";

/**
 * Backend Data Service for Profiles & Credentials
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error(`Error fetching profile for ${userId}:`, error);
    return null;
  }

  return data as Profile;
}

export async function getUserCredentials(userId: string): Promise<Credential[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("credentials")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error(`Error fetching credentials for ${userId}:`, error);
    return [];
  }

  return (data || []) as Credential[];
}

export async function getPendingVerifications(): Promise<Credential[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("credentials")
    .select("*, profiles(*)")
    .eq("status", "pending_verification")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching pending verifications:", error);
    return [];
  }

  return (data || []) as Credential[];
}

