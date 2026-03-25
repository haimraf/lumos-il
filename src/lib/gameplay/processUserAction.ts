import type {
  HouseImpact,
  ProcessUserActionInput,
  ProcessUserActionOutput,
  RewardDelta,
} from "@/lib/gameplay/types";

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/**
 * Extracts numeric deltas from existing RPC/event outputs without changing
 * reward logic or invoking side effects.
 */
function normalizeRewardDelta(actionType: ProcessUserActionInput["actionType"], rawResult: unknown): RewardDelta {
  const payload = (rawResult && typeof rawResult === "object") ? (rawResult as Record<string, unknown>) : {};

  switch (actionType) {
    case "daily_allowance":
      return {
        points: 0,
        galleons: payload.success === true ? (asNumber(payload.galleons) || 5) : 0,
      };

    case "daily_trivia":
      return {
        points: payload.correct === true ? 10 : asNumber(payload.points),
        galleons: asNumber(payload.galleons),
      };

    case "daily_niffler": {
      const amount = asNumber(payload.amount);
      const rewardType = typeof payload.type === "string" ? payload.type : "points";
      return {
        points: rewardType === "points" ? amount : 0,
        galleons: rewardType === "galleons" ? amount : 0,
      };
    }

    case "daily_snitch":
      return {
        points: payload.success === true ? (asNumber(payload.points) || 15) : 0,
        galleons: 0,
      };

    case "arcade_quiz":
      return {
        points: asNumber(payload.points),
        galleons: asNumber(payload.galleons),
      };

    case "duel_outcome":
      return {
        points: asNumber(payload.points),
        galleons: asNumber(payload.galleons),
      };

    case "activity_event":
      return {
        points: asNumber(payload.points_awarded),
        galleons: 0,
      };

    default:
      return { points: 0, galleons: 0 };
  }
}

function normalizeHouseImpact(input: ProcessUserActionInput, reward: RewardDelta): HouseImpact {
  const pointsDelta = asNumber(input.houseImpact?.pointsDelta ?? reward.points);
  const message =
    input.houseImpact?.message ||
    (pointsDelta > 0 ? `הבית שלך התחזק ב-${pointsDelta} נקודות.` : "אין שינוי בניקוד הבית.");

  return { pointsDelta, message };
}

/**
 * PURE WRAPPER:
 * - Does not call RPCs
 * - Does not alter underlying reward logic
 * - Only normalizes and aggregates existing outputs
 */
export function processUserAction(input: ProcessUserActionInput): ProcessUserActionOutput {
  const reward = normalizeRewardDelta(input.actionType, input.rawResult);
  const houseImpact = normalizeHouseImpact(input, reward);
  const questUpdates = input.questUpdates ?? [];
  const completedQuests = questUpdates.filter((quest) => quest.status === "completed");

  return {
    actionType: input.actionType,
    source: input.source,
    reward,
    houseImpact,
    questUpdates,
    completedQuests,
    nextActions: input.nextActions ?? [],
    rawResult: input.rawResult,
  };
}
