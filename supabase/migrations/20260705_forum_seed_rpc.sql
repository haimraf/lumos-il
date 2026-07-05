create extension if not exists pgcrypto with schema extensions;

create table if not exists public.private_app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.private_app_settings enable row level security;

revoke all on table public.private_app_settings from anon, authenticated;

create or replace function public.create_forum_seed_thread_secure(
  p_cron_secret text,
  p_author_id uuid,
  p_forum_id uuid,
  p_title text,
  p_content text,
  p_prefix text default null,
  p_min_hours integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected_secret_hash text;
  v_supplied_secret_hash text;
  v_profile record;
  v_forum record;
  v_clean_content text := public.clean_rich_text(p_content);
  v_thread public.threads;
  v_post public.forum_posts;
  v_min_hours integer := greatest(coalesce(p_min_hours, 20), 1);
begin
  select value->>'cron_secret_sha256'
    into v_expected_secret_hash
  from public.private_app_settings
  where key = 'forum_seed_cron'
  limit 1;

  if v_expected_secret_hash is null or v_expected_secret_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Forum seed cron secret is not configured.';
  end if;

  v_supplied_secret_hash := encode(extensions.digest(coalesce(p_cron_secret, ''), 'sha256'), 'hex');
  if v_supplied_secret_hash <> v_expected_secret_hash then
    raise exception 'Invalid cron secret.';
  end if;

  select id, full_name, role, house, year, status
    into v_profile
  from public.profiles
  where id = p_author_id;

  if not found then
    raise exception 'Forum seed user profile was not found.';
  end if;

  if coalesce(v_profile.status, 'active') in ('banned', 'cooling', 'suspended') then
    raise exception 'Forum seed user status does not allow posting.';
  end if;

  select id, slug, name, house_restriction, min_year, staff_only_create
    into v_forum
  from public.forums
  where id = p_forum_id;

  if not found then
    raise exception 'Forum was not found.';
  end if;

  if coalesce(v_forum.staff_only_create, false) or v_forum.slug = 'feedback-and-suggestions' then
    raise exception 'Forum is not eligible for automated seed posts.';
  end if;

  if nullif(v_forum.house_restriction, '') is not null
    and coalesce(v_profile.house, '') <> v_forum.house_restriction
  then
    raise exception 'Forum seed user cannot post in this house forum.';
  end if;

  if v_forum.min_year is not null and coalesce(v_profile.year, 1) < v_forum.min_year then
    raise exception 'Forum seed user does not meet the forum year requirement.';
  end if;

  if char_length(btrim(coalesce(p_title, ''))) < 2 then
    raise exception 'Forum seed title is too short.';
  end if;

  if char_length(v_clean_content) < 20 then
    raise exception 'Forum seed content is too short.';
  end if;

  if exists (
    select 1
    from public.admin_audit_logs
    where action = 'forum_seed_thread_publish'
      and created_at >= timezone('utc', now()) - make_interval(hours => v_min_hours)
  ) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'A forum seed thread was already published recently.'
    );
  end if;

  if exists (
    select 1
    from public.threads
    where forum_id = p_forum_id
      and created_at >= timezone('utc', now()) - interval '180 days'
      and lower(btrim(coalesce(title, ''))) = lower(btrim(coalesce(p_title, '')))
  ) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'A matching forum seed thread already exists.'
    );
  end if;

  insert into public.threads (
    forum_id,
    author_id,
    title,
    last_post_at,
    last_activity_at,
    prefix,
    is_pinned,
    is_locked
  )
  values (
    p_forum_id,
    p_author_id,
    btrim(p_title),
    timezone('utc', now()),
    timezone('utc', now()),
    nullif(btrim(coalesce(p_prefix, '')), ''),
    false,
    false
  )
  returning * into v_thread;

  insert into public.forum_posts (thread_id, user_id, content)
  values (v_thread.id, p_author_id, p_content)
  returning * into v_post;

  insert into public.admin_audit_logs (
    actor_id,
    actor_name,
    actor_role,
    action,
    target_type,
    target_id,
    target_label,
    details
  )
  values (
    p_author_id,
    coalesce(v_profile.full_name, 'Lumos IL'),
    v_profile.role,
    'forum_seed_thread_publish',
    'thread',
    v_thread.id::text,
    btrim(p_title),
    jsonb_build_object(
      'forum_id', p_forum_id,
      'forum_slug', v_forum.slug,
      'forum_name', v_forum.name,
      'post_id', v_post.id,
      'seed_version', 'forum-seed-v1'
    )
  );

  return jsonb_build_object(
    'ok', true,
    'thread_id', v_thread.id,
    'post_id', v_post.id
  );
end;
$$;

revoke all on function public.create_forum_seed_thread_secure(text, uuid, uuid, text, text, text, integer) from public;
grant execute on function public.create_forum_seed_thread_secure(text, uuid, uuid, text, text, text, integer) to anon, authenticated;
