import type { NextActionItem } from "@/lib/gameplay/types";
import type { ComputedQuest, ProfileQuestSnapshot, QuestProgressResult } from "@/lib/gameplay/questProgress";

export type NextActionRecommendation = NextActionItem & {
  questId: string;
  questType: ComputedQuest["type"];
  houseImpactLabel: string;
  gainLabel: string;
  progressLabel: string;
  urgency: "high" | "medium" | "low";
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
  if (quest.type === "daily") return "high";
  if (quest.type === "weekly" || quest.type === "main") return "medium";
  return "low";
}

function basePriority(quest: ComputedQuest): number {
  const typeWeight = quest.type === "daily" ? 100 : quest.type === "weekly" ? 70 : quest.type === "main" ? 60 : 40;
  const rewardWeight = (quest.reward.points * 2) + quest.reward.galleons;
  const completionRatio = quest.target > 0 ? quest.progress / quest.target : 0;
  const nearingCompletionBonus = completionRatio >= 0.6 ? 10 : 0;
  return typeWeight + rewardWeight + nearingCompletionBonus;
}

function routeForQuest(questId: string): string {
  if (questId.includes("duel")) return "/arena";
  if (questId.includes("trivia") || questId.includes("spell") || questId.includes("allowance") || questId.includes("niffler") || questId.includes("snitch")) {
    return "/quests";
  }
  if (questId.includes("presence") || questId.includes("exploration")) return "/map";
  return "/quests";
}

function buildReason(quest: ComputedQuest, capReached: boolean): string {
  if (capReached && quest.reward.points > 0) {
    return `היעד "${quest.title}" עדיין פתוח, אבל הגעת לתקרת הנקודות היומית — עדיף להתמקד ביעדים עם גליאונים או התקדמות סיפור.`;
  }

  if (quest.type === "daily") {
    return `יעד יומי פעיל (${toProgressLabel(quest)}) שכדאי לסגור עכשיו כדי לא לאבד התקדמות יומית.`;
  }

  if (quest.type === "weekly") {
    return `יעד שבועי בבנייה (${toProgressLabel(quest)}), פעולה עכשיו תקטין לחץ לסוף השבוע.`;
  }

  if (quest.type === "main") {
    return `משימת מסע ראשית (${toProgressLabel(quest)}) שמקדמת מעמד ארוך-טווח בעולם הטירה.`;
  }

  return `פעילות חקירה זמינה (${toProgressLabel(quest)}) שמחזקת נוכחות והשפעה בעולם.`;
}

function toRecommendation(quest: ComputedQuest, capReached: boolean): NextActionRecommendation {
  const priority = basePriority(quest) - (capReached && quest.reward.points > 0 ? 45 : 0);
  return {
    id: `next-${quest.id}`,
    questId: quest.id,
    questType: quest.type,
    title: quest.objectiveLabel,
    reason: buildReason(quest, capReached),
    href: routeForQuest(quest.id),
    priority,
    houseImpactLabel: quest.houseImpactLabel,
    gainLabel: toGainLabel(quest),
    progressLabel: toProgressLabel(quest),
    urgency: urgencyForQuest(quest),
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
