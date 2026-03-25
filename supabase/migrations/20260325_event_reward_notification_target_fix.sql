-- Notifications on this project require target_url, so event reward notifications
-- must link back to the public event page.

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
    event_slug TEXT := 'passover';
    event_target_url TEXT := '/events/passover';
    rank_count INTEGER := 1;
    galleons_reward INTEGER;
    house_points_reward INTEGER;
    reward_group_name TEXT;
    reward_group_color TEXT;
    reward_group_order INTEGER;
    reward_group_id INTEGER;
    notification_content TEXT;
    has_configured_rewards BOOLEAN := false;
BEGIN
    SELECT COALESCE(value, '{}'::jsonb)
    INTO event_settings
    FROM public.site_settings
    WHERE key = 'passover_event'
    LIMIT 1;

    event_label := COALESCE(NULLIF(event_settings->>'eventName', ''), event_settings->>'title', event_label);
    event_slug := COALESCE(NULLIF(event_settings->>'slug', ''), 'passover');
    event_target_url := '/events/' || event_slug;
    has_configured_rewards := jsonb_typeof(COALESCE(event_settings->'rewards', '[]'::jsonb)) = 'array'
        AND jsonb_array_length(COALESCE(event_settings->'rewards', '[]'::jsonb)) > 0;

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
        reward_group_id := NULL;
        reward_group_name := NULL;
        reward_group_color := '#fbbf24';
        reward_group_order := 900 + rank_count;

        SELECT reward
        INTO reward_entry
        FROM jsonb_array_elements(COALESCE(event_settings->'rewards', '[]'::jsonb)) AS reward
        WHERE COALESCE(reward->>'rank', '') ~ '^[0-9]+$'
          AND (reward->>'rank')::INTEGER = rank_count
        LIMIT 1;

        IF has_configured_rewards AND reward_entry IS NULL THEN
            rank_count := rank_count + 1;
            CONTINUE;
        END IF;

        galleons_reward := CASE
            WHEN reward_entry IS NOT NULL AND COALESCE(reward_entry->>'galleons', '') ~ '^[0-9]+$'
                THEN (reward_entry->>'galleons')::INTEGER
            WHEN rank_count = 1 THEN 1000
            WHEN rank_count = 2 THEN 500
            WHEN rank_count = 3 THEN 250
            ELSE 100
        END;

        house_points_reward := CASE
            WHEN reward_entry IS NOT NULL AND COALESCE(reward_entry->>'points', '') ~ '^[0-9]+$'
                THEN (reward_entry->>'points')::INTEGER
            ELSE 0
        END;

        IF reward_entry IS NOT NULL THEN
            reward_group_name := NULLIF(BTRIM(COALESCE(reward_entry->>'group_name', '')), '');

            IF reward_group_name IS NULL THEN
                reward_group_name := NULLIF(
                    substring(COALESCE(reward_entry->>'description', '') from '"([^"]+)"'),
                    ''
                );
            END IF;

            IF reward_group_name IS NULL
               AND (
                    COALESCE(reward_entry->>'description', '') ILIKE '%תואר%'
                    OR COALESCE(reward_entry->>'description', '') ILIKE '%פרופיל%'
               ) THEN
                reward_group_name := NULLIF(BTRIM(COALESCE(reward_entry->>'title', '')), '');
            END IF;

            reward_group_color := COALESCE(NULLIF(reward_entry->>'group_color', ''), reward_group_color);

            IF COALESCE(reward_entry->>'group_display_order', '') ~ '^[0-9]+$' THEN
                reward_group_order := (reward_entry->>'group_display_order')::INTEGER;
            END IF;
        END IF;

        IF reward_group_name IS NOT NULL THEN
            INSERT INTO public.user_groups (name, color, display_order)
            VALUES (reward_group_name, reward_group_color, reward_group_order)
            ON CONFLICT (name) DO UPDATE
            SET color = EXCLUDED.color,
                display_order = EXCLUDED.display_order;

            SELECT id
            INTO reward_group_id
            FROM public.user_groups
            WHERE name = reward_group_name
            LIMIT 1;
        END IF;

        UPDATE public.profiles
        SET
            galleons = COALESCE(galleons, 0) + galleons_reward,
            points_contributed = COALESCE(points_contributed, 0) + house_points_reward,
            group_id = COALESCE(reward_group_id, group_id)
        WHERE id = winner_row.id;

        notification_content := format(
            '🏆 סיימת במקום %s באיוונט %s וקיבלת %s גליאונים ו-%s נקודות בית!',
            rank_count,
            event_label,
            galleons_reward,
            house_points_reward
        );

        IF reward_group_name IS NOT NULL THEN
            notification_content := notification_content || format(' בנוסף הוענק לך התואר "%s".', reward_group_name);
        END IF;

        INSERT INTO public.notifications (user_id, type, content, target_url, is_read)
        VALUES (winner_row.id, 'achievement', notification_content, event_target_url, false);

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
            NULL,
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
                'house_points', house_points_reward,
                'group_name', reward_group_name
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
        NULL,
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

GRANT EXECUTE ON FUNCTION public.distribute_event_rewards() TO authenticated;
GRANT EXECUTE ON FUNCTION public.distribute_passover_rewards() TO authenticated;
