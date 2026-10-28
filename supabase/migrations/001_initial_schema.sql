-- CampusShare Initial Database Schema Migration
-- Enables cryptographic extension for UUIDs and hashes
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'owner', 'manager', 'admin')) DEFAULT 'user',
  department TEXT,
  affiliation TEXT CHECK (affiliation IN ('university', 'makerspace', 'startup')),
  avatar_url TEXT,
  reputation_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. RESOURCES
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('labs_spaces', 'fabrication', 'electronics', 'media')),
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  institution TEXT NOT NULL CHECK (institution IN ('university', 'makerspace')),
  rules TEXT NOT NULL,
  requires_supervision BOOLEAN NOT NULL DEFAULT false,
  min_lead_time_hours INTEGER NOT NULL DEFAULT 2,
  max_duration_hours INTEGER NOT NULL DEFAULT 4,
  is_high_demand BOOLEAN NOT NULL DEFAULT false,
  deposit_required_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('available', 'maintenance', 'archived')) DEFAULT 'available',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. RESOURCE REQUIREMENTS
CREATE TABLE IF NOT EXISTS public.resource_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL,
  min_experience_hours INTEGER NOT NULL DEFAULT 0,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. AVAILABILITY SLOTS
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_interval_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. BLACKOUT DATES
CREATE TABLE IF NOT EXISTS public.blackout_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. CREDENTIALS
CREATE TABLE IF NOT EXISTS public.credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'expired', 'revoked')) DEFAULT 'pending',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verification_notes TEXT,
  evidence_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. BOOKINGS
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'draft', 'pending_verification', 'pending_review', 'waitlisted',
    'approved', 'confirmed', 'checked_in', 'returned', 'completed',
    'flagged_incident', 'rejected', 'cancelled'
  )) DEFAULT 'draft',
  purpose TEXT NOT NULL,
  fairness_score NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  rejection_reason TEXT,
  cancellation_reason TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. BOOKING EVENTS (State Transition Audit)
CREATE TABLE IF NOT EXISTS public.booking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_role TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. CONDITION RECORDS (Check-In & Return Handover)
CREATE TABLE IF NOT EXISTS public.condition_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('check_in', 'return')),
  recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('pristine', 'minor_wear', 'damaged', 'dirty', 'missing_parts')),
  notes TEXT,
  checklist JSONB DEFAULT '{}'::jsonb,
  media_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. INCIDENTS
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('damage', 'late_return', 'safety_violation', 'missing_item', 'conflict')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
  status TEXT NOT NULL CHECK (status IN ('reported', 'under_review', 'resolved', 'escalated')) DEFAULT 'reported',
  description TEXT NOT NULL,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  penalty_applied TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMPTZ
);

-- 11. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'action_required', 'warning', 'success')) DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. WAITLIST ENTRIES
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_start TIMESTAMPTZ NOT NULL,
  requested_end TIMESTAMPTZ NOT NULL,
  priority_score NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'offered', 'expired', 'fulfilled', 'cancelled')) DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. AUDIT LOG (Append-only Cryptographically Chained Log)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  reason TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enforce Append-Only on audit_log (No updates or deletes permitted)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_modification ON public.audit_log;
CREATE TRIGGER trg_prevent_audit_log_modification
BEFORE UPDATE OR DELETE ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blackout_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Standard Read Policies
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public read resources" ON public.resources FOR SELECT USING (true);
CREATE POLICY "Public read requirements" ON public.resource_requirements FOR SELECT USING (true);
CREATE POLICY "Public read availability" ON public.availability_slots FOR SELECT USING (true);
CREATE POLICY "Public read blackouts" ON public.blackout_dates FOR SELECT USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_owner ON public.resources(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_resource_dates ON public.bookings(resource_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_user ON public.credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at);
