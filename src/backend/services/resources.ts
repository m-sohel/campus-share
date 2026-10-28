import { getSupabaseAdminClient } from "../client";
import { Resource } from "@/types";

/**
 * Backend Data Service for Resources
 */
export async function listResources(filters?: {
  category?: string;
  institution?: string;
  availableOnly?: boolean;
}) {
  const supabase = getSupabaseAdminClient();
  let query = supabase.from("resources").select(`
    *,
    resource_requirements (*),
    availability_slots (*)
  `);

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  if (filters?.institution) {
    query = query.eq("institution", filters.institution);
  }
  if (filters?.availableOnly) {
    query = query.eq("status", "available");
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error listing resources:", error);
    throw error;
  }

  return (data || []) as Resource[];
}

export async function getResourceById(id: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("resources")
    .select(`
      *,
      resource_requirements (*),
      availability_slots (*),
      blackout_dates (*)
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Error fetching resource ${id}:`, error);
    return null;
  }

  return data as Resource;
}

