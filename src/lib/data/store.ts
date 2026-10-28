import { Resource, Credential, AuditLogEntry, ResourceRequirement, Booking, ConditionRecord, Incident, Profile } from "@/types";
import { SEED_RESOURCES, SEED_CREDENTIALS, SEED_USERS } from "./seed-data";
import { createClientServer } from "@/lib/supabase/server";
import { computeAuditHash } from "@/lib/rules/audit-verifier";
import { calculateListingCompleteness } from "@/lib/rules/completeness";
import { computeConditionDiff, checkLateReturn, ChecklistItemRecord } from "@/lib/rules/condition";

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
  // 4. Completed Reservation with both condition records logged
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
];

let runtimeIncidents: Incident[] = [];

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
 * Retrieves all incidents.
 */
export async function getIncidents(): Promise<Incident[]> {
  return runtimeIncidents;
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
 * Retrieves all profiles.
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


