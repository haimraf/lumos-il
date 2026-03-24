ALTER TABLE IF EXISTS polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS poll_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert polls" ON polls;
CREATE POLICY "Admins can insert polls"
  ON polls FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('מנהל', 'מנחה')
    )
  );

DROP POLICY IF EXISTS "Admins can insert poll_options" ON poll_options;
CREATE POLICY "Admins can insert poll_options"
  ON poll_options FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('מנהל', 'מנחה')
    )
  );

create or replace function claim_daily_allowance(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today text := to_char(now(), 'YYYY-MM-DD');
  requesting_user uuid := auth.uid();
begin
  if requesting_user is null or requesting_user <> p_user_id then
    raise exception 'Unauthorized reward claim'
      using errcode = '42501';
  end if;

  if (select last_reward_date from profiles where id = p_user_id) = today then
    return '{"success": false, "reason": "already_claimed"}'::jsonb;
  end if;

  update profiles
  set galleons = galleons + 5,
      last_reward_date = today
  where id = p_user_id;

  return '{"success": true}'::jsonb;
end;
$$;

create or replace function claim_niffler_reward(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today text := to_char(now(), 'YYYY-MM-DD');
  requesting_user uuid := auth.uid();
begin
  if requesting_user is null or requesting_user <> p_user_id then
    raise exception 'Unauthorized reward claim'
      using errcode = '42501';
  end if;

  if (select last_niffler_date from profiles where id = p_user_id) = today then
    return '{"success": false, "reason": "already_claimed"}'::jsonb;
  end if;

  update profiles
  set points_contributed = points_contributed + 20,
      last_niffler_date = today
  where id = p_user_id;

  return '{"success": true, "type": "points", "amount": 20}'::jsonb;
end;
$$;

create or replace function claim_snitch_reward(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today text := to_char(now(), 'YYYY-MM-DD');
  requesting_user uuid := auth.uid();
begin
  if requesting_user is null or requesting_user <> p_user_id then
    raise exception 'Unauthorized reward claim'
      using errcode = '42501';
  end if;

  if (select last_snitch_date from profiles where id = p_user_id) = today then
    return '{"success": false, "reason": "already_claimed"}'::jsonb;
  end if;

  update profiles
  set points_contributed = points_contributed + 15,
      last_snitch_date = today
  where id = p_user_id;

  return '{"success": true}'::jsonb;
end;
$$;

create or replace function claim_trivia_reward(p_user_id uuid, p_is_correct boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today text := to_char(now(), 'YYYY-MM-DD');
  requesting_user uuid := auth.uid();
begin
  if requesting_user is null or requesting_user <> p_user_id then
    raise exception 'Unauthorized reward claim'
      using errcode = '42501';
  end if;

  if (select last_trivia_date from profiles where id = p_user_id) = today then
    return '{"success": false, "reason": "already_claimed"}'::jsonb;
  end if;

  update profiles
  set points_contributed = case when p_is_correct then points_contributed + 10 else points_contributed end,
      last_trivia_date = today
  where id = p_user_id;

  return jsonb_build_object('success', true, 'correct', p_is_correct);
end;
$$;
