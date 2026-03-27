import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_QUEST_CATALOG, type QuestCatalogEntry } from "@/lib/gameplay/questCatalog";

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
  actionHref: string;
  actionLabel: string;
  progress: number;
  target: number;
  status: QuestStatus;
  metricSource: QuestCatalogEntry["metric"]["source"];
  metricWindow: QuestCatalogEntry["metric"]["window"];
  metricEventTypes: string[];
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
  questCatalog: QuestCatalogEntry[] = DEFAULT_QUEST_CATALOG,
  now = new Date(),
): QuestProgressResult {
  const today = toIsoDateUTC(now);
  const weekStart = startOfUtcWeek(now).getTime();

  const quests: ComputedQuest[] = questCatalog
    .filter((entry) => entry.enabled !== false)
    .sort((left, right) => left.order - right.order)
    .map((entry) => {
      let progress = 0;

      if (entry.metric.source === "profile_flag") {
        const flagField = entry.metric.profileField as keyof ProfileQuestSnapshot | undefined;
        const rawFieldValue = flagField ? profile[flagField] : null;
        const rawValue = typeof rawFieldValue === "string" ? rawFieldValue : null;
        const timestamp = rawValue ? new Date(rawValue).getTime() : 0;
        const isCompleted = entry.metric.window === "weekly"
          ? timestamp >= weekStart
          : rawValue === today;
        progress = isCompleted ? entry.target : 0;
      }

      if (entry.metric.source === "activity_total") {
        progress = entry.metric.window === "weekly"
          ? activity.weeklyTotal
          : activity.dailyTotal;
      }

      if (entry.metric.source === "activity_types") {
        const eventTypes = entry.metric.eventTypes || [];
        const sourceMap = entry.metric.window === "weekly"
          ? activity.weeklyByType
          : activity.dailyByType;
        progress = eventTypes.reduce((sum, eventType) => sum + (sourceMap[eventType] || 0), 0);
      }

      if (entry.metric.source === "activity_unique_types") {
        const eventTypes = entry.metric.eventTypes || [];
        const sourceMap = entry.metric.window === "weekly"
          ? activity.weeklyByType
          : activity.dailyByType;
        progress = eventTypes.reduce((sum, eventType) => (
          sum + (sourceMap[eventType] && sourceMap[eventType] > 0 ? 1 : 0)
        ), 0);
      }

      if (entry.metric.source === "profile_number") {
        const numericField = entry.metric.profileField as keyof ProfileQuestSnapshot | undefined;
        const rawFieldValue = numericField ? profile[numericField] : 0;
        const rawValue = typeof rawFieldValue === "number" ? rawFieldValue : Number(rawFieldValue || 0);
        progress = Number.isFinite(rawValue) ? rawValue : 0;
      }

      const clampedProgress = clampProgress(progress, entry.target);

      return {
        id: entry.id,
        type: entry.type,
        title: entry.title,
        description: entry.description,
        objectiveLabel: entry.objectiveLabel,
        actionHref: entry.actionHref,
        actionLabel: entry.actionLabel,
        progress: clampedProgress,
        target: entry.target,
        status: questStatus(progress, entry.target),
        metricSource: entry.metric.source,
        metricWindow: entry.metric.window,
        metricEventTypes: entry.metric.eventTypes || [],
        reward: entry.reward,
        houseImpactLabel: entry.houseImpactLabel,
      };
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
