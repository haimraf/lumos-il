import type { SupabaseClient } from "@supabase/supabase-js";

import type { ForumDraftCandidate, ForumDraftSource } from "@/lib/forumAutoGate";
import { CANON_TOPIC_KIND_LABELS, pickCanonTopic } from "@/lib/forumCanonTopics";
import { HOUSE_IDS, HOUSE_PALETTES, type HouseId } from "@/lib/houses";
import { getSpellCanonMeta } from "@/lib/wizardingCanon";

/**
 * מחוללי טיוטות מבוססות מקורות.
 *
 * כלל ברזל אחד: כל מספר שמופיע בטקסט חייב להופיע גם ב-dataSnapshot, אחרת השער
 * ב-forumAutoGate יסמן אותו כטענה לא מבוססת והטיוטה לא תעלה לבד. בגלל זה אין
 * כאן שימוש ב-toLocaleString — מפריד אלפים שובר את ההתאמה בין הטקסט לצילום.
 *
 * כלל שני: המחוללים לא מזכירים שמות של חברי קהילה. זה גם שומר על פרטיות וגם
 * מונע מהשער להוריד כל טיוטה ל-needs_review בגלל אזכור אישי.
 */

export type GeneratedDraft = ForumDraftCandidate & {
  generator: string;
  dedupeKey: string;
  forumSlug: string;
};

export type GeneratorContext = {
  supabase: SupabaseClient;
  now: Date;
};

type Generator = {
  id: string;
  run: (context: GeneratorContext) => Promise<GeneratedDraft | null>;
};

/** מספר שבוע ISO — הבסיס למפתחות הייחודיות השבועיים. */
function isoWeek(date: Date): { year: number; week: number } {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: target.getUTCFullYear(), week };
}

function daysAgo(from: Date, days: number): Date {
  return new Date(from.getTime() - days * 86400000);
}

/** בוחר וריאציה ניסוחית לפי השבוע, כדי שהאשכולות לא יקראו כמו תבנית חוזרת. */
function pickVariant<T>(options: readonly T[], seed: number): T {
  return options[Math.abs(seed) % options.length];
}

function paragraph(text: string): string {
  return `<p>${text}</p>`;
}

// ── גביע הבתים ──────────────────────────────────────────────────────────────

const HOUSE_CUP_OPENERS = [
  "עברתי על מצב הנקודות של הבתים ויש כמה דברים ששווה להצביע עליהם.",
  "בדקתי איפה עומד גביע הבתים כרגע, וזאת התמונה.",
  "עדכון קצר על גביע הבתים — מי מוביל ומה המרווחים.",
] as const;

const HOUSE_CUP_CLOSERS = [
  "מה דעתכם — המרווח הזה עוד ניתן לסגירה עד סוף העונה?",
  "אשמח לשמוע מה לדעתכם משנה את התמונה הזאת הכי מהר.",
  "מוזמנים לספר מה אתם עושים כדי להזיז את המחט לבית שלכם.",
] as const;

async function generateHouseCupWeekly(context: GeneratorContext): Promise<GeneratedDraft | null> {
  const { supabase, now } = context;
  const { year, week } = isoWeek(now);

  const { data, error } = await supabase
    .from("profiles")
    .select("house, points_contributed, is_ghost, role");

  if (error || !data) return null;

  const points: Record<HouseId, number> = {
    Gryffindor: 0,
    Slytherin: 0,
    Ravenclaw: 0,
    Hufflepuff: 0,
  };
  let counted = 0;

  for (const row of data as Array<Record<string, unknown>>) {
    const house = row.house as HouseId | null;
    if (!house || !HOUSE_IDS.includes(house)) continue;
    if (row.is_ghost === true) continue;
    points[house] += Number(row.points_contributed) || 0;
    counted += 1;
  }

  const ranked = HOUSE_IDS.map((house) => ({ house, points: points[house] })).sort(
    (a, b) => b.points - a.points,
  );

  const total = ranked.reduce((sum, entry) => sum + entry.points, 0);
  if (total <= 0) return null;

  const leader = ranked[0];
  const runnerUp = ranked[1];
  const gap = leader.points - runnerUp.points;

  const rows = ranked
    .map(
      (entry, index) =>
        `<li>${HOUSE_PALETTES[entry.house].icon} <strong>${HOUSE_PALETTES[entry.house].label}</strong> — ${entry.points} נקודות${index === 0 ? " (מוביל)" : ""}</li>`,
    )
    .join("");

  const gapSentence =
    gap === 0
      ? `${HOUSE_PALETTES[leader.house].label} ו${HOUSE_PALETTES[runnerUp.house].label} צמודים בדיוק על אותה כמות נקודות, מה שלא קורה הרבה.`
      : `הפער בין ${HOUSE_PALETTES[leader.house].label} ל${HOUSE_PALETTES[runnerUp.house].label} עומד על ${gap} נקודות.`;

  const content = [
    paragraph(pickVariant(HOUSE_CUP_OPENERS, week)),
    `<ul>${rows}</ul>`,
    paragraph(gapSentence),
    paragraph(`הספירה מבוססת על ${counted} קוסמים שמשויכים לבית ותרמו לגביע.`),
    paragraph(pickVariant(HOUSE_CUP_CLOSERS, week)),
  ].join("");

  const sources: ForumDraftSource[] = [
    {
      kind: "site-data",
      label: "נקודות בתים מטבלת המשתמשים",
      ref: "profiles.points_contributed",
      reliability: "high",
    },
  ];

  return {
    generator: "house-cup-weekly",
    dedupeKey: `house-cup-weekly:${year}-W${week}`,
    forumSlug: "main-lobby",
    title: `מצב גביע הבתים — ${HOUSE_PALETTES[leader.house].label} מוביל`,
    content,
    canonSource: "site",
    prefix: "עדכון",
    sources,
    dataSnapshot: {
      isoYear: year,
      isoWeek: week,
      counted,
      total,
      gap,
      standings: ranked,
    },
  };
}

// ── סיכום דואלים ────────────────────────────────────────────────────────────

const DUEL_OPENERS = [
  "עשיתי סיכום קצר לזירת הדואלים של השבוע האחרון.",
  "הצצתי בנתוני הזירה מהשבוע האחרון, וזה מה שיצא.",
  "סיכום זירה — מה קרה בדואלים בשבעת הימים האחרונים.",
] as const;

async function generateDuelsRoundup(context: GeneratorContext): Promise<GeneratedDraft | null> {
  const { supabase, now } = context;
  const { year, week } = isoWeek(now);
  const since = daysAgo(now, 7);

  const { data, error } = await supabase
    .from("duels")
    .select("id, status, winner_id, challenger_hp, opponent_hp, finished_at")
    .gte("finished_at", since.toISOString())
    .not("finished_at", "is", null);

  if (error || !data || data.length === 0) return null;

  const finished = data as Array<Record<string, unknown>>;
  const decided = finished.filter((duel) => Boolean(duel.winner_id));
  const draws = finished.length - decided.length;

  // הקרב הצמוד ביותר = פער נקודות החיים הקטן ביותר בסיום.
  let closestGap: number | null = null;
  for (const duel of finished) {
    const challenger = Number(duel.challenger_hp);
    const opponent = Number(duel.opponent_hp);
    if (!Number.isFinite(challenger) || !Number.isFinite(opponent)) continue;
    const gap = Math.abs(challenger - opponent);
    if (closestGap === null || gap < closestGap) closestGap = gap;
  }

  const lines = [
    `<li>דואלים שהסתיימו: <strong>${finished.length}</strong></li>`,
    `<li>קרבות שהוכרעו: <strong>${decided.length}</strong></li>`,
  ];
  if (draws > 0) lines.push(`<li>הסתיימו בלי מנצח מוכרז: <strong>${draws}</strong></li>`);
  if (closestGap !== null) {
    lines.push(`<li>הקרב הצמוד ביותר נסגר בפער של <strong>${closestGap}</strong> נקודות חיים</li>`);
  }

  const content = [
    paragraph(pickVariant(DUEL_OPENERS, week)),
    `<ul>${lines.join("")}</ul>`,
    paragraph(
      "לא מפרט שמות כאן בכוונה — מי שרוצה לספר על קרב מסוים מוזמן לעשות את זה בעצמו בתגובות.",
    ),
    paragraph("מי שעוד לא ניסה את הזירה, זה זמן טוב להיכנס ולראות איך זה עובד."),
  ].join("");

  const sources: ForumDraftSource[] = [
    {
      kind: "site-data",
      label: "דואלים שהסתיימו בשבעת הימים האחרונים",
      ref: "duels.finished_at >= now() - 7d",
      reliability: "high",
    },
  ];

  return {
    generator: "duels-roundup",
    dedupeKey: `duels-roundup:${year}-W${week}`,
    forumSlug: "main-lobby",
    title: "סיכום הזירה — מה קרה בדואלים השבוע",
    content,
    canonSource: "site",
    prefix: "סיכום",
    sources,
    dataSnapshot: {
      isoYear: year,
      isoWeek: week,
      windowDays: 7,
      finished: finished.length,
      decided: decided.length,
      draws,
      closestGap,
    },
  };
}

// ── זרקור קאנוני ────────────────────────────────────────────────────────────

const SPOTLIGHT_SPELLS = [
  "alohomora",
  "lumos",
  "nox",
  "wingardium",
  "expecto",
  "expelliarmus",
  "accio",
  "riddikulus",
] as const;

async function generateCanonSpotlight(context: GeneratorContext): Promise<GeneratedDraft | null> {
  const { now } = context;
  const { year, week } = isoWeek(now);

  // סבב קבוע לפי שבוע — כל לחש חוזר רק אחרי שכולם עברו.
  const token = SPOTLIGHT_SPELLS[week % SPOTLIGHT_SPELLS.length];
  const meta = getSpellCanonMeta({ latin_name: token });
  if (!meta) return null;

  const displayName = token.charAt(0).toUpperCase() + token.slice(1);

  const content = [
    paragraph(`השבוע בזרקור: <strong>${displayName}</strong>.`),
    `<ul>` +
      `<li>מופיע ב: ${meta.appearsIn}</li>` +
      `<li>נלמד ב: ${meta.curriculum}</li>` +
      `<li>מזוהה עם: ${meta.knownWith}</li>` +
      `</ul>`,
    paragraph(meta.note),
    paragraph(
      "מי שזוכר רגע ספציפי שבו הלחש הזה שינה סצנה — מוזמן להביא אותו לכאן, מעניין לראות מה עולה.",
    ),
  ].join("");

  const sources: ForumDraftSource[] = [
    {
      kind: "canon",
      label: `מקור קאנוני ללחש ${displayName}`,
      ref: meta.appearsIn,
      reliability: "high",
    },
  ];

  return {
    generator: "canon-spotlight",
    dedupeKey: `canon-spotlight:${year}-W${week}:${token}`,
    forumSlug: "library",
    title: `זרקור על לחש — ${displayName}`,
    content,
    canonSource: meta.source,
    prefix: "דיון",
    sources,
    dataSnapshot: {
      isoYear: year,
      isoWeek: week,
      token,
      appearsIn: meta.appearsIn,
      curriculum: meta.curriculum,
    },
  };
}

// ── צלילה קאנונית לעומק ─────────────────────────────────────────────────────

async function generateCanonDeepDive(context: GeneratorContext): Promise<GeneratedDraft | null> {
  const { now } = context;
  const { year, week } = isoWeek(now);

  // סבב רציף שממשיך לרוץ גם במעבר שנה, כך שנושא חוזר רק אחרי מחזור מלא.
  const topic = pickCanonTopic(year * 53 + week);

  const points = topic.points.map((point) => `<li>${point}</li>`).join("");

  const content = [
    paragraph(topic.premise),
    `<ul>${points}</ul>`,
    paragraph(topic.hook),
    paragraph(`<em>מבוסס על: ${topic.appearsIn}</em>`),
  ].join("");

  const sources: ForumDraftSource[] = [
    {
      kind: "canon",
      label: `${CANON_TOPIC_KIND_LABELS[topic.kind]} — ${topic.title}`,
      ref: topic.appearsIn,
      reliability: "high",
    },
  ];

  return {
    generator: "canon-deep-dive",
    dedupeKey: `canon-deep-dive:${year}-W${week}:${topic.id}`,
    forumSlug: "library",
    title: topic.title,
    content,
    canonSource: topic.source,
    prefix: "דיון",
    sources,
    dataSnapshot: {
      isoYear: year,
      isoWeek: week,
      topicId: topic.id,
      kind: topic.kind,
      appearsIn: topic.appearsIn,
    },
  };
}

export const FORUM_THREAD_GENERATORS: Generator[] = [
  { id: "house-cup-weekly", run: generateHouseCupWeekly },
  { id: "duels-roundup", run: generateDuelsRoundup },
  { id: "canon-spotlight", run: generateCanonSpotlight },
  { id: "canon-deep-dive", run: generateCanonDeepDive },
];

/**
 * מריץ את כל המחוללים ומחזיר את הטיוטות שהצליחו.
 * מחולל שנכשל או שאין לו מספיק נתונים פשוט מדלג — הוא לא מפיל את ההרצה.
 */
export async function generateForumDrafts(
  context: GeneratorContext,
): Promise<GeneratedDraft[]> {
  const drafts: GeneratedDraft[] = [];

  for (const generator of FORUM_THREAD_GENERATORS) {
    try {
      const draft = await generator.run(context);
      if (draft) drafts.push(draft);
    } catch (error) {
      console.error(`[forum-generator] ${generator.id} failed`, error);
    }
  }

  return drafts;
}
