alter table if exists public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_staff_user()
  );

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications
  for update
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_staff_user()
  )
  with check (
    user_id = auth.uid()
    or public.is_staff_user()
  );

drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications"
  on public.notifications
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_staff_user()
  );

drop policy if exists "Users can create attributed notifications" on public.notifications;
create policy "Users can create attributed notifications"
  on public.notifications
  for insert
  to authenticated
  with check (
    actor_id = auth.uid()
    or user_id = auth.uid()
    or public.is_staff_user()
  );
