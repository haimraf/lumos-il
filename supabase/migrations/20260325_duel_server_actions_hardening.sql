create index if not exists duels_status_participants_idx
on public.duels (status, challenger_id, opponent_id, created_at desc);

create index if not exists duel_moves_duel_created_idx
on public.duel_moves (duel_id, created_at asc);

alter table if exists public.duels enable row level security;
alter table if exists public.duel_moves enable row level security;

create or replace function public.get_profile_dueling_power(p_user_id uuid)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    sum(
      greatest(
        coalesce(nullif(item->'boosts'->>'dueling_power', '')::integer, 0),
        0
      )
    ),
    0
  )
  from public.profiles p
  cross join lateral jsonb_array_elements(coalesce(p.inventory->'items', '[]'::jsonb)) as item
  where p.id = p_user_id;
$$;

grant execute on function public.get_profile_dueling_power(uuid) to authenticated;

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

create or replace function public.ensure_duel_turn_secure(
  p_duel_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_duel public.duels;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into v_duel
  from public.duels
  where id = p_duel_id
  for update;

  if not found then
    raise exception 'הדו-קרב לא נמצא.';
  end if;

  if v_user_id not in (v_duel.challenger_id, v_duel.opponent_id) and not public.is_staff_user() then
    raise exception 'אין לך הרשאה לגשת לדו-קרב הזה.';
  end if;

  if v_duel.status = 'active' and v_duel.current_turn is null then
    update public.duels
    set current_turn = challenger_id,
        turn_deadline = coalesce(v_duel.turn_deadline, timezone('utc', now()) + interval '60 seconds')
    where id = p_duel_id
    returning * into v_duel;
  end if;

  return jsonb_build_object(
    'duel_id', v_duel.id,
    'status', v_duel.status,
    'current_turn', v_duel.current_turn,
    'turn_deadline', v_duel.turn_deadline
  );
end;
$$;

grant execute on function public.ensure_duel_turn_secure(uuid) to authenticated;

create or replace function public.respond_to_duel_challenge_secure(
  p_duel_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_action text := lower(trim(coalesce(p_action, '')));
  v_duel public.duels;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_action not in ('accept', 'decline', 'expire', 'cancel') then
    raise exception 'פעולת דו-קרב לא נתמכת.';
  end if;

  select *
    into v_duel
  from public.duels
  where id = p_duel_id
  for update;

  if not found then
    raise exception 'הדו-קרב לא נמצא.';
  end if;

  if v_user_id not in (v_duel.challenger_id, v_duel.opponent_id) and not public.is_staff_user() then
    raise exception 'אין לך הרשאה לפעול על הדו-קרב הזה.';
  end if;

  if v_duel.status <> 'pending' then
    return jsonb_build_object(
      'duel_id', v_duel.id,
      'status', v_duel.status
    );
  end if;

  if v_action in ('accept', 'decline') and v_user_id <> v_duel.opponent_id and not public.is_staff_user() then
    raise exception 'רק הצד שקיבל את האתגר יכול לבחור אם לקבל או לדחות.';
  end if;

  if v_action = 'cancel' and v_user_id <> v_duel.challenger_id and not public.is_staff_user() then
    raise exception 'רק הצד ששלח את האתגר יכול לבטל אותו.';
  end if;

  if v_action = 'accept' and v_duel.expires_at is not null and v_duel.expires_at <= timezone('utc', now()) then
    v_action := 'expire';
  end if;

  if v_action = 'accept' then
    update public.duels
    set status = 'active',
        current_turn = challenger_id,
        turn_deadline = timezone('utc', now()) + interval '60 seconds',
        challenger_hp = coalesce(challenger_hp, 100),
        opponent_hp = coalesce(opponent_hp, 100)
    where id = p_duel_id
    returning * into v_duel;

    update public.notifications
    set is_read = true
    where user_id = v_duel.opponent_id
      and type = 'duel_challenge'
      and target_url = '/duels/' || v_duel.id::text;

    insert into public.notifications (
      user_id,
      actor_id,
      type,
      target_url,
      content,
      is_read
    )
    values (
      v_duel.challenger_id,
      v_duel.opponent_id,
      'duel_status',
      '/duels/' || v_duel.id::text,
      'האתגר שלך לזירה אושר!',
      false
    );
  elsif v_action = 'decline' then
    update public.duels
    set status = 'declined'
    where id = p_duel_id
    returning * into v_duel;

    update public.notifications
    set is_read = true
    where user_id = v_duel.opponent_id
      and type = 'duel_challenge'
      and target_url = '/duels/' || v_duel.id::text;

    insert into public.notifications (
      user_id,
      actor_id,
      type,
      target_url,
      content,
      is_read
    )
    values (
      v_duel.challenger_id,
      v_duel.opponent_id,
      'duel_status',
      '/duels/' || v_duel.id::text,
      'האתגר שלך לדו-קרב נדחה.',
      false
    );
  elsif v_action = 'cancel' then
    update public.duels
    set status = 'cancelled'
    where id = p_duel_id
    returning * into v_duel;

    update public.notifications
    set is_read = true
    where user_id = v_duel.opponent_id
      and type = 'duel_challenge'
      and target_url = '/duels/' || v_duel.id::text;
  else
    if v_duel.expires_at is null or (v_duel.expires_at > timezone('utc', now()) and not public.is_staff_user()) then
      raise exception 'האתגר עדיין לא פג תוקף.';
    end if;

    update public.duels
    set status = 'expired'
    where id = p_duel_id
    returning * into v_duel;

    update public.notifications
    set is_read = true
    where user_id = v_duel.opponent_id
      and type = 'duel_challenge'
      and target_url = '/duels/' || v_duel.id::text;

    if not exists (
      select 1
      from public.notifications
      where user_id = v_duel.challenger_id
        and type = 'duel_missed'
        and target_url = '/duels/' || v_duel.id::text
    ) then
      insert into public.notifications (
        user_id,
        actor_id,
        type,
        target_url,
        content,
        is_read
      )
      values
        (
          v_duel.challenger_id,
          v_duel.opponent_id,
          'duel_missed',
          '/duels/' || v_duel.id::text,
          'האתגר שלך לדו-קרב פג תוקף — הצד השני לא הגיב בזמן.',
          false
        ),
        (
          v_duel.opponent_id,
          v_duel.challenger_id,
          'duel_missed',
          '/duels/' || v_duel.id::text,
          'פספסת את האתגר לדו-קרב. אפשר לאתגר שוב מהזירה.',
          false
        );
    end if;
  end if;

  return jsonb_build_object(
    'duel_id', v_duel.id,
    'status', v_duel.status,
    'current_turn', v_duel.current_turn,
    'turn_deadline', v_duel.turn_deadline
  );
end;
$$;

grant execute on function public.respond_to_duel_challenge_secure(uuid, text) to authenticated;

create or replace function public.skip_duel_turn_secure(
  p_duel_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_duel public.duels;
  v_next_turn uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into v_duel
  from public.duels
  where id = p_duel_id
  for update;

  if not found then
    raise exception 'הדו-קרב לא נמצא.';
  end if;

  if v_user_id not in (v_duel.challenger_id, v_duel.opponent_id) and not public.is_staff_user() then
    raise exception 'אין לך הרשאה לפעול על הדו-קרב הזה.';
  end if;

  if v_duel.status <> 'active' then
    raise exception 'אפשר לדלג תור רק בדו-קרב פעיל.';
  end if;

  if v_duel.current_turn is null then
    perform public.ensure_duel_turn_secure(p_duel_id);

    select *
      into v_duel
    from public.duels
    where id = p_duel_id
    for update;
  end if;

  if v_duel.turn_deadline is null or v_duel.turn_deadline > timezone('utc', now()) then
    raise exception 'התור עדיין לא פג תוקף.';
  end if;

  v_next_turn := case
    when v_duel.current_turn = v_duel.challenger_id then v_duel.opponent_id
    else v_duel.challenger_id
  end;

  insert into public.duel_moves (
    duel_id,
    player_id,
    spell_used,
    damage_dealt,
    effect
  )
  values (
    p_duel_id,
    v_duel.current_turn,
    'skip',
    0,
    'פג הזמן — התור דולג!'
  );

  update public.duels
  set current_turn = v_next_turn,
      turn_deadline = timezone('utc', now()) + interval '60 seconds'
  where id = p_duel_id
  returning * into v_duel;

  return jsonb_build_object(
    'duel_id', v_duel.id,
    'status', v_duel.status,
    'current_turn', v_duel.current_turn,
    'turn_deadline', v_duel.turn_deadline
  );
end;
$$;

grant execute on function public.skip_duel_turn_secure(uuid) to authenticated;

create or replace function public.finalize_duel_outcome_secure(
  p_duel_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_duel public.duels;
  v_challenger_name text;
  v_opponent_name text;
  v_loser_id uuid;
begin
  select *
    into v_duel
  from public.duels
  where id = p_duel_id
  for update;

  if not found then
    raise exception 'הדו-קרב לא נמצא.';
  end if;

  if v_user_id is not null
    and v_user_id not in (v_duel.challenger_id, v_duel.opponent_id)
    and not public.is_staff_user()
  then
    raise exception 'אין לך הרשאה לסגור את הדו-קרב הזה.';
  end if;

  if v_duel.status <> 'finished' then
    raise exception 'הדו-קרב עדיין לא הסתיים.';
  end if;

  if not exists (
    select 1
    from public.notifications
    where type = 'duel_result'
      and target_url = '/duels/' || v_duel.id::text
  ) then
    if v_duel.winner_id is null then
      insert into public.notifications (user_id, type, content, target_url, is_read)
      values
        (v_duel.challenger_id, 'duel_result', 'תיקו! קיבלתם 25 גליאונים 🤝', '/duels/' || v_duel.id::text, false),
        (v_duel.opponent_id, 'duel_result', 'תיקו! קיבלתם 25 גליאונים 🤝', '/duels/' || v_duel.id::text, false);
    else
      v_loser_id := case
        when v_duel.winner_id = v_duel.challenger_id then v_duel.opponent_id
        else v_duel.challenger_id
      end;

      insert into public.notifications (user_id, type, content, target_url, is_read)
      values
        (v_duel.winner_id, 'duel_result', 'ניצחת בדו-קרב! +50 גליאונים 🏆', '/duels/' || v_duel.id::text, false),
        (v_loser_id, 'duel_result', 'הפסדת בדו-קרב. +10 גליאונים 💪', '/duels/' || v_duel.id::text, false);
    end if;
  end if;

  perform public.award_duel_rewards_secure(p_duel_id);

  if not exists (
    select 1
    from public.activity_events
    where target_type = 'duel'
      and target_id = p_duel_id::text
      and event_type in ('arena_duel_completed', 'duel_tied')
  ) then
    select p1.full_name, p2.full_name
      into v_challenger_name, v_opponent_name
    from public.profiles p1
    join public.profiles p2 on p2.id = v_duel.opponent_id
    where p1.id = v_duel.challenger_id;

    perform public.log_activity_event_secure(
      case when v_duel.winner_id is null then 'duel_tied' else 'arena_duel_completed' end,
      case when v_duel.winner_id is null then 'סיים/ה דו-קרב בתיקו' else 'ניצח/ה בדו-קרב בזירה' end,
      case
        when v_challenger_name is not null and v_opponent_name is not null
          then v_challenger_name || ' נגד ' || v_opponent_name
        else null
      end,
      case when v_duel.winner_id is null then 'שני הצדדים קיבלו 25 גליאונים' else 'הקרב הוכרע והפרסים נשלחו' end,
      'duel',
      p_duel_id::text,
      '/duels/' || p_duel_id::text,
      case when v_duel.winner_id is null then '🤝' else '⚔️' end
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', v_duel.status
  );
end;
$$;

grant execute on function public.finalize_duel_outcome_secure(uuid) to authenticated;

create or replace function public.cast_duel_spell_secure(
  p_duel_id uuid,
  p_spell_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_spell_key text := lower(trim(coalesce(p_spell_key, '')));
  v_duel public.duels;
  v_player_status text;
  v_is_challenger boolean;
  v_has_spell boolean := false;
  v_base_damage integer := 0;
  v_uses_dueling_power boolean := false;
  v_damage integer := 0;
  v_target_hp integer := 100;
  v_new_hp integer := 0;
  v_next_turn uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_spell_key not in ('expelliarmus', 'expecto', 'wingardium', 'protego', 'stupefy', 'alohomora', 'lumos', 'nox') then
    raise exception 'הלחש שנבחר לא נתמך בזירה.';
  end if;

  select *
    into v_duel
  from public.duels
  where id = p_duel_id
  for update;

  if not found then
    raise exception 'הדו-קרב לא נמצא.';
  end if;

  if v_user_id not in (v_duel.challenger_id, v_duel.opponent_id) then
    raise exception 'אין לך הרשאה להשתתף בדו-קרב הזה.';
  end if;

  if v_duel.status <> 'active' then
    raise exception 'אפשר להטיל לחשים רק בדו-קרב פעיל.';
  end if;

  if v_duel.current_turn is null then
    perform public.ensure_duel_turn_secure(p_duel_id);

    select *
      into v_duel
    from public.duels
    where id = p_duel_id
    for update;
  end if;

  if v_duel.current_turn <> v_user_id then
    raise exception 'זה עדיין לא התור שלך.';
  end if;

  select status
    into v_player_status
  from public.profiles
  where id = v_user_id;

  if coalesce(v_player_status, 'active') in ('banned', 'cooling') then
    raise exception 'הגישה שלך חסומה כרגע לדו-קרב.';
  end if;

  if v_spell_key <> 'stupefy' then
    select exists (
      select 1
      from public.profiles p
      join public.spells s
        on s.id = any(coalesce(p.learned_spells, '{}'::uuid[]))
      where p.id = v_user_id
        and lower(coalesce(s.terminal_command, '')) = v_spell_key
    )
      into v_has_spell;

    if not v_has_spell then
      raise exception 'עוד לא למדת את הלחש הזה.';
    end if;
  end if;

  v_base_damage := case v_spell_key
    when 'expelliarmus' then 20
    when 'expecto' then 35
    when 'wingardium' then 15
    when 'protego' then 0
    when 'stupefy' then 25
    when 'alohomora' then 10
    when 'lumos' then 5
    when 'nox' then 8
    else 0
  end;

  v_uses_dueling_power := v_spell_key in ('expelliarmus', 'expecto');
  v_damage := v_base_damage + case when v_uses_dueling_power then public.get_profile_dueling_power(v_user_id) else 0 end;

  v_is_challenger := v_user_id = v_duel.challenger_id;
  v_target_hp := case
    when v_is_challenger then coalesce(v_duel.opponent_hp, 100)
    else coalesce(v_duel.challenger_hp, 100)
  end;
  v_new_hp := greatest(0, v_target_hp - v_damage);
  v_next_turn := case
    when v_is_challenger then v_duel.opponent_id
    else v_duel.challenger_id
  end;

  insert into public.duel_moves (
    duel_id,
    player_id,
    spell_used,
    damage_dealt
  )
  values (
    p_duel_id,
    v_user_id,
    v_spell_key,
    v_damage
  );

  if v_new_hp <= 0 then
    if v_is_challenger then
      update public.duels
      set opponent_hp = v_new_hp,
          status = 'finished',
          winner_id = v_user_id,
          current_turn = null,
          turn_deadline = null,
          finished_at = timezone('utc', now())
      where id = p_duel_id
      returning * into v_duel;
    else
      update public.duels
      set challenger_hp = v_new_hp,
          status = 'finished',
          winner_id = v_user_id,
          current_turn = null,
          turn_deadline = null,
          finished_at = timezone('utc', now())
      where id = p_duel_id
      returning * into v_duel;
    end if;

    perform public.finalize_duel_outcome_secure(p_duel_id);
  else
    if v_is_challenger then
      update public.duels
      set opponent_hp = v_new_hp,
          current_turn = v_next_turn,
          turn_deadline = timezone('utc', now()) + interval '60 seconds'
      where id = p_duel_id
      returning * into v_duel;
    else
      update public.duels
      set challenger_hp = v_new_hp,
          current_turn = v_next_turn,
          turn_deadline = timezone('utc', now()) + interval '60 seconds'
      where id = p_duel_id
      returning * into v_duel;
    end if;
  end if;

  return jsonb_build_object(
    'duel_id', v_duel.id,
    'status', v_duel.status,
    'winner_id', v_duel.winner_id,
    'challenger_hp', v_duel.challenger_hp,
    'opponent_hp', v_duel.opponent_hp,
    'current_turn', v_duel.current_turn,
    'turn_deadline', v_duel.turn_deadline
  );
end;
$$;

grant execute on function public.cast_duel_spell_secure(uuid, text) to authenticated;

drop policy if exists "Participants can read duels" on public.duels;
create policy "Participants can read duels"
  on public.duels
  for select
  to authenticated
  using (
    auth.uid() in (challenger_id, opponent_id)
    or public.is_staff_user()
  );

drop policy if exists "Staff can manage duels" on public.duels;
create policy "Staff can manage duels"
  on public.duels
  for all
  to authenticated
  using (public.is_staff_user())
  with check (public.is_staff_user());

drop policy if exists "Participants can read duel moves" on public.duel_moves;
create policy "Participants can read duel moves"
  on public.duel_moves
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.duels d
      where d.id = duel_id
        and (
          auth.uid() in (d.challenger_id, d.opponent_id)
          or public.is_staff_user()
        )
    )
  );

drop policy if exists "Staff can manage duel moves" on public.duel_moves;
create policy "Staff can manage duel moves"
  on public.duel_moves
  for all
  to authenticated
  using (public.is_staff_user())
  with check (public.is_staff_user());
