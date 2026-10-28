import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear demo session cookie
  response.cookies.delete("campus_demo_session");

  // Sign out from Supabase if active
  try {
    const supabase = await createClientServer();
    await supabase.auth.signOut();
  } catch {
    // Ignore sign-out errors on fallback
  }

  return response;
}
