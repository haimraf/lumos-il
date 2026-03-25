export type GameplayActionType =
  | "daily_allowance"
  | "daily_trivia"
  | "daily_niffler"
  | "daily_snitch"
  | "arcade_quiz"
  | "duel_outcome"
  | "activity_event"
  | "unknown";

export type RewardDelta = {
  points: number;
  galleons: number;
};

export type HouseImpact = {
  pointsDelta: number;
  message: string;
};

export type QuestUpdate = {
  questId: string;
  title: string;
  progressBefore: number;
  progressAfter: number;
  target: number;
  status: "active" | "completed";
};

export type NextActionItem = {
  id: string;
  title: string;
  reason: string;
  href: string;
  priority: number;
};

export type ProcessUserActionInput = {
  actionType: GameplayActionType;
  /** Raw response from an existing RPC/system. */
  source: "rpc" | "event" | "system";
  rawResult?: unknown;
  /** Optional pre-computed enrichments (added by callers, not by reward logic). */
  houseImpact?: Partial<HouseImpact>;
  questUpdates?: QuestUpdate[];
  nextActions?: NextActionItem[];
};

export type ProcessUserActionOutput = {
  actionType: GameplayActionType;
  source: ProcessUserActionInput["source"];
  reward: RewardDelta;
  houseImpact: HouseImpact;
  questUpdates: QuestUpdate[];
  completedQuests: QuestUpdate[];
  nextActions: NextActionItem[];
  rawResult?: unknown;
};
