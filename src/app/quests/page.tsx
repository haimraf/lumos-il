"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
  ChevronRight, Coins, Trophy, Sparkles, BookOpen, CheckCircle2,
  XCircle, Hourglass, Flame, Search, Gift, Zap
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import { useAuth } from "@/context/AuthContext";
import { logActivityEvent } from "@/lib/activityEvents";
import { processUserAction } from "@/lib/gameplay/processUserAction";
import type { ProcessUserActionOutput, QuestUpdate } from "@/lib/gameplay/types";
import type { NextActionRecommendation } from "@/lib/gameplay/nextActionEngine";
import { computeQuestProgress, fetchQuestActivitySummary } from "@/lib/gameplay/questProgress";
import type { ComputedQuest } from "@/lib/gameplay/questProgress";
import { computeNextActions } from "@/lib/gameplay/nextActionEngine";


// --- מאגר שאלות טריוויה מורחב ---
const TRIVIA_POOL = [
  { q: "איזה לחש פותח דלתות נעולות?", a: "אלוהומורה", options: ["לומוס", "אלוהומורה", "אצ'יו", "רדוקטו"] },
  { q: "מהו הלחש שיוצר מגן מפני סוהרסנים?", a: "אקספקטו פטרונום", options: ["אבדה קדברה", "סטופפיי", "אקספקטו פטרונום", "פרוטגו"] },
  { q: "איך קוראים ללחש המפורק מנשק?", a: "אקספליארמוס", options: ["שתק", "אקספליארמוס", "אינסינדיו", "קונפונדו"] },
  { q: "איזה לחש מתקן חפצים שבורים?", a: "רפארו", options: ["רפארו", "דיפנדו", "טרנספורמציה", "אלוהומורה"] },
  { q: "מהו הלחש שיוצר אור בקצה השרביט?", a: "לומוס", options: ["נוקס", "לומוס", "וינגארדיום לביוסה", "פלגראטה"] },
  { q: "מה שמה של הינשופה של הארי פוטר?", a: "הדוויג", options: ["ארול", "פיגווידג'ן", "הדוויג", "קרוקשנקס"] },
  { q: "איזה שיקוי מאפשר לשנות צורה לאדם אחר?", a: "פולימיצי", options: ["פליקס פליציס", "פולימיצי", "ורטסרום", "אמורטנציה"] },
  { q: "מי היה האסיר מאזקבאן?", a: "סיריוס בלק", options: ["רמוס לופין", "פיטר פטיגרו", "סיריוס בלק", "בלטריקס לסטריינג'"] },
  { q: "מהו שמו האמיתי של לורד וולדמורט?", a: "טום רידל", options: ["סוורוס סנייפ", "טום רידל", "גרינדלוולד", "סלזאר סלית'רין"] },
  { q: "כמה הורקרוקסים יצר וולדמורט (כולל הארי)?", a: "7", options: ["5", "6", "7", "8"] }
];

const HOUSE_COLORS: Record<string, string> = {
  Gryffindor: 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]',
  Slytherin: 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]',
  Ravenclaw: 'text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]',
  Hufflepuff: 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]',
};

export default function QuestsPage() {
  const [supabase] = useState(() => createClient());
  const { sendOwl } = useOwlMail();
  const { profile, refreshProfile, isLoading: authLoading, session, profileError } = useAuth();

  type TriviaQuestion = typeof TRIVIA_POOL[number];
  const [currentTrivia] = useState<TriviaQuestion | null>(() => {
    const day = new Date().getDate();
    return TRIVIA_POOL[day % TRIVIA_POOL.length] ?? null;
  });
  const [nifflerLoading, setNifflerLoading] = useState(false);
  const [snitchLoading, setSnitchLoading] = useState(false);
  const [dailyStatus, setDailyStatus] = useState({ allowance: false, trivia: false, niffler: false, snitch: false });
  const [computedQuests, setComputedQuests] = useState<ComputedQuest[]>([]);
  const [nextActions, setNextActions] = useState<NextActionRecommendation[]>([]);
  const [lastFeedback, setLastFeedback] = useState<ProcessUserActionOutput | null>(null);
  const [liveToasts, setLiveToasts] = useState<Array<{ id: string; title: string; subtitle: string; tone: "success" | "info" | "magic" }>>([]);
  const toastCounterRef = useRef(0);
  const recentLocalEventsRef = useRef<Record<string, number>>({});
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dateObj = new Date();
  const today = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

  const isAllowanceDone = dailyStatus.allowance || profile?.last_reward_date === today;
  const isTriviaDone = dailyStatus.trivia || profile?.last_trivia_date === today;
  const isNifflerDone = dailyStatus.niffler || profile?.last_niffler_date === today;
  const isSnitchDone = dailyStatus.snitch || profile?.last_snitch_date === today;

  useEffect(() => {
    const refreshComputedState = async () => {
      if (!profile?.id) {
        setComputedQuests([]);
        setNextActions([]);
        return;
      }

      const activity = await fetchQuestActivitySummary(supabase, profile.id);
      const questProgress = computeQuestProgress(profile, activity);
      setComputedQuests(questProgress.quests);
      setNextActions(computeNextActions({
        profile: {
          daily_points_earned: profile.daily_points_earned,
          house: profile.house,
        },
        questProgress,
      }));
    };

    void refreshComputedState();
  }, [
    supabase,
    profile,
    profile?.id,
    profile?.last_reward_date,
    profile?.last_trivia_date,
    profile?.last_niffler_date,
    profile?.last_snitch_date,
    profile?.points_contributed,
    profile?.daily_points_earned,
  ]);

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

  const pushLiveToast = useCallback((title: string, subtitle: string, tone: "success" | "info" | "magic" = "magic") => {
    toastCounterRef.current += 1;
    const id = `toast-${toastCounterRef.current}`;
    setLiveToasts((prev) => [...prev.slice(-2), { id, title, subtitle, tone }]);
    window.setTimeout(() => {
      setLiveToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3600);
  }, []);

  const dispatchGameplayFeedback = useCallback((feedback: ProcessUserActionOutput) => {
    const rewardParts: string[] = [];
    if (feedback.reward.points > 0) rewardParts.push(`+${feedback.reward.points} נק׳`);
    if (feedback.reward.galleons > 0) rewardParts.push(`+${feedback.reward.galleons} גליאונים`);
    const rewardLabel = rewardParts.length > 0 ? rewardParts.join(" • ") : "ללא תגמול ישיר";

    sendOwl("תגמול עודכן", rewardLabel, "magic");
    pushLiveToast("תגמול התקבל", rewardLabel, "magic");

    if (feedback.houseImpact.pointsDelta > 0 || feedback.houseImpact.message) {
      sendOwl("השפעה על הבית", feedback.houseImpact.message, "success");
      pushLiveToast("השפעת בית", feedback.houseImpact.message, "success");
    }

    if (feedback.completedQuests.length > 0) {
      const names = feedback.completedQuests.map((quest) => quest.title).join(" • ");
      sendOwl("משימה הושלמה! 🏆", names, "success");
      pushLiveToast("משימה הושלמה", names, "success");
    }
  }, [sendOwl, pushLiveToast]);

  const markLocalEvent = useCallback((eventType: string) => {
    recentLocalEventsRef.current[eventType] = Date.now();
  }, []);

  const isDuplicateRealtimeEvent = useCallback((eventType: string) => {
    const ts = recentLocalEventsRef.current[eventType];
    if (!ts) return false;
    return Date.now() - ts < 5000;
  }, []);

  const scheduleProfileRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) return;
    refreshTimeoutRef.current = setTimeout(() => {
      refreshTimeoutRef.current = null;
      void refreshProfile();
    }, 800);
  }, [refreshProfile]);

  const fetchEconomySnapshot = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("points_contributed, galleons")
      .eq("id", userId)
      .single();
    return {
      points: data?.points_contributed || 0,
      galleons: data?.galleons || 0,
    };
  }, [supabase]);

  const applyActualRewardDeltas = useCallback((
    feedback: ProcessUserActionOutput,
    before: { points: number; galleons: number },
    after: { points: number; galleons: number },
  ): ProcessUserActionOutput => {
    const awardedPoints = Math.max(0, after.points - before.points);
    const awardedGalleons = Math.max(0, after.galleons - before.galleons);
    const capLimited = awardedPoints < feedback.reward.points;
    return {
      ...feedback,
      reward: {
        points: awardedPoints,
        galleons: awardedGalleons,
      },
      houseImpact: {
        pointsDelta: awardedPoints,
        message: capLimited
          ? "התקרה היומית הגבילה את כמות הנקודות שנוספה בפועל."
          : feedback.houseImpact.message,
      },
    };
  }, []);

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
          const feedback = processUserAction({
            actionType: "activity_event",
            source: "event",
            rawResult: { points_awarded: estimateEventPoints(eventType), event_type: eventType },
            houseImpact: {
              pointsDelta: estimateEventPoints(eventType),
              message: eventType.startsWith("arena_duel") || eventType === "duel_tied"
                ? "הקרב בזירה השפיע על מומנטום הבית."
                : "הפעילות שלך בטירה חיזקה את השפעת הבית.",
            },
          });
          setLastFeedback(feedback);
          dispatchGameplayFeedback(feedback);
          scheduleProfileRefresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [profile?.id, supabase, scheduleProfileRefresh, isDuplicateRealtimeEvent, estimateEventPoints, dispatchGameplayFeedback]);

  const handleDailyCollect = async () => {
    if (isAllowanceDone || !profile) return;
    const before = await fetchEconomySnapshot(profile.id);
    setDailyStatus(s => ({ ...s, allowance: true }));
    const { data, error } = await supabase.rpc('claim_daily_allowance', { p_user_id: profile.id });
    if (error) {
      setDailyStatus(s => ({ ...s, allowance: false }));
      sendOwl("הלחש נכשל", `הקצבה לא נאספה: ${error.message}`, "error");
      return;
    }
    if (data?.success) {
      const questUpdates: QuestUpdate[] = [{
        questId: "daily_allowance",
        title: "דמי הכיס של משרד הקסמים",
        progressBefore: 0,
        progressAfter: 1,
        target: 1,
        status: "completed",
      }];
      const feedback = processUserAction({
        actionType: "daily_allowance",
        source: "rpc",
        rawResult: data,
        houseImpact: { pointsDelta: 0, message: "דמי הכיס מוכנים להמשך המסע היומי." },
        questUpdates,
      });
      markLocalEvent("quest_reward_claimed");
      logActivityEvent(supabase, {
        actorId: profile.id,
        actorName: profile.full_name,
        eventType: "quest_reward_claimed",
        title: "קצבה יומית",
        subtitle: "קיבל/ה 5 גליאונים מהקצבה היומית",
        icon: "💰"
      });
      await refreshProfile();
      const after = await fetchEconomySnapshot(profile.id);
      const adjustedFeedback = applyActualRewardDeltas(feedback, before, after);
      setLastFeedback(adjustedFeedback);
      dispatchGameplayFeedback(adjustedFeedback);

    } else {
      sendOwl("כבר אספת היום", "הקצבה תתחדש מחר בשחר.", "info");
      await refreshProfile();
    }
  };

  const handleTriviaAnswer = async (selected: string) => {
    if (isTriviaDone || !profile || !currentTrivia) return;
    const before = await fetchEconomySnapshot(profile.id);
    const isCorrect = selected === currentTrivia.a;
    setDailyStatus(s => ({ ...s, trivia: true }));
    const { data, error } = await supabase.rpc('claim_trivia_reward', { p_user_id: profile.id, p_is_correct: isCorrect });
    if (error) {
      setDailyStatus(s => ({ ...s, trivia: false }));
      sendOwl("הלחש נכשל", `מבחן הלחשים התפרק: ${error.message}`, "error");
      return;
    }
    if (data?.success) {
      const feedback = processUserAction({
        actionType: "daily_trivia",
        source: "rpc",
        rawResult: data,
        questUpdates: isCorrect ? [{
          questId: "daily_spell_exam",
          title: "מבחן הלחשים היומי",
          progressBefore: 0,
          progressAfter: 1,
          target: 1,
          status: "completed",
        }] : [],
      });
      if (!isCorrect) {
        sendOwl("הלחש נכשל", `התשובה הנכונה הייתה: ${currentTrivia.a}`, "error");
      }
      if (isCorrect && profile) {
        markLocalEvent("quest_trivia_completed");
        logActivityEvent(supabase, {
          actorId: profile.id,
          actorName: profile.full_name,
          eventType: "quest_trivia_completed",
          title: "מבחן לחשים",
          subtitle: "ענה/תה נכונה על מבחן הלחשים היומי",
          icon: "📜"
        });
      }
      await refreshProfile();
      const after = await fetchEconomySnapshot(profile.id);
      const adjustedFeedback = applyActualRewardDeltas(feedback, before, after);
      setLastFeedback(adjustedFeedback);
      dispatchGameplayFeedback(adjustedFeedback);
    } else {
      sendOwl("כבר ענית היום", "מבחן הלחשים יחזור מחר בשחר.", "info");
      await refreshProfile();
    }
  };

  const handleNifflerHunt = async () => {
    if (isNifflerDone || nifflerLoading || !profile) return;
    const before = await fetchEconomySnapshot(profile.id);
    setNifflerLoading(true);
    setDailyStatus(s => ({ ...s, niffler: true }));
    const { data, error } = await supabase.rpc('claim_niffler_reward', { p_user_id: profile.id });
    if (error) {
      setDailyStatus(s => ({ ...s, niffler: false }));
      sendOwl("הניפלר ברח", `הציד נכשל: ${error.message}`, "error");
      setNifflerLoading(false);
      return;
    }
    if (data?.success) {
      const feedback = processUserAction({
        actionType: "daily_niffler",
        source: "rpc",
        rawResult: data,
        questUpdates: [{
          questId: "daily_niffler_hunt",
          title: "מרדף הניפלר",
          progressBefore: 0,
          progressAfter: 1,
          target: 1,
          status: "completed",
        }],
      });
      const typeHe = data.type === "galleons" ? "גליאונים" : "נקודות קסם";
      markLocalEvent("quest_niffler_found");
      logActivityEvent(supabase, {
        actorId: profile.id,
        actorName: profile.full_name,
        eventType: "quest_niffler_found",
        title: "ציד הניפלר",
        subtitle: `תפס/ה את הניפלר וקיבל/ה ${data.amount} ${typeHe}`,
        icon: "🐾"
      });
      await refreshProfile();
      const after = await fetchEconomySnapshot(profile.id);
      const adjustedFeedback = applyActualRewardDeltas(feedback, before, after);
      setLastFeedback(adjustedFeedback);
      dispatchGameplayFeedback(adjustedFeedback);

    } else {
      sendOwl("הניפלר ברח", "הוא כבר תפוס להיום. יחזור מחר בשחר.", "info");
      await refreshProfile();
    }
    setNifflerLoading(false);
  };

  const handleSnitchCatch = async () => {
    if (isSnitchDone || snitchLoading || !profile) return;
    const before = await fetchEconomySnapshot(profile.id);
    setSnitchLoading(true);
    setDailyStatus(s => ({ ...s, snitch: true }));
    const { data, error } = await supabase.rpc('claim_snitch_reward', { p_user_id: profile.id });
    if (error) {
      setDailyStatus(s => ({ ...s, snitch: false }));
      sendOwl("הסניץ' ברח", `לא הצלחת לתפוס: ${error.message}`, "error");
      setSnitchLoading(false);
      return;
    }
    if (data?.success) {
      const feedback = processUserAction({
        actionType: "daily_snitch",
        source: "rpc",
        rawResult: data,
        questUpdates: [{
          questId: "daily_snitch_run",
          title: "מרדף אחרי הסניץ'",
          progressBefore: 0,
          progressAfter: 1,
          target: 1,
          status: "completed",
        }],
      });
      markLocalEvent("quest_snitch_caught");
      logActivityEvent(supabase, {
        actorId: profile.id,
        actorName: profile.full_name,
        eventType: "quest_snitch_caught",
        title: "אימון קווידיץ'",
        subtitle: "תפס/ה את הסניץ' הזהוב",
        icon: "⚡"
      });
      await refreshProfile();
      const after = await fetchEconomySnapshot(profile.id);
      const adjustedFeedback = applyActualRewardDeltas(feedback, before, after);
      setLastFeedback(adjustedFeedback);
      dispatchGameplayFeedback(adjustedFeedback);

    } else {
      sendOwl("הסניץ' מתחבא", "כבר תפסת אותו היום. יחזור מחר לאחר שקיעה.", "info");
      await refreshProfile();
    }
    setSnitchLoading(false);
  };

  if (authLoading) return <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4"><div className="w-12 h-12 border-t-2 border-amber-500 rounded-full animate-spin"></div><p className="font-cinzel text-amber-500 tracking-widest animate-pulse">רוקח שיקוי...</p></div>;
  
  if (session && !profile) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center px-6" dir="rtl">
        <div className="max-w-md w-full rounded-[2rem] border border-amber-500/20 bg-black/30 p-8 text-center space-y-5 shadow-[0_0_40px_rgba(245,158,11,0.08)]">
          <Gift className="mx-auto text-amber-500" size={42} />
          <div>
            <h1 className="font-cinzel text-2xl font-black text-white mb-2">החיבור הצליח, אבל הפרופיל עוד לא נטען</h1>
            <p className="font-crimson text-white/55 leading-relaxed">
              {profileError || "אפשר לנסות לרענן את הפרופיל בלי לנתק את החשבון."}
            </p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => refreshProfile()}
              className="px-5 py-3 rounded-xl bg-amber-500 text-amber-950 font-cinzel font-black text-sm tracking-widest uppercase"
            >
              רענון פרופיל
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hColor = (profile?.house && HOUSE_COLORS[profile.house]) ? HOUSE_COLORS[profile.house] : 'text-amber-400';
  const trophyClass = hColor.split(' ')[0] || 'text-amber-400';
  const dailyProgress = `${Math.min(profile?.daily_points_earned || 0, 50)}/50`;
  const activeQuestsCount = computedQuests.filter((quest) => quest.status === "active").length;
  const nextActionHint = nextActions[0]?.title || "בחר/י משימה מהלוח";

  return (
    <main className="min-h-screen bg-[#020617] text-[#f8fafc] relative overflow-hidden pb-20" dir="rtl">
      {/* רקע */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-indigo-900/5 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-amber-900/5 blur-[120px]"></div>
      </div>

      <div className="fixed top-20 inset-x-0 z-20 px-4 pointer-events-none">
        <div className="mx-auto max-w-6xl">
          <div className="pointer-events-auto rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl px-4 py-3 shadow-2xl">
            <div className="flex flex-wrap items-center gap-3 md:gap-5 text-xs md:text-sm font-cinzel">
              <span className="text-amber-300">🪙 {profile?.galleons || 0} גליאונים</span>
              <span className="text-blue-300">📈 יומי {dailyProgress}</span>
              <span className={`${hColor}`}>🏆 תרומה {profile?.points_contributed || 0}</span>
              <span className="text-emerald-300">📜 משימות פעילות {activeQuestsCount}</span>
              <span className="text-white/70 truncate">✨ צעד הבא: {nextActionHint}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 start-6 z-30 flex flex-col gap-2 pointer-events-none">
        {liveToasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-[220px] max-w-xs rounded-xl border px-4 py-3 shadow-xl backdrop-blur-md ${
              toast.tone === "success"
                ? "bg-emerald-500/10 border-emerald-400/30"
                : toast.tone === "info"
                  ? "bg-blue-500/10 border-blue-400/30"
                  : "bg-amber-500/10 border-amber-400/30"
            }`}
          >
            <p className="font-cinzel text-xs font-black text-white mb-1">{toast.title}</p>
            <p className="text-[11px] text-white/70">{toast.subtitle}</p>
          </div>
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-10">
        {/* כותרת עליונה */}
        <div className="flex justify-between items-center mb-12">
          <Link href="/dashboard" className="group flex items-center gap-2 text-white/40 hover:text-white transition-all font-cinzel text-sm font-bold">
            <ChevronRight size={20} className="group-hover:translate-x-1" /> חזרה לטירה
          </Link>

          <div className="flex items-center gap-3 md:gap-6 bg-black/40 backdrop-blur-xl border border-white/10 px-3 md:px-6 py-3 rounded-full shadow-2xl flex-wrap justify-center">
            <div className="flex items-center gap-2"><Coins size={18} className="text-amber-500" /><span className="text-amber-400 font-bold font-cinzel">{profile?.galleons || 0}</span></div>
            <div className="flex items-center gap-2"><Trophy size={18} className={trophyClass} /><span className={`font-bold font-cinzel ${hColor}`}>{profile?.points_contributed || 0}</span></div>
          </div>
        </div>

        <div className="text-center mb-20">
          <h1 className="font-cinzel text-4xl sm:text-6xl md:text-8xl font-black text-white mb-4 drop-shadow-2xl">לוח <span className="text-amber-500 italic">המשימות</span></h1>
          <p className="font-crimson text-2xl text-white/40 italic uppercase tracking-widest">עבודה קשה היא הדרך היחידה לתהילה</p>
        </div>

        {lastFeedback && (
          <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="font-cinzel text-[11px] tracking-[0.2em] uppercase text-amber-300/80 mb-2">עדכון אחרון</p>
            <div className="flex flex-wrap gap-3 text-sm font-bold">
              <span className="text-amber-400">+{lastFeedback.reward.galleons} גליאונים</span>
              <span className="text-blue-300">+{lastFeedback.reward.points} נק׳</span>
              <span className="text-white/70">{lastFeedback.houseImpact.message}</span>
            </div>
          </div>
        )}

        {nextActions.length > 0 && (
          <section className="mb-8">
            <h2 className="font-cinzel text-xl md:text-2xl text-white mb-4">מה לעשות עכשיו?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {nextActions.map((action) => (
                <Link key={action.id} href={action.href} className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-amber-500/30 transition-all">
                  <p className="font-cinzel text-sm font-black text-amber-300 mb-1">{action.title}</p>
                  <p className="text-xs text-white/55 mb-2">{action.reason}</p>
                  <p className="text-[11px] text-white/70">{action.gainLabel}</p>
                  <p className="text-[11px] text-emerald-300/80 mt-1">{action.houseImpactLabel}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {computedQuests.length > 0 && (
          <section className="mb-10 rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
            <h2 className="font-cinzel text-xl md:text-2xl text-white mb-4">Quest Board V2</h2>
            <div className="space-y-3">
              {computedQuests.map((quest) => {
                const percent = quest.target > 0 ? Math.min(100, Math.round((quest.progress / quest.target) * 100)) : 0;
                return (
                  <div key={quest.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="font-cinzel font-black text-white text-sm">{quest.title}</p>
                      <span className={`text-[10px] font-cinzel font-black uppercase tracking-widest ${quest.status === "completed" ? "text-emerald-400" : "text-white/40"}`}>
                        {quest.status === "completed" ? "הושלם" : "פעיל"}
                      </span>
                    </div>
                    <p className="text-sm text-white/55 mb-2">{quest.objectiveLabel}</p>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px] font-bold">
                      <span className="text-white/70">{quest.progress}/{quest.target}</span>
                      <span className="text-amber-300">+{quest.reward.galleons} גליאונים</span>
                      <span className="text-blue-300">+{quest.reward.points} נק׳</span>
                      <span className="text-emerald-300/80">{quest.houseImpactLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          <QuestCard
            title="קצבה יומית"
            desc="משרד הקסמים מאשר דמי כיס."
            reward="5 גליאונים"
            icon={<Coins className="text-amber-500" size={32} />}
            completed={isAllowanceDone}
            onAction={handleDailyCollect}
            btnText="אסוף קצבה"
            color="amber"
          />

          {/* מבחן לחשים - עדכון ל-3 נקודות */}
          <div className={`relative group glass-panel rounded-[2.5rem] p-8 transition-all duration-500 flex flex-col ${isTriviaDone ? 'opacity-60 border-white/5' : 'hover:border-blue-500/30 hover:shadow-[0_15px_50px_rgba(59,130,246,0.2)] hover:-translate-y-2 border-t border-r border-white/10'}`}>
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20"><BookOpen className="text-blue-400" size={28} /></div>
              <span className="text-[10px] font-black font-cinzel text-blue-400 uppercase tracking-tighter bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">3 נקודות</span>
            </div>

            <h3 className="font-cinzel text-xl font-bold mb-3">מבחן לחשים</h3>

            {isTriviaDone ? (
              <div className="flex-1 flex flex-col justify-end">
                <p className="font-crimson text-lg text-white/40 mb-6 italic">ענית על המבחן היומי</p>
                <div className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white/30 font-cinzel font-bold text-center flex items-center justify-center gap-2">
                  <CheckCircle2 size={18} /> הושלם להיום
                </div>
              </div>
            ) : (
              <>
                <p className="font-crimson text-lg text-white/70 mb-6 h-16 line-clamp-2">{currentTrivia?.q || "טוען שאלה..."}</p>
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  {currentTrivia?.options?.map((opt: string) => (
                    <button
                      key={opt}
                      onClick={() => handleTriviaAnswer(opt)}
                      className="py-2 rounded-xl border text-xs font-bold transition-all border-white/10 hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-200"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <QuestCard
            title="ציד הניפלר"
            desc="ניפלר חצוף גנב אוצרות! עזור למצוא אותו."
            reward="7 נקודות / גליאונים"
            icon={<Search className="text-emerald-500" size={32} />}
            completed={isNifflerDone}
            onAction={handleNifflerHunt}
            btnText={nifflerLoading ? "מחפש..." : "צא לציד"}
            color="emerald"
          />

          <QuestCard
            title="אימון קווידיץ'"
            desc="הסניץ' מתעופף במגרש! נסה לתפוס אותו."
            reward="5 נקודות"
            icon={<Zap className="text-violet-400" size={32} />}
            completed={isSnitchDone}
            onAction={handleSnitchCatch}
            btnText={snitchLoading ? "מזנק..." : "תפוס סניץ'"}
            color="violet"
          />

        </div>
      </div>
    </main>
  );
}

type QuestCardProps = {
  title: string;
  desc: string;
  reward: string;
  icon: ReactNode;
  completed: boolean;
  onAction: () => void | Promise<void>;
  btnText: string;
  color: "amber" | "emerald" | "violet";
};

function QuestCard({ title, desc, reward, icon, completed, onAction, btnText, color }: QuestCardProps) {
  const colors: Record<QuestCardProps["color"], { border: string; iconBg: string; badge: string; btn: string }> = {
    amber: { border: 'hover:border-amber-500/50 hover:shadow-[0_15px_50px_rgba(245,158,11,0.2)] hover:-translate-y-2 border-t border-r border-white/10', iconBg: 'bg-amber-500/10 border-amber-500/20', badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20', btn: 'from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700' },
    emerald: { border: 'hover:border-emerald-500/50 hover:shadow-[0_15px_50px_rgba(16,185,129,0.2)] hover:-translate-y-2 border-t border-r border-white/10', iconBg: 'bg-emerald-500/10 border-emerald-500/20', badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', btn: 'from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700' },
    violet: { border: 'hover:border-violet-500/50 hover:shadow-[0_15px_50px_rgba(139,92,246,0.2)] hover:-translate-y-2 border-t border-r border-white/10', iconBg: 'bg-violet-500/10 border-violet-500/20', badge: 'text-violet-400 bg-violet-500/10 border-violet-500/20', btn: 'from-violet-600 to-violet-900 hover:from-violet-500 hover:to-violet-800' }
  };
  const theme = colors[color] || colors.amber;
  return (
    <div className={`relative group glass-panel rounded-[2.5rem] p-8 transition-all duration-500 flex flex-col ${completed ? 'opacity-60 border-white/5' : theme.border}`}>
      <div className="flex justify-between items-start mb-6 text-right">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${theme.iconBg}`}>{icon}</div>
        <span className={`text-[10px] font-black font-cinzel uppercase tracking-tighter px-3 py-1 rounded-full border ${theme.badge}`}>{reward}</span>
      </div>
      <div className="flex-1 mb-8">
        <h3 className="font-cinzel text-xl font-bold text-white mb-3">{title}</h3>
        <p className="font-crimson text-lg text-white/60 leading-relaxed">{desc}</p>
      </div>
      {completed ? (
        <div className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white/30 font-cinzel font-bold text-center flex items-center justify-center gap-2 mt-auto">
          <CheckCircle2 size={18} /> הושלם להיום
        </div>
      ) : (
        <button
          onClick={onAction}
          className={`mt-auto w-full py-4 rounded-xl bg-gradient-to-r ${theme.btn} text-white font-cinzel font-black text-lg tracking-widest shadow-lg transition-all active:scale-95`}
        >
          {btnText}
        </button>
      )}
    </div>
  );
}
