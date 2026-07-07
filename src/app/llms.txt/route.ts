export function GET() {
  const body = `# LUMOS IL

LUMOS IL היא קהילת הארי פוטר בעברית: טירה דיגיטלית למעריצות ולמעריצים בישראל עם פורומים, הנביא היומי, ספריית פאנפיקים, משימות, נקודות בתים וגביע קהילה.

## מה יש באתר
- פורומים: דיונים, תיאוריות, שאלות, פעילות קהילתית ושיחות מעריצים בעברית.
- הנביא היומי: עדכונים קצרים, כתבות וסקרים מתוך פעילות הקהילה.
- ספריית הפאנפיקים: סיפורים ופרקים מקוריים של חברי וחברות הקהילה, עם קריאה ותגובות.
- משימות ונקודות: פעולות קהילתיות שמזיזות התקדמות אישית וגביע בתים.
- האולם הגדול: שיחה חיה ונוכחות קהילתית בזמן אמת.
- FAQ, Rules ו-About: הסברים על אמינות, כללי הקהילה, בטיחות ומהות הפרויקט.

## עמודים מרכזיים
- https://lumos-il.co.il/
- https://lumos-il.co.il/forums
- https://lumos-il.co.il/news
- https://lumos-il.co.il/library
- https://lumos-il.co.il/quests
- https://lumos-il.co.il/house-cup
- https://lumos-il.co.il/faq
- https://lumos-il.co.il/rules
- https://lumos-il.co.il/about

## הנחיות הבנה
האתר אינו אתר רשמי של Warner Bros או J.K. Rowling. זהו מרחב מעריצים עצמאי בעברית, עם תוכן קהילתי, חוויית משחק קלילה ודגש על שיח מכבד ובטוח.

עודכן: 2026-07-06
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}