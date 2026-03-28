create extension if not exists pgcrypto;

create table if not exists public.faq_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  question text not null,
  answer text not null,
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (category, question)
);

create index if not exists faq_items_display_order_idx
  on public.faq_items (display_order, created_at);

alter table public.faq_items enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'faq_items'
      and policyname = 'faq_items_public_read'
  ) then
    create policy faq_items_public_read
      on public.faq_items
      for select
      using (is_published = true);
  end if;
end $$;

insert into public.faq_items (category, question, answer, display_order)
values
  (
    'קאנון ומקורות',
    'על מה האתר נשען מבחינת הארי פוטר?',
    'הלב של LUMOS נשען קודם כול על הספרים והסרטים של הארי פוטר. במקומות שבהם הוספנו שכבת משחק, תרגול או התקדמות משלנו — נסמן זאת כהרחבה משחקית כדי לא לבלבל בין קאנון לבין פיצ׳ר של הטירה.',
    900
  ),
  (
    'קאנון ומקורות',
    'מה נחשב אצלכם להרחבה משחקית?',
    'ריטואלי לימוד, חלק ממערכות הקווסטים, חלק מן ההתקדמות האישית והחיבורים בין עמודים הם הרחבות מקוריות של LUMOS. הן נועדו לגרום לעולם להרגיש חי יותר, אבל אינן מוצגות כעובדה מן הספרים או הסרטים.',
    910
  ),
  (
    'קאנון ומקורות',
    'איך אתם מתייחסים לסדרה החדשה של HBO Max?',
    'אנחנו משלבים באתר רק מה שהוכרז רשמית על הסדרה. בלי שמועות, בלי הדלפות, ובלי חומרים לא מורשים. כל פרט כזה יסומן אצלנו כעדכון רשמי מן הסדרה ולא כעובדה שכבר הופיעה בספרים או בסרטים.',
    920
  ),
  (
    'קאנון ומקורות',
    'מה זה Back to Hogwarts אצלכם?',
    'בכל 1 בספטמבר נפתח בטירה מרחב עונתי לפתיחת שנת הלימודים: הכרזה, דיון קהילתי ולעתים גם משימה או אירוע קטן. זהו עוגן קהילתי של האתר בהשראת פתיחת השנה בהוגוורטס.',
    930
  )
on conflict (category, question) do update
set
  answer = excluded.answer,
  display_order = excluded.display_order,
  is_published = true;
