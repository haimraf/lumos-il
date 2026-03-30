-- Lock down activity-based event scoring:
-- 1. direct inserts into activity_events should go through the RPC only
-- 2. points are only granted for explicit mission event types
-- 3. mission event types must be backed by real source records in the DB

DROP POLICY IF EXISTS "Authenticated users can insert own activity events" ON public.activity_events;

CREATE INDEX IF NOT EXISTS activity_events_actor_event_target_created_idx
ON public.activity_events (actor_id, event_type, target_type, target_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_activity_event_secure(
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
  v_is_staff boolean := public.is_staff_user();
  v_event_config jsonb := '{}'::jsonb;
  v_mission jsonb;
  v_has_override boolean := false;
  v_points_override integer := 0;
  v_points integer := 0;
  v_now timestamptz := timezone('utc', now());
  v_today text := to_char(timezone('utc', now()), 'YYYY-MM-DD');
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_cooldown_seconds integer := 0;
  v_recent_exists boolean := false;
  v_target_type text := nullif(btrim(p_target_type), '');
  v_target_id text := nullif(btrim(p_target_id), '');
  v_visibility text := case when p_visibility = 'private' then 'private' else 'public' end;
  v_is_supported_event boolean := false;
  v_is_verified boolean := false;
  v_source_created_at timestamptz;
  v_target_uuid uuid;
  v_has_same_day_claim boolean := false;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  select p.full_name, p.house, p.status, ug.color
    into v_actor_name, v_actor_house, v_actor_status, v_actor_group_color
  from public.profiles p
  left join public.user_groups ug on ug.id = p.group_id
  where p.id = v_actor_id;

  v_actor_name := coalesce(v_actor_name, 'קוסם/ת');

  v_is_supported_event := p_event_type in (
    'admin_test_event',
    'arena_duel_completed',
    'chapter_published',
    'duel_tied',
    'forum_post_created',
    'forum_reply_created',
    'forum_thread_created',
    'house_sorted',
    'library_chapter_read',
    'news_comment_created',
    'news_poll_voted',
    'news_published',
    'quest_niffler_found',
    'quest_reward_claimed',
    'quest_snitch_caught',
    'quest_trivia_completed',
    'shop_purchase',
    'story_published'
  );

  if not v_is_supported_event and not v_is_staff then
    return jsonb_build_object(
      'ok', true,
      'rejected', true,
      'reason', 'unsupported_event',
      'points_awarded', 0
    );
  end if;

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

  if v_target_id is not null and v_target_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    v_target_uuid := v_target_id::uuid;
  end if;

  v_is_verified := v_is_staff;

  case p_event_type
    when 'forum_thread_created' then
      if v_target_type = 'thread' and v_target_uuid is not null then
        v_is_verified := exists (
          select 1
          from public.threads t
          where t.id = v_target_uuid
            and t.author_id = v_actor_id
        )
        and not exists (
          select 1
          from public.activity_events ae
          where ae.actor_id = v_actor_id
            and ae.event_type = p_event_type
            and ae.target_type = 'thread'
            and ae.target_id = v_target_id
        );
      end if;

    when 'forum_post_created', 'forum_reply_created' then
      if v_target_type = 'thread' and v_target_uuid is not null then
        select fp.created_at
          into v_source_created_at
        from public.forum_posts fp
        where fp.thread_id = v_target_uuid
          and fp.user_id = v_actor_id
        order by fp.created_at desc
        limit 1;

        v_is_verified := v_source_created_at is not null
          and v_source_created_at >= v_now - interval '10 minutes'
          and not exists (
            select 1
            from public.activity_events ae
            where ae.actor_id = v_actor_id
              and ae.event_type = p_event_type
              and ae.target_type = 'thread'
              and ae.target_id = v_target_id
              and ae.created_at >= v_source_created_at
          );
      end if;

    when 'news_comment_created' then
      if v_target_type = 'news' and v_target_uuid is not null then
        select c.created_at
          into v_source_created_at
        from public.comments c
        where c.news_id = v_target_uuid
          and c.user_id = v_actor_id
        order by c.created_at desc
        limit 1;

        v_is_verified := v_source_created_at is not null
          and v_source_created_at >= v_now - interval '10 minutes'
          and not exists (
            select 1
            from public.activity_events ae
            where ae.actor_id = v_actor_id
              and ae.event_type = p_event_type
              and ae.target_type = 'news'
              and ae.target_id = v_target_id
              and ae.created_at >= v_source_created_at
          );
      end if;

    when 'news_poll_voted' then
      if v_target_type = 'poll' and v_target_uuid is not null then
        v_is_verified := exists (
          select 1
          from public.poll_votes pv
          where pv.poll_id = v_target_uuid
            and pv.user_id = v_actor_id
        )
        and not exists (
          select 1
          from public.activity_events ae
          where ae.actor_id = v_actor_id
            and ae.event_type = p_event_type
            and ae.target_type = 'poll'
            and ae.target_id = v_target_id
        );
      end if;

    when 'story_published' then
      if v_target_type = 'story' and v_target_uuid is not null then
        v_is_verified := exists (
          select 1
          from public.stories s
          where s.id = v_target_uuid
            and s.author_id = v_actor_id
            and coalesce(s.is_published, false) = true
        )
        and not exists (
          select 1
          from public.activity_events ae
          where ae.actor_id = v_actor_id
            and ae.event_type = p_event_type
            and ae.target_type = 'story'
            and ae.target_id = v_target_id
        );
      end if;

    when 'chapter_published' then
      if v_target_type = 'chapter' and v_target_uuid is not null then
        v_is_verified := exists (
          select 1
          from public.chapters c
          join public.stories s on s.id = c.story_id
          where c.id = v_target_uuid
            and s.author_id = v_actor_id
        )
        and not exists (
          select 1
          from public.activity_events ae
          where ae.actor_id = v_actor_id
            and ae.event_type = p_event_type
            and ae.target_type = 'chapter'
            and ae.target_id = v_target_id
        );
      end if;

    when 'quest_reward_claimed' then
      select coalesce(p.last_reward_date, '') = v_today
        into v_has_same_day_claim
      from public.profiles p
      where p.id = v_actor_id;

      v_is_verified := v_has_same_day_claim
        and not exists (
          select 1
          from public.activity_events ae
          where ae.actor_id = v_actor_id
            and ae.event_type = p_event_type
            and ae.created_at >= date_trunc('day', v_now)
        );

    when 'quest_trivia_completed' then
      select coalesce(p.last_trivia_date, '') = v_today
        into v_has_same_day_claim
      from public.profiles p
      where p.id = v_actor_id;

      v_is_verified := v_has_same_day_claim
        and not exists (
          select 1
          from public.activity_events ae
          where ae.actor_id = v_actor_id
            and ae.event_type = p_event_type
            and ae.created_at >= date_trunc('day', v_now)
        );

    when 'quest_niffler_found' then
      select coalesce(p.last_niffler_date, '') = v_today
        into v_has_same_day_claim
      from public.profiles p
      where p.id = v_actor_id;

      v_is_verified := v_has_same_day_claim
        and not exists (
          select 1
          from public.activity_events ae
          where ae.actor_id = v_actor_id
            and ae.event_type = p_event_type
            and ae.created_at >= date_trunc('day', v_now)
        );

    when 'quest_snitch_caught' then
      select coalesce(p.last_snitch_date, '') = v_today
        into v_has_same_day_claim
      from public.profiles p
      where p.id = v_actor_id;

      v_is_verified := v_has_same_day_claim
        and not exists (
          select 1
          from public.activity_events ae
          where ae.actor_id = v_actor_id
            and ae.event_type = p_event_type
            and ae.created_at >= date_trunc('day', v_now)
        );

    when 'arena_duel_completed' then
      if v_target_type = 'duel' and v_target_uuid is not null then
        v_is_verified := exists (
          select 1
          from public.duels d
          where d.id = v_target_uuid
            and d.status = 'finished'
            and d.winner_id = v_actor_id
        )
        and not exists (
          select 1
          from public.activity_events ae
          where ae.actor_id = v_actor_id
            and ae.event_type = p_event_type
            and ae.target_type = 'duel'
            and ae.target_id = v_target_id
        );
      end if;

    when 'duel_tied' then
      if v_target_type = 'duel' and v_target_uuid is not null then
        v_is_verified := exists (
          select 1
          from public.duels d
          where d.id = v_target_uuid
            and d.status = 'finished'
            and d.winner_id is null
            and v_actor_id in (d.challenger_id, d.opponent_id)
        )
        and not exists (
          select 1
          from public.activity_events ae
          where ae.actor_id = v_actor_id
            and ae.event_type = p_event_type
            and ae.target_type = 'duel'
            and ae.target_id = v_target_id
        );
      end if;
  end case;

  if p_event_type in (
    'arena_duel_completed',
    'chapter_published',
    'duel_tied',
    'forum_post_created',
    'forum_reply_created',
    'forum_thread_created',
    'news_comment_created',
    'news_poll_voted',
    'quest_niffler_found',
    'quest_reward_claimed',
    'quest_snitch_caught',
    'quest_trivia_completed',
    'story_published'
  ) and not v_is_verified then
    return jsonb_build_object(
      'ok', true,
      'rejected', true,
      'reason', 'source_not_verified',
      'points_awarded', 0
    );
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
      and v_is_verified
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
    'verified', v_is_verified,
    'points_awarded', v_points
  );
end;
$$;

GRANT EXECUTE ON FUNCTION public.log_activity_event_secure(
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
) TO authenticated;
