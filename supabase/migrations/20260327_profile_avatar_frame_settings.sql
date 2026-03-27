alter table public.profiles
  add column if not exists avatar_position text not null default '50% 50%';

alter table public.profiles
  add column if not exists avatar_zoom numeric not null default 1;

update public.profiles
set
  avatar_position = coalesce(nullif(btrim(avatar_position), ''), '50% 50%'),
  avatar_zoom = coalesce(avatar_zoom, 1);
