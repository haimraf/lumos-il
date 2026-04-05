alter table public.comments
  add column if not exists parent_comment_id uuid null references public.comments(id) on delete cascade;

create index if not exists comments_news_parent_created_idx
on public.comments (news_id, parent_comment_id, created_at asc);

drop function if exists public.create_news_comment_secure(uuid, text, uuid);

create or replace function public.create_news_comment_secure(
  p_news_id uuid,
  p_content text,
  p_parent_comment_id uuid default null
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
  v_parent_news_id uuid;
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

  if p_parent_comment_id is not null then
    select news_id
      into v_parent_news_id
    from public.comments
    where id = p_parent_comment_id;

    if v_parent_news_id is null then
      raise exception 'תגובת המקור לא נמצאה.';
    end if;

    if v_parent_news_id <> p_news_id then
      raise exception 'אי אפשר להשיב לתגובה מכתבה אחרת.';
    end if;
  end if;

  if p_parent_comment_id is null and exists (
    select 1
    from public.comments
    where news_id = p_news_id
      and user_id = v_user_id
      and parent_comment_id is null
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

  insert into public.comments (news_id, user_id, content, user_name, parent_comment_id)
  values (p_news_id, v_user_id, btrim(coalesce(p_content, '')), null, p_parent_comment_id)
  returning * into v_comment;

  return v_comment;
end;
$$;

grant execute on function public.create_news_comment_secure(uuid, text, uuid) to authenticated;

create or replace function public.create_news_comment_secure(
  p_news_id uuid,
  p_content text
)
returns public.comments
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_news_comment_secure(p_news_id, p_content, null);
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
  v_parent_news_id uuid;
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

  if new.parent_comment_id is not null then
    select news_id
      into v_parent_news_id
    from public.comments
    where id = new.parent_comment_id;

    if v_parent_news_id is null then
      raise exception 'תגובת המקור לא נמצאה.';
    end if;

    if v_parent_news_id <> new.news_id then
      raise exception 'אי אפשר להשיב לתגובה מכתבה אחרת.';
    end if;
  end if;

  if new.parent_comment_id is null and exists (
    select 1
    from public.comments
    where news_id = new.news_id
      and user_id = new.user_id
      and parent_comment_id is null
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
