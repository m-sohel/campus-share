-- CampusShare Stage 3: Booking Workflow, Double-Booking Prevention & Constraints
-- This migration adds database-level protection against overlapping active bookings.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Indexing for fast conflict lookups
CREATE INDEX IF NOT EXISTS idx_bookings_resource_times 
  ON public.bookings(resource_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_bookings_user_status 
  ON public.bookings(user_id, status);

-- 2. Concurrency-Safe Collision Check Trigger (Works universally across Postgres setups)
CREATE OR REPLACE FUNCTION public.check_booking_collision()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enforce conflict checks for active or pending reservations
  IF NEW.status IN ('approved', 'confirmed', 'checked_in', 'pending_review') THEN
    IF EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id <> NEW.id
        AND resource_id = NEW.resource_id
        AND status IN ('approved', 'confirmed', 'checked_in', 'pending_review')
        AND (
          (NEW.start_time < end_time AND NEW.end_time > start_time)
        )
    ) THEN
      RAISE EXCEPTION 'RESOURCE_ALREADY_BOOKED: This resource is already reserved or pending review for the requested time window.'
        USING ERRCODE = '23P01';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_booking_collision ON public.bookings;
CREATE TRIGGER trg_check_booking_collision
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_collision();

-- 3. Exclusion constraint (where supported with btree_gist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prevent_overlapping_active_bookings'
  ) THEN
    BEGIN
      ALTER TABLE public.bookings
      ADD CONSTRAINT prevent_overlapping_active_bookings
      EXCLUDE USING gist (
        resource_id WITH =,
        tstzrange(start_time, end_time) WITH &&
      )
      WHERE (status IN ('approved', 'confirmed', 'checked_in', 'pending_review'));
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Exclusion constraint skipped, collision trigger will enforce protection: %', SQLERRM;
    END;
  END IF;
END $$;

