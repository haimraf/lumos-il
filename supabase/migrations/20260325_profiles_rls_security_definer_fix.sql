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
    'ban_expires_at'
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
