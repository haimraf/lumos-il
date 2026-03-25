alter table public.shop_items
  add column if not exists is_available boolean not null default true;

alter table public.profiles
  add column if not exists duel_badge text;

create index if not exists duels_status_expires_at_idx
  on public.duels (status, expires_at);
