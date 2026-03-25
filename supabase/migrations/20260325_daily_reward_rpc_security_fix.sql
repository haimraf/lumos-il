-- Ensure legacy daily reward RPCs can update protected economy/profile fields
-- after the profile hardening trigger was introduced.

create or replace function public.claim_daily_allowance(p_user_id uuid)
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

  if (select last_reward_date from public.profiles where id = p_user_id) = today then
    return '{"success": false, "reason": "already_claimed"}'::jsonb;
  end if;

  perform set_config('app.allow_event_point_write', '1', true);

  update public.profiles
  set
    galleons = coalesce(galleons, 0) + 5,
    last_reward_date = today
  where id = p_user_id;

  return '{"success": true}'::jsonb;
end;
$$;

create or replace function public.claim_niffler_reward(p_user_id uuid)
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

  if (select last_niffler_date from public.profiles where id = p_user_id) = today then
    return '{"success": false, "reason": "already_claimed"}'::jsonb;
  end if;

  perform set_config('app.allow_event_point_write', '1', true);

  update public.profiles
  set
    points_contributed = coalesce(points_contributed, 0) + 20,
    last_niffler_date = today
  where id = p_user_id;

  return '{"success": true, "type": "points", "amount": 20}'::jsonb;
end;
$$;

create or replace function public.claim_snitch_reward(p_user_id uuid)
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

  if (select last_snitch_date from public.profiles where id = p_user_id) = today then
    return '{"success": false, "reason": "already_claimed"}'::jsonb;
  end if;

  perform set_config('app.allow_event_point_write', '1', true);

  update public.profiles
  set
    points_contributed = coalesce(points_contributed, 0) + 15,
    last_snitch_date = today
  where id = p_user_id;

  return '{"success": true}'::jsonb;
end;
$$;

create or replace function public.claim_trivia_reward(p_user_id uuid, p_is_correct boolean)
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

  if (select last_trivia_date from public.profiles where id = p_user_id) = today then
    return '{"success": false, "reason": "already_claimed"}'::jsonb;
  end if;

  perform set_config('app.allow_event_point_write', '1', true);

  update public.profiles
  set
    points_contributed = case when p_is_correct then coalesce(points_contributed, 0) + 10 else points_contributed end,
    last_trivia_date = today
  where id = p_user_id;

  return jsonb_build_object('success', true, 'correct', p_is_correct);
end;
$$;

grant execute on function public.claim_daily_allowance(uuid) to authenticated;
grant execute on function public.claim_niffler_reward(uuid) to authenticated;
grant execute on function public.claim_snitch_reward(uuid) to authenticated;
grant execute on function public.claim_trivia_reward(uuid, boolean) to authenticated;
