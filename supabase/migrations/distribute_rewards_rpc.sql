-- Create RPC for distributing Passover rewards to top 10 players
CREATE OR REPLACE FUNCTION public.distribute_passover_rewards()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    winner_row RECORD;
    rank_count INTEGER := 1;
    gold_group_id INTEGER;
    silver_group_id INTEGER;
BEGIN
    -- 1. Get Group IDs
    SELECT id INTO gold_group_id FROM user_groups WHERE name = 'מנצחי חג החירות (זהב)' LIMIT 1;
    SELECT id INTO silver_group_id FROM user_groups WHERE name = 'נבחרי הנהלה (כסף)' LIMIT 1;

    -- 2. Loop through top 10 performers
    FOR winner_row IN 
        SELECT id, full_name, passover_points 
        FROM profiles 
        WHERE passover_points > 0 
        ORDER BY passover_points DESC 
        LIMIT 10
    LOOP
        -- Award Galleons (Example: 1st=1000, others=500)
        IF rank_count = 1 THEN
            UPDATE profiles SET 
                galleons = galleons + 1000,
                group_id = COALESCE(gold_group_id, group_id)
            WHERE id = winner_row.id;
        ELSE
            UPDATE profiles SET 
                galleons = galleons + 500,
                group_id = COALESCE(silver_group_id, group_id)
            WHERE id = winner_row.id;
        END IF;

        -- Log the reward
        INSERT INTO admin_audit_logs (actor_id, actor_name, action, target_type, target_id, target_label, details)
        VALUES (
            '00000000-0000-0000-0000-000000000000', 
            'מערכת איוונטים', 
            'הענקת פרס סיום איוונט', 
            'user', 
            winner_row.id, 
            winner_row.full_name, 
            jsonb_build_object('rank', rank_count, 'points', winner_row.passover_points)
        );

        rank_count := rank_count + 1;
    END LOOP;

    -- 3. Deactivate Event
    UPDATE site_settings 
    SET value = jsonb_set(value, '{active}', 'false')
    WHERE key = 'passover_event';

    -- 4. Log event completion
    INSERT INTO admin_audit_logs (actor_id, actor_name, action, target_type, target_id, target_label, details)
    VALUES (
        '00000000-0000-0000-0000-000000000000', 
        'מערכת איוונטים', 
        'סיום איוונט פסח', 
        'setting', 
        'passover_event', 
        'פסח בטירה', 
        '{"status": "completed", "rewards_distributed": true}'
    );

END;
$$;
