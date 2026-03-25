create or replace function public.reset_house_secure()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_galleons integer;
  v_house_changes_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(galleons, 0), coalesce(house_changes_count, 0)
    into v_galleons, v_house_changes_count
  from public.profiles
  where id = v_user_id;

  if v_galleons < 500 then
    raise exception 'עליך לאסוף 500 גליאונים כדי לעבור מיון מחדש.';
  end if;

  if v_house_changes_count >= 1 then
    raise exception 'כבר ניצלת את המיון החוזר שלך.';
  end if;

  update public.profiles
  set house = 'Unsorted',
      galleons = coalesce(galleons, 0) - 500,
      house_changes_count = coalesce(house_changes_count, 0) + 1
  where id = v_user_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.reset_house_secure() to authenticated;

create or replace function public.learn_spell_secure(
  p_spell_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing text[];
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if nullif(btrim(coalesce(p_spell_id, '')), '') is null then
    raise exception 'Spell id is required';
  end if;

  select coalesce(learned_spells, '{}'::text[])
    into v_existing
  from public.profiles
  where id = v_user_id;

  if p_spell_id = any(v_existing) then
    return jsonb_build_object('success', true, 'already_known', true);
  end if;

  update public.profiles
  set learned_spells = array_append(coalesce(learned_spells, '{}'::text[]), p_spell_id)
  where id = v_user_id;

  return jsonb_build_object('success', true, 'already_known', false);
end;
$$;

grant execute on function public.learn_spell_secure(text) to authenticated;

create or replace function public.purchase_wand_secure(
  p_wand_type text,
  p_cost integer default 15
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_galleons integer;
  v_existing_wand text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if nullif(btrim(coalesce(p_wand_type, '')), '') is null then
    raise exception 'Wand type is required';
  end if;

  select coalesce(galleons, 0), nullif(btrim(coalesce(wand_type, '')), '')
    into v_galleons, v_existing_wand
  from public.profiles
  where id = v_user_id;

  if v_existing_wand is not null then
    raise exception 'כבר יש לך שרביט רשום בפרופיל.';
  end if;

  if v_galleons < greatest(coalesce(p_cost, 15), 0) then
    raise exception 'חסרים גליאונים לרכישת השרביט.';
  end if;

  update public.profiles
  set wand_type = btrim(p_wand_type),
      galleons = coalesce(galleons, 0) - greatest(coalesce(p_cost, 15), 0)
  where id = v_user_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.purchase_wand_secure(text, integer) to authenticated;

create or replace function public.save_exam_pass_secure(
  p_exam_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_exam_type text := lower(trim(coalesce(p_exam_type, '')));
  v_now timestamptz := timezone('utc', now());
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_exam_type not in ('owl', 'newt') then
    raise exception 'Exam type is invalid';
  end if;

  if v_exam_type = 'owl' then
    update public.profiles
    set owl_passed = true,
        owl_passed_at = v_now
    where id = v_user_id;
  else
    update public.profiles
    set newt_passed = true,
        newt_passed_at = v_now
    where id = v_user_id;
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.save_exam_pass_secure(text) to authenticated;

create or replace function public.guard_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
  v_key text;
  v_protected_keys text[] := array[
    'role',
    'status',
    'group_id',
    'year',
    'duel_badge',
    'event_points',
    'passover_points',
    'points_contributed',
    'daily_points_earned',
    'last_point_at',
    'is_ghost',
    'ban_reason',
    'ban_expires_at',
    'house',
    'galleons',
    'house_changes_count',
    'learned_spells',
    'wand_type',
    'magic_traits',
    'found_lost_card',
    'last_trivia_date',
    'owl_passed',
    'owl_passed_at',
    'newt_passed',
    'newt_passed_at'
  ];
begin
  if auth.uid() is null
    or public.is_staff_user()
    or current_setting('app.allow_event_point_write', true) = '1'
    or current_user <> session_user
  then
    return new;
  end if;

  foreach v_key in array v_protected_keys loop
    if (v_old -> v_key) is distinct from (v_new -> v_key) then
      raise exception 'Direct update to protected profile field "%" is not allowed.', v_key;
    end if;
  end loop;

  return new;
end;
$$;
