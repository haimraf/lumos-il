-- ─────────────────────────────────────────────────────────────
-- Daily points cap: max 50 points_contributed per day per user
-- ─────────────────────────────────────────────────────────────

-- 1. Add tracking columns (idempotent)
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS last_point_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS daily_points_earned INTEGER NOT NULL DEFAULT 0;

-- 2. Trigger function
CREATE OR REPLACE FUNCTION enforce_daily_points_cap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    points_added  INTEGER;
    daily_max     INTEGER := 50;
    allowed       INTEGER;
BEGIN
    points_added := NEW.points_contributed - OLD.points_contributed;

    -- Only enforce when points are increasing
    IF points_added <= 0 THEN
        RETURN NEW;
    END IF;

    -- Reset daily counter on a new calendar day (UTC)
    IF OLD.last_point_at IS NULL
       OR (OLD.last_point_at AT TIME ZONE 'UTC')::DATE < CURRENT_DATE
    THEN
        NEW.daily_points_earned := 0;
    END IF;

    -- How many points are still allowed today?
    allowed := daily_max - NEW.daily_points_earned;
    IF allowed <= 0 THEN
        -- Already at cap — roll back the increase
        NEW.points_contributed := OLD.points_contributed;
        RETURN NEW;
    END IF;

    -- Cap the addition if it would exceed the daily limit
    IF points_added > allowed THEN
        NEW.points_contributed := OLD.points_contributed + allowed;
        points_added := allowed;
    END IF;

    NEW.daily_points_earned := NEW.daily_points_earned + points_added;
    NEW.last_point_at       := NOW();

    RETURN NEW;
END;
$$;

-- 3. Attach trigger (drop first so re-runs are safe)
DROP TRIGGER IF EXISTS check_daily_points_cap ON profiles;
CREATE TRIGGER check_daily_points_cap
    BEFORE UPDATE OF points_contributed ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION enforce_daily_points_cap();
