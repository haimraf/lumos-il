-- ─────────────────────────────────────────────────────────────
-- Quests RPC functions (security definer — no direct table writes from client)
-- ─────────────────────────────────────────────────────────────

create or replace function claim_daily_allowance(p_user_id uuid)
returns jsonb language plpgsql security definer as $$
declare today text := to_char(now(), 'YYYY-MM-DD');
begin
  if (select last_reward_date from profiles where id = p_user_id) = today then
    return '{"success": false, "reason": "already_claimed"}'::jsonb;
  end if;
  update profiles set galleons = galleons + 5, last_reward_date = today where id = p_user_id;
  return '{"success": true}'::jsonb;
end;$$;

create or replace function claim_niffler_reward(p_user_id uuid)
returns jsonb language plpgsql security definer as $$
declare today text := to_char(now(), 'YYYY-MM-DD');
declare daily_points int;
begin
  if (select last_niffler_date from profiles where id = p_user_id) = today then
    return '{"success": false, "reason": "already_claimed"}'::jsonb;
  end if;
  select coalesce(sum(points_contributed), 0) into daily_points
  from profiles where id = p_user_id;
  update profiles set
    points_contributed = points_contributed + 20,
    last_niffler_date = today
  where id = p_user_id;
  return '{"success": true, "type": "points", "amount": 20}'::jsonb;
end;$$;

create or replace function claim_snitch_reward(p_user_id uuid)
returns jsonb language plpgsql security definer as $$
declare today text := to_char(now(), 'YYYY-MM-DD');
begin
  if (select last_snitch_date from profiles where id = p_user_id) = today then
    return '{"success": false, "reason": "already_claimed"}'::jsonb;
  end if;
  update profiles set
    points_contributed = points_contributed + 15,
    last_snitch_date = today
  where id = p_user_id;
  return '{"success": true}'::jsonb;
end;$$;

create or replace function claim_trivia_reward(p_user_id uuid, p_is_correct boolean)
returns jsonb language plpgsql security definer as $$
declare today text := to_char(now(), 'YYYY-MM-DD');
begin
  if (select last_trivia_date from profiles where id = p_user_id) = today then
    return '{"success": false, "reason": "already_claimed"}'::jsonb;
  end if;
  update profiles set
    points_contributed = case when p_is_correct then points_contributed + 10 else points_contributed end,
    last_trivia_date = today
  where id = p_user_id;
  return jsonb_build_object('success', true, 'correct', p_is_correct);
end;$$;
