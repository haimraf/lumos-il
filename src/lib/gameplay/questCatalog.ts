import type { SupabaseClient } from "@supabase/supabase-js";

export const QUEST_CATALOG_KEY = "quest_catalog";

export type QuestCatalogKind = "daily" | "weekly" | "main" | "house" | "exploration";
export type QuestMetricWindow = "daily" | "weekly" | "lifetime";
export type QuestProfileFlagField =
  | "last_reward_date"
  | "last_trivia_date"
  | "last_niffler_date"
  | "last_snitch_date";
export type QuestProfileNumberField = "points_contributed" | "daily_points_earned";
export type QuestMetricSource =
  | "profile_flag"
  | "activity_total"
  | "activity_types"
  | "activity_unique_types"
  | "profile_number";

export type QuestCatalogMetric = {
  source: QuestMetricSource;
  window?: QuestMetricWindow;
  profileField?: QuestProfileFlagField | QuestProfileNumberField;
  eventTypes?: string[];
};

export type QuestCatalogEntry = {
  id: string;
  enabled: boolean;
  order: number;
  type: QuestCatalogKind;
  title: string;
  description: string;
  objectiveLabel: string;
  target: number;
  reward: {
    points: number;
    galleons: number;
  };
  houseImpactLabel: string;
  actionHref: string;
  actionLabel: string;
  metric: QuestCatalogMetric;
};

export const QUEST_PROFILE_FLAG_OPTIONS: Array<{ value: QuestProfileFlagField; label: string }> = [
  { value: "last_reward_date", label: "קצבה יומית" },
  { value: "last_trivia_date", label: "טריוויה יומית" },
  { value: "last_niffler_date", label: "ציד ניפלר" },
  { value: "last_snitch_date", label: "תפיסת סניץ'" },
];

export const QUEST_PROFILE_NUMBER_OPTIONS: Array<{ value: QuestProfileNumberField; label: string }> = [
  { value: "points_contributed", label: "נקודות תרומה אישיות" },
  { value: "daily_points_earned", label: "נקודות יומיות" },
];

export const QUEST_ACTIVITY_EVENT_OPTIONS = [
  { value: "arena_duel_completed", label: "ניצחון בזירה" },
  { value: "duel_tied", label: "תיקו בזירה" },
  { value: "story_published", label: "פרסום סיפור" },
  { value: "chapter_published", label: "פרסום פרק" },
  { value: "forum_thread_created", label: "פתיחת שרשור" },
  { value: "forum_reply_created", label: "תגובה בפורום" },
  { value: "news_comment_created", label: "תגובה בנביא" },
  { value: "news_poll_voted", label: "הצבעה בסקר" },
  { value: "library_chapter_read", label: "קריאת פרק" },
] as const;

export const DEFAULT_QUEST_CATALOG: QuestCatalogEntry[] = [
  {
    id: "daily_allowance",
    enabled: true,
    order: 10,
    type: "daily",
    title: "דמי הכיס של משרד הקסמים",
    description: "הינשוף הגיע עם קצבה קטנה להמשך הלימודים.",
    objectiveLabel: "לאסוף קצבה יומית",
    target: 1,
    reward: { points: 0, galleons: 5 },
    houseImpactLabel: "משאב אישי למשימות עתידיות",
    actionHref: "/quests",
    actionLabel: "לאסוף את הקצבה",
    metric: { source: "profile_flag", window: "daily", profileField: "last_reward_date" },
  },
  {
    id: "daily_spell_exam",
    enabled: true,
    order: 20,
    type: "daily",
    title: "מבחן הלחשים היומי",
    description: "המרצה מצפה לתשובה מדויקת אחת לפחות.",
    objectiveLabel: "להשלים טריוויה יומית",
    target: 1,
    reward: { points: 10, galleons: 0 },
    houseImpactLabel: "מחזק את ניקוד הבית",
    actionHref: "/quests",
    actionLabel: "להיבחן עכשיו",
    metric: { source: "profile_flag", window: "daily", profileField: "last_trivia_date" },
  },
  {
    id: "daily_niffler_hunt",
    enabled: true,
    order: 30,
    type: "daily",
    title: "מרדף הניפלר",
    description: "הניפלר בורח במסדרונות עם שלל קסום.",
    objectiveLabel: "לתפוס את הניפלר",
    target: 1,
    reward: { points: 20, galleons: 0 },
    houseImpactLabel: "תוספת מהירה לבית",
    actionHref: "/quests",
    actionLabel: "לצאת לציד ניפלר",
    metric: { source: "profile_flag", window: "daily", profileField: "last_niffler_date" },
  },
  {
    id: "daily_snitch_run",
    enabled: true,
    order: 40,
    type: "daily",
    title: "מרדף אחרי הסניץ'",
    description: "אימון קצר לקבוצת הקווידיץ' של הבית.",
    objectiveLabel: "לתפוס סניץ' פעם אחת",
    target: 1,
    reward: { points: 15, galleons: 0 },
    houseImpactLabel: "נקודות יוקרה לבית",
    actionHref: "/quests",
    actionLabel: "לתפוס את הסניץ'",
    metric: { source: "profile_flag", window: "daily", profileField: "last_snitch_date" },
  },
  {
    id: "daily_duel_victory",
    enabled: true,
    order: 50,
    type: "daily",
    title: "דו-קרב של כבוד",
    description: "פרופסור פליטיק מבקש להוכיח שליטה בזירה.",
    objectiveLabel: "לנצח דו-קרב אחד היום",
    target: 1,
    reward: { points: 15, galleons: 0 },
    houseImpactLabel: "ניצחון יומי לזכות הבית",
    actionHref: "/arena",
    actionLabel: "להיכנס לזירה",
    metric: { source: "activity_types", window: "daily", eventTypes: ["arena_duel_completed"] },
  },
  {
    id: "weekly_arena_routine",
    enabled: true,
    order: 60,
    type: "weekly",
    title: "שגרת אימון בזירה",
    description: "שלושה קרבות בשבוע מחזקים את מעמד הבית.",
    objectiveLabel: "להשלים 3 דו-קרבות השבוע",
    target: 3,
    reward: { points: 30, galleons: 20 },
    houseImpactLabel: "מומנטום שבועי לבית",
    actionHref: "/arena",
    actionLabel: "להמשיך לזירה",
    metric: { source: "activity_types", window: "weekly", eventTypes: ["arena_duel_completed", "duel_tied"] },
  },
  {
    id: "daily_castle_presence",
    enabled: true,
    order: 70,
    type: "exploration",
    title: "מסע חקירה פתוח",
    description: "פעולות שונות במסדרונות מחזקות את הנוכחות וההשפעה שלכם בטירה.",
    objectiveLabel: "לבצע 3 סוגי פעילויות היום",
    target: 3,
    reward: { points: 10, galleons: 10 },
    houseImpactLabel: "מחזק את הנוכחות וההשפעה בטירה",
    actionHref: "/forums",
    actionLabel: "להדליק את המסדרונות",
    metric: {
      source: "activity_unique_types",
      window: "daily",
      eventTypes: [
        "forum_thread_created",
        "forum_reply_created",
        "news_comment_created",
        "news_poll_voted",
        "library_chapter_read",
        "arena_duel_completed",
        "duel_tied",
      ],
    },
  },
  {
    id: "daily_quill_and_owl",
    enabled: true,
    order: 80,
    type: "exploration",
    title: "נוצה וינשוף בפעולה",
    description: "כתיבה, תגובה או קריאה מחברות בין אגפי הטירה.",
    objectiveLabel: "לבצע 2 אינטראקציות קהילתיות היום",
    target: 2,
    reward: { points: 10, galleons: 5 },
    houseImpactLabel: "הפעילות הקהילתית מזינה את כוח הבית",
    actionHref: "/forums",
    actionLabel: "להצית את השיח",
    metric: {
      source: "activity_types",
      window: "daily",
      eventTypes: [
        "story_published",
        "chapter_published",
        "forum_thread_created",
        "forum_reply_created",
        "news_comment_created",
        "news_poll_voted",
        "library_chapter_read",
      ],
    },
  },
  {
    id: "weekly_house_momentum",
    enabled: true,
    order: 90,
    type: "house",
    title: "מומנטום ביתי",
    description: "הבית שלך מתרומם כשהקהילה נשארת חיה ופעילה לאורך השבוע.",
    objectiveLabel: "לצבור 5 פעולות קהילתיות השבוע",
    target: 5,
    reward: { points: 20, galleons: 10 },
    houseImpactLabel: "מומנטום חיובי ישיר לבית שלך",
    actionHref: "/forums",
    actionLabel: "להמשיך לפעילות קהילתית",
    metric: {
      source: "activity_types",
      window: "weekly",
      eventTypes: [
        "story_published",
        "chapter_published",
        "forum_thread_created",
        "forum_reply_created",
        "news_comment_created",
        "news_poll_voted",
        "library_chapter_read",
      ],
    },
  },
  {
    id: "main_house_contributor",
    enabled: true,
    order: 100,
    type: "main",
    title: "שוליית גביע הבתים",
    description: "הדרך להפוך לעמוד תווך של הבית מתחילה בתרומה עקבית.",
    objectiveLabel: "להגיע ל-10 נקודות תרומה אישיות",
    target: 10,
    reward: { points: 0, galleons: 25 },
    houseImpactLabel: "יעד פתיחה במסע העונתי",
    actionHref: "/quests",
    actionLabel: "להתקדם במסע",
    metric: { source: "profile_number", window: "lifetime", profileField: "points_contributed" },
  },
];

function normalizeReward(value: any) {
  return {
    points: Number(value?.points) || 0,
    galleons: Number(value?.galleons) || 0,
  };
}

function normalizeEventTypes(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeMetric(value: any, fallback: QuestCatalogEntry["metric"]) {
  const source = ["profile_flag", "activity_total", "activity_types", "activity_unique_types", "profile_number"].includes(value?.source)
    ? value.source
    : fallback.source;
  const window = ["daily", "weekly", "lifetime"].includes(value?.window)
    ? value.window
    : (fallback.window || "daily");
  const profileField = typeof value?.profileField === "string" ? value.profileField : fallback.profileField;
  const eventTypes = normalizeEventTypes(value?.eventTypes || fallback.eventTypes);

  return {
    source,
    window,
    profileField,
    eventTypes,
  } as QuestCatalogMetric;
}

function normalizeQuestEntry(entry: any, fallback: QuestCatalogEntry, index: number): QuestCatalogEntry {
  const normalized = {
    id: String(entry?.id || fallback.id || `quest_${index + 1}`),
    enabled: entry?.enabled !== false,
    order: Number(entry?.order) || fallback.order || ((index + 1) * 10),
    type: ["daily", "weekly", "main", "house", "exploration"].includes(entry?.type) ? entry.type : fallback.type,
    title: String(entry?.title || fallback.title),
    description: String(entry?.description || fallback.description),
    objectiveLabel: String(entry?.objectiveLabel || fallback.objectiveLabel),
    target: Math.max(1, Number(entry?.target) || fallback.target || 1),
    reward: normalizeReward(entry?.reward || fallback.reward),
    houseImpactLabel: String(entry?.houseImpactLabel || fallback.houseImpactLabel),
    actionHref: String(entry?.actionHref || fallback.actionHref || "/quests"),
    actionLabel: String(entry?.actionLabel || fallback.actionLabel || "להמשיך"),
    metric: normalizeMetric(entry?.metric, fallback.metric),
  };

  const isLegacyCastlePresence = normalized.id === "daily_castle_presence"
    && normalized.metric.source === "activity_total"
    && normalized.metric.window === "daily"
    && !entry?.actionHref
    && !entry?.actionLabel;

  if (isLegacyCastlePresence) {
    return {
      ...normalized,
      title: fallback.title,
      description: fallback.description,
      objectiveLabel: fallback.objectiveLabel,
      houseImpactLabel: fallback.houseImpactLabel,
      actionHref: fallback.actionHref,
      actionLabel: fallback.actionLabel,
      metric: fallback.metric,
    };
  }

  return normalized;
}

export function normalizeQuestCatalog(value: unknown): QuestCatalogEntry[] {
  const rawEntries = Array.isArray(value) ? value : [];
  const normalized = rawEntries.map((entry, index) => {
    const fallback = DEFAULT_QUEST_CATALOG.find((item) => item.id === entry?.id) || DEFAULT_QUEST_CATALOG[index] || DEFAULT_QUEST_CATALOG[0];
    return normalizeQuestEntry(entry, fallback, index);
  });

  const merged = normalized.length > 0
    ? normalized
    : DEFAULT_QUEST_CATALOG.map((entry, index) => normalizeQuestEntry(entry, entry, index));

  return merged.sort((left, right) => left.order - right.order);
}

export function createQuestDraft(order = 999): QuestCatalogEntry {
  return {
    id: `quest_${Math.random().toString(36).slice(2, 10)}`,
    enabled: true,
    order,
    type: "daily",
    title: "משימה חדשה",
    description: "תיאור קצר של המשימה.",
    objectiveLabel: "מה צריך להשלים",
    target: 1,
    reward: { points: 5, galleons: 0 },
    houseImpactLabel: "השפעה שתוצג למשתמש",
    actionHref: "/quests",
    actionLabel: "לפתוח את היעד",
    metric: { source: "profile_flag", window: "daily", profileField: "last_reward_date" },
  };
}

export async function fetchQuestCatalog(supabase: SupabaseClient): Promise<QuestCatalogEntry[]> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", QUEST_CATALOG_KEY)
    .maybeSingle();

  return normalizeQuestCatalog(data?.value);
}

export function subscribeToQuestCatalogChanges(
  supabase: SupabaseClient,
  scope: string,
  onChange: () => void | Promise<void>,
) {
  return supabase
    .channel(`quest-catalog-${scope}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "site_settings",
        filter: `key=eq.${QUEST_CATALOG_KEY}`,
      },
      () => {
        void onChange();
      },
    )
    .subscribe();
}
