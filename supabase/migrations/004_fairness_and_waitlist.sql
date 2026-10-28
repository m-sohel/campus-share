-- CampusShare Stage 7: Fairness Engine & Waitlist Management
-- Configurable fairness settings, cooldown enforcement, and waitlist offer windows.

-- 1. Fairness Configuration Settings Table
CREATE TABLE IF NOT EXISTS public.fairness_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  max_active_bookings_per_user INT NOT NULL DEFAULT 3,
  max_hours_per_week_fabrication NUMERIC(5,2) NOT NULL DEFAULT 10.0,
  max_hours_per_week_labs NUMERIC(5,2) NOT NULL DEFAULT 15.0,
  max_hours_per_week_electronics NUMERIC(5,2) NOT NULL DEFAULT 12.0,
  max_hours_per_week_media NUMERIC(5,2) NOT NULL DEFAULT 10.0,
  cooldown_threshold_hours NUMERIC(5,2) NOT NULL DEFAULT 4.0,
  cooldown_period_hours INT NOT NULL DEFAULT 24,
  offer_window_hours INT NOT NULL DEFAULT 2,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Seed default global settings row if empty
INSERT INTO public.fairness_settings (
  id,
  max_active_bookings_per_user,
  max_hours_per_week_fabrication,
  max_hours_per_week_labs,
  max_hours_per_week_electronics,
  max_hours_per_week_media,
  cooldown_threshold_hours,
  cooldown_period_hours,
  offer_window_hours
) VALUES (
  '70000000-0000-0000-0000-000000000001',
  3,
  10.0,
  15.0,
  12.0,
  10.0,
  4.0,
  24,
  2
) ON CONFLICT (id) DO NOTHING;

-- 2. Enhanced Waitlist Columns (optional for environments running automated DDL)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waitlist_entries' AND column_name = 'deadline_date') THEN
    ALTER TABLE public.waitlist_entries ADD COLUMN deadline_date TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waitlist_entries' AND column_name = 'deadline_verified') THEN
    ALTER TABLE public.waitlist_entries ADD COLUMN deadline_verified BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waitlist_entries' AND column_name = 'offer_expires_at') THEN
    ALTER TABLE public.waitlist_entries ADD COLUMN offer_expires_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waitlist_entries' AND column_name = 'override_reason') THEN
    ALTER TABLE public.waitlist_entries ADD COLUMN override_reason TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waitlist_entries' AND column_name = 'breakdown') THEN
    ALTER TABLE public.waitlist_entries ADD COLUMN breakdown JSONB;
  END IF;
END $$;
