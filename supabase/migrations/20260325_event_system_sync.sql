-- Sync the live event system with the legacy passover schema.

-- 1. Ensure profiles has a generic event_points column.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'event_points'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN event_points INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Backfill generic event points from the legacy passover points if they exist.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'passover_points'
    ) THEN
        UPDATE public.profiles
        SET event_points = GREATEST(COALESCE(event_points, 0), COALESCE(passover_points, 0))
        WHERE COALESCE(passover_points, 0) > COALESCE(event_points, 0);
    END IF;
END $$;

-- 3. Make sure the live event config has the normalized dynamic shape.
INSERT INTO public.site_settings (key, value)
VALUES ('passover_event', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

UPDATE public.site_settings
SET
    value = COALESCE(value, '{}'::jsonb)
        || jsonb_build_object(
            'title', COALESCE(NULLIF(value->>'title', ''), value->>'eventName', 'איוונט בטירה'),
            'eventName', COALESCE(NULLIF(value->>'eventName', ''), value->>'title', 'איוונט בטירה'),
            'start_date', COALESCE(NULLIF(value->>'start_date', ''), value->>'startDate', ''),
            'end_date', COALESCE(NULLIF(value->>'end_date', ''), value->>'endDate', ''),
            'endDate', COALESCE(NULLIF(value->>'endDate', ''), value->>'end_date', ''),
            'missions', COALESCE(value->'missions', '[]'::jsonb),
            'rewards', COALESCE(value->'rewards', '[]'::jsonb)
        ),
    updated_at = timezone('utc'::text, now())
WHERE key = 'passover_event';

-- 4. The live-event reward distributor is defined in
--    20260325_event_reward_audit_actor_fix.sql (and patched by the earlier
--    event_reward_* migrations). Do NOT redefine it here — this file runs
--    after those migrations alphabetically and would regress the function.
