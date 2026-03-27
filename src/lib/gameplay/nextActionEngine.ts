import type { NextActionItem } from "@/lib/gameplay/types";
import type { ComputedQuest, ProfileQuestSnapshot, QuestProgressResult } from "@/lib/gameplay/questProgress";

export type NextActionRecommendation = NextActionItem & {
  questId: string;
  questType: ComputedQuest["type"];
  houseImpactLabel: string;
  gainLabel: string;
  progressLabel: string;
  urgency: "high" | "medium" | "low";
  ctaLabel: string;
};

export type NextActionContext = {
  profile: Pick<ProfileQuestSnapshot, "daily_points_earned" | "house">;
  questProgress: QuestProgressResult;
};

function toGainLabel(quest: ComputedQuest) {
  const parts: string[] = [];
  if (quest.reward.points > 0) parts.push(`+${quest.reward.points} נקודות`);
  if (quest.reward.galleons > 0) parts.push(`+${quest.reward.galleons} גליאונים`);
  if (parts.length === 0) return "ללא תגמול ישיר";
  return parts.join(" • ");
}

function toProgressLabel(quest: ComputedQuest) {
  return `${quest.progress}/${quest.target}`;
}

function urgencyForQuest(quest: ComputedQuest): NextActionRecommendation["urgency"] {
  if (quest.metricWindow === "daily" || quest.type === "daily") return "high";
  if (quest.metricWindow === "weekly" || quest.type === "weekly" || quest.type === "main") return "medium";
  return "low";
}

function basePriority(quest: ComputedQuest): number {
  const typeWeight = quest.metricWindow === "daily"
    ? 140
    : quest.metricWindow === "weekly" || quest.type === "weekly"
      ? 90
      : quest.type === "main"
        ? 70
        : 40;
  const rewardWeight = (quest.reward.points * 2) + quest.reward.galleons;
  const completionRatio = quest.target > 0 ? quest.progress / quest.target : 0;
  const nearingCompletionBonus = completionRatio >= 0.6 ? 10 : 0;
  const actionBonus = quest.actionHref && quest.actionHref !== "/quests" ? 8 : 0;
  return typeWeight + rewardWeight + nearingCompletionBonus + actionBonus;
}

function routeForQuest(quest: ComputedQuest): string {
  if (quest.actionHref?.startsWith("/")) return quest.actionHref;
  if (quest.id.includes("duel")) return "/arena";
  if (quest.id.includes("quill") || quest.id.includes("forum") || quest.id.includes("reply") || quest.id.includes("thread")) {
    return "/forums";
  }
  if (quest.id.includes("news") || quest.id.includes("prophet") || quest.id.includes("poll")) {
    return "/news";
  }
  if (quest.id.includes("presence")) return "/forums";
  if (quest.id.includes("trivia") || quest.id.includes("spell") || quest.id.includes("allowance") || quest.id.includes("niffler") || quest.id.includes("snitch")) {
    return "/quests";
  }
  if (quest.id.includes("exploration")) return "/map";
  return "/quests";
}

function buildReason(quest: ComputedQuest, capReached: boolean): string {
  if (quest.id === "daily_duel_victory") {
    return "דחוף להיום: היעד הזה ייסגר רק דרך הזירה. ניצחון אחד בדו-קרב ישלים את ההתקדמות היומית וייתן בוסט רציני לבית.";
  }

  if (quest.id === "daily_castle_presence") {
    return `התקדמות במסדרונות: ${quest.title} (${toProgressLabel(quest)}). כדי לסגור אותו צריך סוגי פעילות שונים באמת, לא רק לחיצה חוזרת על אותו כפתור.`;
  }

  if (quest.id === "daily_quill_and_owl") {
    return `השיח בטירה מחכה לניצוץ שלך. שרשור חדש, תגובה בפורום או תגובה בנביא יקדמו את "${quest.title}" מ-${toProgressLabel(quest)} ויעירו את המסדרונות.`;
  }

  if (capReached && quest.reward.points > 0) {
    return `היעד "${quest.title}" עדיין פתוח, אבל מכסת הנקודות היומית כבר מלאה. עדיף כרגע להתמקד בו אם הגליאונים או ההתקדמות הארוכה שלו חשובים לך.`;
  }

  if (quest.metricWindow === "daily" || quest.type === "daily") {
    return `היעד היומי "${quest.title}" פתוח על ${toProgressLabel(quest)}. צעד אמיתי אחד עכשיו יסגור עוד חלק משגרת המסדרונות.`;
  }

  if (quest.metricWindow === "weekly" || quest.type === "weekly") {
    return `המסלול השבועי "${quest.title}" כבר פתוח על ${toProgressLabel(quest)}. פעולה אחת עכשיו תוריד עומס מסוף השבוע ותשאיר מומנטום חי.`;
  }

  if (quest.type === "main") {
    return `המסע הראשי "${quest.title}" עומד על ${toProgressLabel(quest)}. כל צעד כאן מחזק את המעמד שלך לאורך זמן, לא רק להיום.`;
  }

  return `היעד "${quest.title}" מתקדם כרגע על ${toProgressLabel(quest)}. ${quest.houseImpactLabel}.`;
}

function toRecommendation(quest: ComputedQuest, capReached: boolean): NextActionRecommendation {
  const priority = basePriority(quest) - (capReached && quest.reward.points > 0 ? 45 : 0);
  return {
    id: `next-${quest.id}`,
    questId: quest.id,
    questType: quest.type,
    title: quest.title,
    reason: buildReason(quest, capReached),
    href: routeForQuest(quest),
    priority,
    houseImpactLabel: quest.houseImpactLabel,
    gainLabel: toGainLabel(quest),
    progressLabel: toProgressLabel(quest),
    urgency: urgencyForQuest(quest),
    ctaLabel: quest.actionLabel || "להמשיך ליעד",
  };
}

/**
 * Step 3 / Next Action Engine (read-only):
 * - consumes computed quest state + profile snapshot
 * - returns 1-3 actionable recommendations
 * - does not mutate DB or call RPCs
 */
export function computeNextActions(context: NextActionContext): NextActionRecommendation[] {
  const dailyPointsEarned = context.profile.daily_points_earned || 0;
  const capReached = dailyPointsEarned >= 50;

  const activeQuests = context.questProgress.quests.filter((quest) => quest.status === "active");

  const recommendations = activeQuests
    .map((quest) => toRecommendation(quest, capReached))
    .sort((a, b) => b.priority - a.priority);

  return recommendations.slice(0, 3);
}
