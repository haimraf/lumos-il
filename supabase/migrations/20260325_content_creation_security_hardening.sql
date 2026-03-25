create index if not exists comments_news_user_created_idx
on public.comments (news_id, user_id, created_at desc);

create index if not exists messages_user_created_idx
on public.messages (user_id, created_at desc);

alter table if exists public.comments enable row level security;
alter table if exists public.stories enable row level security;
alter table if exists public.chapters enable row level security;
alter table if exists public.forums enable row level security;
alter table if exists public.threads enable row level security;
alter table if exists public.forum_posts enable row level security;
alter table if exists public.messages enable row level security;
alter table if exists public.duels add column if not exists rewards_paid_at timestamptz;

create or replace function public.clean_rich_text(p_input text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      regexp_replace(coalesce(p_input, ''), '<[^>]+>', ' ', 'g'),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

create or replace function public.can_user_post_in_forum(p_forum_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_status text;
  v_house text;
  v_year integer;
  v_staff_only boolean;
  v_house_restriction text;
  v_min_year integer;
begin
  if v_user_id is null then
    return false;
  end if;

  select role, status, house, year
    into v_role, v_status, v_house, v_year
  from public.profiles
  where id = v_user_id;

  if coalesce(v_status, 'active') in ('banned', 'cooling') then
    return false;
  end if;

  select staff_only_create, house_restriction, min_year
    into v_staff_only, v_house_restriction, v_min_year
  from public.forums
  where id = p_forum_id;

  if not found then
    return false;
  end if;

  if coalesce(v_role, '') not in ('מנהל', 'מנחה') then
    if coalesce(v_staff_only, false) then
      return false;
    end if;

    if nullif(v_house_restriction, '') is not null
      and coalesce(v_house, '') <> v_house_restriction
    then
      return false;
    end if;

    if v_min_year is not null and coalesce(v_year, 1) < v_min_year then
      return false;
    end if;
  end if;

  return true;
end;
$$;

grant execute on function public.can_user_post_in_forum(uuid) to authenticated;

create or replace function public.can_user_reply_in_thread(p_thread_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_forum_id uuid;
  v_locked boolean;
begin
  select forum_id, is_locked
    into v_forum_id, v_locked
  from public.threads
  where id = p_thread_id;

  if not found then
    return false;
  end if;

  if coalesce(v_locked, false) and not public.is_staff_user() then
    return false;
  end if;

  return public.can_user_post_in_forum(v_forum_id);
end;
$$;

grant execute on function public.can_user_reply_in_thread(uuid) to authenticated;

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
    raise exception 'הגישה שלך חסומה כרגע לפרסום בפורום.';
  end if;

  new.last_post_at := timezone('utc', now());
  new.last_activity_at := timezone('utc', now());

  if coalesce(v_role, '') not in ('מנהל', 'מנחה') then
    new.is_pinned := false;
    new.is_locked := false;

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

create or replace function public.create_news_comment_secure(
  p_news_id uuid,
  p_content text
)
returns public.comments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_clean text := public.clean_rich_text(p_content);
  v_last_created timestamptz;
  v_comment public.comments;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select status
    into v_status
  from public.profiles
  where id = v_user_id;

  if coalesce(v_status, 'active') in ('banned', 'cooling') then
    raise exception 'הגישה שלך חסומה כרגע לתגובות.';
  end if;

  if char_length(v_clean) < 20 then
    raise exception 'תגובה לנביא חייבת לכלול לפחות 20 תווים.';
  end if;

  if exists (
    select 1
    from public.comments
    where news_id = p_news_id
      and user_id = v_user_id
  ) then
    raise exception 'כבר הגבת לכתבה הזאת.';
  end if;

  select created_at
    into v_last_created
  from public.comments
  where user_id = v_user_id
  order by created_at desc
  limit 1;

  if v_last_created is not null
    and v_last_created > timezone('utc', now()) - interval '30 seconds'
  then
    raise exception 'המתן 30 שניות בין תגובות.';
  end if;

  insert into public.comments (news_id, user_id, content, user_name)
  values (p_news_id, v_user_id, btrim(coalesce(p_content, '')), null)
  returning * into v_comment;

  return v_comment;
end;
$$;

grant execute on function public.create_news_comment_secure(uuid, text) to authenticated;

create or replace function public.guard_news_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_status text;
  v_last_created timestamptz;
  v_clean text := public.clean_rich_text(new.content);
begin
  select role, status
    into v_role, v_status
  from public.profiles
  where id = new.user_id;

  if coalesce(v_status, 'active') in ('banned', 'cooling') then
    raise exception 'הגישה שלך חסומה כרגע לתגובות.';
  end if;

  if char_length(v_clean) < 20 then
    raise exception 'תגובה לנביא חייבת לכלול לפחות 20 תווים.';
  end if;

  if exists (
    select 1
    from public.comments
    where news_id = new.news_id
      and user_id = new.user_id
  ) then
    raise exception 'כבר הגבת לכתבה הזאת.';
  end if;

  if coalesce(v_role, '') not in ('מנהל', 'מנחה') then
    select created_at
      into v_last_created
    from public.comments
    where user_id = new.user_id
    order by created_at desc
    limit 1;

    if v_last_created is not null
      and v_last_created > timezone('utc', now()) - interval '30 seconds'
    then
      raise exception 'המתן 30 שניות בין תגובות.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_news_comment_insert on public.comments;
create trigger guard_news_comment_insert
before insert on public.comments
for each row
execute function public.guard_news_comment_insert();

create or replace function public.create_story_secure(
  p_title text,
  p_description text default null,
  p_house_theme text default 'Neutral',
  p_rating text default 'PG-13',
  p_cover_url text default null
)
returns public.stories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_story public.stories;
  v_house_theme text := case
    when coalesce(nullif(btrim(p_house_theme), ''), 'Neutral') in ('Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff', 'Neutral')
      then coalesce(nullif(btrim(p_house_theme), ''), 'Neutral')
    else 'Neutral'
  end;
  v_rating text := case
    when coalesce(nullif(btrim(p_rating), ''), 'PG-13') in ('G', 'PG-13', 'R', '18+')
      then coalesce(nullif(btrim(p_rating), ''), 'PG-13')
    else 'PG-13'
  end;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select status
    into v_status
  from public.profiles
  where id = v_user_id;

  if coalesce(v_status, 'active') in ('banned', 'cooling') then
    raise exception 'הגישה שלך חסומה כרגע לפרסום סיפורים.';
  end if;

  if char_length(btrim(coalesce(p_title, ''))) < 2 then
    raise exception 'לכל סיפור חייבת להיות כותרת תקינה.';
  end if;

  insert into public.stories (
    author_id,
    title,
    description,
    house_theme,
    rating,
    cover_url,
    is_published,
    views_count
  )
  values (
    v_user_id,
    btrim(p_title),
    p_description,
    v_house_theme,
    v_rating,
    nullif(btrim(coalesce(p_cover_url, '')), ''),
    true,
    0
  )
  returning * into v_story;

  return v_story;
end;
$$;

grant execute on function public.create_story_secure(text, text, text, text, text) to authenticated;

create or replace function public.create_story_chapter_secure(
  p_story_id uuid,
  p_title text,
  p_content text,
  p_order_index integer default null
)
returns public.chapters
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_story_author_id uuid;
  v_order_index integer;
  v_chapter public.chapters;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select status
    into v_status
  from public.profiles
  where id = v_user_id;

  if coalesce(v_status, 'active') in ('banned', 'cooling') then
    raise exception 'הגישה שלך חסומה כרגע לפרסום פרקים.';
  end if;

  if char_length(btrim(coalesce(p_title, ''))) < 2 then
    raise exception 'לכל פרק חייבת להיות כותרת תקינה.';
  end if;

  if public.clean_rich_text(p_content) = '' then
    raise exception 'אי אפשר לפרסם פרק ריק.';
  end if;

  select author_id
    into v_story_author_id
  from public.stories
  where id = p_story_id;

  if not found then
    raise exception 'הסיפור המבוקש לא נמצא.';
  end if;

  if v_story_author_id <> v_user_id and not public.is_staff_user() then
    raise exception 'רק מחבר/ת הסיפור יכול/ה להוסיף פרקים.';
  end if;

  if coalesce(p_order_index, 0) > 0 then
    v_order_index := p_order_index;
  else
    select coalesce(max(order_index), 0) + 1
      into v_order_index
    from public.chapters
    where story_id = p_story_id;
  end if;

  insert into public.chapters (story_id, title, content, order_index)
  values (p_story_id, btrim(p_title), p_content, v_order_index)
  returning * into v_chapter;

  return v_chapter;
end;
$$;

grant execute on function public.create_story_chapter_secure(uuid, text, text, integer) to authenticated;

create or replace function public.create_forum_thread_secure(
  p_forum_id uuid,
  p_title text,
  p_content text,
  p_prefix text default null,
  p_is_pinned boolean default false,
  p_is_locked boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_staff boolean := public.is_staff_user();
  v_clean text := public.clean_rich_text(p_content);
  v_thread public.threads;
  v_post public.forum_posts;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.can_user_post_in_forum(p_forum_id) then
    raise exception 'אין לך הרשאה לפרסם בפורום הזה כרגע.';
  end if;

  if char_length(btrim(coalesce(p_title, ''))) < 2 then
    raise exception 'כותרת השרשור קצרה מדי.';
  end if;

  if char_length(v_clean) < 20 then
    raise exception 'יש לכתוב לפחות 20 תווים לפני פתיחת שרשור.';
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
    v_user_id,
    btrim(p_title),
    timezone('utc', now()),
    timezone('utc', now()),
    nullif(btrim(coalesce(p_prefix, '')), ''),
    case when v_is_staff then coalesce(p_is_pinned, false) else false end,
    case when v_is_staff then coalesce(p_is_locked, false) else false end
  )
  returning * into v_thread;

  insert into public.forum_posts (thread_id, user_id, content)
  values (v_thread.id, v_user_id, p_content)
  returning * into v_post;

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'post_id', v_post.id
  );
end;
$$;

grant execute on function public.create_forum_thread_secure(uuid, text, text, text, boolean, boolean) to authenticated;

create or replace function public.create_forum_reply_secure(
  p_thread_id uuid,
  p_content text
)
returns public.forum_posts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_clean text := public.clean_rich_text(p_content);
  v_post public.forum_posts;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.can_user_reply_in_thread(p_thread_id) then
    raise exception 'אין לך הרשאה להגיב בשרשור הזה כרגע.';
  end if;

  if v_clean = '' then
    raise exception 'אי אפשר לשלוח תגובה ריקה.';
  end if;

  insert into public.forum_posts (thread_id, user_id, content)
  values (p_thread_id, v_user_id, p_content)
  returning * into v_post;

  return v_post;
end;
$$;

grant execute on function public.create_forum_reply_secure(uuid, text) to authenticated;

create or replace function public.send_great_hall_message_secure(
  p_content text
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_status text;
  v_clean text := public.clean_rich_text(p_content);
  v_last_created timestamptz;
  v_last_content text;
  v_message public.messages;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select role, status
    into v_role, v_status
  from public.profiles
  where id = v_user_id;

  if coalesce(v_status, 'active') in ('banned', 'cooling') then
    raise exception 'הגישה שלך חסומה כרגע לצ׳אט.';
  end if;

  if v_clean = '' then
    raise exception 'אי אפשר לשלוח הודעה ריקה.';
  end if;

  select created_at, content
    into v_last_created, v_last_content
  from public.messages
  where user_id = v_user_id
  order by created_at desc
  limit 1;

  if coalesce(v_role, '') not in ('מנהל', 'מנחה') then
    if v_last_created is not null
      and v_last_created > timezone('utc', now()) - interval '4 seconds'
    then
      raise exception 'המתן כמה שניות בין הודעות.';
    end if;

    if v_last_created is not null
      and v_last_created > timezone('utc', now()) - interval '3 minutes'
      and lower(trim(coalesce(v_last_content, ''))) = lower(trim(coalesce(p_content, '')))
    then
      raise exception 'נראה שזו אותה הודעה שוב.';
    end if;
  end if;

  insert into public.messages (content, user_id)
  values (btrim(p_content), v_user_id)
  returning * into v_message;

  return v_message;
end;
$$;

grant execute on function public.send_great_hall_message_secure(text) to authenticated;

create or replace function public.sync_profile_fingerprint_secure(
  p_fingerprint text,
  p_is_ghost boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.profiles
  set fingerprint = nullif(btrim(coalesce(p_fingerprint, '')), ''),
      is_ghost = coalesce(p_is_ghost, is_ghost)
  where id = v_user_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.sync_profile_fingerprint_secure(text, boolean) to authenticated;

create or replace function public.guard_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_status text;
  v_last_created timestamptz;
  v_last_content text;
  v_clean text := public.clean_rich_text(new.content);
begin
  select role, status
    into v_role, v_status
  from public.profiles
  where id = new.user_id;

  if coalesce(v_status, 'active') in ('banned', 'cooling') then
    raise exception 'הגישה שלך חסומה כרגע לצ׳אט.';
  end if;

  if v_clean = '' then
    raise exception 'אי אפשר לשלוח הודעה ריקה.';
  end if;

  if coalesce(v_role, '') not in ('מנהל', 'מנחה') then
    select created_at, content
      into v_last_created, v_last_content
    from public.messages
    where user_id = new.user_id
    order by created_at desc
    limit 1;

    if v_last_created is not null
      and v_last_created > timezone('utc', now()) - interval '4 seconds'
    then
      raise exception 'המתן כמה שניות בין הודעות.';
    end if;

    if v_last_created is not null
      and v_last_created > timezone('utc', now()) - interval '3 minutes'
      and lower(trim(coalesce(v_last_content, ''))) = lower(trim(coalesce(new.content, '')))
    then
      raise exception 'נראה שזו אותה הודעה שוב.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_message_insert on public.messages;
create trigger guard_message_insert
before insert on public.messages
for each row
execute function public.guard_message_insert();

create or replace function public.complete_sorting_ceremony_secure(
  p_house text,
  p_magic_traits jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_current_house text;
  v_current_role text;
  v_bonus_galleons integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(nullif(btrim(p_house), ''), '') not in ('Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff') then
    raise exception 'בית לא תקין.';
  end if;

  select status, house, role
    into v_status, v_current_house, v_current_role
  from public.profiles
  where id = v_user_id;

  if coalesce(v_status, 'active') in ('banned', 'cooling') then
    raise exception 'הגישה שלך חסומה כרגע לטקס המיון.';
  end if;

  if coalesce(v_current_house, 'Unsorted') not in ('', 'Unsorted') and v_current_house is not null then
    raise exception 'כבר שובצת לבית.';
  end if;

  if coalesce(v_current_role, '') = '' then
    v_bonus_galleons := 100;
  end if;

  update public.profiles
  set house = p_house,
      role = case when coalesce(role, '') = '' then 'תלמיד׳' else role end,
      magic_traits = coalesce(p_magic_traits, '{}'::jsonb),
      galleons = coalesce(galleons, 0) + v_bonus_galleons
  where id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'bonus_galleons', v_bonus_galleons
  );
end;
$$;

grant execute on function public.complete_sorting_ceremony_secure(text, jsonb) to authenticated;

create or replace function public.claim_lost_card_secure()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_updated integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select status
    into v_status
  from public.profiles
  where id = v_user_id;

  if coalesce(v_status, 'active') in ('banned', 'cooling') then
    raise exception 'הגישה שלך חסומה כרגע למשימות.';
  end if;

  update public.profiles
  set found_lost_card = true,
      galleons = coalesce(galleons, 0) + 50,
      points_contributed = coalesce(points_contributed, 0) + 10
  where id = v_user_id
    and coalesce(found_lost_card, false) = false;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return jsonb_build_object(
      'success', false,
      'reason', 'already_claimed'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'galleons', 50,
    'points', 10
  );
end;
$$;

grant execute on function public.claim_lost_card_secure() to authenticated;

create or replace function public.submit_arcade_quiz_secure(
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_today text := to_char(now(), 'YYYY-MM-DD');
  v_answer jsonb;
  v_question_id text;
  v_selected_answer text;
  v_correct_answer text;
  v_points_reward integer;
  v_galleons_reward integer;
  v_seen_question_ids text[] := array[]::text[];
  v_total_points integer := 0;
  v_total_galleons integer := 0;
  v_answer_count integer := 0;
  v_is_correct boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select status
    into v_status
  from public.profiles
  where id = v_user_id;

  if coalesce(v_status, 'active') in ('banned', 'cooling') then
    raise exception 'הגישה שלך חסומה כרגע לחידון.';
  end if;

  if jsonb_typeof(coalesce(p_answers, '[]'::jsonb)) <> 'array' then
    raise exception 'תשובות החידון לא נשלחו בפורמט תקין.';
  end if;

  if exists (
    select 1
    from public.profiles
    where id = v_user_id
      and last_trivia_date = v_today
  ) then
    return jsonb_build_object(
      'success', false,
      'reason', 'already_claimed'
    );
  end if;

  for v_answer in
    select value
    from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb))
  loop
    v_question_id := nullif(btrim(coalesce(v_answer->>'question_id', '')), '');
    v_selected_answer := lower(trim(coalesce(v_answer->>'selected_answer', '')));

    if v_question_id is null
      or v_selected_answer not in ('a', 'b', 'c', 'd')
      or v_question_id = any(v_seen_question_ids)
    then
      continue;
    end if;

    v_seen_question_ids := array_append(v_seen_question_ids, v_question_id);

    select lower(trim(correct_answer)), coalesce(points_reward, 0), coalesce(galleons_reward, 0)
      into v_correct_answer, v_points_reward, v_galleons_reward
    from public.trivia_questions
    where id::text = v_question_id
      and is_active = true;

    if not found then
      continue;
    end if;

    v_is_correct := v_selected_answer = v_correct_answer;
    v_answer_count := v_answer_count + 1;

    insert into public.trivia_submissions (user_id, question_id, is_correct)
    select v_user_id, q.id, v_is_correct
    from public.trivia_questions q
    where q.id::text = v_question_id
    on conflict do nothing;

    if v_is_correct then
      v_total_points := v_total_points + greatest(v_points_reward, 0);
      v_total_galleons := v_total_galleons + greatest(v_galleons_reward, 0);
    end if;
  end loop;

  if v_answer_count = 0 then
    raise exception 'לא התקבלו תשובות תקינות לחידון.';
  end if;

  update public.profiles
  set galleons = coalesce(galleons, 0) + v_total_galleons,
      points_contributed = coalesce(points_contributed, 0) + v_total_points,
      last_trivia_date = v_today
  where id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'points', v_total_points,
    'galleons', v_total_galleons
  );
end;
$$;

grant execute on function public.submit_arcade_quiz_secure(jsonb) to authenticated;

create or replace function public.award_duel_rewards_secure(
  p_duel_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_challenger_id uuid;
  v_opponent_id uuid;
  v_winner_id uuid;
  v_status text;
  v_rewards_paid_at timestamptz;
  v_loser_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select challenger_id, opponent_id, winner_id, status, rewards_paid_at
    into v_challenger_id, v_opponent_id, v_winner_id, v_status, v_rewards_paid_at
  from public.duels
  where id = p_duel_id
  for update;

  if not found then
    raise exception 'הדו-קרב לא נמצא.';
  end if;

  if v_user_id not in (v_challenger_id, v_opponent_id) and not public.is_staff_user() then
    raise exception 'אין לך הרשאה לחלק את פרסי הדו-קרב הזה.';
  end if;

  if v_status <> 'finished' then
    raise exception 'הדו-קרב עדיין לא הסתיים.';
  end if;

  if v_rewards_paid_at is not null then
    return jsonb_build_object(
      'ok', true,
      'already_paid', true
    );
  end if;

  if v_winner_id is null then
    update public.profiles
    set galleons = coalesce(galleons, 0) + 25
    where id in (v_challenger_id, v_opponent_id);
  else
    v_loser_id := case
      when v_winner_id = v_challenger_id then v_opponent_id
      else v_challenger_id
    end;

    update public.profiles
    set galleons = coalesce(galleons, 0) + 50
    where id = v_winner_id;

    update public.profiles
    set galleons = coalesce(galleons, 0) + 10
    where id = v_loser_id;
  end if;

  update public.duels
  set rewards_paid_at = timezone('utc', now())
  where id = p_duel_id;

  return jsonb_build_object(
    'ok', true,
    'already_paid', false
  );
end;
$$;

grant execute on function public.award_duel_rewards_secure(uuid) to authenticated;

drop policy if exists "Public can read comments" on public.comments;
create policy "Public can read comments"
  on public.comments
  for select
  using (true);

drop policy if exists "Staff can manage comments" on public.comments;
create policy "Staff can manage comments"
  on public.comments
  for all
  to authenticated
  using (public.is_staff_user())
  with check (public.is_staff_user());

drop policy if exists "Authenticated users can create own comments" on public.comments;
create policy "Authenticated users can create own comments"
  on public.comments
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Public can read stories" on public.stories;
create policy "Public can read stories"
  on public.stories
  for select
  using (
    coalesce(is_published, false)
    or author_id = auth.uid()
    or public.is_staff_user()
  );

drop policy if exists "Authors and staff can manage stories" on public.stories;
create policy "Authors and staff can manage stories"
  on public.stories
  for all
  to authenticated
  using (author_id = auth.uid() or public.is_staff_user())
  with check (author_id = auth.uid() or public.is_staff_user());

drop policy if exists "Authenticated users can create own stories" on public.stories;
create policy "Authenticated users can create own stories"
  on public.stories
  for insert
  to authenticated
  with check (author_id = auth.uid());

drop policy if exists "Public can read chapters" on public.chapters;
create policy "Public can read chapters"
  on public.chapters
  for select
  using (
    exists (
      select 1
      from public.stories s
      where s.id = chapters.story_id
        and (
          coalesce(s.is_published, false)
          or s.author_id = auth.uid()
          or public.is_staff_user()
        )
    )
  );

drop policy if exists "Story authors and staff can manage chapters" on public.chapters;
create policy "Story authors and staff can manage chapters"
  on public.chapters
  for all
  to authenticated
  using (
    public.is_staff_user()
    or exists (
      select 1
      from public.stories s
      where s.id = chapters.story_id
        and s.author_id = auth.uid()
    )
  )
  with check (
    public.is_staff_user()
    or exists (
      select 1
      from public.stories s
      where s.id = chapters.story_id
        and s.author_id = auth.uid()
    )
  );

drop policy if exists "Story authors and staff can create chapters" on public.chapters;
create policy "Story authors and staff can create chapters"
  on public.chapters
  for insert
  to authenticated
  with check (
    public.is_staff_user()
    or exists (
      select 1
      from public.stories s
      where s.id = chapters.story_id
        and s.author_id = auth.uid()
    )
  );

drop policy if exists "Public can read forums" on public.forums;
create policy "Public can read forums"
  on public.forums
  for select
  using (true);

drop policy if exists "Staff can manage forums" on public.forums;
create policy "Staff can manage forums"
  on public.forums
  for all
  to authenticated
  using (public.is_staff_user())
  with check (public.is_staff_user());

drop policy if exists "Public can read threads" on public.threads;
create policy "Public can read threads"
  on public.threads
  for select
  using (true);

drop policy if exists "Staff can manage threads" on public.threads;
create policy "Staff can manage threads"
  on public.threads
  for all
  to authenticated
  using (public.is_staff_user())
  with check (public.is_staff_user());

drop policy if exists "Authenticated users can create threads in allowed forums" on public.threads;
create policy "Authenticated users can create threads in allowed forums"
  on public.threads
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.can_user_post_in_forum(forum_id)
  );

drop policy if exists "Public can read forum posts" on public.forum_posts;
create policy "Public can read forum posts"
  on public.forum_posts
  for select
  using (true);

drop policy if exists "Staff can manage forum posts" on public.forum_posts;
create policy "Staff can manage forum posts"
  on public.forum_posts
  for all
  to authenticated
  using (public.is_staff_user())
  with check (public.is_staff_user());

drop policy if exists "Authenticated users can create forum posts in allowed threads" on public.forum_posts;
create policy "Authenticated users can create forum posts in allowed threads"
  on public.forum_posts
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.can_user_reply_in_thread(thread_id)
  );

drop policy if exists "Authenticated users can read great hall messages" on public.messages;
create policy "Authenticated users can read great hall messages"
  on public.messages
  for select
  to authenticated
  using (auth.uid() is not null);

drop policy if exists "Staff can manage great hall messages" on public.messages;
create policy "Staff can manage great hall messages"
  on public.messages
  for all
  to authenticated
  using (public.is_staff_user())
  with check (public.is_staff_user());

drop policy if exists "Authenticated users can create own great hall messages" on public.messages;
create policy "Authenticated users can create own great hall messages"
  on public.messages
  for insert
  to authenticated
  with check (user_id = auth.uid());
