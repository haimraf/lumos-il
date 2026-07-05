export type SeedForum = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  house_restriction: string | null;
  min_year: number | null;
  staff_only_create: boolean | null;
};

export type SeedProfile = {
  id: string;
  full_name: string | null;
  role: string | null;
  house: string | null;
  year: number | null;
  status: string | null;
};

export type SeedTopic = {
  prefix: string;
  title: string;
  content: string;
};

type TopicTemplate = {
  prefix: string;
  title: string;
  intro: string;
  questions: string[];
};

const DAILY_TOPIC_VERSION = "forum-seed-v1";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildContent(template: TopicTemplate, forum: SeedForum, profile: SeedProfile) {
  const displayName = profile.full_name?.trim() || "צוות לומוס";
  const questions = template.questions
    .map((question) => `<li>${escapeHtml(question)}</li>`)
    .join("");

  return [
    `<p>${escapeHtml(template.intro)}</p>`,
    `<p>פותח/ת את הדיון בשם ${escapeHtml(displayName)} כדי להחזיר קצת תנועה ל${escapeHtml(forum.name)}.</p>`,
    `<ul>${questions}</ul>`,
  ].join("");
}

function dayOfYear(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((current - start) / 86400000);
}

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickTemplate(templates: TopicTemplate[], forum: SeedForum, now: Date) {
  const index = (dayOfYear(now) + stableHash(`${forum.slug}:${DAILY_TOPIC_VERSION}`)) % templates.length;
  return templates[index];
}

const HOUSE_LABELS: Record<string, string> = {
  Gryffindor: "גריפינדור",
  Slytherin: "סלית'רין",
  Ravenclaw: "רייבנקלו",
  Hufflepuff: "הפלפאף",
};

const TOPICS_BY_FORUM: Record<string, TopicTemplate[]> = {
  "main-lobby": [
    {
      prefix: "דיון",
      title: "איזה רגע מהספרים עדיין עובד עליכם בכל קריאה מחדש?",
      intro: "יש רגעים בסדרה שממשיכים להרגיש חזקים גם אחרי שמכירים את העלילה בעל פה.",
      questions: [
        "איזה רגע תמיד מחזיר אתכם לעולם הקסום?",
        "האם הוא עובד בגלל הדמות, המתח, ההומור או הבחירה המוסרית?",
        "איזה רגע דומה הייתם רוצים לראות בדיון או פעילות באתר?",
      ],
    },
    {
      prefix: "שאלה",
      title: "אם הייתם מוסיפים שיעור חובה בהוגוורטס, מה הוא היה?",
      intro: "מעבר לשיקויים, לחשים ותולדות הקסם, תמיד יש מקום לשיעור שהיה משנה את חיי התלמידים.",
      questions: [
        "מה שם השיעור ומה לומדים בו בפועל?",
        "מי המרצה המתאים ביותר מתוך הדמויות הקיימות?",
        "איזה שיעורי בית הייתם נותנים לכיתה?",
      ],
    },
    {
      prefix: "תיאוריה",
      title: "איזו החלטה קטנה הייתה משנה את כל העלילה?",
      intro: "לפעמים שינוי קטן בבחירה אחת יכול לפתוח קו עלילה אחר לגמרי.",
      questions: [
        "איזו החלטה הייתם משנים?",
        "מי הדמות שהכי הייתה מושפעת מזה?",
        "האם העולם היה משתפר או מסתבך יותר?",
      ],
    },
  ],
  library: [
    {
      prefix: "דיון",
      title: "איזו נקודת מבט חסרה לכם בפאנפיקים?",
      intro: "הספרייה היא המקום המתאים לשאול איזה קול עוד לא קיבל מספיק מקום ביצירות מעריצים.",
      questions: [
        "על איזו דמות משנית הייתם רוצים לקרוא יצירה ארוכה?",
        "באיזו תקופה בעולם הקסום הייתם ממקמים אותה?",
        "מה יהפוך את הסיפור הזה למקורי ולא לעוד גרסה מוכרת?",
      ],
    },
    {
      prefix: "שאלה",
      title: "מה הופך פרק ראשון לכזה שממשיכים ממנו מיד לפרק הבא?",
      intro: "פתיחה טובה לא חייבת לחשוף הכל, אבל היא צריכה לתת סיבה להישאר.",
      questions: [
        "האם אתם מעדיפים פתיחה מסתורית, דרמטית או מצחיקה?",
        "כמה מהר צריך להכיר את הקונפליקט המרכזי?",
        "איזו פתיחה מתוך ספר או פאנפיק נשארה איתכם?",
      ],
    },
  ],
  "diagon-alley": [
    {
      prefix: "דיון",
      title: "איזה פריט קסום הייתם קונים קודם בסמטת דיאגון?",
      intro: "תקציב מוגבל, רשימת ציוד ארוכה, ויותר מדי חנויות שמפתות לעצור בהן.",
      questions: [
        "מה הדבר הראשון שהייתם קונים ולמה?",
        "על איזה פריט הייתם מתפשרים כדי לחסוך גליונים?",
        "איזו חנות באתר הכי הייתם רוצים לראות מתפתחת?",
      ],
    },
    {
      prefix: "שאלה",
      title: "איזה חפץ קסום צריך לקבל גרסה ישראלית?",
      intro: "העולם הקסום מלא חפצים שימושיים, אבל לא כולם מותאמים לחיים שלנו כאן.",
      questions: [
        "מה החפץ ומה הוא עושה?",
        "איזה שם עברי הייתם נותנים לו?",
        "האם הוא שימושי, מצחיק, או מסוכן מדי לשימוש יומיומי?",
      ],
    },
  ],
  "forum-games": [
    {
      prefix: "פרסום",
      title: "אתגר קצר: בוחרים לחש אחד ליום שלם",
      intro: "בואו נבדוק כמה יצירתיים אפשר להיות כשמותר להשתמש רק בלחש אחד.",
      questions: [
        "איזה לחש בחרתם?",
        "באיזה מצב יומיומי הוא הכי יעזור לכם?",
        "איזה לחש הייתם אוסרים כי הוא חזק מדי לאתגר?",
      ],
    },
    {
      prefix: "דיון",
      title: "משחק פורום: מדרגים סצנות לפי רמת הקסם שלהן",
      intro: "אפשר לבחור סצנה מהספרים, מהסרטים או מהדמיון ולדרג אותה לפי תחושה קסומה.",
      questions: [
        "איזו סצנה אתם מציעים לדירוג?",
        "מה הציון שלה מתוך 10?",
        "מה היה מעלה לה עוד נקודה?",
      ],
    },
  ],
  "wizards-kitchen": [
    {
      prefix: "דיון",
      title: "איזה מאכל מהעולם הקסום צריך גרסה ישראלית?",
      intro: "המטבח של הוגוורטס כנראה היה נראה אחרת אם היה פועל כאן.",
      questions: [
        "איזה מאכל הייתם מתרגמים לטעם מקומי?",
        "מה המרכיב הקסום המרכזי שלו?",
        "האם הוא מתאים לארוחת חג, להפסקה, או לנשנוש במועדון הבית?",
      ],
    },
  ],
  "hogwarts-choir": [
    {
      prefix: "שאלה",
      title: "איזה שיר מתאים לפתיחת שנה בהוגוורטס?",
      intro: "אם מקהלת הוגוורטס הייתה צריכה לבחור שיר פתיחה חדש, הבחירה כנראה הייתה מייצרת ויכוח טוב.",
      questions: [
        "איזה שיר הייתם מציעים?",
        "לאיזה בית הוא הכי מתאים?",
        "האם הוא צריך להיות חגיגי, מצחיק או קצת מסתורי?",
      ],
    },
  ],
  "general-talk": [
    {
      prefix: "דיון",
      title: "איזה דבר מוגלגי הכי היה מבלבל קוסם?",
      intro: "לפעמים המצאות רגילות לגמרי נראות מוזרות יותר מכל לחש.",
      questions: [
        "איזו המצאה הייתה הכי קשה להסביר?",
        "איזו דמות הייתה מסתבכת איתה במיוחד?",
        "איך משרד הקסמים היה מנסה להסוות אותה?",
      ],
    },
  ],
  "three-broomsticks": [
    {
      prefix: "דיון",
      title: "על מה מדברים הערב בשלושת המטאטאים?",
      intro: "פאב טוב צריך נושא שיחה טוב: משהו קליל, קהילתי, וקצת קסום.",
      questions: [
        "איזו שמועה מהוגוורטס הייתה מתפשטת שם מהר?",
        "איזו דמות הייתם מזמינים לשולחן שלכם?",
        "מה הייתם מזמינים לשתות בזמן הדיון?",
      ],
    },
  ],
};

const HOUSE_ROOM_TOPICS: TopicTemplate[] = [
  {
    prefix: "דיון",
    title: "מה הופך את חדר הבית שלנו למקום ששווה לחזור אליו?",
    intro: "חדר בית טוב הוא לא רק עיצוב וצבעים, אלא תחושה של קבוצה עם אופי משלה.",
    questions: [
      "איזה מנהג קטן הייתם מוסיפים לבית?",
      "איזו תכונה של הבית הכי מורגשת אצל המשתמשים כאן?",
      "איזו פעילות יכולה לחזק את הבית השבוע?",
    ],
  },
  {
    prefix: "שאלה",
    title: "איזה אתגר ביתי מתאים לשבוע הקרוב?",
    intro: "אתגר קטן יכול לתת לבית סיבה טובה להתעורר ולצבור נקודות יחד.",
    questions: [
      "האם האתגר צריך להיות כתיבה, ידע, יצירתיות או פעילות בפורום?",
      "כמה זמן הוא צריך להימשך?",
      "מה פרס קטן והוגן שיכול להתאים?",
    ],
  },
];

const FALLBACK_TOPICS: TopicTemplate[] = [
  {
    prefix: "דיון",
    title: "איזה נושא קהילתי הייתם רוצים לראות כאן השבוע?",
    intro: "כל פורום חי צריך מדי פעם לשאול את המשתתפים מה חסר להם עכשיו.",
    questions: [
      "איזה סוג דיון הכי מתאים לפורום הזה?",
      "מה יגרום לכם להגיב ולא רק לקרוא?",
      "איזה רעיון יכול להפוך לפעילות קבועה?",
    ],
  },
];

export function buildForumSeedTopic(forum: SeedForum, profile: SeedProfile, now = new Date()): SeedTopic {
  const houseName = forum.house_restriction ? HOUSE_LABELS[forum.house_restriction] || forum.house_restriction : null;
  const templates = forum.house_restriction
    ? HOUSE_ROOM_TOPICS.map((topic) => ({
        ...topic,
        title: houseName ? `${topic.title} (${houseName})` : topic.title,
      }))
    : TOPICS_BY_FORUM[forum.slug] || FALLBACK_TOPICS;
  const template = pickTemplate(templates, forum, now);

  return {
    prefix: template.prefix,
    title: template.title,
    content: buildContent(template, forum, profile),
  };
}

