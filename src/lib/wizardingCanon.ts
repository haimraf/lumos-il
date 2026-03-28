export type CanonSource = "books" | "films" | "both" | "series" | "site";

export type CanonBadgeTone = {
  label: string;
  description: string;
  className: string;
};

export const CANON_SOURCE_META: Record<CanonSource, CanonBadgeTone> = {
  books: {
    label: "מן הספרים",
    description: "נשען ישירות על שבעת הספרים של הארי פוטר.",
    className: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
  },
  films: {
    label: "מן הסרטים",
    description: "נשען על העיבוד הקולנועי.",
    className: "border-sky-400/25 bg-sky-500/10 text-sky-100",
  },
  both: {
    label: "ספרים + סרטים",
    description: "מוכר גם מן הספרים וגם מן הסרטים.",
    className: "border-amber-400/25 bg-amber-500/10 text-amber-100",
  },
  series: {
    label: "עדכון רשמי מהסדרה",
    description: "מבוסס רק על הודעות רשמיות של HBO Max.",
    className: "border-violet-400/25 bg-violet-500/10 text-violet-100",
  },
  site: {
    label: "הרחבה משחקית",
    description: "תוספת מקורית של LUMOS IL, לא פרט קאנוני מן הסאגה.",
    className: "border-white/15 bg-white/[0.06] text-white/75",
  },
};

type SpellLike = {
  name?: string | null;
  latin_name?: string | null;
  terminal_command?: string | null;
};

export type SpellCanonMeta = {
  source: CanonSource;
  curriculum: string;
  knownWith: string;
  appearsIn: string;
  note: string;
};

function normalizeToken(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

const SPELL_CANON_BY_TOKEN: Record<string, SpellCanonMeta> = {
  alohomora: {
    source: "both",
    curriculum: "שנה א'",
    knownWith: "הרמיוני גריינג'ר",
    appearsIn: "אבן החכמים",
    note: "לחש פתיחה קלאסי שמלווה את תחילת המסע של הטריו.",
  },
  lumos: {
    source: "both",
    curriculum: "לחש יסוד",
    knownWith: "שימוש יומיומי של תלמידים וקוסמים",
    appearsIn: "לאורך הספרים והסרטים",
    note: "אחד הלחשים הבסיסיים ביותר: אור פשוט, ברור ושימושי.",
  },
  nox: {
    source: "both",
    curriculum: "לחש יסוד",
    knownWith: "לחש הנגד של Lumos",
    appearsIn: "לאורך הספרים והסרטים",
    note: "לחש כיבוי קצר ונקי שמסיים את מעגל האור.",
  },
  wingardium: {
    source: "both",
    curriculum: "שנה א'",
    knownWith: "פרופ' פליטיק",
    appearsIn: "אבן החכמים",
    note: "הלחש שהופך נוצה קטנה לשיעור הראשון בזיכרון של דור שלם.",
  },
  expelliarmus: {
    source: "both",
    curriculum: "שנה ב'",
    knownWith: "מועדון הדו-קרב של סנייפ ולוקהרט",
    appearsIn: "חדר הסודות",
    note: "לחש פריקה שהפך עם השנים לחתימה המזוהה ביותר עם הארי.",
  },
  protego: {
    source: "both",
    curriculum: "שנה ה' ומעלה",
    knownWith: "הארי פוטר וצבא דמבלדור",
    appearsIn: "מסדר עוף החול",
    note: "לחש מגן שמזוהה עם אימון, עמידה תחת לחץ והגנה על אחרים.",
  },
  expecto: {
    source: "both",
    curriculum: "שנה ג'",
    knownWith: "פרופ' רמוס לופין",
    appearsIn: "האסיר מאזקבאן",
    note: "אחד הלחשים המתקדמים והמרגשים ביותר בקאנון של הוגוורטס.",
  },
};

export function getSpellCanonMeta(spell: SpellLike | null | undefined): SpellCanonMeta | null {
  const candidates = [
    normalizeToken(spell?.terminal_command),
    normalizeToken(spell?.latin_name),
    normalizeToken(spell?.name),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    for (const token of Object.keys(SPELL_CANON_BY_TOKEN)) {
      if (candidate.includes(token)) {
        return SPELL_CANON_BY_TOKEN[token];
      }
    }
  }

  return null;
}

export type DiagonGuideEntry = {
  id: string;
  title: string;
  source: CanonSource;
  summary: string;
  note?: string;
};

export const DIAGON_ALLEY_GUIDE: DiagonGuideEntry[] = [
  {
    id: "all",
    title: "מסורת הסמטה",
    source: "both",
    summary:
      "סמטת דיאגון כאן נשענת על רוח החנויות מן הספרים והסרטים, אבל חלק מן המדפים הורחבו כדי לתמוך במסע המשחקי של האתר.",
  },
  {
    id: "wands",
    title: "אוליבנדר",
    source: "both",
    summary: "בית השרביטים המזוהה ביותר מן הסאגה, המקום שבו הקשר בין קוסם לשרביט מתחיל.",
  },
  {
    id: "companion",
    title: "גן החיות הקסום",
    source: "both",
    summary:
      "ינשופים, מלווים ויצורים קטנים בהשראת החיות הקסומות שמופיעות בסמטה ובעולם הקוסמים.",
  },
  {
    id: "potions",
    title: "Slug & Jiggers",
    source: "both",
    summary:
      "מדפי רוקחות ושיקויים בהשראת בית המרקחת המוכר של סמטת דיאגון.",
  },
  {
    id: "cards",
    title: "צפרדעי שוקולד",
    source: "site",
    summary:
      "קלפי הצפרדע עצמם מוכרים מן הסאגה, אבל שיטת האיסוף, הבונוסים והנדירויות כאן הם הרחבה משחקית של האתר.",
  },
  {
    id: "travel",
    title: "מדף המסעות",
    source: "site",
    summary:
      "ציוד מעבר, מסעות והיערכות לדרך שלא קיבלו חנות אחת קבועה בקאנון, ולכן רוכזו כאן כהרחבה משחקית.",
  },
];

export type LibraryShelfEntry = {
  title: string;
  source: CanonSource;
  description: string;
};

export const LIBRARY_CANON_SHELVES: LibraryShelfEntry[] = [
  {
    title: "מן הספרים",
    source: "books",
    description: "קריאות מחודשות, פרשנויות וקווי אופי שנשענים על שבעת הספרים.",
  },
  {
    title: "מן הסרטים",
    source: "films",
    description: "אווירה חזותית, רגעים איקוניים וטון שנולדו על המסך.",
  },
  {
    title: "הרחבה משחקית",
    source: "site",
    description: "פאנפיקים, עיבודים ונתיבים מקוריים של הקהילה ושל הטירה.",
  },
];

export type OfficialSeriesNote = {
  title: string;
  value: string;
  detail: string;
};

export const OFFICIAL_SERIES_NOTES: OfficialSeriesNote[] = [
  {
    title: "חלון שידור רשמי",
    value: "2027",
    detail: "נכון לעכשיו זה חלון העלייה הרשמי שפורסם ל-HBO Max.",
  },
  {
    title: "הקו המוצהר",
    value: "עיבוד נאמן יותר לספרים",
    detail: "זה הכיוון הרשמי שהודגש בהודעות ההפקה עד כה.",
  },
  {
    title: "אצלנו בפורום",
    value: "רק עדכונים רשמיים",
    detail: "בלי שמועות, בלי הדלפות ובלי חומרים לא מורשים.",
  },
];

export const BACK_TO_HOGWARTS_NOTE = {
  title: "Back to Hogwarts",
  description:
    "בכל 1 בספטמבר נפתח כאן מרחב עונתי לפתיחת שנת הלימודים, דיונים רשמיים ועדכונים של הקהילה סביב החזרה להוגוורטס.",
};
