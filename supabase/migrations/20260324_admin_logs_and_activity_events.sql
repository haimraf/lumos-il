create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  actor_role text,
  action text not null,
  target_type text,
  target_id text,
  target_label text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);

create index if not exists admin_audit_logs_action_idx
  on public.admin_audit_logs (action);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "Staff can read audit logs" on public.admin_audit_logs;
create policy "Staff can read audit logs"
  on public.admin_audit_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('מנהל', 'מנחה')
    )
  );

drop policy if exists "Staff can insert audit logs" on public.admin_audit_logs;
create policy "Staff can insert audit logs"
  on public.admin_audit_logs
  for insert
  to authenticated
  with check (
    actor_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('מנהל', 'מנחה')
    )
  );

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  actor_house text,
  actor_group_color text,
  event_type text not null,
  icon text,
  title text not null,
  subtitle text,
  description text,
  target_type text,
  target_id text,
  target_url text,
  metadata jsonb not null default '{}'::jsonb,
  visibility text not null default 'public',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists activity_events_created_at_idx
  on public.activity_events (created_at desc);

create index if not exists activity_events_type_idx
  on public.activity_events (event_type);

create index if not exists activity_events_visibility_idx
  on public.activity_events (visibility);

alter table public.activity_events enable row level security;

drop policy if exists "Public can read visible activity events" on public.activity_events;
create policy "Public can read visible activity events"
  on public.activity_events
  for select
  using (visibility = 'public');

drop policy if exists "Authenticated users can insert own activity events" on public.activity_events;
create policy "Authenticated users can insert own activity events"
  on public.activity_events
  for insert
  to authenticated
  with check (actor_id = auth.uid());
