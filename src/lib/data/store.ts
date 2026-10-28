import { Resource, Credential, AuditLogEntry, ResourceRequirement } from "@/types";
import { SEED_RESOURCES, SEED_CREDENTIALS, SEED_USERS } from "./seed-data";
import { createClientServer } from "@/lib/supabase/server";
import { computeAuditHash } from "@/lib/rules/audit-verifier";
import { calculateListingCompleteness } from "@/lib/rules/completeness";

export { calculateListingCompleteness };

// In-memory runtime cache for seamless offline / demo mode and immediate reactivity
let runtimeResources: Resource[] = SEED_RESOURCES.map((r) => ({
  ...r,
  safety_notes:
    r.category === "fabrication"
      ? "Ensure exhaust fans are on before starting. Wear eye protection."
      : r.category === "electronics"
      ? "ESD grounding required at all times. Verify probe voltage limit."
      : r.category === "media"
      ? "Inspect lens glass and sensor cap. Keep equipment tethered."
      : "Complete bunny suit and decontamination protocol before entry.",
  condition_checklist: [
    "Clean and free of debris",
    "No visible structural cracks or damage",
    "Safety emergency stop / interlock functional",
    "All included accessories and cables present",
    "Operational self-test passed",
  ],
  requirements: r.requirements.map((req, i) => ({
    id: `req-${r.id.slice(0, 8)}-${i}`,
    resource_id: r.id,
    credential_type: req.credential_type,
    min_experience_hours: 0,
    is_mandatory: req.is_mandatory,
    explanation: req.explanation,
    created_at: new Date().toISOString(),
  })),
  availability_slots: [1, 2, 3, 4, 5].map((day) => ({
    id: `slot-${r.id.slice(0, 8)}-${day}`,
    resource_id: r.id,
    day_of_week: day,
    start_time: "09:00",
    end_time: "18:00",
    slot_interval_minutes: 60,
    created_at: new Date().toISOString(),
  })),
  blackout_dates: [],
  created_at: "2026-10-28T00:00:00Z",
  updated_at: "2026-10-28T00:00:00Z",
}));

let runtimeCredentials: Credential[] = SEED_CREDENTIALS.map((c) => ({
  id: c.id,
  user_id: c.user_id,
  credential_type: c.credential_type,
  title: c.title,
  status: c.status,
  issued_at: c.issued_at,
  expires_at: c.expires_at || null,
  verification_notes: c.verification_notes || null,
  created_at: c.issued_at,
}));

let runtimeAuditLog: AuditLogEntry[] = [];



/**
 * Retrieves all resources with attached requirements, slots, and checklist.
 */
export async function getAllResources(): Promise<Resource[]> {
  try {
    const supabase = await createClientServer();
    const { data, error } = await supabase.from("resources").select(`
      *,
      resource_requirements (*)
    `);

    if (!error && data && data.length > 0) {
      // Map and merge with runtime memory
      return data.map((r) => {
        const mem = runtimeResources.find((m) => m.id === r.id);
        return {
          ...r,
          requirements: r.resource_requirements || mem?.requirements || [],
          safety_notes: mem?.safety_notes || "Standard institutional lab safety rules apply.",
          condition_checklist: mem?.condition_checklist || [
            "Equipment intact and clean",
            "Emergency stop operational",
            "Accessories returned",
          ],
          availability_slots: mem?.availability_slots || [],
          blackout_dates: mem?.blackout_dates || [],
        };
      });
    }
  } catch {
    // Fallback to runtime store
  }

  return runtimeResources;
}

/**
 * Retrieves a single resource by ID.
 */
export async function getResourceById(id: string): Promise<Resource | null> {
  const all = await getAllResources();
  return all.find((r) => r.id === id) || null;
}

/**
 * Creates or updates a resource.
 */
export async function saveResource(resourceData: Partial<Resource> & { name: string; owner_id: string }): Promise<Resource> {
  const now = new Date().toISOString();
  const id = resourceData.id || `res-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const existingIndex = runtimeResources.findIndex((r) => r.id === id);

  const newResource: Resource = {
    id,
    owner_id: resourceData.owner_id,
    manager_id: resourceData.manager_id || null,
    name: resourceData.name,
    category: resourceData.category || "fabrication",
    description: resourceData.description || "",
    location: resourceData.location || "Campus Makerspace",
    institution: resourceData.institution || "university",
    rules: resourceData.rules || "Treat machinery with care and clean up after use.",
    safety_notes: resourceData.safety_notes || "Follow standard safety protocols.",
    requires_supervision: resourceData.requires_supervision || false,
    min_lead_time_hours: resourceData.min_lead_time_hours || 2,
    max_duration_hours: resourceData.max_duration_hours || 4,
    is_high_demand: resourceData.is_high_demand || false,
    deposit_required_cents: resourceData.deposit_required_cents || 0,
    status: resourceData.status || "available",
    image_url:
      resourceData.image_url ||
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=60",
    condition_checklist: resourceData.condition_checklist || [
      "Physical chassis clean and undamaged",
      "Power and interface cords functional",
      "Consumables / parts verified",
    ],
    requirements: resourceData.requirements || [],
    availability_slots: resourceData.availability_slots || [1, 2, 3, 4, 5].map((d) => ({
      id: `slot-${id}-${d}`,
      resource_id: id,
      day_of_week: d,
      start_time: "09:00",
      end_time: "18:00",
      slot_interval_minutes: 60,
      created_at: now,
    })),
    blackout_dates: resourceData.blackout_dates || [],
    created_at: existingIndex >= 0 ? runtimeResources[existingIndex].created_at : now,
    updated_at: now,
  };

  if (existingIndex >= 0) {
    runtimeResources[existingIndex] = newResource;
  } else {
    runtimeResources.unshift(newResource);
  }

  // Attempt Supabase sync if connected
  try {
    const supabase = await createClientServer();
    await supabase.from("resources").upsert({
      id: newResource.id,
      owner_id: newResource.owner_id,
      manager_id: newResource.manager_id,
      name: newResource.name,
      category: newResource.category,
      description: newResource.description,
      location: newResource.location,
      institution: newResource.institution,
      rules: newResource.rules,
      requires_supervision: newResource.requires_supervision,
      min_lead_time_hours: newResource.min_lead_time_hours,
      max_duration_hours: newResource.max_duration_hours,
      is_high_demand: newResource.is_high_demand,
      deposit_required_cents: newResource.deposit_required_cents,
      status: newResource.status,
      image_url: newResource.image_url,
      updated_at: now,
    });
  } catch {
    // Ignore in fallback mode
  }

  return newResource;
}

/**
 * Retrieves credentials, optionally filtered by user ID.
 */
export async function getCredentials(userId?: string): Promise<Credential[]> {
  try {
    const supabase = await createClientServer();
    let query = supabase.from("credentials").select("*");
    if (userId) {
      query = query.eq("user_id", userId);
    }
    const { data } = await query;
    if (data && data.length > 0) {
      return data as Credential[];
    }
  } catch {
    // Ignore in fallback mode
  }

  if (userId) {
    return runtimeCredentials.filter((c) => c.user_id === userId);
  }
  return runtimeCredentials;
}

/**
 * Creates or updates a credential.
 */
export async function saveCredential(cred: Partial<Credential> & { user_id: string; credential_type: string; title: string }): Promise<Credential> {
  const now = new Date().toISOString();
  const id = cred.id || `cred-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const existingIndex = runtimeCredentials.findIndex((c) => c.id === id);

  const updated: Credential = {
    id,
    user_id: cred.user_id,
    credential_type: cred.credential_type,
    title: cred.title,
    status: cred.status || "pending",
    issued_at: cred.issued_at || now,
    expires_at: cred.expires_at || null,
    verified_by: cred.verified_by || null,
    verification_notes: cred.verification_notes || null,
    evidence_url: cred.evidence_url || null,
    created_at: existingIndex >= 0 ? runtimeCredentials[existingIndex].created_at : now,
  };

  if (existingIndex >= 0) {
    runtimeCredentials[existingIndex] = updated;
  } else {
    runtimeCredentials.unshift(updated);
  }

  // Supabase sync
  try {
    const supabase = await createClientServer();
    await supabase.from("credentials").upsert({
      id: updated.id,
      user_id: updated.user_id,
      credential_type: updated.credential_type,
      title: updated.title,
      status: updated.status,
      issued_at: updated.issued_at,
      expires_at: updated.expires_at,
      verified_by: updated.verified_by,
      verification_notes: updated.verification_notes,
    });
  } catch {
    // Fallback
  }

  return updated;
}

/**
 * Appends an entry to the cryptographic audit log.
 */
export async function logAuditEvent(entry: {
  actor_id: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  reason: string;
}): Promise<AuditLogEntry> {
  const prevEntry = runtimeAuditLog[runtimeAuditLog.length - 1];
  const prevHash = prevEntry ? prevEntry.hash : "GENESIS_HASH";
  const now = new Date().toISOString();
  const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const hash = computeAuditHash(prevHash, {
    id,
    actor_id: entry.actor_id,
    action: entry.action,
    resource_type: entry.resource_type,
    resource_id: entry.resource_id,
    new_state: entry.new_state,
    reason: entry.reason,
    created_at: now,
  });

  const fullEntry: AuditLogEntry = {
    id,
    actor_id: entry.actor_id,
    actor_role: entry.actor_role,
    action: entry.action,
    resource_type: entry.resource_type,
    resource_id: entry.resource_id,
    previous_state: entry.previous_state || null,
    new_state: entry.new_state || null,
    reason: entry.reason,
    ip_address: "127.0.0.1",
    user_agent: "CampusShare-App",
    prev_hash: prevHash,
    hash,
    created_at: now,
  };

  runtimeAuditLog.push(fullEntry);

  try {
    const supabase = await createClientServer();
    await supabase.from("audit_log").insert(fullEntry);
  } catch {
    // Fallback
  }

  return fullEntry;
}

export function getAuditLogs(): AuditLogEntry[] {
  return runtimeAuditLog;
}
