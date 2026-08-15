-- ניקוי טבלת הנוכחות, ומניעת הצטברות מחדש.
--
-- הבעיה: כל אורח מקבל מזהה `guest_<uuid>` חדש בכל ביקור, והשורה שלו נשארת
-- בטבלה לנצח. חברים רשומים מתעדכנים לפי המזהה הקבוע שלהם ולכן אינם מצטברים.
-- נכון לכתיבת המיגרציה היו בטבלה 2,243 שורות עבור 71 שמות בלבד, מהן 2,203
-- ישנות משבוע. הטבלה גדלה באופן מונוטוני מאז מרץ.
--
-- הפתרון הוא טריגר ברמת ההצהרה ולא משימה מתוזמנת: אין תלות ב-pg_cron, אין
-- קרון חיצוני ואין סוד שצריך לתחזק. הניקוי רץ על אינדקס last_seen הקיים,
-- ואחרי הניקוי הראשוני הוא כמעט תמיד מוחק אפס שורות.
--
-- שמירת יום אחד נדיבה בכוונה: הצרכן היחיד של הטבלה (מפת הקונדסאים, רשימת
-- המחוברים) מסתכל על דקות בודדות אחורה.

delete from public.online_users
where last_seen < (now() at time zone 'utc') - interval '1 day';

create or replace function public.prune_online_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.online_users
  where last_seen < (now() at time zone 'utc') - interval '1 day';
  return null;
end;
$$;

comment on function public.prune_online_users is
  'מוחק רשומות נוכחות ישנות מיום. נקרא מטריגר ברמת הצהרה על כל כתיבה לטבלה.';

drop trigger if exists online_users_prune on public.online_users;
create trigger online_users_prune
  after insert on public.online_users
  for each statement execute function public.prune_online_users();
