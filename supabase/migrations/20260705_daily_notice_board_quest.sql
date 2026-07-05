-- Add the daily notice board quest to existing dynamic quest catalogs.
-- If no quest_catalog setting exists, the application default catalog already includes it.
WITH new_quest AS (
  SELECT jsonb_build_object(
    'id', 'daily_notice_board',
    'enabled', true,
    'order', 85,
    'type', 'exploration',
    'title', 'לוח המודעות החי',
    'description', 'השאירו סימן אחד במסדרונות: תגובה, קריאה, הצבעה או דיון קטן שמראה שהטירה לא שקטה.',
    'objectiveLabel', 'לבצע פעולה קהילתית אחת היום',
    'target', 1,
    'reward', jsonb_build_object('points', 8, 'galleons', 4),
    'houseImpactLabel', 'ניצוץ קטן שמדליק את הבית',
    'actionHref', '/forums',
    'actionLabel', 'להשאיר סימן בטירה',
    'metric', jsonb_build_object(
      'source', 'activity_types',
      'window', 'daily',
      'eventTypes', jsonb_build_array(
        'forum_thread_created',
        'forum_reply_created',
        'news_comment_created',
        'news_poll_voted',
        'library_chapter_read'
      )
    )
  ) AS value
)
UPDATE public.site_settings
SET
  value = public.site_settings.value || jsonb_build_array(new_quest.value),
  updated_at = timezone('utc'::text, now())
FROM new_quest
WHERE public.site_settings.key = 'quest_catalog'
  AND jsonb_typeof(public.site_settings.value) = 'array'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(public.site_settings.value) AS entry
    WHERE entry->>'id' = 'daily_notice_board'
  );
