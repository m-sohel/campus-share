import {
  Resource,
  Credential,
  AuditLogEntry,
  ResourceRequirement,
  Booking,
  BookingStatus,
  UserRole,
  ConditionRecord,
  Incident,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  IncidentTimelineEvent,
  Profile,
  Notification,
} from "@/types";
import { SEED_RESOURCES, SEED_CREDENTIALS, SEED_USERS } from "./seed-data";
import { createClientServer } from "@/lib/supabase/server";
import { computeAuditHash } from "@/lib/rules/audit-verifier";
import { calculateListingCompleteness } from "@/lib/rules/completeness";
import { computeConditionDiff, checkLateReturn, ChecklistItemRecord } from "@/lib/rules/condition";
import {
  canTransitionIncident,
  getManagerDecisionLabel,
  getAdminResolutionLabel,
} from "@/lib/rules/incidents";
import {
  getAppTime,
  resetAppClock,
  detectTimeTriggerEvents,
  TriggeredTimeEvent,
} from "@/lib/rules/clock";

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
    actor_role: entry.actor_role,
    action: entry.action,
    resource_type: entry.resource_type,
    resource_id: entry.resource_id,
    previous_state: entry.previous_state || null,
    new_state: entry.new_state || null,
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

// -------------------------------------------------------------
// STAGE 4: BOOKINGS, CONDITION RECORDS & INCIDENT PERSISTENCE
// -------------------------------------------------------------

const now = Date.now();
const oneHour = 60 * 60 * 1000;

let runtimeBookings: Booking[] = [
  // 1. Approved Laser Cutter reservation - Ready for Step 7 Check-in
  {
    id: "b-approved-laser",
    resource_id: "20000000-0000-0000-0000-000000000001", // Epilog Laser Cutter
    user_id: "00000000-0000-0000-0000-000000000005", // Sarah Jenkins (Certified)
    start_time: new Date(now - oneHour).toISOString(),
    end_time: new Date(now + 2 * oneHour).toISOString(),
    status: "approved",
    purpose: "Laser cutting acrylic chassis brackets for autonomous ground rover.",
    fairness_score: 9.2,
    reviewed_by: "00000000-0000-0000-0000-000000000002",
    created_at: new Date(now - 5 * oneHour).toISOString(),
    updated_at: new Date(now - oneHour).toISOString(),
  },
  // 2. In-Use Keysight Oscilloscope - Checked in 3 hours ago, ready for Step 8 Return (test degradation)!
  {
    id: "b-in-use-scope",
    resource_id: "20000000-0000-0000-0000-000000000003", // Keysight Oscilloscope
    user_id: "00000000-0000-0000-0000-000000000008", // David Kim (Startup)
    start_time: new Date(now - 3 * oneHour).toISOString(),
    end_time: new Date(now - 30 * 60 * 1000).toISOString(), // Ended 30m ago to test late return
    status: "in_use",
    purpose: "High-speed differential signal jitter measurement for neural interface board.",
    fairness_score: 8.8,
    reviewed_by: "00000000-0000-0000-0000-000000000004",
    created_at: new Date(now - 8 * oneHour).toISOString(),
    updated_at: new Date(now - 3 * oneHour).toISOString(),
  },
  // 3. In-Use Prusa 3D Printer - Active, on-time session ready for clean return test
  {
    id: "b-in-use-prusa",
    resource_id: "20000000-0000-0000-0000-000000000002", // Prusa MK4 3D Printer
    user_id: "00000000-0000-0000-0000-000000000009", // Maya Lin
    start_time: new Date(now - oneHour).toISOString(),
    end_time: new Date(now + 3 * oneHour).toISOString(),
    status: "in_use",
    purpose: "3D printing ergonomic grip prototypes for medical rehabilitation tool.",
    fairness_score: 8.5,
    reviewed_by: "00000000-0000-0000-0000-000000000004",
    created_at: new Date(now - 4 * oneHour).toISOString(),
    updated_at: new Date(now - oneHour).toISOString(),
  },
  // 4. Completed Reservation with both condition records logged (Sony FX3)
  {
    id: "b-completed-camera",
    resource_id: "20000000-0000-0000-0000-000000000005", // Sony FX3
    user_id: "00000000-0000-0000-0000-000000000007", // Amara Okafor
    start_time: new Date(now - 24 * oneHour).toISOString(),
    end_time: new Date(now - 20 * oneHour).toISOString(),
    status: "completed",
    purpose: "Documentary interview filming for campus sustainability initiative.",
    fairness_score: 9.0,
    reviewed_by: "00000000-0000-0000-0000-000000000002",
    created_at: new Date(now - 30 * oneHour).toISOString(),
    updated_at: new Date(now - 20 * oneHour).toISOString(),
  },
  // 5. Pending Review - Cleanroom Lithography Lab (Sarah Jenkins requested, awaiting Elena Rostova review)
  {
    id: "b-pending-review-cleanroom",
    resource_id: "20000000-0000-0000-0000-000000000006", // Cleanroom Lithography
    user_id: "00000000-0000-0000-0000-000000000005", // Sarah Jenkins
    start_time: new Date(now + 24 * oneHour).toISOString(),
    end_time: new Date(now + 28 * oneHour).toISOString(),
    status: "pending_review",
    purpose: "E-beam mask exposure for microfluidic biosensor prototype.",
    fairness_score: 9.4,
    reviewed_by: null,
    created_at: new Date(now - 2 * oneHour).toISOString(),
    updated_at: new Date(now - 2 * oneHour).toISOString(),
  },
  // 6. Waitlisted - Contested Epilog Laser Cutter slot (David Kim, startup prototype)
  {
    id: "b-waitlisted-laser",
    resource_id: "20000000-0000-0000-0000-000000000001", // Epilog Laser Cutter
    user_id: "00000000-0000-0000-0000-000000000008", // David Kim
    start_time: new Date(now + 5 * oneHour).toISOString(),
    end_time: new Date(now + 7 * oneHour).toISOString(),
    status: "waitlisted",
    purpose: "Cutting acrylic housings for wearable sensor test batch.",
    fairness_score: 7.8,
    reviewed_by: "00000000-0000-0000-0000-000000000002",
    created_at: new Date(now - 6 * oneHour).toISOString(),
    updated_at: new Date(now - 5 * oneHour).toISOString(),
  },
  // 7. Pending Verification - DJI Inspire Drone (Maya Lin, license awaiting check)
  {
    id: "b-pending-verification-drone",
    resource_id: "20000000-0000-0000-0000-000000000007", // DJI Inspire 3
    user_id: "00000000-0000-0000-0000-000000000009", // Maya Lin
    start_time: new Date(now + 48 * oneHour).toISOString(),
    end_time: new Date(now + 52 * oneHour).toISOString(),
    status: "pending_verification",
    purpose: "Aerial thermography survey of campus solar array.",
    fairness_score: 8.1,
    reviewed_by: null,
    created_at: new Date(now - 1 * oneHour).toISOString(),
    updated_at: new Date(now - 1 * oneHour).toISOString(),
  },
  // 8. Flagged Incident - Drone Propeller Crack (Lucas Wright)
  {
    id: "b-flagged-incident-drone",
    resource_id: "20000000-0000-0000-0000-000000000007", // DJI Inspire 3
    user_id: "00000000-0000-0000-0000-000000000010", // Lucas Wright
    start_time: new Date(now - 15 * oneHour).toISOString(),
    end_time: new Date(now - 12 * oneHour).toISOString(),
    status: "flagged_incident",
    purpose: "High-speed outdoor obstacle avoidance flight recording.",
    fairness_score: 6.5,
    reviewed_by: "00000000-0000-0000-0000-000000000004",
    created_at: new Date(now - 18 * oneHour).toISOString(),
    updated_at: new Date(now - 12 * oneHour).toISOString(),
  },
  // 9. Rejected - PCB Printer Safety Violation Conflict (Lucas Wright)
  {
    id: "b-rejected-pcb",
    resource_id: "20000000-0000-0000-0000-000000000004", // Voltera V-One
    user_id: "00000000-0000-0000-0000-000000000010", // Lucas Wright
    start_time: new Date(now - 2 * 24 * oneHour).toISOString(),
    end_time: new Date(now - 2 * 24 * oneHour + 3 * oneHour).toISOString(),
    status: "rejected",
    purpose: "Double-sided PCB trace printing for transmitter unit.",
    fairness_score: 5.2,
    rejection_reason: "Borrower has active safety violation record. Must complete PCB chemical safety renewal workshop first.",
    reviewed_by: "00000000-0000-0000-0000-000000000004",
    created_at: new Date(now - 3 * 24 * oneHour).toISOString(),
    updated_at: new Date(now - 2 * 24 * oneHour).toISOString(),
  },
];

let runtimeConditionRecords: ConditionRecord[] = [
  // Initial Check-in Record for b-in-use-scope
  {
    id: "cond-checkin-scope",
    booking_id: "b-in-use-scope",
    stage: "check_in",
    recorded_by: "00000000-0000-0000-0000-000000000004", // Jordan Taylor
    recorded_by_name: "Jordan Taylor (Makerspace Technician)",
    status: "pristine",
    notes: "Equipment handed over in pristine condition. All 4 differential active probes inspected.",
    items: [
      { item: "Power and interface cords functional", state: "ok", notes: "Probes intact" },
      { item: "No physical cracks, burns, or structural defects", state: "ok", notes: "Chassis clean" },
      { item: "Operational self-test passed", state: "ok", notes: "Self-cal passed" },
      { item: "Clean and free of debris", state: "ok", notes: "Glass screen spotless" },
    ],
    checklist: {},
    media_urls: [],
    created_at: new Date(now - 3 * oneHour).toISOString(),
  },
  // Initial Check-in Record for b-in-use-prusa
  {
    id: "cond-checkin-prusa",
    booking_id: "b-in-use-prusa",
    stage: "check_in",
    recorded_by: "00000000-0000-0000-0000-000000000004", // Jordan Taylor
    recorded_by_name: "Jordan Taylor (Makerspace Technician)",
    status: "pristine",
    notes: "Printer inspected prior to handover. PEI build sheet spotless, nozzle clean.",
    items: [
      { item: "Clean and free of debris", state: "ok", notes: "Bed wiped down with IPA" },
      { item: "No visible structural cracks or damage", state: "ok", notes: "Extruder clean" },
      { item: "Safety emergency stop / interlock functional", state: "ok" },
      { item: "All included accessories and cables present", state: "ok" },
      { item: "Operational self-test passed", state: "ok", notes: "Bed mesh leveling pass" },
    ],
    checklist: {},
    media_urls: [],
    created_at: new Date(now - oneHour).toISOString(),
  },
  // Check-in & Return records for b-completed-camera (Sony FX3)
  {
    id: "cond-checkin-camera",
    booking_id: "b-completed-camera",
    stage: "check_in",
    recorded_by: "00000000-0000-0000-0000-000000000002", // Elena Rostova
    recorded_by_name: "Prof. Elena Rostova",
    status: "pristine",
    notes: "Full cinema kit handed over. Sensor spotless, 24-70mm GM lens in pristine condition.",
    items: [
      { item: "Camera body and mount intact", state: "ok", notes: "Sensor clean" },
      { item: "Lens glass free of scratches and fungus", state: "ok", notes: "Optics pristine" },
      { item: "Batteries (2x) and charger provided", state: "ok" },
      { item: "CFexpress Type A card functional", state: "ok" },
    ],
    checklist: {},
    media_urls: [],
    created_at: new Date(now - 24 * oneHour).toISOString(),
  },
  {
    id: "cond-return-camera",
    booking_id: "b-completed-camera",
    stage: "return",
    recorded_by: "00000000-0000-0000-0000-000000000002",
    recorded_by_name: "Prof. Elena Rostova",
    status: "pristine",
    notes: "Returned on time. Sensor cap attached, all accessories returned in protective Pelican case.",
    items: [
      { item: "Camera body and mount intact", state: "ok", notes: "Returned spotless" },
      { item: "Lens glass free of scratches and fungus", state: "ok", notes: "Lens verified clean" },
      { item: "Batteries (2x) and charger provided", state: "ok" },
      { item: "CFexpress Type A card functional", state: "ok" },
    ],
    checklist: {},
    media_urls: [],
    created_at: new Date(now - 20 * oneHour).toISOString(),
  },
];

let runtimeIncidents: Incident[] = [
  {
    id: "inc-seed-drone-01",
    booking_id: "b-flagged-incident-drone",
    reporter_id: "00000000-0000-0000-0000-000000000004", // Jordan Taylor (Technician)
    reporter_name: "Jordan Taylor",
    affected_user_id: "00000000-0000-0000-0000-000000000010", // Lucas Wright
    affected_user_name: "Lucas Wright",
    resource_id: "res-drone-matrice",
    resource_name: "DJI Matrice 350 RTK Inspection Drone Kit",
    type: "damage",
    severity: "medium",
    status: "draft", // In draft for manager review
    title: "Post-flight motor mount hairline crack",
    description: "Post-flight motor mount hairline crack observed during return inspection. Awaiting technician sign-off.",
    evidence_text: "Visual inspection revealed 1.2cm stress fracture along rear-left arm carbon assembly after field flight test.",
    evidence_url: "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800&auto=format&fit=crop&q=80",
    timeline: [
      {
        id: "evt-draft-01",
        incident_id: "inc-seed-drone-01",
        actor_id: "00000000-0000-0000-0000-000000000004",
        actor_name: "Jordan Taylor",
        actor_role: "manager",
        action: "draft_created",
        notes: "Auto-drafted by condition diff engine following physical return inspection. Awaiting technician sign-off.",
        timestamp: new Date(now - 12 * oneHour).toISOString(),
      },
    ],
    created_at: new Date(now - 12 * oneHour).toISOString(),
    updated_at: new Date(now - 12 * oneHour).toISOString(),
  },
];

let runtimeNotifications: Notification[] = [
  // For Sarah Jenkins (Borrower)
  {
    id: "notif-1",
    user_id: "00000000-0000-0000-0000-000000000005",
    title: "Reservation Approved: Epilog Laser Cutter",
    message: "Your booking #b-approved-laser has been approved by Prof. Elena Rostova. Present your QR pass at Central Engineering Rm 142.",
    type: "success",
    is_read: false,
    link: "/bookings/b-approved-laser",
    created_at: new Date(now - 2 * oneHour).toISOString(),
  },
  {
    id: "notif-2",
    user_id: "00000000-0000-0000-0000-000000000005",
    title: "Handover Reminder: Laser Prototyping",
    message: "Your session starts soon. Please bring ANSI Z136 certified laser safety eyewear.",
    type: "info",
    is_read: false,
    link: "/bookings/b-approved-laser",
    created_at: new Date(now - 45 * 60 * 1000).toISOString(),
  },
  {
    id: "notif-3",
    user_id: "00000000-0000-0000-0000-000000000005",
    title: "Cleanroom Request Under Review",
    message: "Request #b-pending-review-cleanroom passed automated checks and is awaiting faculty review.",
    type: "info",
    is_read: true,
    link: "/dashboard/user",
    created_at: new Date(now - 6 * oneHour).toISOString(),
  },
  // For Elena Rostova (Owner)
  {
    id: "notif-4",
    user_id: "00000000-0000-0000-0000-000000000002",
    title: "Action Required: Cleanroom Lithography Request",
    message: "Sarah Jenkins submitted request #b-pending-review-cleanroom for bio-chip prototyping.",
    type: "action_required",
    is_read: false,
    link: "/dashboard/owner",
    created_at: new Date(now - 3 * oneHour).toISOString(),
  },
  {
    id: "notif-5",
    user_id: "00000000-0000-0000-0000-000000000002",
    title: "Contested Slot on Epilog Laser",
    message: "David Kim was waitlisted (#b-waitlisted-laser). Automated fairness score: 7.8.",
    type: "info",
    is_read: false,
    link: "/dashboard/owner",
    created_at: new Date(now - 5 * oneHour).toISOString(),
  },
  // For Jordan Taylor (Manager / Technician)
  {
    id: "notif-6",
    user_id: "00000000-0000-0000-0000-000000000004",
    title: "Station Handover Ready: Laser Cutter",
    message: "Booking #b-approved-laser is ready for Step 7 physical inspection and handover sign-off.",
    type: "action_required",
    is_read: false,
    link: "/bookings/b-approved-laser/check-in",
    created_at: new Date(now - 1 * oneHour).toISOString(),
  },
  {
    id: "notif-7",
    user_id: "00000000-0000-0000-0000-000000000004",
    title: "Return Due: Keysight Oscilloscope",
    message: "Session ended for David Kim (#b-in-use-scope). Conduct Step 8 return inspection.",
    type: "warning",
    is_read: false,
    link: "/bookings/b-in-use-scope/return",
    created_at: new Date(now - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "notif-8",
    user_id: "00000000-0000-0000-0000-000000000004",
    title: "Draft Incident: Drone Motor Mount",
    message: "Hairline crack flagged on #b-flagged-incident-drone. Review physical evidence before sign-off.",
    type: "warning",
    is_read: true,
    link: "/dashboard/manager",
    created_at: new Date(now - 10 * oneHour).toISOString(),
  },
];

/**
 * Retrieves all bookings.
 */
export async function getAllBookings(): Promise<Booking[]> {
  try {
    const supabase = await createClientServer();
    const { data } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
    if (data && data.length > 0) {
      return data as Booking[];
    }
  } catch {
    // Fallback
  }
  return runtimeBookings;
}

/**
 * Retrieves a booking by ID.
 */
export async function getBookingById(id: string): Promise<Booking | null> {
  const all = await getAllBookings();
  return all.find((b) => b.id === id) || null;
}

/**
 * Updates or creates a booking.
 */
export async function saveBooking(booking: Partial<Booking> & { id: string }): Promise<Booking> {
  const existingIndex = runtimeBookings.findIndex((b) => b.id === booking.id);
  const nowStr = new Date().toISOString();

  let updated: Booking;
  if (existingIndex >= 0) {
    updated = {
      ...runtimeBookings[existingIndex],
      ...booking,
      updated_at: nowStr,
    };
    runtimeBookings[existingIndex] = updated;
  } else {
    updated = {
      id: booking.id,
      resource_id: booking.resource_id || "",
      user_id: booking.user_id || "",
      start_time: booking.start_time || nowStr,
      end_time: booking.end_time || nowStr,
      status: booking.status || "approved",
      purpose: booking.purpose || "Academic prototyping session",
      fairness_score: booking.fairness_score || 5.0,
      created_at: nowStr,
      updated_at: nowStr,
    };
    runtimeBookings.unshift(updated);
  }

  // Supabase sync
  try {
    const supabase = await createClientServer();
    await supabase.from("bookings").upsert(updated);
  } catch {
    // Fallback
  }

  return updated;
}

/**
 * Retrieves condition records for a booking.
 */
export async function getConditionRecords(bookingId?: string): Promise<ConditionRecord[]> {
  try {
    const supabase = await createClientServer();
    let query = supabase.from("condition_records").select("*").order("created_at", { ascending: true });
    if (bookingId) {
      query = query.eq("booking_id", bookingId);
    }
    const { data } = await query;
    if (data && data.length > 0) {
      return data as ConditionRecord[];
    }
  } catch {
    // Fallback
  }

  if (bookingId) {
    return runtimeConditionRecords.filter((c) => c.booking_id === bookingId);
  }
  return runtimeConditionRecords;
}

/**
 * Saves a condition record.
 * If stage is 'return', computes condition diff against initial check-in.
 * If any item worsened, automatically creates a DRAFT incident for manager review.
 */
export async function saveConditionRecord(record: {
  booking_id: string;
  stage: "check_in" | "return";
  recorded_by: string;
  recorded_by_name: string;
  items: ChecklistItemRecord[];
  notes?: string;
}): Promise<{ record: ConditionRecord; incident?: Incident; diffResult?: ReturnType<typeof computeConditionDiff>; lateResult?: ReturnType<typeof checkLateReturn> }> {
  const id = `cond-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const nowIso = new Date().toISOString();

  // Determine overall status grade
  const hasDamaged = record.items.some((i) => i.state === "damaged");
  const hasMinor = record.items.some((i) => i.state === "minor_issue");
  const statusGrade = hasDamaged ? "damaged" : hasMinor ? "minor_wear" : "pristine";

  const newRecord: ConditionRecord = {
    id,
    booking_id: record.booking_id,
    stage: record.stage,
    recorded_by: record.recorded_by,
    recorded_by_name: record.recorded_by_name,
    status: statusGrade,
    notes: record.notes || null,
    items: record.items,
    checklist: {},
    media_urls: [],
    created_at: nowIso,
  };

  runtimeConditionRecords.push(newRecord);

  // Update Booking Status
  const booking = await getBookingById(record.booking_id);
  let createdIncident: Incident | undefined;
  let diffResult: ReturnType<typeof computeConditionDiff> | undefined;
  let lateResult: ReturnType<typeof checkLateReturn> | undefined;

  if (booking) {
    if (record.stage === "check_in") {
      await saveBooking({
        id: booking.id,
        status: "in_use",
      });

      await logAuditEvent({
        actor_id: record.recorded_by,
        actor_role: "manager",
        action: "CHECK_IN_COMPLETED",
        resource_type: "booking",
        resource_id: booking.id,
        new_state: { status: "in_use", condition_id: id, items: record.items },
        reason: `${record.recorded_by_name} verified physical handover. Resource is now In Use.`,
      });
    } else if (record.stage === "return") {
      // Find initial check-in record for diff
      const initialRecord = runtimeConditionRecords.find(
        (c) => c.booking_id === record.booking_id && c.stage === "check_in"
      );

      const checkInItems = (initialRecord?.items as ChecklistItemRecord[]) || [];
      diffResult = computeConditionDiff(checkInItems, record.items);
      lateResult = checkLateReturn(booking.end_time, nowIso);

      // Check if return was late
      let returnReason = `${record.recorded_by_name} completed return inspection.`;
      if (lateResult.isLate) {
        returnReason += ` ${lateResult.explanation}`;
      }

      // Check if anything worsened -> auto-draft incident
      if (diffResult.hasWorsened && diffResult.suggestedIncidentDraft) {
        const incidentId = `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newIncident: Incident = {
          id: incidentId,
          booking_id: booking.id,
          reporter_id: record.recorded_by,
          type: diffResult.suggestedIncidentDraft.type,
          severity: diffResult.suggestedIncidentDraft.severity,
          status: "draft", // Auto-DRAFT status as mandated
          description: diffResult.suggestedIncidentDraft.description + (lateResult.isLate ? ` ${lateResult.explanation}` : ""),
          created_at: nowIso,
        };

        createdIncident = newIncident;
        runtimeIncidents.unshift(newIncident);

        await logAuditEvent({
          actor_id: record.recorded_by,
          actor_role: "manager",
          action: "INCIDENT_DRAFTED",
          resource_type: "incident",
          resource_id: incidentId,
          new_state: newIncident as unknown as Record<string, unknown>,
          reason: `Condition diff detected degradation: auto-created Draft incident for manager review. No automated penalty applied.`,
        });
      }

      await saveBooking({
        id: booking.id,
        status: createdIncident ? "flagged_incident" : "returned",
      });

      await logAuditEvent({
        actor_id: record.recorded_by,
        actor_role: "manager",
        action: "RETURN_COMPLETED",
        resource_type: "booking",
        resource_id: booking.id,
        new_state: {
          status: createdIncident ? "flagged_incident" : "returned",
          condition_id: id,
          worsened: diffResult.hasWorsened,
          late: lateResult.isLate,
        },
        reason: returnReason,
      });
    }
  }

  return {
    record: newRecord,
    incident: createdIncident,
    diffResult,
    lateResult,
  };
}

/**
 * Retrieves all incidents, optionally filtered.
 */
export async function getIncidents(filter?: {
  bookingId?: string;
  status?: IncidentStatus;
  userId?: string;
}): Promise<Incident[]> {
  let list = runtimeIncidents;
  if (filter?.bookingId) {
    list = list.filter((i) => i.booking_id === filter.bookingId);
  }
  if (filter?.status) {
    list = list.filter((i) => i.status === filter.status);
  }
  if (filter?.userId) {
    list = list.filter(
      (i) => i.affected_user_id === filter.userId || i.reporter_id === filter.userId
    );
  }
  return list;
}

/**
 * Retrieves a single incident by ID.
 */
export async function getIncidentById(id: string): Promise<Incident | null> {
  const inc = runtimeIncidents.find((i) => i.id === id);
  return inc ? { ...inc } : null;
}

/**
 * Creates a new incident report (by user, owner, or condition engine).
 */
export async function createIncident(data: {
  booking_id: string;
  reporter_id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  title?: string;
  description: string;
  evidence_text?: string;
  evidence_url?: string;
  status?: IncidentStatus;
}): Promise<Incident> {
  const booking = await getBookingById(data.booking_id);
  const reporter = getUserById(data.reporter_id);
  const resource = booking ? await getResourceById(booking.resource_id) : null;
  const affectedUser = booking ? getUserById(booking.user_id) : null;

  const id = `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const status: IncidentStatus = data.status || "open";
  const nowStr = getAppTime().toISOString();

  const title =
    data.title ||
    `${data.type.replace("_", " ").toUpperCase()}: ${resource ? resource.name : "Equipment Issue"}`;

  const newIncident: Incident = {
    id,
    booking_id: data.booking_id,
    reporter_id: data.reporter_id,
    reporter_name: reporter ? reporter.full_name : "Station Technician",
    affected_user_id: affectedUser ? affectedUser.id : booking?.user_id,
    affected_user_name: affectedUser ? affectedUser.full_name : "Borrower",
    resource_id: resource?.id,
    resource_name: resource?.name,
    type: data.type,
    severity: data.severity,
    status,
    title,
    description: data.description,
    evidence_text: data.evidence_text || null,
    evidence_url: data.evidence_url || null,
    timeline: [
      {
        id: `evt-${Date.now()}-1`,
        incident_id: id,
        actor_id: data.reporter_id,
        actor_name: reporter ? reporter.full_name : "Reporter",
        actor_role: reporter ? reporter.role : "manager",
        action: status === "draft" ? "draft_created" : "incident_opened",
        notes: data.description,
        timestamp: nowStr,
      },
    ],
    created_at: nowStr,
    updated_at: nowStr,
  };

  runtimeIncidents.unshift(newIncident);

  await logAuditEvent({
    actor_id: data.reporter_id,
    actor_role: reporter ? reporter.role : "user",
    action: status === "draft" ? "INCIDENT_DRAFTED" : ("INCIDENT_REPORTED" as any),
    resource_type: "incident",
    resource_id: id,
    new_state: {
      type: data.type,
      severity: data.severity,
      status,
      title,
    },
    reason: `Incident ${status === "draft" ? "auto-drafted" : "reported"}: "${data.description}"`,
  });

  // If opened directly, notify the affected borrower
  if (status === "open" && affectedUser) {
    await createNotification({
      user_id: affectedUser.id,
      title: `⚠️ Incident Opened: ${title}`,
      message: `An incident regarding reservation #${data.booking_id} has been opened for investigation. Please review the details and submit your response statement.`,
      type: "action_required",
      category: "incident_opened",
      link: `/incidents/${id}`,
    });
  }

  return newIncident;
}

/**
 * Opens a draft incident for formal review (Manager/Owner/Admin).
 */
export async function openDraftIncident(params: {
  incidentId: string;
  managerId: string;
  notes?: string;
}): Promise<Incident> {
  const inc = runtimeIncidents.find((i) => i.id === params.incidentId);
  if (!inc) throw new Error("Incident not found");

  const manager = getUserById(params.managerId);
  const nowStr = getAppTime().toISOString();
  const prevStatus = inc.status;

  inc.status = "open";
  inc.updated_at = nowStr;

  inc.timeline = inc.timeline || [];
  inc.timeline.push({
    id: `evt-${Date.now()}`,
    incident_id: inc.id,
    actor_id: params.managerId,
    actor_name: manager ? manager.full_name : "Station Manager",
    actor_role: manager ? manager.role : "manager",
    action: "incident_opened",
    notes: params.notes || "Draft incident formally opened for borrower response and physical review.",
    timestamp: nowStr,
  });

  await logAuditEvent({
    actor_id: params.managerId,
    actor_role: manager ? manager.role : "manager",
    action: "INCIDENT_OPENED" as any,
    resource_type: "incident",
    resource_id: inc.id,
    previous_state: { status: prevStatus },
    new_state: { status: "open" },
    reason: params.notes || "Opened draft incident for formal investigation.",
  });

  if (inc.affected_user_id) {
    await createNotification({
      user_id: inc.affected_user_id,
      title: `⚠️ Incident Opened for Review`,
      message: `Incident #${inc.id} regarding your reservation has been opened. Please submit your statement and explanation.`,
      type: "action_required",
      category: "incident_opened",
      link: `/incidents/${inc.id}`,
    });
  }

  return { ...inc };
}

/**
 * Borrower responds to an incident with their formal statement.
 */
export async function respondToIncident(params: {
  incidentId: string;
  userId: string;
  statement: string;
  evidenceUrl?: string;
}): Promise<Incident> {
  const inc = runtimeIncidents.find((i) => i.id === params.incidentId);
  if (!inc) throw new Error("Incident not found");

  const user = getUserById(params.userId);
  const nowStr = getAppTime().toISOString();

  inc.user_response = params.statement;
  inc.user_response_at = nowStr;
  if (params.evidenceUrl) inc.evidence_url = params.evidenceUrl;
  inc.status = "under_review";
  inc.updated_at = nowStr;

  inc.timeline = inc.timeline || [];
  inc.timeline.push({
    id: `evt-${Date.now()}`,
    incident_id: inc.id,
    actor_id: params.userId,
    actor_name: user ? user.full_name : "Borrower",
    actor_role: user ? user.role : "user",
    action: "user_responded",
    notes: params.statement,
    timestamp: nowStr,
  });

  await logAuditEvent({
    actor_id: params.userId,
    actor_role: user ? user.role : "user",
    action: "INCIDENT_USER_RESPONDED" as any,
    resource_type: "incident",
    resource_id: inc.id,
    previous_state: { status: "open" },
    new_state: { status: "under_review", statement: params.statement },
    reason: `Borrower submitted statement: "${params.statement.slice(0, 80)}..."`,
  });

  // Notify station manager
  if (inc.reporter_id) {
    await createNotification({
      user_id: inc.reporter_id,
      title: `📝 Borrower Statement Submitted`,
      message: `${user?.full_name || "Borrower"} responded to Incident #${inc.id}. Ready for manager decision.`,
      type: "action_required",
      category: "action_required" as any,
      link: `/incidents/${inc.id}`,
    });
  }

  return { ...inc };
}

/**
 * Manager records a formal decision on an incident.
 */
export async function decideIncident(params: {
  incidentId: string;
  managerId: string;
  decision: "fault_user" | "fault_equipment" | "no_fault_wear_and_tear" | "warning_issued" | "cost_share" | "dismissed";
  notes: string;
  penaltyApplied?: string;
}): Promise<Incident> {
  const inc = runtimeIncidents.find((i) => i.id === params.incidentId);
  if (!inc) throw new Error("Incident not found");

  const manager = getUserById(params.managerId);
  const nowStr = getAppTime().toISOString();
  const decisionInfo = getManagerDecisionLabel(params.decision);

  inc.manager_decision = params.decision;
  inc.manager_notes = params.notes;
  inc.decided_by = params.managerId;
  inc.decided_at = nowStr;
  inc.penalty_applied = params.penaltyApplied || null;
  inc.status = "resolved";
  inc.resolved_at = nowStr;
  inc.resolution_notes = `[${decisionInfo.label}] ${params.notes}`;
  inc.updated_at = nowStr;

  inc.timeline = inc.timeline || [];
  inc.timeline.push({
    id: `evt-${Date.now()}`,
    incident_id: inc.id,
    actor_id: params.managerId,
    actor_name: manager ? manager.full_name : "Station Manager",
    actor_role: manager ? manager.role : "manager",
    action: "manager_decided",
    notes: `Finding: ${decisionInfo.label}. Justification: ${params.notes}${
      params.penaltyApplied ? ` (Terms: ${params.penaltyApplied})` : ""
    }`,
    timestamp: nowStr,
  });

  await logAuditEvent({
    actor_id: params.managerId,
    actor_role: manager ? manager.role : "manager",
    action: "INCIDENT_DECIDED" as any,
    resource_type: "incident",
    resource_id: inc.id,
    previous_state: { status: "under_review" },
    new_state: {
      status: "resolved",
      decision: params.decision,
      notes: params.notes,
      penalty: params.penaltyApplied,
    },
    reason: `Manager finding recorded: ${decisionInfo.label}. ${params.notes}`,
  });

  // Notify borrower with plain-language explanation and dispute rights
  if (inc.affected_user_id) {
    await createNotification({
      user_id: inc.affected_user_id,
      title: `⚖️ Manager Finding: ${decisionInfo.label}`,
      message: `Finding on Incident #${inc.id}: "${params.notes}". You may appeal this finding to Campus Administration within 48 hours.`,
      type: "action_required",
      category: "approved" as any,
      link: `/incidents/${inc.id}`,
    });
  }

  return { ...inc };
}

/**
 * Borrower formally disputes a manager decision for Admin review.
 */
export async function disputeIncident(params: {
  incidentId: string;
  userId: string;
  reason: string;
}): Promise<Incident> {
  const inc = runtimeIncidents.find((i) => i.id === params.incidentId);
  if (!inc) throw new Error("Incident not found");

  const user = getUserById(params.userId);
  const nowStr = getAppTime().toISOString();

  inc.dispute_reason = params.reason;
  inc.disputed_at = nowStr;
  inc.status = "disputed";
  inc.updated_at = nowStr;

  inc.timeline = inc.timeline || [];
  inc.timeline.push({
    id: `evt-${Date.now()}`,
    incident_id: inc.id,
    actor_id: params.userId,
    actor_name: user ? user.full_name : "Borrower",
    actor_role: user ? user.role : "user",
    action: "dispute_raised",
    notes: `Formal dispute appealed: "${params.reason}"`,
    timestamp: nowStr,
  });

  await logAuditEvent({
    actor_id: params.userId,
    actor_role: user ? user.role : "user",
    action: "INCIDENT_DISPUTED" as any,
    resource_type: "incident",
    resource_id: inc.id,
    previous_state: { status: "resolved" },
    new_state: { status: "disputed", dispute_reason: params.reason },
    reason: `Borrower formally contested finding: "${params.reason}"`,
  });

  // Notify campus admin
  const admins = SEED_USERS.filter((u) => u.role === "admin");
  for (const admin of admins) {
    await createNotification({
      user_id: admin.id,
      title: `🚨 Incident Dispute Escalated`,
      message: `${user?.full_name || "Borrower"} disputed manager finding on Incident #${inc.id}. Administrative arbitration required.`,
      type: "action_required",
      category: "action_required" as any,
      link: `/incidents/${inc.id}`,
    });
  }

  return { ...inc };
}

/**
 * Campus Administrator issues final binding arbitration on a disputed incident.
 */
export async function resolveIncidentDispute(params: {
  incidentId: string;
  adminId: string;
  resolution: "upheld" | "overturned" | "compromise" | "dismissed";
  notes: string;
}): Promise<Incident> {
  const inc = runtimeIncidents.find((i) => i.id === params.incidentId);
  if (!inc) throw new Error("Incident not found");

  const admin = getUserById(params.adminId);
  const nowStr = getAppTime().toISOString();
  const resolutionInfo = getAdminResolutionLabel(params.resolution);

  inc.admin_resolution = params.resolution;
  inc.admin_notes = params.notes;
  inc.resolved_by = params.adminId;
  inc.resolved_at = nowStr;
  inc.resolution_notes = `[Council Ruling: ${resolutionInfo.label}] ${params.notes}`;
  inc.status = "resolved";
  inc.updated_at = nowStr;

  inc.timeline = inc.timeline || [];
  inc.timeline.push({
    id: `evt-${Date.now()}`,
    incident_id: inc.id,
    actor_id: params.adminId,
    actor_name: admin ? admin.full_name : "Campus Administrator",
    actor_role: admin ? admin.role : "admin",
    action: "admin_resolved",
    notes: `Administrative Ruling: ${resolutionInfo.label}. Binding rationale: ${params.notes}`,
    timestamp: nowStr,
  });

  await logAuditEvent({
    actor_id: params.adminId,
    actor_role: admin ? admin.role : "admin",
    action: "INCIDENT_DISPUTE_RESOLVED" as any,
    resource_type: "incident",
    resource_id: inc.id,
    previous_state: { status: "disputed" },
    new_state: {
      status: "resolved",
      resolution: params.resolution,
      notes: params.notes,
    },
    reason: `Campus governance arbitration completed: ${resolutionInfo.label}. ${params.notes}`,
  });

  // Notify borrower and manager
  if (inc.affected_user_id) {
    await createNotification({
      user_id: inc.affected_user_id,
      title: `🏛️ Final Administrative Ruling: ${resolutionInfo.label}`,
      message: `Campus Governance issued final arbitration on Incident #${inc.id}: "${params.notes}"`,
      type: "info",
      category: "general",
      link: `/incidents/${inc.id}`,
    });
  }

  if (inc.reporter_id && inc.reporter_id !== inc.affected_user_id) {
    await createNotification({
      user_id: inc.reporter_id,
      title: `🏛️ Final Administrative Ruling: ${resolutionInfo.label}`,
      message: `Dispute on Incident #${inc.id} was arbitrated: "${params.notes}"`,
      type: "info",
      category: "general",
      link: `/incidents/${inc.id}`,
    });
  }

  return { ...inc };
}

/**
 * Runs automated time-based trigger checks against current App Time.
 * Detects overdue returns, upcoming reservation alerts, and return due warnings.
 */
export async function runTimeBasedTriggers(
  appTime: Date
): Promise<{ createdCount: number; events: TriggeredTimeEvent[] }> {
  const triggeredEvents = detectTimeTriggerEvents(
    runtimeBookings,
    appTime,
    runtimeNotifications
  );

  let createdCount = 0;

  for (const event of triggeredEvents) {
    // 1. Notify Borrower
    await createNotification({
      user_id: event.user_id,
      title: event.title,
      message: event.message,
      type: event.severity,
      category: event.type as any,
      link: event.link,
    });
    createdCount++;

    // 2. If Overdue and notify_owner: notify owner/manager with action button to open incident
    if (event.notify_owner) {
      const resource = await getResourceById(event.resource_id);
      const borrower = getUserById(event.user_id);
      const ownerId = resource?.owner_id;
      const managerId = resource?.manager_id;

      const ownerMessage = `Reservation #${event.booking_id} for "${resource?.name}" by ${
        borrower?.full_name || "Borrower"
      } is overdue. Click below to open an incident.`;

      if (ownerId) {
        await createNotification({
          user_id: ownerId,
          title: `🚨 Overdue Equipment Return: ${resource?.name}`,
          message: ownerMessage,
          type: "action_required",
          category: "overdue",
          link: event.link,
          action_label: "Open Late Return Incident",
          action_url: `/incidents/new?booking_id=${event.booking_id}&type=late_return`,
        });
        createdCount++;
      }

      if (managerId && managerId !== ownerId) {
        await createNotification({
          user_id: managerId,
          title: `🚨 Overdue Equipment Return: ${resource?.name}`,
          message: ownerMessage,
          type: "action_required",
          category: "overdue",
          link: event.link,
          action_label: "Open Late Return Incident",
          action_url: `/incidents/new?booking_id=${event.booking_id}&type=late_return`,
        });
        createdCount++;
      }
    }
  }

  return { createdCount, events: triggeredEvents };
}

/**
 * Retrieves a user profile by ID.
 */
export function getUserById(id: string): Profile | null {
  const u = SEED_USERS.find((user) => user.id === id);
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    department: u.department,
    affiliation: u.affiliation,
    reputation_score: u.reputation_score,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Retrieves all user profiles.
 */
export function getAllUsers(): Profile[] {
  return SEED_USERS.map((u) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    department: u.department,
    affiliation: u.affiliation,
    reputation_score: u.reputation_score,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

/**
 * Retrieves notifications, optionally filtered by user ID.
 */
export async function getNotifications(userId?: string): Promise<Notification[]> {
  if (userId) {
    return runtimeNotifications.filter((n) => n.user_id === userId);
  }
  return runtimeNotifications;
}

/**
 * Marks a notification as read.
 */
export async function markNotificationAsRead(id: string): Promise<boolean> {
  const notif = runtimeNotifications.find((n) => n.id === id);
  if (notif) {
    notif.is_read = true;
    return true;
  }
  return false;
}

/**
 * Marks all notifications as read for a user.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  let updated = false;
  runtimeNotifications.forEach((n) => {
    if (n.user_id === userId && !n.is_read) {
      n.is_read = true;
      updated = true;
    }
  });
  return updated;
}

/**
 * Creates a notification.
 */
export async function createNotification(
  notification: Omit<Notification, "id" | "created_at" | "is_read">
): Promise<Notification> {
  const newNotif: Notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...notification,
    is_read: false,
    created_at: new Date().toISOString(),
  };
  runtimeNotifications.unshift(newNotif);
  return newNotif;
}

/**
 * Reviews a booking request (Step 6 of lifecycle: approve, reject, or waitlist).
 */
export async function reviewBooking(params: {
  booking_id: string;
  decision: "approved" | "rejected" | "waitlisted";
  reason: string;
  reviewer_id: string;
  reviewer_role: UserRole;
}): Promise<Booking> {
  const booking = await getBookingById(params.booking_id);
  if (!booking) throw new Error("Booking not found");

  const prevStatus = booking.status;
  const newStatus: BookingStatus = params.decision;

  const updated = await saveBooking({
    id: booking.id,
    status: newStatus,
    reviewed_by: params.reviewer_id,
    rejection_reason: params.decision === "rejected" ? params.reason : null,
  });

  await logAuditEvent({
    actor_id: params.reviewer_id,
    actor_role: params.reviewer_role,
    action: `BOOKING_${params.decision.toUpperCase()}` as any,
    resource_type: "booking",
    resource_id: booking.id,
    previous_state: { status: prevStatus },
    new_state: { status: newStatus, reason: params.reason },
    reason: params.reason,
  });

  // Notify the borrower
  await createNotification({
    user_id: booking.user_id,
    title: `Reservation ${params.decision === "approved" ? "Approved" : params.decision === "waitlisted" ? "Waitlisted" : "Declined"}`,
    message: `Your booking #${booking.id} was marked ${params.decision}: "${params.reason}"`,
    type: params.decision === "approved" ? "success" : params.decision === "waitlisted" ? "warning" : "action_required",
    link: `/bookings/${booking.id}`,
  });

  return updated;
}

/**
 * Calculates a resource's utilization percentage and label based on active and total reservations.
 */
export async function calculateResourceUtilization(
  resourceId: string
): Promise<{ percentage: number; label: string }> {
  const bookings = await getAllBookings();
  const resBookings = bookings.filter((b) => b.resource_id === resourceId && b.status !== "rejected" && b.status !== "cancelled");
  const resource = await getResourceById(resourceId);

  let score = 25;
  if (resource?.is_high_demand) score += 35;
  score += Math.min(35, resBookings.length * 15);

  let label = "Normal Availability";
  if (score >= 80) label = "High Demand (Heavy Utilization)";
  else if (score >= 50) label = "Moderate Utilization";

  return {
    percentage: Math.min(95, score),
    label,
  };
}

// Snapshot storage for demo reset
const INITIAL_BOOKINGS = JSON.parse(JSON.stringify(runtimeBookings));
const INITIAL_CONDITION_RECORDS = JSON.parse(JSON.stringify(runtimeConditionRecords));
const INITIAL_INCIDENTS = JSON.parse(JSON.stringify(runtimeIncidents));
const INITIAL_NOTIFICATIONS = JSON.parse(JSON.stringify(runtimeNotifications));

/**
 * Safely restores all demo data to pristine initial state for judge reviews.
 */
export function resetDemoStore(): void {
  runtimeBookings = JSON.parse(JSON.stringify(INITIAL_BOOKINGS));
  runtimeConditionRecords = JSON.parse(JSON.stringify(INITIAL_CONDITION_RECORDS));
  runtimeIncidents = JSON.parse(JSON.stringify(INITIAL_INCIDENTS));
  runtimeNotifications = JSON.parse(JSON.stringify(INITIAL_NOTIFICATIONS));
  resetAppClock();
}



