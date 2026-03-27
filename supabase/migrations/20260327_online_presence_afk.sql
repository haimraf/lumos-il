alter table public.online_users
  add column if not exists presence_status text not null default 'online';

alter table public.online_users
  add column if not exists last_active_at timestamptz;

update public.online_users
set
  presence_status = case
    when lower(coalesce(presence_status, 'online')) = 'afk' then 'afk'
    else 'online'
  end,
  last_active_at = coalesce(last_active_at, last_seen);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'online_users_presence_status_check'
  ) then
    alter table public.online_users
      add constraint online_users_presence_status_check
      check (presence_status in ('online', 'afk'));
  end if;
end $$;
