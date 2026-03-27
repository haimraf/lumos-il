update public.duels
set status = 'expired'
where status = 'pending'
  and expires_at is not null
  and expires_at <= timezone('utc', now());

create or replace function public.create_duel_challenge_secure(
  p_opponent_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_actor_status text;
  v_opponent_status text;
  v_existing_duel_id uuid;
  v_duel public.duels;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_opponent_id is null or p_opponent_id = v_user_id then
    raise exception 'אי אפשר לאתגר את עצמך לדו-קרב.';
  end if;

  select status
    into v_actor_status
  from public.profiles
  where id = v_user_id;

  if coalesce(v_actor_status, 'active') in ('banned', 'cooling') then
    raise exception 'הגישה שלך חסומה כרגע לזירה.';
  end if;

  select status
    into v_opponent_status
  from public.profiles
  where id = p_opponent_id;

  if not found then
    raise exception 'היריב המבוקש לא נמצא.';
  end if;

  if coalesce(v_opponent_status, 'active') in ('banned', 'cooling') then
    raise exception 'הקוסם/ה הזה לא זמין כרגע לדו-קרב.';
  end if;

  update public.duels
  set status = 'expired'
  where status = 'pending'
    and expires_at is not null
    and expires_at <= timezone('utc', now())
    and (
      challenger_id in (v_user_id, p_opponent_id)
      or opponent_id in (v_user_id, p_opponent_id)
    );

  select id
    into v_existing_duel_id
  from public.duels
  where status in ('pending', 'active')
    and (
      challenger_id in (v_user_id, p_opponent_id)
      or opponent_id in (v_user_id, p_opponent_id)
    )
  order by created_at desc
  limit 1;

  if v_existing_duel_id is not null then
    raise exception 'כבר יש דו-קרב פתוח שמערב אחד מהשחקנים.';
  end if;

  insert into public.duels (
    challenger_id,
    opponent_id,
    status,
    expires_at,
    challenger_hp,
    opponent_hp,
    current_turn,
    turn_deadline
  )
  values (
    v_user_id,
    p_opponent_id,
    'pending',
    timezone('utc', now()) + interval '5 minutes',
    100,
    100,
    null,
    null
  )
  returning * into v_duel;

  insert into public.notifications (
    user_id,
    actor_id,
    type,
    target_url,
    content,
    is_read
  )
  values (
    p_opponent_id,
    v_user_id,
    'duel_challenge',
    '/duels/' || v_duel.id::text,
    'מאתגר/ת אותך לקרב בזירה!',
    false
  );

  return jsonb_build_object(
    'duel_id', v_duel.id,
    'status', v_duel.status,
    'expires_at', v_duel.expires_at
  );
end;
$$;

grant execute on function public.create_duel_challenge_secure(uuid) to authenticated;
