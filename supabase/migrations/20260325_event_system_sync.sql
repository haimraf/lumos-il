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

-- 4. Generic live-event reward distributor.
CREATE OR REPLACE FUNCTION public.distribute_event_rewards()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    winner_row RECORD;
    reward_entry JSONB;
    event_settings JSONB := '{}'::jsonb;
    event_label TEXT := 'איוונט בטירה';
    rank_count INTEGER := 1;
    gold_group_id INTEGER;
    silver_group_id INTEGER;
    galleons_reward INTEGER;
    house_points_reward INTEGER;
BEGIN
    SELECT COALESCE(value, '{}'::jsonb)
    INTO event_settings
    FROM public.site_settings
    WHERE key = 'passover_event'
    LIMIT 1;

    event_label := COALESCE(NULLIF(event_settings->>'eventName', ''), event_settings->>'title', event_label);

    SELECT id INTO gold_group_id
    FROM public.user_groups
    WHERE name = 'מנצחי חג החירות (זהב)'
    LIMIT 1;

    SELECT id INTO silver_group_id
    FROM public.user_groups
    WHERE name = 'נבחרי הנהלה (כסף)'
    LIMIT 1;

    FOR winner_row IN
        SELECT
            id,
            full_name,
            COALESCE(event_points, passover_points, 0) AS total_points
        FROM public.profiles
        WHERE COALESCE(event_points, passover_points, 0) > 0
        ORDER BY COALESCE(event_points, passover_points, 0) DESC, created_at ASC NULLS LAST
        LIMIT 10
    LOOP
        reward_entry := NULL;

        SELECT reward
        INTO reward_entry
        FROM jsonb_array_elements(COALESCE(event_settings->'rewards', '[]'::jsonb)) AS reward
        WHERE COALESCE(reward->>'rank', '') ~ '^[0-9]+$'
          AND (reward->>'rank')::INTEGER = rank_count
        LIMIT 1;

        galleons_reward := CASE
            WHEN reward_entry IS NOT NULL AND COALESCE(reward_entry->>'galleons', '') ~ '^[0-9]+$'
                THEN (reward_entry->>'galleons')::INTEGER
            WHEN rank_count = 1 THEN 1000
            WHEN rank_count <= 3 THEN 500
            ELSE 250
        END;

        house_points_reward := CASE
            WHEN reward_entry IS NOT NULL AND COALESCE(reward_entry->>'points', '') ~ '^[0-9]+$'
                THEN (reward_entry->>'points')::INTEGER
            ELSE 0
        END;

        UPDATE public.profiles
        SET
            galleons = COALESCE(galleons, 0) + galleons_reward,
            points_contributed = COALESCE(points_contributed, 0) + house_points_reward,
            group_id = CASE
                WHEN rank_count = 1 THEN COALESCE(gold_group_id, group_id)
                WHEN rank_count <= 3 THEN COALESCE(silver_group_id, group_id)
                ELSE group_id
            END
        WHERE id = winner_row.id;

        INSERT INTO public.admin_audit_logs (
            actor_id,
            actor_name,
            action,
            target_type,
            target_id,
            target_label,
            details
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            'מערכת איוונטים',
            'הענקת פרס סיום איוונט',
            'user',
            winner_row.id,
            winner_row.full_name,
            jsonb_build_object(
                'event', event_label,
                'rank', rank_count,
                'points', winner_row.total_points,
                'galleons', galleons_reward,
                'house_points', house_points_reward
            )
        );

        rank_count := rank_count + 1;
    END LOOP;

    UPDATE public.profiles
    SET
        event_points = 0,
        passover_points = 0
    WHERE COALESCE(event_points, 0) <> 0
       OR COALESCE(passover_points, 0) <> 0;

    UPDATE public.site_settings
    SET
        value = jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(COALESCE(value, '{}'::jsonb), '{active}', 'false'::jsonb, true),
                    '{status}',
                    to_jsonb('completed'::text),
                    true
                ),
                '{rewards_distributed}',
                'true'::jsonb,
                true
            ),
            '{completed_at}',
            to_jsonb(timezone('utc'::text, now())),
            true
        ),
        updated_at = timezone('utc'::text, now())
    WHERE key = 'passover_event';

    INSERT INTO public.admin_audit_logs (
        actor_id,
        actor_name,
        action,
        target_type,
        target_id,
        target_label,
        details
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        'מערכת איוונטים',
        'סיום איוונט',
        'setting',
        'passover_event',
        event_label,
        jsonb_build_object(
            'status', 'completed',
            'rewards_distributed', true
        )
    );
END;
$$;

-- 5. Keep the legacy RPC alive as an alias for older clients.
CREATE OR REPLACE FUNCTION public.distribute_passover_rewards()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.distribute_event_rewards();
END;
$$;
