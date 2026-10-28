import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { SEED_USERS, SEED_RESOURCES, SEED_CREDENTIALS } from "../src/lib/data/seed-data";
import { computeAuditHash } from "../src/lib/rules/audit-verifier";

config({ path: ".env.local" });
config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function seed() {
  console.log("==========================================");
  console.log("🌱 CampusShare: Initializing Idempotent Seed");
  console.log("==========================================");

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("placeholder")) {
    console.log("⚠️ No remote Supabase connection detected in .env.local.");
    console.log("ℹ️ Running in Local Evaluation & Demo Mode.");
    console.log(`✅ Loaded ${SEED_USERS.length} accounts:`);
    console.log(`   - 1 Admin: admin@campusshare.edu`);
    console.log(`   - 2 Owners: owner.lab@campusshare.edu, owner.makerspace@campusshare.edu`);
    console.log(`   - 1 Manager: manager.tech@campusshare.edu`);
    console.log(`   - 6 Users: researcher, expired, pending, startup, new, revoked`);
    console.log(`✅ Loaded ${SEED_RESOURCES.length} resources across 4 categories.`);
    console.log(`✅ Loaded ${SEED_CREDENTIALS.length} credentials with varied validity.`);
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`📡 Connected to Supabase at: ${supabaseUrl}`);

  // Fetch all existing users once to avoid rate limits
  const { data: userListRes } = await supabase.auth.admin.listUsers();
  const existingUsers = userListRes?.users || [];

  const idMap = new Map<string, string>(); // seedUserId -> realAuthUserId

  // 1. Seed Users
  console.log("\n👤 Seeding Profiles & Auth Users...");
  for (const user of SEED_USERS) {
    const existing = existingUsers.find((u) => u.email === user.email);

    let authUserId = user.id;

    if (!existing) {
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name,
          role: user.role,
          department: user.department,
          affiliation: user.affiliation,
        },
      });

      if (error) {
        console.warn(`  ⚠️ Could not create auth user ${user.email}: ${error.message}`);
      } else if (created?.user) {
        authUserId = created.user.id;
        console.log(`  ✓ Created auth user: ${user.email} (${user.role})`);
      }
    } else {
      authUserId = existing.id;
      console.log(`  ✓ Auth user already exists: ${user.email}`);
    }

    idMap.set(user.id, authUserId);

    // Upsert into public.profiles
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: authUserId,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        department: user.department,
        affiliation: user.affiliation,
        reputation_score: user.reputation_score,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.warn(`  ⚠️ Profile upsert warning for ${user.email}: ${profileError.message}`);
    }
  }

  // 2. Seed Resources & Requirements
  console.log("\n🔬 Seeding Resources & Requirements...");
  for (const res of SEED_RESOURCES) {
    const realOwnerId = idMap.get(res.owner_id) || res.owner_id;
    const realManagerId = res.manager_id ? idMap.get(res.manager_id) || res.manager_id : null;

    const { error: resError } = await supabase.from("resources").upsert(
      {
        id: res.id,
        owner_id: realOwnerId,
        manager_id: realManagerId,
        name: res.name,
        category: res.category,
        description: res.description,
        location: res.location,
        institution: res.institution,
        rules: res.rules,
        requires_supervision: res.requires_supervision,
        min_lead_time_hours: res.min_lead_time_hours,
        max_duration_hours: res.max_duration_hours,
        is_high_demand: res.is_high_demand,
        deposit_required_cents: res.deposit_required_cents,
        status: res.status,
        image_url: res.image_url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (resError) {
      console.warn(`  ⚠️ Resource upsert error for ${res.name}: ${resError.message}`);
    } else {
      console.log(`  ✓ Seeded resource: [${res.category}] ${res.name}`);
    }

    // Seed Requirements
    for (const req of res.requirements) {
      await supabase.from("resource_requirements").upsert(
        {
          resource_id: res.id,
          credential_type: req.credential_type,
          is_mandatory: req.is_mandatory,
          explanation: req.explanation,
        },
        { onConflict: "id" }
      );
    }

    // Seed default availability slots: Mon-Fri 09:00 - 18:00
    for (let day = 1; day <= 5; day++) {
      await supabase.from("availability_slots").upsert({
        resource_id: res.id,
        day_of_week: day,
        start_time: "09:00:00",
        end_time: "18:00:00",
        slot_interval_minutes: 60,
      });
    }
  }

  // 3. Seed Credentials
  console.log("\n🎖️ Seeding Credentials...");
  for (const cred of SEED_CREDENTIALS) {
    const realUserId = idMap.get(cred.user_id) || cred.user_id;

    const { error: credError } = await supabase.from("credentials").upsert(
      {
        id: cred.id,
        user_id: realUserId,
        credential_type: cred.credential_type,
        title: cred.title,
        status: cred.status,
        issued_at: cred.issued_at,
        expires_at: cred.expires_at || null,
        verification_notes: cred.verification_notes || null,
      },
      { onConflict: "id" }
    );

    if (credError) {
      console.warn(`  ⚠️ Credential upsert warning: ${credError.message}`);
    } else {
      console.log(`  ✓ Credential: ${cred.title} (${cred.status})`);
    }
  }

  // 4. Initial Audit Log Entry
  const adminRealId = idMap.get("00000000-0000-0000-0000-000000000001") || "00000000-0000-0000-0000-000000000001";
  const genesisEntry = {
    id: "30000000-0000-0000-0000-000000000001",
    actor_id: adminRealId,
    actor_role: "admin",
    action: "SYSTEM_INITIALIZED",
    resource_type: "system",
    resource_id: "seed-v1",
    new_state: { seeded_users: 10, seeded_resources: 8 },
    reason: "Initial system seeding and audit chain bootstrap.",
    prev_hash: "GENESIS_HASH",
    created_at: new Date().toISOString(),
  };

  const genesisHash = computeAuditHash("GENESIS_HASH", genesisEntry);

  await supabase.from("audit_log").upsert(
    {
      ...genesisEntry,
      hash: genesisHash,
    },
    { onConflict: "id" }
  );

  console.log("\n⛓️ Initialized cryptographically chained audit log.");
  console.log("==========================================");
  console.log("🎉 Seed finished successfully!");
  console.log("==========================================");
}

seed().catch((err) => {
  console.error("Fatal error during seeding:", err);
  process.exit(1);
});
