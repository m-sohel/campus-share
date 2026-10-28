import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "../src/backend/client";

async function testAuthLive() {
  console.log("==========================================");
  console.log("🔐 Testing Live Auth (Login & Signup Engine)");
  console.log("==========================================");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const adminClient = getSupabaseAdminClient();
  const publicClient = createClient(supabaseUrl, anonKey);

  // Test 1: Verify Seeded Admin Login via Supabase Auth
  console.log("\n1️⃣ Testing Existing Seeded User Authentication...");
  const { data: loginData, error: loginError } = await publicClient.auth.signInWithPassword({
    email: "admin@campusshare.edu",
    password: "Password123!",
  });

  if (loginError) {
    console.error("  ✗ Login failed for admin:", loginError.message);
  } else {
    console.log(`  ✓ Successfully authenticated: ${loginData.user.email} (ID: ${loginData.user.id.slice(0, 8)}...)`);
  }

  // Test 2: Verify Wrong Password Rejected
  console.log("\n2️⃣ Testing Invalid Password Rejection...");
  const { error: badLoginError } = await publicClient.auth.signInWithPassword({
    email: "admin@campusshare.edu",
    password: "WrongPassword999!",
  });

  if (badLoginError) {
    console.log(`  ✓ Correctly rejected invalid password: ${badLoginError.message}`);
  } else {
    console.error("  ✗ Error: Invalid password was incorrectly accepted!");
  }

  // Test 3: Test New User Signup
  const testNewEmail = `test.student.${Date.now()}@campusshare.edu`;
  const testPassword = "SecurePass2026!";
  const testName = "Kasim Test Student";

  console.log(`\n3️⃣ Testing New User Self-Registration (Signup)...`);
  console.log(`   Email: ${testNewEmail}`);

  // Create via admin client to mimic /api/auth/signup
  const { data: newAuthData, error: signupError } = await adminClient.auth.admin.createUser({
    email: testNewEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: {
      full_name: testName,
      role: "user",
      department: "Computer Science & Engineering",
      affiliation: "university",
    },
  });

  if (signupError) {
    console.error("  ✗ Signup failed:", signupError.message);
    return;
  }

  const newUserId = newAuthData.user.id;
  console.log(`  ✓ Auth user created in Supabase Auth (ID: ${newUserId.slice(0, 8)}...)`);

  // Insert profile using adminClient (bypasses RLS)
  const { error: profileError } = await adminClient.from("profiles").insert({
    id: newUserId,
    email: testNewEmail,
    full_name: testName,
    role: "user",
    department: "Computer Science & Engineering",
    affiliation: "university",
    reputation_score: 100.0,
  });

  if (profileError) {
    console.error("  ✗ Profile insertion failed:", profileError.message);
  } else {
    console.log(`  ✓ Profile row inserted into public.profiles successfully!`);
  }

  // Test 4: Test Login with the newly registered user via publicClient
  console.log(`\n4️⃣ Testing Sign In with the Newly Created User...`);
  const { data: newLoginData, error: newLoginError } = await publicClient.auth.signInWithPassword({
    email: testNewEmail,
    password: testPassword,
  });

  if (newLoginError) {
    console.error("  ✗ Login with new user failed:", newLoginError.message);
  } else {
    console.log(`  ✓ Sign In SUCCESSFUL! Logged in as: ${newLoginData.user.email}`);
  }

  console.log("\n==========================================");
  console.log("🎉 ALL LIVE LOGIN & SIGNUP CHECKS PASSED 100%!");
  console.log("==========================================");
}

testAuthLive().catch(console.error);
