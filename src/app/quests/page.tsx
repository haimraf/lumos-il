"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Coins,
  Flame,
  Gift,
  Hourglass,
  Search,
  Sparkles,
  ScrollText,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import MemberOnlyNotice from "@/components/auth/MemberOnlyNotice";
import { useOwlMail } from "@/components/OwlMail";
import QuestCommunityPulse from "@/components/QuestCommunityPulse";
import QuickDailyQuestModal, { type QuickDailyQuestMode } from "@/components/QuickDailyQuestModal";
import { useAuth } from "@/context/AuthContext";
import { logActivityEvent } from "@/lib/activityEvents";
import { computeNextActions, type NextActionRecommendation } from "@/lib/gameplay/nextActionEngine";
import {
  computeQuestProgress,
  fetchQuestActivitySummary,
  type ComputedQuest,
} from "@/lib/gameplay/questProgress";
import { fetchQuestCatalog, subscribeToQuestCatalogChanges } from "@/lib/gameplay/questCatalog";
import { processUserAction } from "@/lib/gameplay/processUserAction";
import type { ProcessUserActionOutput, QuestUpdate } from "@/lib/gameplay/types";

const TRIVIA_POOL = [
  {
    q: "איזה לחש פותח דלתות נעולות?",
    a: "אלוהומורה",
    options: ["לומוס", "אלוהומורה", "אקספקטו פטרונום", "רפארו"],
  },
  {
    q: "מהו הלחש שיוצר מגן מפני סוהרסנים?",
    a: "אקספקטו פטרונום",
    options: ["פרוטגו", "אקספקטו פטרונום", "סטופפי", "אינסנדיו"],
  },
  {
    q: "איך קוראים ללחש שמפרק מנשק את היריב?",
    a: "אקספליארמוס",
    options: ["אקספליארמוס", "קונפונדו", "רדוקטו", "אציו"],
  },
  {
    q: "איזה לחש מתקן חפצים שבורים?",
    a: "רפארו",
    options: ["רפארו", "לומוס", "דיפינדו", "אלוהומורה"],
  },
  {
    q: "מה שמו האמיתי של לורד וולדמורט?",
    a: "טום רידל",
    options: ["טום רידל", "סוורוס סנייפ", "גלרט גרינדלוולד", "סלזאר סלית'רין"],
  },
  {
    q: "כמה הורקרוקסים יצר וולדמורט, כולל הארי?",
    a: "7",
    options: ["5", "6", "7", "8"],
  },
  {
    q: "מהו הלחש שיוצר אור בקצה השרביט?",
    a: "לומוס",
    options: ["לומוס", "נוקס", "אקסיו", "אינסנדיו"],
  },
  {
    q: "איזה שיקוי מאפשר לשנות צורה לאדם אחר?",
    a: "פולימיצי",
    options: ["פליקס פליציס", "פולימיצי", "אמורטנציה", "וריטסרום"],
  },
  {
    q: "מי היה האסיר מאזקבאן?",
    a: "סיריוס בלק",
    options: ["סיריוס בלק", "רמוס לופין", "פיטר פטיגרו", "דראקו מאלפוי"],
  },
  {
    q: "מה שמה של הינשופה של הארי פוטר?",
    a: "הדוויג",
    options: ["ארול", "פיגווידג'ן", "הדוויג", "קרוקשנקס"],
  },
  {
    q: "איזה לחש מזמן חפץ אליך?",
    a: "אציו",
    options: ["אציו", "לומוס", "רידיקולוס", "סקטומסמפרה"],
  },
  {
    q: "איזה לחש מתאים להרמת חפצים באוויר?",
    a: "ווינגארדיום לביוסה",
    options: ["אקספליארמוס", "ווינגארדיום לביוסה", "רפארו", "פטריפיקוס טוטאלוס"],
  },
];

const HOUSE_COLORS: Record<string, string> = {
  Gryffindor: "text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]",
  Slytherin: "text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]",
  Ravenclaw: "text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]",
  Hufflepuff: "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]",
};

type BrowserTimeout = ReturnType<typeof setTimeout>;

const QUICK_DAILY_QUEST_IDS = new Set([
  "daily_allowance",
  "daily_spell_exam",
  "daily_niffler_hunt",
  "daily_snitch_run",
]);

function getUrgencyMeta(urgency: NextActionRecommendation["urgency"]) {
  if (urgency === "high") {
    return {
      label: "דחוף להיום",
      className: "border-rose-400/30 bg-rose-500/10 text-rose-200",
      Icon: Flame,
    };
  }

  if (urgency === "medium") {
    return {
      label: "כדאי לסגור בקרוב",
      className: "border-amber-400/30 bg-amber-500/10 text-amber-200",
      Icon: Hourglass,
    };
  }

  return {
    label: "התקדמות רגועה",
    className: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
    Icon: Sparkles,
  };
}

function getLiveDailyQuestMeta(quest: ComputedQuest) {
  if (quest.id === "daily_quill_and_owl") {
    return {
      href: quest.actionHref,
      cta: quest.progress > 0 ? "להשלים דרך השיח החי" : quest.actionLabel,
      eyebrow: "פורומים והנביא",
      Icon: BookOpen,
      iconClass: "text-blue-300",
      shellClass: "border-blue-400/20 bg-blue-500/10 text-blue-100",
    };
  }

  if (quest.id === "daily_castle_presence") {
    return {
      href: quest.actionHref,
      cta: quest.actionLabel,
      eyebrow: "תנועה חיה בטירה",
      Icon: Sparkles,
      iconClass: "text-amber-300",
      shellClass: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    };
  }

  if (quest.id === "daily_duel_victory") {
    return {
      href: quest.actionHref,
      cta: quest.actionLabel,
      eyebrow: "דו-קרב יומי",
      Icon: Trophy,
      iconClass: "text-rose-300",
      shellClass: "border-rose-400/20 bg-rose-500/10 text-rose-100",
    };
  }

  return {
    href: quest.actionHref || "/quests",
    cta: quest.actionLabel || "לפתוח את היעד",
    eyebrow: "יעד יומי",
    Icon: Flame,
    iconClass: "text-white/80",
    shellClass: "border-white/10 bg-white/5 text-white/70",
  };
}

function getPrimaryActionSupportCopy(remainingDailyTasks: number) {
  if (remainingDailyTasks <= 0) {
    return "אתגרי היום נסגרו. עכשיו זה זמן טוב לדחוף קדימה מסלולים ארוכים יותר ולתת לטירה להרגיש אותך.";
  }

  if (remainingDailyTasks === 1) {
    return "אתגרים ששווה לסיים: נשאר לך עוד מעשה יומי אחד להיום.";
  }

  return `אתגרים ששווה לסיים: נשארו לך עוד ${remainingDailyTasks} מעשים יומיים להיום.`;
}

function getQuickDailySectionCopy(quickDailyTasksRemaining: number) {
  if (quickDailyTasksRemaining <= 0) {
    return "אלה היו הבונוסים המהירים של היום. סיימתם אותם? מעולה. עכשיו הזמן לעבור לאתגרים החיים שלמעלה.";
  }

  return "אלה בונוסים מהירים להיום. סיימתם אותם? מעולה. המשיכו לאתגרים שלמעלה כדי להרגיש את הטירה זזה איתכם.";
}

function formatQuestReward(quest?: ComputedQuest | null) {
  if (!quest) return "";

  const parts: string[] = [];
  if (quest.reward.points > 0) parts.push(`${quest.reward.points} נקודות`);
  if (quest.reward.galleons > 0) parts.push(`${quest.reward.galleons} גליאונים`);

  return parts.join(" • ");
}
function getQuestTypeLabel(type: ComputedQuest["type"]) {
  switch (type) {
    case "daily":
      return "יומי";
    case "weekly":
      return "שבועי";
    case "main":
      return "ראשי";
    case "house":
      return "בית";
    case "exploration":
      return "חקירה";
    default:
      return "משימה";
  }
}

function getQuestTypeClass(type: ComputedQuest["type"]) {
  switch (type) {
    case "daily":
      return "border-amber-400/25 bg-amber-500/10 text-amber-100";
    case "weekly":
      return "border-blue-400/25 bg-blue-500/10 text-blue-100";
    case "main":
      return "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100";
    case "house":
      return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
    case "exploration":
      return "border-cyan-400/25 bg-cyan-500/10 text-cyan-100";
    default:
      return "border-white/10 bg-white/5 text-white/70";
  }
}

function getQuestVisualState(quest: ComputedQuest, justCompletedQuestIds: string[]) {
  const percent = quest.target > 0 ? Math.min(100, Math.round((quest.progress / quest.target) * 100)) : 0;
  const justCompleted = justCompletedQuestIds.includes(quest.id);
  const completed = quest.status === "completed";
  const almostDone = !completed && quest.progress > 0 && ((quest.target - quest.progress) <= 1 || percent >= 80);

  if (justCompleted) {
    return {
      percent,
      justCompleted,
      almostDone,
      statusLabel: "הושלם עכשיו",
      statusClass: "border-emerald-300/40 bg-emerald-400/15 text-emerald-100",
      cardClass: "border-emerald-300/35 bg-emerald-500/[0.08] shadow-[0_0_45px_rgba(74,222,128,0.18)]",
      barClass: "bg-gradient-to-r from-emerald-300 via-emerald-400 to-amber-300 shadow-[0_0_30px_rgba(74,222,128,0.45)]",
      meterClass: "border-emerald-400/25 bg-emerald-500/10",
      progressCopy: "ההשלמה עוד מהדהדת בלוח",
    };
  }

  if (completed) {
    return {
      percent,
      justCompleted,
      almostDone,
      statusLabel: "הושלם",
      statusClass: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200/90",
      cardClass: "border-emerald-500/20 bg-emerald-500/[0.04]",
      barClass: "bg-gradient-to-r from-emerald-400 to-emerald-300",
      meterClass: "border-emerald-500/20 bg-emerald-500/10",
      progressCopy: "יעד סגור ומוכן לסבב הבא",
    };
  }

  if (almostDone) {
    return {
      percent,
      justCompleted,
      almostDone,
      statusLabel: "עוד רגע נסגר",
      statusClass: "border-amber-400/30 bg-amber-500/10 text-amber-100",
      cardClass: "border-amber-400/25 bg-amber-500/[0.04] shadow-[0_0_35px_rgba(251,191,36,0.12)]",
      barClass: "bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 shadow-[0_0_24px_rgba(251,191,36,0.28)]",
      meterClass: "border-amber-400/20 bg-amber-500/10",
      progressCopy: "עוד פעולה קטנה והיעד נסגר",
    };
  }

  return {
    percent,
    justCompleted,
    almostDone,
    statusLabel: "פעיל",
    statusClass: "border-white/10 bg-white/5 text-white/65",
    cardClass: "border-white/10 bg-white/[0.03] hover:border-white/15",
    barClass: "bg-gradient-to-r from-sky-400 via-blue-400 to-emerald-400",
    meterClass: "border-white/10 bg-white/5",
    progressCopy: "התקדמות פתוחה למסע של היום",
  };
}

function getQuestBoardMeta(quest: ComputedQuest): {
  Icon: LucideIcon;
  sigil: string;
  realm: string;
  frameClass: string;
  iconClass: string;
  glowClass: string;
} {
  if (quest.id.includes("duel") || quest.actionHref === "/arena") {
    return {
      Icon: Trophy,
      sigil: "ARENA",
      realm: "זירת הלחשים",
      frameClass: "border-rose-400/20 bg-rose-500/[0.055]",
      iconClass: "text-rose-200",
      glowClass: "bg-rose-400/15",
    };
  }

  if (quest.id.includes("notice") || quest.id.includes("quill") || quest.actionHref === "/forums") {
    return {
      Icon: ScrollText,
      sigil: "BOARD",
      realm: "מסדרונות הקהילה",
      frameClass: "border-amber-400/20 bg-amber-500/[0.06]",
      iconClass: "text-amber-200",
      glowClass: "bg-amber-400/15",
    };
  }

  if (quest.type === "weekly" || quest.type === "house") {
    return {
      Icon: Flame,
      sigil: "HOUSE",
      realm: "מומנטום ביתי",
      frameClass: "border-emerald-400/20 bg-emerald-500/[0.055]",
      iconClass: "text-emerald-200",
      glowClass: "bg-emerald-400/15",
    };
  }

  if (quest.type === "main") {
    return {
      Icon: Sparkles,
      sigil: "MAIN",
      realm: "מסע אישי",
      frameClass: "border-fuchsia-400/20 bg-fuchsia-500/[0.055]",
      iconClass: "text-fuchsia-200",
      glowClass: "bg-fuchsia-400/15",
    };
  }

  return {
    Icon: BookOpen,
    sigil: "QUEST",
    realm: "משימת טירה",
    frameClass: "border-cyan-400/20 bg-cyan-500/[0.055]",
    iconClass: "text-cyan-200",
    glowClass: "bg-cyan-400/15",
  };
}

export default function QuestsPage() {
  const [supabase] = useState(() => createClient());
  const { sendOwl } = useOwlMail();
  const { profile, refreshProfile, isLoading: authLoading, session, profileError } = useAuth();

  type TriviaQuestion = (typeof TRIVIA_POOL)[number];

  const [currentTrivia] = useState<TriviaQuestion | null>(() => {
    const day = new Date().getDate();
    return TRIVIA_POOL[day % TRIVIA_POOL.length] ?? null;
  });
  const [activeQuickQuest, setActiveQuickQuest] = useState<QuickDailyQuestMode | null>(null);
  const [nifflerLoading, setNifflerLoading] = useState(false);
  const [snitchLoading, setSnitchLoading] = useState(false);
  const [dailyStatus, setDailyStatus] = useState({
    allowance: false,
    trivia: false,
    niffler: false,
    snitch: false,
  });
  const [computedQuests, setComputedQuests] = useState<ComputedQuest[]>([]);
  const [nextActions, setNextActions] = useState<NextActionRecommendation[]>([]);
  const [lastFeedback, setLastFeedback] = useState<ProcessUserActionOutput | null>(null);
  const [justCompletedQuestIds, setJustCompletedQuestIds] = useState<string[]>([]);
  const [rewardPulse, setRewardPulse] = useState(false);
  const [liveToasts, setLiveToasts] = useState<
    Array<{ id: string; title: string; subtitle: string; tone: "success" | "info" | "magic" }>
  >([]);
  const toastCounterRef = useRef(0);
  const recentLocalEventsRef = useRef<Record<string, number>>({});
  const refreshTimeoutRef = useRef<BrowserTimeout | null>(null);
  const rewardPulseTimeoutRef = useRef<BrowserTimeout | null>(null);
  const completionTimeoutsRef = useRef<Record<string, BrowserTimeout>>({});

// פונקציה שבודקת האם התאריך מהשרת תואם להיום (גם לפי שעון ישראל וגם לפי UTC)
  const checkIsDoneToday = (dateStr?: string | null) => {
    if (!dateStr) return false;
    
    const now = new Date();
    // תאריך לפי שעון ישראל (מקומי לדפדפן)
    const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    // תאריך לפי שעון שרת (UTC)
    const utcToday = now.toISOString().split("T")[0];
    
    return dateStr.startsWith(localToday) || dateStr.startsWith(utcToday);
  };

  const isAllowanceDone = dailyStatus.allowance || checkIsDoneToday(profile?.last_reward_date);
  const isTriviaDone = dailyStatus.trivia || checkIsDoneToday(profile?.last_trivia_date);
  const isNifflerDone = dailyStatus.niffler || checkIsDoneToday(profile?.last_niffler_date);
  const isSnitchDone = dailyStatus.snitch || checkIsDoneToday(profile?.last_snitch_date);
  const refreshComputedState = useCallback(async () => {
    if (!profile?.id) {
      setComputedQuests([]);
      setNextActions([]);
      return;
    }

    const [activity, questCatalog] = await Promise.all([
      fetchQuestActivitySummary(supabase, profile.id),
      fetchQuestCatalog(supabase),
    ]);
    const questProgress = computeQuestProgress(profile, activity, questCatalog);

    setComputedQuests(questProgress.quests);
    setNextActions(
      computeNextActions({
        profile: {
          daily_points_earned: profile.daily_points_earned,
          house: profile.house,
        },
        questProgress,
      }),
    );
  }, [
    supabase,
    profile,
  ]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshComputedState();
    });
  }, [refreshComputedState]);

  useEffect(() => {
    if (!profile?.id) return;

    const questCatalogChannel = subscribeToQuestCatalogChanges(
      supabase,
      `quests-page-${profile.id}`,
      refreshComputedState,
    );

    return () => {
      void supabase.removeChannel(questCatalogChannel);
    };
  }, [profile?.id, refreshComputedState, supabase]);

  const estimateEventPoints = useCallback((eventType: string) => {
    const pointMap: Record<string, number> = {
      quest_trivia_completed: 10,
      quest_niffler_found: 10,
      quest_snitch_caught: 15,
      quest_reward_claimed: 5,
      arena_duel_completed: 15,
      duel_tied: 10,
      story_published: 25,
      chapter_published: 15,
      forum_thread_created: 15,
      forum_reply_created: 10,
      news_comment_created: 5,
      news_poll_voted: 8,
      library_chapter_read: 5,
    };

    return pointMap[eventType] || 0;
  }, []);

  const pushLiveToast = useCallback(
    (title: string, subtitle: string, tone: "success" | "info" | "magic" = "magic") => {
      toastCounterRef.current += 1;
      const id = `toast-${toastCounterRef.current}`;

      setLiveToasts((prev) => [...prev.slice(-2), { id, title, subtitle, tone }]);

      setTimeout(() => {
        setLiveToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 3600);
    },
    [],
  );

  const triggerRewardPulse = useCallback(() => {
    setRewardPulse(true);
    if (rewardPulseTimeoutRef.current) clearTimeout(rewardPulseTimeoutRef.current);
    rewardPulseTimeoutRef.current = setTimeout(() => {
      setRewardPulse(false);
      rewardPulseTimeoutRef.current = null;
    }, 2200);
  }, []);

  const triggerQuestCompletion = useCallback((quests: QuestUpdate[]) => {
    const completedIds = quests
      .filter((quest) => quest.status === "completed")
      .map((quest) => quest.questId);

    if (completedIds.length === 0) return;

    setJustCompletedQuestIds((prev) => Array.from(new Set([...prev, ...completedIds])));

    completedIds.forEach((questId) => {
      if (completionTimeoutsRef.current[questId]) clearTimeout(completionTimeoutsRef.current[questId]);

      completionTimeoutsRef.current[questId] = setTimeout(() => {
        setJustCompletedQuestIds((prev) => prev.filter((id) => id !== questId));
        delete completionTimeoutsRef.current[questId];
      }, 2800);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rewardPulseTimeoutRef.current) clearTimeout(rewardPulseTimeoutRef.current);
      Object.values(completionTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
      completionTimeoutsRef.current = {};
    };
  }, []);

  const dispatchGameplayFeedback = useCallback(
    (feedback: ProcessUserActionOutput) => {
      const rewardParts: string[] = [];
      if (feedback.reward.points > 0) rewardParts.push(`+${feedback.reward.points} נקודות`);
      if (feedback.reward.galleons > 0) rewardParts.push(`+${feedback.reward.galleons} גליאונים`);
      const rewardLabel = rewardParts.length > 0 ? rewardParts.join(" • ") : "ללא תגמול ישיר";

      if (feedback.reward.points > 0 || feedback.reward.galleons > 0) triggerRewardPulse();

      const detailParts: string[] = [];

      if (feedback.completedQuests.length > 0) {
        triggerQuestCompletion(feedback.completedQuests);
        detailParts.push(feedback.completedQuests.map((quest) => quest.title).join(" • "));
      }

      if (rewardParts.length > 0) detailParts.push(rewardLabel);

      if (feedback.houseImpact.message && (feedback.houseImpact.pointsDelta > 0 || detailParts.length === 0)) {
        detailParts.push(feedback.houseImpact.message);
      }

      if (detailParts.length === 0) return;

      if (feedback.completedQuests.length > 0) {
        pushLiveToast("משימה הושלמה", detailParts.join(" • "), "success");
        return;
      }

      if (feedback.reward.points > 0 || feedback.reward.galleons > 0) {
        pushLiveToast("תגמול התקבל", detailParts.join(" • "), "magic");
        return;
      }

      pushLiveToast("השפעת בית", detailParts.join(" • "), "success");
    },
    [pushLiveToast, triggerQuestCompletion, triggerRewardPulse],
  );

  const markLocalEvent = useCallback((eventType: string) => {
    recentLocalEventsRef.current[eventType] = Date.now();
  }, []);

  const isDuplicateRealtimeEvent = useCallback((eventType: string) => {
    const timestamp = recentLocalEventsRef.current[eventType];
    if (!timestamp) return false;
    return Date.now() - timestamp < 5000;
  }, []);

  const scheduleProfileRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) return;
    refreshTimeoutRef.current = setTimeout(() => {
      refreshTimeoutRef.current = null;
      void refreshProfile();
    }, 800);
  }, [refreshProfile]);

  const fetchEconomySnapshot = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("points_contributed, galleons")
        .eq("id", userId)
        .single();

      return {
        points: data?.points_contributed || 0,
        galleons: data?.galleons || 0,
      };
    },
    [supabase],
  );

  const applyActualRewardDeltas = useCallback(
    (
      feedback: ProcessUserActionOutput,
      before: { points: number; galleons: number },
      after: { points: number; galleons: number },
    ): ProcessUserActionOutput => {
      const awardedPoints = Math.max(0, after.points - before.points);
      const awardedGalleons = Math.max(0, after.galleons - before.galleons);
      const capLimited = awardedPoints < feedback.reward.points;

      return {
        ...feedback,
        reward: { points: awardedPoints, galleons: awardedGalleons },
        houseImpact: {
          pointsDelta: awardedPoints,
          message: capLimited ? "התקרה היומית הגבילה את כמות הנקודות שנוספה בפועל." : feedback.houseImpact.message,
        },
      };
    },
    [],
  );

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`quest-loop-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_events",
          filter: `actor_id=eq.${profile.id}`,
        },
        (payload) => {
          const newEvent = payload.new as { event_type?: string };
          const eventType = newEvent.event_type || "activity_event";

          if (isDuplicateRealtimeEvent(eventType)) {
            scheduleProfileRefresh();
            return;
          }

          const estimatedPoints = estimateEventPoints(eventType);
          const feedback = processUserAction({
            actionType: "activity_event",
            source: "event",
            rawResult: { points_awarded: estimatedPoints, event_type: eventType },
            houseImpact: {
              pointsDelta: estimatedPoints,
              message:
                eventType.startsWith("arena_duel") || eventType === "duel_tied"
                  ? "הקרב בזירה הזיז את מומנטום הבית."
                  : "הפעילות שלך בטירה חיזקה את תרומת הבית.",
            },
          });

          setLastFeedback(feedback);
          dispatchGameplayFeedback(feedback);
          scheduleProfileRefresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [
    dispatchGameplayFeedback,
    estimateEventPoints,
    isDuplicateRealtimeEvent,
    profile?.id,
    scheduleProfileRefresh,
    supabase,
  ]);

  const handleDailyCollect = async () => {
    if (isAllowanceDone || !profile) return;

    const before = await fetchEconomySnapshot(profile.id);
    setDailyStatus((current) => ({ ...current, allowance: true }));
    const { data, error } = await supabase.rpc("claim_daily_allowance", { p_user_id: profile.id });

    if (error) {
      setDailyStatus((current) => ({ ...current, allowance: false }));
      sendOwl("הלחש נכשל", `הקצבה לא נאספה: ${error.message}`, "error");
      return;
    }

    if (data?.success) {
      const feedback = processUserAction({
        actionType: "daily_allowance",
        source: "rpc",
        rawResult: data,
        houseImpact: { pointsDelta: 0, message: "דמי הכיס מוכנים להמשך המסע היומי." },
        questUpdates: [
          {
            questId: "daily_allowance",
            title: "דמי הכיס של משרד הקסמים",
            progressBefore: 0,
            progressAfter: 1,
            target: 1,
            status: "completed",
          },
        ],
      });

      markLocalEvent("quest_reward_claimed");
      void logActivityEvent(supabase, {
        actorId: profile.id,
        actorName: profile.full_name,
        eventType: "quest_reward_claimed",
        title: "קצבה ממשרד הקסמים",
        subtitle: "קיבלת 5 גליאונים מהקצבה היומית",
        icon: "נ’°",
      });

      await refreshProfile();
      const after = await fetchEconomySnapshot(profile.id);
      const adjustedFeedback = applyActualRewardDeltas(feedback, before, after);
      setLastFeedback(adjustedFeedback);
      dispatchGameplayFeedback(adjustedFeedback);
      return;
    }

    sendOwl("כבר אספת היום", "הקצבה תתחדש מחר בבוקר.", "info");
    await refreshProfile();
  };

  const openQuickQuest = (mode: QuickDailyQuestMode) => {
    if (
      (mode === "allowance" && isAllowanceDone) ||
      (mode === "trivia" && isTriviaDone) ||
      (mode === "niffler" && (isNifflerDone || nifflerLoading)) ||
      (mode === "snitch" && (isSnitchDone || snitchLoading))
    ) {
      return;
    }

    setActiveQuickQuest(mode);
  };

  const handleTriviaAnswer = async (selected: string) => {
    if (isTriviaDone || !profile || !currentTrivia) return;

    const before = await fetchEconomySnapshot(profile.id);
    const isCorrect = selected === currentTrivia.a;
    setDailyStatus((current) => ({ ...current, trivia: true }));
    const { data, error } = await supabase.rpc("claim_trivia_reward", {
      p_user_id: profile.id,
      p_is_correct: isCorrect,
    });

    if (error) {
      setDailyStatus((current) => ({ ...current, trivia: false }));
      sendOwl("הלחש נכשל", `מבחן הלחשים נתקע: ${error.message}`, "error");
      return;
    }

    if (data?.success) {
      const feedback = processUserAction({
        actionType: "daily_trivia",
        source: "rpc",
        rawResult: data,
        questUpdates: isCorrect
          ? [
              {
                questId: "daily_spell_exam",
                title: "מבחן הלחשים היומי",
                progressBefore: 0,
                progressAfter: 1,
                target: 1,
                status: "completed",
              },
            ]
          : [],
      });

      if (!isCorrect) {
        sendOwl("תשובה שגויה", `התשובה הנכונה הייתה: ${currentTrivia.a}`, "error");
      }

      if (isCorrect) {
        markLocalEvent("quest_trivia_completed");
        void logActivityEvent(supabase, {
          actorId: profile.id,
          actorName: profile.full_name,
          eventType: "quest_trivia_completed",
          title: "מבחן הלחשים היומי",
          subtitle: "ענית נכון על מבחן הלחשים היומי",
          icon: "נ“˜",
        });
      }

      await refreshProfile();
      const after = await fetchEconomySnapshot(profile.id);
      const adjustedFeedback = applyActualRewardDeltas(feedback, before, after);
      setLastFeedback(adjustedFeedback);
      dispatchGameplayFeedback(adjustedFeedback);
      return;
    }

    sendOwl("כבר ענית היום", "מבחן הלחשים יחזור מחר בבוקר.", "info");
    await refreshProfile();
  };

  const handleNifflerHunt = async () => {
    if (isNifflerDone || nifflerLoading || !profile) return;

    const before = await fetchEconomySnapshot(profile.id);
    setNifflerLoading(true);
    setDailyStatus((current) => ({ ...current, niffler: true }));
    const { data, error } = await supabase.rpc("claim_niffler_reward", { p_user_id: profile.id });

    if (error) {
      setDailyStatus((current) => ({ ...current, niffler: false }));
      sendOwl("הניפלר ברח", `הציד נכשל: ${error.message}`, "error");
      setNifflerLoading(false);
      return;
    }

    if (data?.success) {
      const feedback = processUserAction({
        actionType: "daily_niffler",
        source: "rpc",
        rawResult: data,
        questUpdates: [
          {
            questId: "daily_niffler_hunt",
            title: "מרדף הניפלר",
            progressBefore: 0,
            progressAfter: 1,
            target: 1,
            status: "completed",
          },
        ],
      });

      const rewardTypeLabel = data.type === "galleons" ? "גליאונים" : "נקודות קסם";
      markLocalEvent("quest_niffler_found");
      void logActivityEvent(supabase, {
        actorId: profile.id,
        actorName: profile.full_name,
        eventType: "quest_niffler_found",
        title: "מרדף הניפלר",
        subtitle: `תפסת את הניפלר וקיבלת ${data.amount} ${rewardTypeLabel}`,
        icon: "נ¦¦",
      });

      await refreshProfile();
      const after = await fetchEconomySnapshot(profile.id);
      const adjustedFeedback = applyActualRewardDeltas(feedback, before, after);
      setLastFeedback(adjustedFeedback);
      dispatchGameplayFeedback(adjustedFeedback);
    } else {
      sendOwl("הניפלר ברח", "הוא כבר נתפס להיום. יחזור מחר בבוקר.", "info");
      await refreshProfile();
    }

    setNifflerLoading(false);
  };

  const handleSnitchCatch = async () => {
    if (isSnitchDone || snitchLoading || !profile) return;

    const before = await fetchEconomySnapshot(profile.id);
    setSnitchLoading(true);
    setDailyStatus((current) => ({ ...current, snitch: true }));
    const { data, error } = await supabase.rpc("claim_snitch_reward", { p_user_id: profile.id });

    if (error) {
      setDailyStatus((current) => ({ ...current, snitch: false }));
      sendOwl("הסניץ' ברח", `לא הצלחת לתפוס: ${error.message}`, "error");
      setSnitchLoading(false);
      return;
    }

    if (data?.success) {
      const feedback = processUserAction({
        actionType: "daily_snitch",
        source: "rpc",
        rawResult: data,
        questUpdates: [
          {
            questId: "daily_snitch_run",
            title: "מרדף אחרי הסניץ'",
            progressBefore: 0,
            progressAfter: 1,
            target: 1,
            status: "completed",
          },
        ],
      });

      markLocalEvent("quest_snitch_caught");
      void logActivityEvent(supabase, {
        actorId: profile.id,
        actorName: profile.full_name,
        eventType: "quest_snitch_caught",
        title: "מרדף אחרי הסניץ'",
        subtitle: "תפסת את הסניץ' הזהוב",
        icon: "ג¡",
      });

      await refreshProfile();
      const after = await fetchEconomySnapshot(profile.id);
      const adjustedFeedback = applyActualRewardDeltas(feedback, before, after);
      setLastFeedback(adjustedFeedback);
      dispatchGameplayFeedback(adjustedFeedback);
    } else {
      sendOwl("הסניץ' מתחבא", "כבר תפסת אותו היום. יחזור מחר לאחר השקיעה.", "info");
      await refreshProfile();
    }

    setSnitchLoading(false);
  };

  const handleQuickQuestComplete = async (payload?: string) => {
    if (!activeQuickQuest) return;

    if (activeQuickQuest === "allowance") {
      await handleDailyCollect();
      return;
    }

    if (activeQuickQuest === "trivia") {
      if (typeof payload === "string") {
        await handleTriviaAnswer(payload);
      }
      return;
    }

    if (activeQuickQuest === "niffler") {
      await handleNifflerHunt();
      return;
    }

    await handleSnitchCatch();
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#020617]">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-amber-500" />
        <p className="animate-pulse font-cinzel tracking-widest text-amber-500">רוקח שיקוי...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <MemberOnlyNotice
        title="לוח המשימות מתעורר רק לקוסמים מחוברים"
        description="כדי לראות את הקווסטים האישיים שלך, הגליאונים, ההתקדמות היומית וההמלצות החיות של הטירה בלי מספרי אפס מטעים, צריך קודם להיכנס לחשבון שלך."
        icon={Gift}
      />
    );
  }

  if (session && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] px-6" dir="rtl">
        <div className="w-full max-w-md space-y-5 rounded-[2rem] border border-amber-500/20 bg-black/30 p-8 text-center shadow-[0_0_40px_rgba(245,158,11,0.08)]">
          <Gift className="mx-auto text-amber-500" size={42} />
          <div>
            <h1 className="mb-2 font-cinzel text-2xl font-black text-white">
              הכניסה נפתחה, אבל דף הקוסם עוד מתארגן
            </h1>
            <p className="font-crimson leading-relaxed text-white/55">
              {profileError || "אפשר לנסות לרענן את הדף האישי בלי לנתק את החשבון."}
            </p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => refreshProfile()}
              className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-black font-cinzel uppercase tracking-widest text-amber-950"
            >
              רענון הדף האישי
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hColor = profile?.house ? HOUSE_COLORS[profile.house] || "text-amber-400" : "text-amber-400";
  const trophyClass = hColor.split(" ")[0] || "text-amber-400";
  const dailyPoints = Math.min(profile?.daily_points_earned || 0, 50);
  const dailyProgress = `${dailyPoints}/50`;
  const dailyProgressPercent = Math.min(100, Math.round((dailyPoints / 50) * 100));
  const questLookup = new Map(computedQuests.map((quest) => [quest.id, quest]));
  const activeQuestsCount = computedQuests.filter((quest) => quest.status === "active").length;
  const completedQuestsCount = computedQuests.length - activeQuestsCount;
  const nextActionHint = nextActions[0]?.title || "בחר/י יעד מהלוח";
  const primaryAction = nextActions[0] ?? null;
  const secondaryActions = nextActions.slice(1);
  const primaryUrgency = primaryAction ? getUrgencyMeta(primaryAction.urgency) : null;
  const triviaJustCompleted = justCompletedQuestIds.includes("daily_spell_exam");
  const quickDailyTasksRemaining = [isAllowanceDone, isTriviaDone, isNifflerDone, isSnitchDone].filter(
    (done) => !done,
  ).length;
  const activeDailyQuests = computedQuests.filter((quest) => quest.metricWindow === "daily" && quest.status === "active");
  const activeLiveDailyQuests = activeDailyQuests.filter((quest) => !QUICK_DAILY_QUEST_IDS.has(quest.id));
  const remainingDailyTasks = activeDailyQuests.length;
  const allowanceQuest = questLookup.get("daily_allowance");
  const triviaQuest = questLookup.get("daily_spell_exam");
  const nifflerQuest = questLookup.get("daily_niffler_hunt");
  const snitchQuest = questLookup.get("daily_snitch_run");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] pb-20 text-[#f8fafc]" dir="rtl">
      {activeQuickQuest && (
        <QuickDailyQuestModal
          mode={activeQuickQuest}
          trivia={currentTrivia}
          onClose={() => setActiveQuickQuest(null)}
          onComplete={handleQuickQuestComplete}
        />
      )}

      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-[-10%] top-[-10%] h-[70vw] w-[70vw] animate-pulse rounded-full bg-indigo-900/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[60vw] w-[60vw] rounded-full bg-amber-900/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
      </div>

      <div className="pointer-events-none fixed inset-x-0 top-20 z-20 px-4">
        <div className="mx-auto max-w-6xl">
          <div className={`pointer-events-auto rounded-[1.75rem] border px-4 py-3 shadow-2xl backdrop-blur-xl transition-all duration-500 ${rewardPulse ? "border-amber-400/35 bg-black/70 shadow-[0_0_40px_rgba(251,191,36,0.16)]" : "border-white/10 bg-black/45"}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3 font-cinzel text-xs md:gap-5 md:text-sm">
                <span className="text-amber-300">✦ {profile?.galleons || 0} גליאונים</span>
                <span className="text-blue-300">יומי {dailyProgress}</span>
                <span className={hColor}>גביע {profile?.points_contributed || 0}</span>
                <span className="text-emerald-300">פעילות {activeQuestsCount}</span>
                <span className="truncate text-white/70">הצעד הבא: {nextActionHint}</span>
              </div>
              <div className="w-full lg:max-w-xs">
                <div className="mb-2 flex items-center justify-between font-cinzel text-[10px] uppercase tracking-[0.22em] text-white/45">
                  <span>מיצוי יומי</span>
                  <span>{dailyProgress}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${rewardPulse ? "bg-gradient-to-r from-amber-300 via-amber-400 to-emerald-300 shadow-[0_0_24px_rgba(251,191,36,0.35)]" : "bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400"}`}
                    style={{ width: `${dailyProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none fixed bottom-6 start-6 z-30 flex flex-col gap-2"
        aria-live="polite"
        aria-atomic="false"
        aria-label="עדכוני משימות חיים"
      >
        {liveToasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-atomic="true"
            className={`max-w-xs min-w-[220px] rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md transition-all duration-500 ${
              toast.tone === "success"
                ? "border-emerald-400/30 bg-emerald-500/10"
                : toast.tone === "info"
                  ? "border-blue-400/30 bg-blue-500/10"
                  : "border-amber-400/30 bg-amber-500/10"
            }`}
          >
            <p className="mb-1 font-cinzel text-xs font-black text-white">{toast.title}</p>
            <p className="text-[11px] text-white/70">{toast.subtitle}</p>
          </div>
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-10">
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link href="/dashboard" className="group flex items-center gap-2 text-sm font-bold font-cinzel text-white/40 transition-all hover:text-white">
            <ChevronRight size={20} className="transition-transform group-hover:translate-x-1" />
            חזרה לטירה
          </Link>
          <div className={`flex flex-wrap items-center justify-center gap-3 rounded-full border px-3 py-3 shadow-2xl backdrop-blur-xl transition-all duration-500 md:gap-6 md:px-6 ${rewardPulse ? "border-amber-400/30 bg-amber-500/10" : "border-white/10 bg-black/40"}`}>
            <div className="flex items-center gap-2"><Coins size={18} className="text-amber-500" /><span className="font-bold font-cinzel text-amber-400">{profile?.galleons || 0}</span></div>
            <div className="flex items-center gap-2"><Trophy size={18} className={trophyClass} /><span className={`font-bold font-cinzel ${hColor}`}>{profile?.points_contributed || 0}</span></div>
          </div>
        </div>

        <div className="relative mb-12 overflow-hidden rounded-[2.75rem] border border-amber-400/20 bg-[linear-gradient(135deg,rgba(15,23,42,0.86),rgba(41,25,8,0.72),rgba(4,10,24,0.9))] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.45)] md:p-8">
          <div className="pointer-events-none absolute inset-x-6 top-36 h-px bg-gradient-to-r from-transparent via-amber-300/25 to-transparent" />
          <div className="grid gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 font-cinzel text-[10px] font-black uppercase tracking-[0.24em] text-amber-100">
                  <Sparkles size={12} className="text-amber-300" />
                  Quest HUD
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-cinzel text-[10px] font-black uppercase tracking-[0.22em] text-white/50">
                  Browser RPG
                </span>
              </div>
              <h1 className="font-cinzel text-4xl font-black leading-tight text-white drop-shadow-2xl sm:text-6xl md:text-7xl">
                לוח <span className="text-amber-400 italic">המשימות</span>
              </h1>
              <p className="mt-4 max-w-3xl font-crimson text-xl leading-relaxed text-white/60 md:text-2xl">
                מסך הקווסטים של הטירה: פעולות קהילתיות, דו-קרבות, קריאה ותגובות הופכות להתקדמות חיה לבית שלך.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <HeroChip label="מד יומי" value={dailyProgress} tone="blue" pulse={rewardPulse} />
              <HeroChip label="משימות פעילות" value={`${activeQuestsCount}`} tone="rose" />
              <HeroChip label="גליאונים" value={`${profile?.galleons || 0}`} tone="amber" pulse={rewardPulse} />
              <HeroChip label="תרומת בית" value={`${profile?.points_contributed || 0}`} tone="emerald" />
            </div>
          </div>
        </div>

        {lastFeedback && (
          <section className={`mb-6 rounded-[1.75rem] border p-5 transition-all duration-500 ${rewardPulse ? "border-amber-400/35 bg-amber-500/10 shadow-[0_0_35px_rgba(251,191,36,0.16)]" : "border-amber-500/20 bg-amber-500/5"}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="mb-2 font-cinzel text-[11px] uppercase tracking-[0.2em] text-amber-300/80">עדכון אחרון</p>
                <h2 className="font-cinzel text-xl font-black text-white">{lastFeedback.completedQuests.length > 0 ? "משימה נסגרה והלוח זז קדימה" : "המאזן הקסום שלך עודכן"}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">{lastFeedback.houseImpact.message}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <HeroChip label="נקודות" value={`+${lastFeedback.reward.points}`} tone="blue" pulse={rewardPulse && lastFeedback.reward.points > 0} />
                <HeroChip label="גליאונים" value={`+${lastFeedback.reward.galleons}`} tone="amber" pulse={rewardPulse && lastFeedback.reward.galleons > 0} />
                <HeroChip label="הושלמו" value={`${lastFeedback.completedQuests.length}`} tone="emerald" pulse={lastFeedback.completedQuests.length > 0} />
              </div>
            </div>
          </section>
        )}

        <section className={`relative mb-10 overflow-hidden rounded-[2.25rem] border p-6 transition-all duration-700 md:p-8 ${rewardPulse ? "border-amber-400/35 bg-[#120f07]/90 shadow-[0_0_70px_rgba(251,191,36,0.18)]" : "border-white/10 bg-white/[0.04]"}`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.12),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.12),_transparent_30%)]" />
          <div className="relative grid gap-5 lg:grid-cols-[1.35fr_0.95fr]">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black font-cinzel uppercase tracking-[0.24em] text-amber-100"><Sparkles size={12} className="text-amber-300" />שגרת מסדרונות</span>
                {primaryUrgency && <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black font-cinzel uppercase tracking-[0.22em] ${primaryUrgency.className}`}><primaryUrgency.Icon size={12} />{primaryUrgency.label}</span>}
              </div>

              {primaryAction ? (
                <>
                  <div>
                    <p className="text-[11px] font-cinzel uppercase tracking-[0.25em] text-white/35">במוקד הטירה</p>
                    <h2 className="mt-2 max-w-3xl font-cinzel text-3xl font-black text-white md:text-4xl">{primaryAction.title}</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">{primaryAction.reason}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <HeroChip label="תגמול" value={primaryAction.gainLabel} tone="amber" pulse={rewardPulse} />
                    <HeroChip label="התקדמות" value={primaryAction.progressLabel} tone="blue" />
                    <HeroChip label="בית" value={primaryAction.houseImpactLabel} tone="emerald" />
                    <HeroChip label="במוקד הטירה" value={`${activeQuestsCount} פעילים`} tone="rose" pulse={remainingDailyTasks > 0} />
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Link href={primaryAction.href} className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 px-6 py-3 text-sm font-black font-cinzel uppercase tracking-[0.18em] text-[#1f1405] shadow-[0_12px_32px_rgba(251,191,36,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(251,191,36,0.34)]">
                      הצעד הבא שלך
                      <ChevronRight size={16} className="transition-transform group-hover:-translate-x-1" />
                    </Link>
                    <p className="text-sm text-white/55">{getPrimaryActionSupportCopy(remainingDailyTasks)}</p>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-[11px] font-cinzel uppercase tracking-[0.25em] text-white/35">במוקד הטירה</p>
                  <h2 className="font-cinzel text-3xl font-black text-white md:text-4xl">הלוח שקט לרגע</h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">אין כרגע מסלול דחוף במיוחד, אז זה זמן טוב לצאת למסדרונות, לפתוח תנועה חדשה, ולתת לקווסט הבא להופיע מתוך הפעילות שלך.</p>
                  <Link href="/map" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-6 py-3 text-sm font-black font-cinzel uppercase tracking-[0.18em] text-cyan-100 transition-all hover:border-cyan-300/40 hover:bg-cyan-500/15">לצאת לטירה<ChevronRight size={16} /></Link>
                </div>
              )}
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-cinzel text-[10px] uppercase tracking-[0.24em] text-white/35">הצעד הבא שלך</p>
                  <h3 className="mt-1 font-cinzel text-lg font-black text-white">מסלולים פתוחים</h3>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-cinzel uppercase tracking-[0.2em] text-white/45">{secondaryActions.length > 0 ? `${secondaryActions.length} פתוחים` : "פוקוס יחיד"}</span>
              </div>
              <div className="space-y-3">
                {secondaryActions.length > 0 ? secondaryActions.map((action) => {
                  const urgency = getUrgencyMeta(action.urgency);
                  return (
                    <Link key={action.id} href={action.href} className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="font-cinzel text-sm font-black text-white">{action.title}</p>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-black font-cinzel uppercase tracking-[0.18em] ${urgency.className}`}><urgency.Icon size={10} />{urgency.label}</span>
                      </div>
                      <p className="mb-3 text-xs leading-relaxed text-white/55">{action.reason}</p>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/70">{action.progressLabel}</span>
                        <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-amber-100">{action.gainLabel}</span>
                      </div>
                    </Link>
                  );
                }) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-center">
                    <p className="font-cinzel text-sm font-black text-white/70">כל הפוקוס נשאר על המסלול הראשי</p>
                    <p className="mt-2 text-xs leading-relaxed text-white/45">כרגע אין עוד מסלולים בולטים מסביב, אז שווה לסגור קודם את היעד העליון ואז לתת להמלצה הבאה להתעדכן מהדאטה החי.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <QuestCommunityPulse currentHouse={profile?.house} />

        {activeLiveDailyQuests.length > 0 && (
          <section className="mb-6">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-cinzel text-[11px] uppercase tracking-[0.24em] text-white/35">יעדים עם מעשה אמיתי</p>
                <h2 className="mt-1 font-cinzel text-2xl font-black text-white">יומיות חיות של הטירה</h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
                  אלה היעדים שבאמת מחיים את היום באתר: לפתוח אשכול, להגיב, או להיכנס לזירה. לא רק ללחוץ על כפתור ולקחת פרס.
                </p>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-cinzel uppercase tracking-[0.2em] text-emerald-100">
                {activeLiveDailyQuests.length} דורשות מעשה
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {activeLiveDailyQuests.slice(0, 4).map((quest) => {
                const meta = getLiveDailyQuestMeta(quest);
                const progressPercent = quest.target > 0 ? Math.min(100, Math.round((quest.progress / quest.target) * 100)) : 0;

                return (
                  <Link
                    key={quest.id}
                    href={meta.href}
                    className="group rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${meta.shellClass}`}>
                        <meta.Icon size={22} className={meta.iconClass} />
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-black font-cinzel uppercase tracking-[0.2em] ${meta.shellClass}`}>
                        {meta.eyebrow}
                      </span>
                    </div>
                    <h3 className="font-cinzel text-lg font-black text-white">{quest.title}</h3>
                    <p className="mt-2 min-h-[3.5rem] text-sm leading-relaxed text-white/60">{quest.description}</p>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-white/70">{quest.objectiveLabel}</span>
                        <span className="text-[11px] font-bold text-white/45">{quest.progress}/{quest.target}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-300 transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold">
                      <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-blue-100">+{quest.reward.points} נקודות</span>
                      <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-amber-100">+{quest.reward.galleons} גליאונים</span>
                    </div>
                    <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black font-cinzel uppercase tracking-[0.18em] text-white/80 transition-all group-hover:border-amber-300/30 group-hover:bg-amber-500/10 group-hover:text-amber-100">
                      {meta.cta}
                      <ChevronRight size={14} className="transition-transform group-hover:-translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {computedQuests.length > 0 && (
          <section className="mb-10 overflow-hidden rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] md:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-cinzel text-[11px] uppercase tracking-[0.25em] text-amber-200/55">Campaign Board</p>
                <h2 className="mt-1 font-cinzel text-2xl font-black text-white">מסעות פעילים בטירה</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
                  כל קלף הוא משימה חיה: פעולה אמיתית באתר מזיזה את המד, מדליקה תגמול, ומוסיפה נוכחות לבית שלך.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[10px] font-cinzel uppercase tracking-[0.22em] text-white/60">Active {activeQuestsCount}</span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-cinzel uppercase tracking-[0.22em] text-emerald-100">Cleared {completedQuestsCount}</span>
              </div>
            </div>

            <div className="grid gap-4">
              {computedQuests.map((quest) => {
                const visual = getQuestVisualState(quest, justCompletedQuestIds);
                const boardMeta = getQuestBoardMeta(quest);
                return (
                  <div key={quest.id} className={`group relative overflow-hidden rounded-[2.1rem] border p-4 transition-all duration-500 hover:-translate-y-1 md:p-5 ${visual.cardClass}`}>
                    <div className={`pointer-events-none absolute -left-12 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-100 ${boardMeta.glowClass} opacity-45`} />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:36px_36px] opacity-15" />
                    <div className="relative grid gap-4 lg:grid-cols-[92px_1fr_170px] lg:items-center">
                      <div className={`flex h-20 w-20 items-center justify-center rounded-[1.6rem] border shadow-[0_16px_42px_rgba(0,0,0,0.28)] ${boardMeta.frameClass}`}>
                        <boardMeta.Icon size={30} className={boardMeta.iconClass} />
                      </div>

                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black font-cinzel uppercase tracking-[0.2em] ${getQuestTypeClass(quest.type)}`}>{getQuestTypeLabel(quest.type)}</span>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black font-cinzel uppercase tracking-[0.2em] ${visual.statusClass}`}>{visual.statusLabel}</span>
                          <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 font-cinzel text-[10px] font-black uppercase tracking-[0.2em] text-white/35">{boardMeta.sigil}</span>
                        </div>
                        <h3 className="font-cinzel text-xl font-black text-white md:text-2xl">{quest.title}</h3>
                        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/60">{quest.description}</p>

                        <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/25 p-3">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-bold text-white/80">{quest.objectiveLabel}</p>
                            <span className={`text-[11px] font-bold ${visual.almostDone ? "text-amber-200" : visual.justCompleted ? "text-emerald-200" : "text-white/45"}`}>{visual.progressCopy}</span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-white/10 shadow-inner">
                            <div className={`h-full rounded-full transition-all duration-700 ${visual.barClass}`} style={{ width: `${visual.percent}%` }} />
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70">{quest.progress}/{quest.target}</span>
                          <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-amber-100">+{quest.reward.galleons} גליאונים</span>
                          <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-blue-100">+{quest.reward.points} נקודות</span>
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-emerald-100">{quest.houseImpactLabel}</span>
                        </div>
                      </div>

                      <div className={`rounded-[1.7rem] border px-4 py-4 text-center ${visual.meterClass}`}>
                        <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.24em] text-white/35">{boardMeta.realm}</p>
                        <p className="mt-2 font-cinzel text-4xl font-black text-white">{visual.percent}%</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/45">{quest.progress}/{quest.target}</p>
                        <Link
                          href={quest.actionHref || "/quests"}
                          className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black font-cinzel uppercase tracking-[0.16em] text-white/80 transition-all hover:border-amber-300/35 hover:bg-amber-500/10 hover:text-amber-100"
                        >
                          {quest.actionLabel || "לצאת למשימה"}
                          <ChevronRight size={13} className="transition-transform group-hover:-translate-x-1" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mb-6">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-cinzel text-[11px] uppercase tracking-[0.24em] text-white/35">בונוסים מהירים להיום</p>
              <h2 className="mt-1 font-cinzel text-2xl font-black text-white">מענקי הקסם היומיים</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
                {getQuickDailySectionCopy(quickDailyTasksRemaining)}
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-cinzel uppercase tracking-[0.2em] text-white/50">
              {quickDailyTasksRemaining > 0 ? `נשארו ${quickDailyTasksRemaining} מהירים` : "המהירים נסגרו"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <QuestCard
              title={allowanceQuest?.title || "קצבה ממשרד הקסמים"}
              desc={allowanceQuest?.description || "הינשוף הגיע עם דמי כיס קטנים להמשך הלימודים."}
              reward={formatQuestReward(allowanceQuest) || "5 גליאונים"}
              icon={<Coins className="text-amber-500" size={32} />}
              completed={isAllowanceDone}
              justCompleted={justCompletedQuestIds.includes("daily_allowance")}
              statusHint={isAllowanceDone ? "הקופה של היום כבר נאספה." : "הינשוף כבר מחכה. פתח/י את המעטפה והעבר/י את המטבעות לארנק."}
              onAction={() => openQuickQuest("allowance")}
              btnText={allowanceQuest?.actionLabel || "לפתוח מעטפה"}
              color="amber"
            />

            <div className={`relative flex flex-col rounded-[2.5rem] p-8 transition-all duration-500 glass-panel ${triviaJustCompleted ? "border border-emerald-300/40 bg-emerald-500/[0.08] shadow-[0_0_45px_rgba(74,222,128,0.2)]" : isTriviaDone ? "border border-white/10 bg-white/[0.03] opacity-70" : "border-t border-r border-white/10 hover:-translate-y-2 hover:border-blue-500/30 hover:shadow-[0_15px_50px_rgba(59,130,246,0.2)]"}`}>
              <div className="relative mb-6 flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10"><BookOpen className="text-blue-400" size={28} /></div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black font-cinzel uppercase tracking-tighter ${triviaJustCompleted ? "border-emerald-300/35 bg-emerald-500/10 text-emerald-100" : "border-blue-500/20 bg-blue-500/10 text-blue-400"}`}>{triviaJustCompleted ? "הושלם עכשיו" : formatQuestReward(triviaQuest) || "מבחן יומי"}</span>
              </div>
              <div className="relative mb-4">
                <h3 className="mb-3 font-cinzel text-xl font-bold text-white">{triviaQuest?.title || "מבחן הלחשים היומי"}</h3>
                <p className="text-sm leading-relaxed text-white/55">{isTriviaDone ? "היום כבר נבחנת. מחר יחכה לך אתגר חדש." : triviaQuest?.description || "המרצה מצפה לתשובה מדויקת אחת לפחות כדי לסגור את היעד היומי."}</p>
              </div>
              {isTriviaDone ? (
                <div className="relative mt-auto flex flex-1 flex-col justify-end">
                  <div className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl border py-4 text-center font-cinzel font-bold ${triviaJustCompleted ? "border-emerald-300/35 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/5 text-white/35"}`}>
                    <CheckCircle2 size={18} />
                    {triviaJustCompleted ? "הושלם עכשיו" : "הושלם להיום"}
                  </div>
                </div>
              ) : (
                <div className="mt-auto space-y-5">
                  <div className="rounded-[1.8rem] border border-blue-400/15 bg-blue-500/[0.06] p-5">
                    <p className="mb-3 font-cinzel text-[10px] font-black uppercase tracking-[0.24em] text-blue-200/55">השאלה של היום</p>
                    <p className="font-crimson text-lg leading-relaxed text-white/80 line-clamp-3">{currentTrivia?.q || "טוען שאלה..."}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-white/45">
                    {(currentTrivia?.options || []).slice(0, 4).map((opt: string) => (
                      <div key={opt} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center">
                        {opt}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => openQuickQuest("trivia")}
                    className="relative w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 py-4 text-lg font-black font-cinzel tracking-widest text-white shadow-lg transition-all hover:from-blue-500 hover:to-blue-700 active:scale-95"
                  >
                    להתחיל את המבחן
                  </button>
                </div>
              )}
            </div>

            <QuestCard
              title={nifflerQuest?.title || "מרדף הניפלר"}
              desc={nifflerQuest?.description || "ניפלר ברח עם שלל נוצץ. משימה מהירה עם בוסט מעולה."}
              reward={formatQuestReward(nifflerQuest) || "7 נקודות / גליאונים"}
              icon={<Search className="text-emerald-500" size={32} />}
              completed={isNifflerDone}
              justCompleted={justCompletedQuestIds.includes("daily_niffler_hunt")}
              statusHint={isNifflerDone ? "הניפלר של היום כבר נתפס." : "מסדרון קטן, שלל נוצץ, ושלוש תפיסות מהירות לפני שהוא בורח."}
              onAction={() => openQuickQuest("niffler")}
              btnText={nifflerLoading ? "מחפש..." : (nifflerQuest?.actionLabel || "להיכנס למרדף")}
              color="emerald"
            />

            <QuestCard
              title={snitchQuest?.title || "מרדף אחרי הסניץ'"}
              desc={snitchQuest?.description || "הסניץ' שוב בשטח. תפיסה מהירה דוחפת את הבית קדימה."}
              reward={formatQuestReward(snitchQuest) || "15 נקודות"}
              icon={<Zap className="text-violet-400" size={32} />}
              completed={isSnitchDone}
              justCompleted={justCompletedQuestIds.includes("daily_snitch_run")}
              statusHint={isSnitchDone ? "הסניץ' של היום כבר נתפס." : "הסניץ' לא נשאר במקום. צריך שתי תפיסות מדויקות כדי לסגור את האימון."}
              onAction={() => openQuickQuest("snitch")}
              btnText={snitchLoading ? "מזנק..." : (snitchQuest?.actionLabel || "להיכנס לאימון")}
              color="violet"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

type HeroChipProps = {
  label: string;
  value: string;
  tone: "amber" | "blue" | "emerald" | "rose";
  pulse?: boolean;
};

function HeroChip({ label, value, tone, pulse = false }: HeroChipProps) {
  const tones: Record<HeroChipProps["tone"], string> = {
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-100",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-100",
  };

  return (
    <div className={`rounded-2xl border px-3 py-2 transition-all duration-500 ${tones[tone]} ${pulse ? "scale-[1.02] shadow-[0_0_24px_rgba(251,191,36,0.14)]" : ""}`}>
      <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-1 text-sm font-bold leading-relaxed text-white">{value}</p>
    </div>
  );
}

type QuestCardProps = {
  title: string;
  desc: string;
  reward: string;
  icon: ReactNode;
  completed: boolean;
  justCompleted?: boolean;
  statusHint?: string;
  onAction: () => void | Promise<void>;
  btnText: string;
  color: "amber" | "emerald" | "violet";
};

function QuestCard({ title, desc, reward, icon, completed, justCompleted = false, statusHint, onAction, btnText, color }: QuestCardProps) {
  const colors: Record<QuestCardProps["color"], { border: string; iconBg: string; badge: string; btn: string; done: string }> = {
    amber: { border: "border-t border-r border-white/10 hover:-translate-y-2 hover:border-amber-500/50 hover:shadow-[0_15px_50px_rgba(245,158,11,0.2)]", iconBg: "bg-amber-500/10 border-amber-500/20", badge: "text-amber-400 bg-amber-500/10 border-amber-500/20", btn: "from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700", done: "border-amber-300/30 bg-amber-500/10 text-amber-100" },
    emerald: { border: "border-t border-r border-white/10 hover:-translate-y-2 hover:border-emerald-500/50 hover:shadow-[0_15px_50px_rgba(16,185,129,0.2)]", iconBg: "bg-emerald-500/10 border-emerald-500/20", badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", btn: "from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700", done: "border-emerald-300/30 bg-emerald-500/10 text-emerald-100" },
    violet: { border: "border-t border-r border-white/10 hover:-translate-y-2 hover:border-violet-500/50 hover:shadow-[0_15px_50px_rgba(139,92,246,0.2)]", iconBg: "bg-violet-500/10 border-violet-500/20", badge: "text-violet-400 bg-violet-500/10 border-violet-500/20", btn: "from-violet-600 to-violet-900 hover:from-violet-500 hover:to-violet-800", done: "border-violet-300/30 bg-violet-500/10 text-violet-100" },
  };

  const theme = colors[color] || colors.amber;

  return (
    <div className={`relative flex flex-col rounded-[2.5rem] p-8 transition-all duration-500 glass-panel ${justCompleted ? "border border-emerald-300/40 bg-emerald-500/[0.08] shadow-[0_0_45px_rgba(74,222,128,0.2)]" : completed ? "border border-white/10 bg-white/[0.03] opacity-70" : theme.border}`}>
      <div className="relative mb-6 flex items-start justify-between text-right">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${theme.iconBg}`}>{icon}</div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black font-cinzel uppercase tracking-tighter ${justCompleted ? "border-emerald-300/35 bg-emerald-500/10 text-emerald-100" : theme.badge}`}>{justCompleted ? "הושלם עכשיו" : reward}</span>
      </div>
<div className="relative mb-8 flex-1">
  <h3 className="mb-3 font-cinzel text-xl font-bold text-white">{title}</h3>
  <p className="font-crimson text-lg leading-relaxed text-white/60">{desc}</p>
  {statusHint && (
    <p
      className={`mt-4 text-sm leading-relaxed ${
        justCompleted
          ? "text-emerald-100/80"
          : completed
          ? "text-white/35"
          : "text-white/50"
      }`}
    >
      {statusHint}
    </p>
  )}
</div>

{completed || justCompleted ? (
  <div
    className={`relative mt-auto flex w-full items-center justify-center gap-2 rounded-xl border py-4 text-center font-cinzel font-bold ${
      justCompleted
        ? "border-emerald-300/35 bg-emerald-500/10 text-emerald-100"
        : theme.done
    }`}
  >
    <CheckCircle2 size={18} />
    {justCompleted ? "הושלם עכשיו" : "הושלם להיום"}
  </div>
) : (
  <button
    onClick={onAction}
    className={`relative mt-auto w-full rounded-xl bg-gradient-to-r py-4 text-lg font-black font-cinzel tracking-widest text-white shadow-lg transition-all active:scale-95 ${theme.btn}`}
  >
    {btnText}
  </button>
)}
    </div>
  );
}

