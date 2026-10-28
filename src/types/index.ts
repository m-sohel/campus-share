export type UserRole = "user" | "owner" | "manager" | "admin";

export type ResourceCategory = "labs_spaces" | "fabrication" | "electronics" | "media";

export type ResourceStatus = "available" | "maintenance" | "archived";

export type CredentialStatus = "pending" | "verified" | "expired" | "revoked";

export type BookingStatus =
  | "draft"
  | "pending_verification"
  | "pending_review"
  | "waitlisted"
  | "approved"
  | "confirmed"
  | "checked_in"
  | "in_use"
  | "returned"
  | "completed"
  | "flagged_incident"
  | "rejected"
  | "cancelled";

export type ConditionStage = "check_in" | "return";

export type ConditionGrade = "pristine" | "minor_wear" | "damaged" | "dirty" | "missing_parts";

export type IncidentType = "damage" | "late_return" | "safety_violation" | "missing_item" | "conflict" | "misuse";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type IncidentStatus = "draft" | "reported" | "under_review" | "resolved" | "escalated";

export type NotificationType = "info" | "action_required" | "warning" | "success";

export type WaitlistStatus = "waiting" | "offered" | "expired" | "fulfilled" | "cancelled";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string | null;
  affiliation?: "university" | "makerspace" | "startup" | null;
  avatar_url?: string | null;
  reputation_score: number;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  owner_id: string;
  manager_id?: string | null;
  name: string;
  category: ResourceCategory;
  description: string;
  location: string;
  institution: "university" | "makerspace";
  rules: string;
  safety_notes?: string;
  requires_supervision: boolean;
  min_lead_time_hours: number;
  max_duration_hours: number;
  is_high_demand: boolean;
  deposit_required_cents: number;
  status: ResourceStatus;
  image_url?: string | null;
  condition_checklist?: string[];
  requirements?: ResourceRequirement[];
  availability_slots?: AvailabilitySlot[];
  blackout_dates?: BlackoutDate[];
  created_at: string;
  updated_at: string;
}

export interface ResourceRequirement {
  id: string;
  resource_id: string;
  credential_type: string;
  min_experience_hours: number;
  is_mandatory: boolean;
  explanation: string;
  created_at: string;
}

export interface AvailabilitySlot {
  id: string;
  resource_id: string;
  day_of_week: number; // 0 = Sunday
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  slot_interval_minutes: number;
  created_at: string;
}

export interface BlackoutDate {
  id: string;
  resource_id: string;
  start_time: string;
  end_time: string;
  reason: string;
  created_by?: string | null;
  created_at: string;
}

export interface Credential {
  id: string;
  user_id: string;
  credential_type: string;
  title: string;
  status: CredentialStatus;
  issued_at: string;
  expires_at?: string | null;
  verified_by?: string | null;
  verification_notes?: string | null;
  evidence_url?: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  resource_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  purpose: string;
  fairness_score: number;
  rejection_reason?: string | null;
  cancellation_reason?: string | null;
  reviewed_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingEvent {
  id: string;
  booking_id: string;
  actor_id: string;
  actor_role: UserRole;
  from_status: BookingStatus;
  to_status: BookingStatus;
  reason: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface ConditionRecord {
  id: string;
  booking_id: string;
  stage: ConditionStage;
  recorded_by: string;
  recorded_by_name?: string;
  status: ConditionGrade;
  notes?: string | null;
  items?: Array<{ item: string; state: "ok" | "minor_issue" | "damaged"; notes?: string }>;
  checklist?: Record<string, boolean> | null;
  media_urls?: string[];
  created_at: string;
}

export interface Incident {
  id: string;
  booking_id: string;
  reporter_id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  resolution_notes?: string | null;
  resolved_by?: string | null;
  penalty_applied?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  link?: string | null;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  resource_id: string;
  user_id: string;
  requested_start: string;
  requested_end: string;
  priority_score: number;
  status: WaitlistStatus;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  reason: string;
  ip_address?: string | null;
  user_agent?: string | null;
  prev_hash: string;
  hash: string;
  created_at: string;
}

