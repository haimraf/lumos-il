-- Restore legacy compatibility for installations that already moved to event_points
-- but still run live-event code paths that fallback to passover_points.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'passover_points'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN passover_points INTEGER DEFAULT 0;
    END IF;
END $$;

UPDATE public.profiles
SET passover_points = GREATEST(COALESCE(passover_points, 0), COALESCE(event_points, 0))
WHERE COALESCE(passover_points, 0) < COALESCE(event_points, 0);
