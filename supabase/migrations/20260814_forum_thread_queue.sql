-- מנוע פרסום אשכולות אוטומטי לפורומים של לומוס.
--
-- הרעיון: הדיפולט הוא שאשכול מתפרסם לבד. השער האוטומטי (forumAutoGate) מסמן
-- טיוטה כ-approved רק אם היא מבוססת מקורות ולא נגעה בנושא רגיש. כל השאר יושב
-- ב-needs_review ומחכה להחלטה ידנית, כדי שהצוות ייכנס לתמונה רק כשבאמת צריך.

create table if not exists public.forum_publisher_settings (
  id boolean primary key default true,
  is_enabled boolean not null default false,
  author_id uuid references public.profiles(id) on delete set null,
  min_hours_between_posts integer not null default 48,
  blocked_keywords jsonb not null default '[]'::jsonb,
  allowed_link_hosts jsonb not null default '["lumos-il.co.il"]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint forum_publisher_settings_singleton check (id)
);

comment on table public.forum_publisher_settings is
  'הגדרות מנוע הפרסום האוטומטי. שורה בודדת (id=true). is_enabled=false עוצר את הקרון לגמרי.';

create table if not exists public.forum_thread_queue (
  id uuid primary key default gen_random_uuid(),
  forum_id uuid not null references public.forums(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,

  title text not null,
  content text not null,
  prefix text,
  is_pinned boolean not null default false,
  is_locked boolean not null default false,

  -- שכבת הביסוס: מאיזה סוג מקור האשכול נשען, ומה בדיוק המקורות.
  -- canon_source תואם ל-CanonSource ב-src/lib/wizardingCanon.ts
  canon_source text not null default 'site',
  sources jsonb not null default '[]'::jsonb,
  data_snapshot jsonb not null default '{}'::jsonb,

  status text not null default 'needs_review',
  gate_reasons jsonb not null default '[]'::jsonb,
  generator text,
  dedupe_key text,

  scheduled_for timestamptz,
  published_thread_id uuid references public.threads(id) on delete set null,
  published_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,

  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint forum_thread_queue_status_check
    check (status in ('needs_review', 'approved', 'published', 'rejected')),
  constraint forum_thread_queue_canon_source_check
    check (canon_source in ('books', 'films', 'both', 'series', 'site')),
  constraint forum_thread_queue_title_check
    check (char_length(btrim(title)) between 2 and 180),
  constraint forum_thread_queue_sources_is_array
    check (jsonb_typeof(sources) = 'array'),
  constraint forum_thread_queue_gate_reasons_is_array
    check (jsonb_typeof(gate_reasons) = 'array'),
  -- אשכול שפורסם חייב להצביע על השרשור שנוצר, ולהיפך.
  constraint forum_thread_queue_published_consistency
    check (
      (status = 'published' and published_thread_id is not null and published_at is not null)
      or (status <> 'published' and published_thread_id is null and published_at is null)
    )
);

comment on table public.forum_thread_queue is
  'תור אשכולות ממתינים לפרסום בפורומים. approved עולה לבד דרך הקרון, needs_review מחכה לצוות.';
comment on column public.forum_thread_queue.sources is
  'מערך מקורות: [{kind, label, ref, url, reliability}]. תור בלי מקורות לא עובר את השער.';
comment on column public.forum_thread_queue.data_snapshot is
  'צילום הנתונים שמהם נוצר האשכול, לביקורת בדיעבד (מה היה מצב גביע הבתים בזמן הכתיבה).';
comment on column public.forum_thread_queue.dedupe_key is
  'מפתח ייחודיות לוגי (למשל house-cup-weekly:2026-W33) שמונע פרסום כפול של אותו נושא.';

create index if not exists forum_thread_queue_pending_idx
  on public.forum_thread_queue (status, scheduled_for)
  where status in ('needs_review', 'approved');

create index if not exists forum_thread_queue_forum_idx
  on public.forum_thread_queue (forum_id, created_at desc);

-- אותו נושא לא ייכנס לתור פעמיים כל עוד הוא חי או כבר פורסם.
create unique index if not exists forum_thread_queue_dedupe_idx
  on public.forum_thread_queue (dedupe_key)
  where dedupe_key is not null and status <> 'rejected';

create or replace function public.set_forum_thread_queue_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists forum_thread_queue_updated_at on public.forum_thread_queue;
create trigger forum_thread_queue_updated_at
  before update on public.forum_thread_queue
  for each row execute function public.set_forum_thread_queue_updated_at();

drop trigger if exists forum_publisher_settings_updated_at on public.forum_publisher_settings;
create trigger forum_publisher_settings_updated_at
  before update on public.forum_publisher_settings
  for each row execute function public.set_forum_thread_queue_updated_at();

-- ── RLS: התור הוא כלי צוות בלבד. משתמשים רגילים לא רואים טיוטות. ──
alter table public.forum_thread_queue enable row level security;
alter table public.forum_publisher_settings enable row level security;

drop policy if exists "Staff can read forum thread queue" on public.forum_thread_queue;
create policy "Staff can read forum thread queue"
  on public.forum_thread_queue
  for select
  using (public.is_staff_user());

drop policy if exists "Staff can manage forum thread queue" on public.forum_thread_queue;
create policy "Staff can manage forum thread queue"
  on public.forum_thread_queue
  for all
  using (public.is_staff_user())
  with check (public.is_staff_user());

drop policy if exists "Staff can read publisher settings" on public.forum_publisher_settings;
create policy "Staff can read publisher settings"
  on public.forum_publisher_settings
  for select
  using (public.is_staff_user());

drop policy if exists "Staff can manage publisher settings" on public.forum_publisher_settings;
create policy "Staff can manage publisher settings"
  on public.forum_publisher_settings
  for all
  using (public.is_staff_user())
  with check (public.is_staff_user());

-- ── הפרסום עצמו ──
-- create_forum_thread_secure נשען על auth.uid() ולכן קרון לא יכול לקרוא לו.
-- הפונקציה הזאת לוקחת את המחבר מהשורה בתור, ומורשית ל-service_role בלבד.
create or replace function public.publish_forum_thread_queued(p_queue_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.forum_thread_queue;
  v_thread public.threads;
  v_post public.forum_posts;
  v_now timestamptz := timezone('utc', now());
begin
  -- נעילת השורה מונעת פרסום כפול אם שתי הרצות קרון חופפות.
  select * into v_row
  from public.forum_thread_queue
  where id = p_queue_id
  for update;

  if not found then
    raise exception 'פריט התור לא נמצא: %', p_queue_id;
  end if;

  if v_row.status <> 'approved' then
    raise exception 'אפשר לפרסם רק פריט במצב approved (המצב הנוכחי: %).', v_row.status;
  end if;

  if char_length(public.clean_rich_text(v_row.content)) < 20 then
    raise exception 'תוכן האשכול קצר מדי לפרסום.';
  end if;

  insert into public.threads (
    forum_id, author_id, title, prefix,
    is_pinned, is_locked, last_post_at, last_activity_at
  )
  values (
    v_row.forum_id, v_row.author_id, btrim(v_row.title),
    nullif(btrim(coalesce(v_row.prefix, '')), ''),
    v_row.is_pinned, v_row.is_locked, v_now, v_now
  )
  returning * into v_thread;

  insert into public.forum_posts (thread_id, user_id, content)
  values (v_thread.id, v_row.author_id, v_row.content)
  returning * into v_post;

  update public.forum_thread_queue
  set status = 'published',
      published_thread_id = v_thread.id,
      published_at = v_now
  where id = v_row.id;

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'post_id', v_post.id,
    'forum_id', v_row.forum_id,
    'title', v_thread.title
  );
end;
$$;

revoke all on function public.publish_forum_thread_queued(uuid) from public, anon, authenticated;
grant execute on function public.publish_forum_thread_queued(uuid) to service_role;

insert into public.forum_publisher_settings (id, is_enabled)
values (true, false)
on conflict (id) do nothing;
