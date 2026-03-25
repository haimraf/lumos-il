create index if not exists activity_events_actor_type_created_idx
on public.activity_events (actor_id, event_type, created_at desc);

create index if not exists forum_posts_user_created_idx
on public.forum_posts (user_id, created_at desc);

create index if not exists threads_author_forum_created_idx
on public.threads (author_id, forum_id, created_at desc);

create or replace function public.log_activity_event_secure(
  p_event_type text,
  p_title text,
  p_subtitle text default null,
  p_description text default null,
  p_target_type text default null,
  p_target_id text default null,
  p_target_url text default null,
  p_icon text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_visibility text default 'public'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_name text;
  v_actor_house text;
  v_actor_status text;
  v_actor_group_color text;
  v_event_config jsonb := '{}'::jsonb;
  v_mission jsonb;
  v_has_override boolean := false;
  v_points_override integer := 0;
  v_points integer := 0;
  v_now timestamptz := timezone('utc', now());
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_cooldown_seconds integer := 0;
  v_recent_exists boolean := false;
  v_target_type text := nullif(btrim(p_target_type), '');
  v_target_id text := nullif(btrim(p_target_id), '');
  v_visibility text := case when p_visibility = 'private' then 'private' else 'public' end;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  select p.full_name, p.house, p.status, ug.color
    into v_actor_name, v_actor_house, v_actor_status, v_actor_group_color
  from public.profiles p
  left join public.user_groups ug on ug.id = p.group_id
  where p.id = v_actor_id;

  v_actor_name := coalesce(v_actor_name, 'קוסמ׳');

  v_cooldown_seconds := case
    when p_event_type in ('forum_reply_created', 'forum_post_created', 'news_comment_created') then 30
    when p_event_type = 'forum_thread_created' then 45
    else 0
  end;

  if v_cooldown_seconds > 0 then
    select exists (
      select 1
      from public.activity_events ae
      where ae.actor_id = v_actor_id
        and ae.event_type = p_event_type
        and ae.created_at >= v_now - make_interval(secs => v_cooldown_seconds)
    )
      into v_recent_exists;

    if v_recent_exists then
      return jsonb_build_object(
        'ok', true,
        'throttled', true,
        'points_awarded', 0
      );
    end if;
  end if;

  insert into public.activity_events (
    actor_id,
    actor_name,
    actor_house,
    actor_group_color,
    event_type,
    icon,
    title,
    subtitle,
    description,
    target_type,
    target_id,
    target_url,
    metadata,
    visibility
  )
  values (
    v_actor_id,
    v_actor_name,
    v_actor_house,
    v_actor_group_color,
    p_event_type,
    nullif(p_icon, ''),
    p_title,
    nullif(p_subtitle, ''),
    nullif(p_description, ''),
    v_target_type,
    v_target_id,
    nullif(p_target_url, ''),
    coalesce(p_metadata, '{}'::jsonb),
    v_visibility
  );

  select coalesce(value, '{}'::jsonb)
    into v_event_config
  from public.site_settings
  where key = 'passover_event'
  limit 1;

  if coalesce((v_event_config->>'active')::boolean, false) then
    if coalesce(v_event_config->>'start_date', v_event_config->>'startDate', '') <> '' then
      v_start_at := coalesce(v_event_config->>'start_date', v_event_config->>'startDate')::timestamptz;
    end if;

    if coalesce(v_event_config->>'end_date', v_event_config->>'endDate', '') <> '' then
      v_end_at := coalesce(v_event_config->>'end_date', v_event_config->>'endDate')::timestamptz;
    end if;

    if (v_start_at is null or v_start_at <= v_now)
      and (v_end_at is null or v_end_at > v_now)
      and coalesce(v_actor_status, 'active') not in ('banned', 'cooling')
    then
      if jsonb_typeof(v_event_config->'missions') = 'array' then
        for v_mission in
          select value
          from jsonb_array_elements(v_event_config->'missions')
        loop
          if coalesce(v_mission->>'event_type', v_mission->>'eventType', '') = p_event_type then
            v_has_override := true;
            if coalesce(v_mission->>'points', '') ~ '^-?\d+$' then
              v_points_override := (v_mission->>'points')::integer;
            else
              v_points_override := 0;
            end if;
            exit;
          end if;
        end loop;
      end if;

      if v_has_override then
        v_points := greatest(v_points_override, 0);
      else
        v_points := case p_event_type
          when 'quest_trivia_completed' then 10
          when 'quest_niffler_found' then 10
          when 'quest_snitch_caught' then 15
          when 'quest_reward_claimed' then 5
          when 'forum_post_created' then 10
          when 'forum_thread_created' then 15
          when 'forum_reply_created' then 10
          when 'news_poll_voted' then 8
          when 'news_comment_created' then 5
          when 'arena_duel_completed' then 15
          when 'library_chapter_read' then 5
          when 'story_published' then 25
          when 'chapter_published' then 15
          when 'shop_purchase' then 5
          when 'house_sorted' then 10
          else 0
        end;
      end if;

      if v_points > 0 then
        perform set_config('app.allow_event_point_write', '1', true);
        update public.profiles
        set event_points = coalesce(event_points, 0) + v_points,
            passover_points = coalesce(passover_points, 0) + v_points
        where id = v_actor_id;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'throttled', false,
    'points_awarded', v_points
  );
end;
$$;

grant execute on function public.log_activity_event_secure(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text
) to authenticated;

create or replace function public.guard_thread_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_status text;
  v_last_created timestamptz;
  v_last_title text;
begin
  select role, status
    into v_role, v_status
  from public.profiles
  where id = new.author_id;

  if coalesce(v_status, 'active') in ('banned', 'cooling') then
    raise exception 'גישתך חסומה כרגע לפרסום בפורום.';
  end if;

  if coalesce(v_role, '') not in ('מנהל', 'מנחה') then
    select created_at, title
      into v_last_created, v_last_title
    from public.threads
    where author_id = new.author_id
      and forum_id = new.forum_id
    order by created_at desc
    limit 1;

    if v_last_created is not null
      and v_last_created > timezone('utc', now()) - interval '45 seconds'
    then
      raise exception 'המתן 45 שניות בין פתיחת שרשורים.';
    end if;

    if v_last_created is not null
      and v_last_created > timezone('utc', now()) - interval '20 minutes'
      and lower(trim(coalesce(v_last_title, ''))) = lower(trim(coalesce(new.title, '')))
    then
      raise exception 'נראה שכבר פתחת דיון זהה ממש עכשיו.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.guard_forum_post_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_status text;
  v_thread_locked boolean;
  v_last_created timestamptz;
  v_last_thread_id text;
  v_last_content text;
  v_new_clean text;
  v_last_clean text;
begin
  select role, status
    into v_role, v_status
  from public.profiles
  where id = new.user_id;

  if coalesce(v_status, 'active') in ('banned', 'cooling') then
    raise exception 'גישתך חסומה כרגע לפרסום בפורום.';
  end if;

  if coalesce(v_role, '') not in ('מנהל', 'מנחה') then
    select is_locked
      into v_thread_locked
    from public.threads
    where id = new.thread_id;

    if coalesce(v_thread_locked, false) then
      raise exception 'השרשור נעול כרגע.';
    end if;

    select created_at, thread_id::text, content
      into v_last_created, v_last_thread_id, v_last_content
    from public.forum_posts
    where user_id = new.user_id
    order by created_at desc
    limit 1;

    if v_last_created is not null
      and v_last_created > timezone('utc', now()) - interval '30 seconds'
    then
      raise exception 'המתן 30 שניות בין תגובות בפורום.';
    end if;

    v_new_clean := regexp_replace(
      regexp_replace(lower(coalesce(new.content, '')), '<[^>]+>', ' ', 'g'),
      '\s+',
      ' ',
      'g'
    );
    v_last_clean := regexp_replace(
      regexp_replace(lower(coalesce(v_last_content, '')), '<[^>]+>', ' ', 'g'),
      '\s+',
      ' ',
      'g'
    );

    if v_last_created is not null
      and v_last_created > timezone('utc', now()) - interval '10 minutes'
      and coalesce(v_last_thread_id, '') = new.thread_id::text
      and trim(v_new_clean) <> ''
      and trim(v_new_clean) = trim(v_last_clean)
    then
      raise exception 'נראה שזו אותה תגובה שוב.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_thread_insert on public.threads;
create trigger guard_thread_insert
before insert on public.threads
for each row
execute function public.guard_thread_insert();

drop trigger if exists guard_forum_post_insert on public.forum_posts;
create trigger guard_forum_post_insert
before insert on public.forum_posts
for each row
execute function public.guard_forum_post_insert();
