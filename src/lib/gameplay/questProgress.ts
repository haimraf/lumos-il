import type { SupabaseClient } from "@supabase/supabase-js";

export type QuestKind = "daily" | "weekly" | "main" | "house" | "exploration";
export type QuestStatus = "active" | "completed";

export type ProfileQuestSnapshot = {
  id: string;
  house?: string | null;
  points_contributed?: number | null;
  daily_points_earned?: number | null;
  last_reward_date?: string | null;
  last_trivia_date?: string | null;
  last_niffler_date?: string | null;
  last_snitch_date?: string | null;
};

export type ComputedQuest = {
  id: string;
  type: QuestKind;
  title: string;
  description: string;
  objectiveLabel: string;
  progress: number;
  target: number;
  status: QuestStatus;
  reward: {
    points: number;
    galleons: number;
  };
  houseImpactLabel: string;
};

export type QuestProgressResult = {
  quests: ComputedQuest[];
  activity: {
    dailyTotal: number;
    weeklyTotal: number;
    dailyByType: Record<string, number>;
    weeklyByType: Record<string, number>;
  };
};

type ActivityRow = {
  event_type: string | null;
  created_at: string | null;
};

type ActivitySummary = {
  dailyTotal: number;
  weeklyTotal: number;
  dailyByType: Record<string, number>;
  weeklyByType: Record<string, number>;
};

function toIsoDateUTC(input: Date) {
  return input.toISOString().slice(0, 10);
}

function startOfUtcDay(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function startOfUtcWeek(now: Date) {
  const dayStart = startOfUtcDay(now);
  const day = dayStart.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  dayStart.setUTCDate(dayStart.getUTCDate() - diffToMonday);
  return dayStart;
}

function increment(map: Record<string, number>, key: string) {
  map[key] = (map[key] || 0) + 1;
}

function summarizeActivity(rows: ActivityRow[], now: Date): ActivitySummary {
  const dayStart = startOfUtcDay(now).getTime();
  const weekStart = startOfUtcWeek(now).getTime();

  const dailyByType: Record<string, number> = {};
  const weeklyByType: Record<string, number> = {};
  let dailyTotal = 0;
  let weeklyTotal = 0;

  rows.forEach((row) => {
    if (!row.event_type || !row.created_at) return;
    const ts = new Date(row.created_at).getTime();
    if (Number.isNaN(ts)) return;

    if (ts >= weekStart) {
      weeklyTotal += 1;
      increment(weeklyByType, row.event_type);
    }

    if (ts >= dayStart) {
      dailyTotal += 1;
      increment(dailyByType, row.event_type);
    }
  });

  return {
    dailyTotal,
    weeklyTotal,
    dailyByType,
    weeklyByType,
  };
}

function clampProgress(value: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(Math.max(value, 0), target);
}

function questStatus(progress: number, target: number): QuestStatus {
  return progress >= target ? "completed" : "active";
}

function fromDailyFlag(
  completed: boolean,
  base: Omit<ComputedQuest, "progress" | "target" | "status">,
): ComputedQuest {
  const progress = completed ? 1 : 0;
  const target = 1;
  return {
    ...base,
    progress,
    target,
    status: questStatus(progress, target),
  };
}

export async function fetchQuestActivitySummary(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<ActivitySummary> {
  const weekStartIso = startOfUtcWeek(now).toISOString();

  const { data, error } = await supabase
    .from("activity_events")
    .select("event_type, created_at")
    .eq("actor_id", userId)
    .gte("created_at", weekStartIso)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !data) {
    return {
      dailyTotal: 0,
      weeklyTotal: 0,
      dailyByType: {},
      weeklyByType: {},
    };
  }

  return summarizeActivity((data as ActivityRow[]) ?? [], now);
}

export function computeQuestProgress(
  profile: ProfileQuestSnapshot,
  activity: ActivitySummary,
  now = new Date(),
): QuestProgressResult {
  const today = toIsoDateUTC(now);

  const quests: ComputedQuest[] = [
    fromDailyFlag(profile.last_reward_date === today, {
      id: "daily_allowance",
      type: "daily",
      title: "דמי הכיס של משרד הקסמים",
      description: "הינשוף הגיע עם קצבה קטנה להמשך הלימודים.",
      objectiveLabel: "לאסוף קצבה יומית",
      reward: { points: 0, galleons: 5 },
      houseImpactLabel: "משאב אישי למשימות עתידיות",
    }),

    fromDailyFlag(profile.last_trivia_date === today, {
      id: "daily_spell_exam",
      type: "daily",
      title: "מבחן הלחשים היומי",
      description: "המרצה מצפה לתשובה מדויקת אחת לפחות.",
      objectiveLabel: "להשלים טריוויה יומית",
      reward: { points: 10, galleons: 0 },
      houseImpactLabel: "מחזק את ניקוד הבית",
    }),

    fromDailyFlag(profile.last_niffler_date === today, {
      id: "daily_niffler_hunt",
      type: "daily",
      title: "מרדף הניפלר",
      description: "הניפלר בורח במסדרונות עם שלל קסום.",
      objectiveLabel: "לתפוס את הניפלר",
      reward: { points: 20, galleons: 0 },
      houseImpactLabel: "תוספת מהירה לבית",
    }),

    fromDailyFlag(profile.last_snitch_date === today, {
      id: "daily_snitch_run",
      type: "daily",
      title: "מרדף אחרי הסניץ'",
      description: "אימון קצר לקבוצת הקווידיץ' של הבית.",
      objectiveLabel: "לתפוס סניץ' פעם אחת",
      reward: { points: 15, galleons: 0 },
      houseImpactLabel: "נקודות יוקרה לבית",
    }),
  ];

  const dailyDuelWins = activity.dailyByType.arena_duel_completed || 0;
  const duelQuestTarget = 1;
  quests.push({
    id: "daily_duel_victory",
    type: "daily",
    title: "דו-קרב של כבוד",
    description: "פרופסור פליטיק מבקש להוכיח שליטה בזירה.",
    objectiveLabel: "לנצח דו-קרב אחד היום",
    progress: clampProgress(dailyDuelWins, duelQuestTarget),
    target: duelQuestTarget,
    status: questStatus(dailyDuelWins, duelQuestTarget),
    reward: { points: 15, galleons: 0 },
    houseImpactLabel: "ניצחון יומי לזכות הבית",
  });

  const weeklyDuels = (activity.weeklyByType.arena_duel_completed || 0) + (activity.weeklyByType.duel_tied || 0);
  const weeklyTarget = 3;
  quests.push({
    id: "weekly_arena_routine",
    type: "weekly",
    title: "שגרת אימון בזירה",
    description: "שלושה קרבות בשבוע מחזקים את מעמד הבית.",
    objectiveLabel: "להשלים 3 דו-קרבות השבוע",
    progress: clampProgress(weeklyDuels, weeklyTarget),
    target: weeklyTarget,
    status: questStatus(weeklyDuels, weeklyTarget),
    reward: { points: 30, galleons: 20 },
    houseImpactLabel: "מומנטום שבועי לבית",
  });

  const explorationTarget = 3;
  quests.push({
    id: "daily_castle_presence",
    type: "exploration",
    title: "הטירה חיה בזכותך",
    description: "כל פעילות קהילתית מזרימה קסם ברחבי הטירה.",
    objectiveLabel: "לבצע 3 פעילויות שונות ביום",
    progress: clampProgress(activity.dailyTotal, explorationTarget),
    target: explorationTarget,
    status: questStatus(activity.dailyTotal, explorationTarget),
    reward: { points: 10, galleons: 10 },
    houseImpactLabel: "נוכחות פעילה מגדילה השפעה",
  });

  const mainTarget = 10;
  const mainProgress = profile.points_contributed || 0;
  quests.push({
    id: "main_house_contributor",
    type: "main",
    title: "שוליית גביע הבתים",
    description: "הדרך להפוך לעמוד תווך של הבית מתחילה בתרומה עקבית.",
    objectiveLabel: "להגיע ל-10 נקודות תרומה אישיות",
    progress: clampProgress(mainProgress, mainTarget),
    target: mainTarget,
    status: questStatus(mainProgress, mainTarget),
    reward: { points: 0, galleons: 25 },
    houseImpactLabel: "יעד פתיחה במסע העונתי",
  });

  return {
    quests,
    activity: {
      dailyTotal: activity.dailyTotal,
      weeklyTotal: activity.weeklyTotal,
      dailyByType: activity.dailyByType,
      weeklyByType: activity.weeklyByType,
    },
  };
}
