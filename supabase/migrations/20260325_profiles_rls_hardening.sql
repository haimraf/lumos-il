alter table public.profiles enable row level security;

create or replace function public.is_staff_user()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_is_staff boolean := false;
begin
  if v_actor_id is null then
    return false;
  end if;

  select exists (
    select 1
    from public.profiles
    where id = v_actor_id
      and role in ('מנהל', 'מנחה')
  )
    into v_is_staff;

  return coalesce(v_is_staff, false);
end;
$$;

grant execute on function public.is_staff_user() to authenticated;

drop policy if exists "Public can read profiles" on public.profiles;
create policy "Public can read profiles"
  on public.profiles
  for select
  using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Staff can update any profile" on public.profiles;
create policy "Staff can update any profile"
  on public.profiles
  for update
  to authenticated
  using (public.is_staff_user())
  with check (public.is_staff_user());

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

drop trigger if exists guard_profile_sensitive_fields on public.profiles;
create trigger guard_profile_sensitive_fields
before update on public.profiles
for each row
execute function public.guard_profile_sensitive_fields();
