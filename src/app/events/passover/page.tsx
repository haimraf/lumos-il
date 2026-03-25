"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  Clock3,
  Flame,
  Gift,
  House,
  ScrollText,
  Sparkles,
  Swords,
  Trophy,
  BookOpen,
  Newspaper,
  Star,
  Wand2,
  Tent,
  Coffee,
  Search,
  Shirt,
  Crown,
  Feather,
  HelpCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import {
  compareLiveEventParticipants,
  fetchLiveEventBySlug,
  fetchLiveEventSettings,
  getDefaultLiveEventSettings,
  getLiveEventEnd,
  getLiveEventLabel,
  getLiveEventPhase,
  getLiveEventStart,
  getProfileLiveEventPoints,
  type LiveEventSettings,
} from "@/lib/liveEvent";

type LiveEventExperienceProps = {
  initialEventConfig?: LiveEventSettings | null;
};

type EventProfile = {
  id?: string;
  full_name?: string | null;
  house?: string | null;
  created_at?: string | null;
  event_points?: number | null;
  passover_points?: number | null;
};

type EventMission = {
  title?: string;
  description?: string;
  href?: string;
  icon?: string;
  color?: string;
  points?: number;
};

type AccentTone = {
  bg: string;
  border: string;
  glow: string;
  text: string;
};

const ICON_MAP: Record<string, LucideIcon> = {
  ScrollText,
  Sparkles,
  Feather,
  Shirt,
  Search,
  Swords,
  Crown,
  Gift,
  House,
  Flame,
  Trophy,
  Newspaper,
  BookOpen,
};

const ACCENT_TONES: Record<string, AccentTone> = {
  amber: {
    bg: "linear-gradient(135deg, rgba(245,158,11,0.22), rgba(120,53,15,0.35))",
    border: "rgba(245,158,11,0.28)",
    glow: "rgba(245,158,11,0.18)",
    text: "#fbbf24",
  },
  pink: {
    bg: "linear-gradient(135deg, rgba(236,72,153,0.22), rgba(131,24,67,0.35))",
    border: "rgba(236,72,153,0.28)",
    glow: "rgba(236,72,153,0.18)",
    text: "#f9a8d4",
  },
  rose: {
    bg: "linear-gradient(135deg, rgba(244,63,94,0.22), rgba(136,19,55,0.35))",
    border: "rgba(244,63,94,0.28)",
    glow: "rgba(244,63,94,0.18)",
    text: "#fda4af",
  },
  emerald: {
    bg: "linear-gradient(135deg, rgba(16,185,129,0.22), rgba(6,78,59,0.35))",
    border: "rgba(16,185,129,0.28)",
    glow: "rgba(16,185,129,0.18)",
    text: "#6ee7b7",
  },
  blue: {
    bg: "linear-gradient(135deg, rgba(59,130,246,0.22), rgba(30,64,175,0.35))",
    border: "rgba(59,130,246,0.28)",
    glow: "rgba(59,130,246,0.18)",
    text: "#93c5fd",
  },
  sky: {
    bg: "linear-gradient(135deg, rgba(14,165,233,0.22), rgba(12,74,110,0.35))",
    border: "rgba(14,165,233,0.28)",
    glow: "rgba(14,165,233,0.18)",
    text: "#7dd3fc",
  },
  violet: {
    bg: "linear-gradient(135deg, rgba(139,92,246,0.22), rgba(76,29,149,0.35))",
    border: "rgba(139,92,246,0.28)",
    glow: "rgba(139,92,246,0.18)",
    text: "#c4b5fd",
  },
  red: {
    bg: "linear-gradient(135deg, rgba(239,68,68,0.22), rgba(127,29,29,0.35))",
    border: "rgba(239,68,68,0.28)",
    glow: "rgba(239,68,68,0.18)",
    text: "#fca5a5",
  },
};

const DEFAULT_END = "2026-04-15T23:59:59Z";
const EVENT_LEADERBOARD_COPY = {
  title: "\u05D8\u05D1\u05DC\u05EA \u05D4\u05DE\u05D5\u05D1\u05D9\u05DC\u05D9\u05DD \u05E2\u05DB\u05E9\u05D9\u05D5",
  explainer: "\u05D6\u05D0\u05EA \u05D0\u05D5\u05EA\u05D4 \u05D4\u05D8\u05D1\u05DC\u05D4 \u05E9\u05DC\u05E4\u05D9\u05D4 \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05DE\u05D6\u05D4\u05D4 \u05D0\u05EA \u05DE\u05E7\u05D5\u05DD 1, 2, 3 \u05D5\u05D4\u05DC\u05D0\u05D4 \u05D1\u05D6\u05DE\u05DF \u05D7\u05DC\u05D5\u05E7\u05EA \u05D4\u05E4\u05E8\u05E1\u05D9\u05DD.",
  participants: "\u05DE\u05E9\u05EA\u05EA\u05E4\u05D9\u05DD \u05E2\u05DD \u05E0\u05D9\u05E7\u05D5\u05D3",
  upcomingEmpty: "\u05D4\u05D8\u05D1\u05DC\u05D4 \u05EA\u05EA\u05DE\u05DC\u05D0 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05D1\u05E8\u05D2\u05E2 \u05E9\u05D4\u05D0\u05D9\u05D5\u05D5\u05E0\u05D8 \u05D9\u05D9\u05E4\u05EA\u05D7 \u05D5\u05D9\u05EA\u05D7\u05D9\u05DC\u05D5 \u05DC\u05D4\u05D9\u05E6\u05D1\u05E8 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA.",
  liveEmpty: "\u05E2\u05D3\u05D9\u05D9\u05DF \u05D0\u05D9\u05DF \u05E9\u05D7\u05E7\u05E0\u05D9\u05DD \u05E2\u05DD \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D0\u05D9\u05D5\u05D5\u05E0\u05D8. \u05D1\u05E8\u05D2\u05E2 \u05E9\u05D4\u05E7\u05E1\u05DD \u05D9\u05D6\u05D5\u05D6, \u05D4\u05E9\u05DE\u05D5\u05EA \u05D9\u05D5\u05E4\u05D9\u05E2\u05D5 \u05DB\u05D0\u05DF.",
  guest: "\u05E7\u05D5\u05E1\u05DD/\u05EA",
  leadingNow: "\u05DE\u05D5\u05D1\u05D9\u05DC/\u05D4 \u05D0\u05EA \u05D4\u05D0\u05D9\u05D5\u05D5\u05E0\u05D8 \u05DB\u05E8\u05D2\u05E2.",
  points: "\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA",
  yourStatusTitle: "\u05DE\u05D4 \u05D4\u05DE\u05E6\u05D1 \u05E9\u05DC\u05DA",
  yourPoints: "\u05D4\u05E0\u05D9\u05E7\u05D5\u05D3 \u05E9\u05DC\u05DA",
  yourPlace: "\u05D4\u05DE\u05E7\u05D5\u05DD \u05E9\u05DC\u05DA",
  leaderTitle: "\u05DE\u05D9 \u05DE\u05D5\u05D1\u05D9\u05DC \u05DB\u05E8\u05D2\u05E2",
  noLeader: "\u05E2\u05D3\u05D9\u05D9\u05DF \u05D0\u05D9\u05DF \u05DE\u05D5\u05D1\u05D9\u05DC \u05DB\u05D9 \u05D4\u05D8\u05D1\u05DC\u05D4 \u05E8\u05D9\u05E7\u05D4.",
  tieBreak: "\u05D0\u05DD \u05D9\u05E9 \u05E9\u05D5\u05D5\u05D9\u05D5\u05DF \u05D1\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA, \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05E9\u05D5\u05D1\u05E8\u05EA \u05D0\u05D5\u05EA\u05D5 \u05DC\u05E4\u05D9 \u05EA\u05D0\u05E8\u05D9\u05DA \u05D4\u05E8\u05E9\u05DE\u05D4 \u05DE\u05D5\u05E7\u05D3\u05DD \u05D9\u05D5\u05EA\u05E8.",
  rankedNowPrefix: "\u05D0\u05EA/\u05D4 \u05DB\u05E8\u05D2\u05E2 \u05D1\u05DE\u05E7\u05D5\u05DD ",
  noTopTenYet: "\u05E6\u05D1\u05E8\u05EA \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA, \u05D0\u05D1\u05DC \u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05E0\u05DB\u05E0\u05E1\u05EA \u05DC\u05D8\u05D5\u05E4 10.",
  noPersonalRank: "\u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05E6\u05D1\u05E8\u05EA \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA, \u05D0\u05D6 \u05E2\u05D3\u05D9\u05D9\u05DF \u05D0\u05D9\u05DF \u05D3\u05D9\u05E8\u05D5\u05D2 \u05D0\u05D9\u05E9\u05D9.",
};

function useCountdown(target: string) {
  const targetMs = useMemo(() => new Date(target).getTime(), [target]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(Date.now()));
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, []);

  const diff = Math.max(0, targetMs - now);
  const totalSeconds = Math.floor(diff / 1000);

  return {
    isDone: diff <= 0,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function getAccentTone(color?: string) {
  if (!color) return ACCENT_TONES.amber;
  return ACCENT_TONES[color.toLowerCase()] || ACCENT_TONES.amber;
}

function formatEventDate(value: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("he-IL", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

export function LiveEventExperience({ initialEventConfig = null }: LiveEventExperienceProps) {
  const [supabase] = useState(() => createClient());
  const [userProfile, setUserProfile] = useState<EventProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<EventProfile[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [eventConfig, setEventConfig] = useState<LiveEventSettings | null>(initialEventConfig);
  const [loading, setLoading] = useState(() => !initialEventConfig);

  const liveEvent = eventConfig || getDefaultLiveEventSettings();
  const eventLabel = getLiveEventLabel(liveEvent);
  const eventPoints = getProfileLiveEventPoints(userProfile);
  const eventPhase = getLiveEventPhase(liveEvent);
  const countdownTarget = eventPhase === "upcoming"
    ? getLiveEventStart(liveEvent) || DEFAULT_END
    : getLiveEventEnd(liveEvent) || DEFAULT_END;
  const countdown = useCountdown(countdownTarget);
  const missions = liveEvent.missions as EventMission[];
  const rewards = liveEvent.rewards;
  const eventTagline = liveEvent.tagline || (eventPhase === "upcoming" ? "מתחיל בקרוב" : "איוונט חי, חכם ומתעדכן");
  const eventDescription = liveEvent.description || (
    eventPhase === "upcoming"
      ? "דף איוונט ייעודי, טיימר דינמי, משימות ופרסים מההגדרות החיות. הניקוד יתחיל להיספר אוטומטית בזמן הפתיחה."
      : "דף איוונט ייעודי, טיימר דינמי, משימות ופרסים מההגדרות החיות, וניקוד אישי שמסונכרן עם הפעילות שלכם ברחבי הטירה."
  );
  const supportForumHref = liveEvent.support_forum_href || "/forums/feedback-and-suggestions";
  const leadingWizard = leaderboard[0] || null;

  useEffect(() => {
    const fetchData = async () => {
      if (initialEventConfig?.slug) {
        const refreshedEvent = await fetchLiveEventBySlug(supabase, initialEventConfig.slug);
        if (refreshedEvent) {
          setEventConfig(refreshedEvent);
        } else {
          setEventConfig(initialEventConfig);
        }
      } else {
        setEventConfig(await fetchLiveEventSettings(supabase));
      }

      const [
        {
          data: { user },
        },
        { data: leaderboardProfiles },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("profiles")
          .select("id, full_name, house, created_at, event_points, passover_points")
          .or("event_points.gt.0,passover_points.gt.0")
          .limit(250),
      ]);

      const rankedParticipants = [...(leaderboardProfiles || [])]
        .filter((profile) => getProfileLiveEventPoints(profile) > 0)
        .sort(compareLiveEventParticipants);

      setParticipantCount(rankedParticipants.length);
      setLeaderboard(rankedParticipants.slice(0, 10));
      setCurrentUserRank(
        user ? rankedParticipants.findIndex((profile) => profile.id === user.id) + 1 || null : null,
      );

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setUserProfile(data);
      }

      setLoading(false);
    };

    void fetchData();
  }, [initialEventConfig, supabase]);

  if (loading) return null;

  if (eventPhase === "inactive") {
    return (
      <div className="min-h-screen bg-[#0a0705] flex items-center justify-center text-amber-500/50 font-cinzel text-2xl tracking-widest uppercase">
        אין איוונט פעיל כרגע בטירה...
      </div>
    );
  }

  if (eventPhase === "ended") {
    const endedAt = formatEventDate(getLiveEventEnd(liveEvent));

    return (
      <div className="min-h-screen bg-[#0a0705] flex items-center justify-center px-6 text-center" dir="rtl">
        <div className="max-w-2xl rounded-[2.5rem] border border-amber-500/15 bg-white/[0.03] p-10 text-amber-100 shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] border border-amber-500/20 bg-amber-500/10 text-amber-400">
            <Clock3 size={34} />
          </div>
          <h1 className="font-cinzel text-4xl font-black text-amber-200">{eventLabel}</h1>
          <p className="mt-4 text-lg text-white/65">
            האיוונט נסגר אוטומטית בסיום חלון הזמן שהוגדר לו.
          </p>
          <p className="mt-2 text-sm text-white/40">
            {endedAt ? `מועד הסיום שנקבע: ${endedAt}` : "מועד הסיום של האיוונט כבר חלף."}
          </p>
          <Link
            href="/home"
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-6 py-3 text-sm font-black text-amber-300 transition-all hover:bg-amber-500/20"
          >
            חזרה לטירה
            <Sparkles size={14} />
          </Link>
        </div>
      </div>
    );
  }

  const isUpcoming = eventPhase === "upcoming";
  const statusLabel = isUpcoming ? "בקרוב" : "באוויר";
  const statusText = isUpcoming ? "פתיחת השערים בעוד:" : "סגירת השערים בעוד:";
  const statusDate = isUpcoming
    ? formatEventDate(getLiveEventStart(liveEvent))
    : formatEventDate(getLiveEventEnd(liveEvent));

  const currentUserStatus = currentUserRank
    ? `${EVENT_LEADERBOARD_COPY.rankedNowPrefix}${currentUserRank}.`
    : eventPoints > 0
      ? EVENT_LEADERBOARD_COPY.noTopTenYet
      : EVENT_LEADERBOARD_COPY.noPersonalRank;

  return (
    <main className="event-readable min-h-screen bg-[#120d09] text-[#fef3c7] overflow-x-hidden selection:bg-amber-500/30 text-[1.02rem]" dir="rtl">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/old-map.png')] opacity-[0.04]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-700/25 via-[#120d09] to-[#080503]" />
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.5, 0.8, 0.5] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
          className="absolute top-[10%] left-[15%] w-[30vw] h-[30vw] bg-amber-600/10 blur-[120px] rounded-full"
        />
        <motion.div
          animate={{ y: [0, 30, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[5%] right-[10%] w-[40vw] h-[40vw] bg-emerald-900/10 blur-[150px] rounded-full"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="text-center space-y-6 pt-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.3em] text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          >
            <Star size={14} className="animate-spin-slow text-amber-300" />
            {eventTagline}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            className="font-cinzel text-6xl font-black md:text-8xl drop-shadow-2xl text-transparent bg-clip-text bg-gradient-to-b from-[#fff6d9] via-amber-300 to-amber-700"
          >
            {eventLabel || "איוונט מיוחד"}
          </motion.h1>

          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-white/[0.85] font-crimson">
            {eventDescription}
          </p>

          {statusDate && (
            <p className="text-sm text-white/45 font-crimson italic">{statusDate}</p>
          )}
        </header>

        <section className="mt-16 grid gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="group relative overflow-hidden rounded-[2.5rem] border border-amber-500/20 bg-gradient-to-br from-white/[0.04] to-black/40 p-8 backdrop-blur-xl shadow-2xl"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-cinzel text-xs font-black text-amber-500/80 uppercase tracking-widest">
                  יומן המסע שלך
                </h3>
                <p className="text-3xl font-black text-white drop-shadow-md">
                  {userProfile?.full_name || "קוסם/ת אורח/ת"}
                </p>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-900/40 flex items-center justify-center border border-amber-500/30">
                <Wand2 className="text-amber-300" size={32} />
              </div>
            </div>

            <div className="relative z-10 mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-3xl bg-white/[0.08] p-6 border border-white/10 text-center transition-transform hover:scale-105">
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
                  {eventPoints}
                </div>
                <div className="text-[11px] text-amber-100/50 uppercase tracking-widest mt-2 font-bold">
                  נקודות איוונט
                </div>
              </div>
              <div className="rounded-3xl bg-white/[0.08] p-6 border border-white/10 text-center transition-transform hover:scale-105">
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">
                  {userProfile?.house || "—"}
                </div>
                <div className="text-[11px] text-blue-100/50 uppercase tracking-widest mt-2 font-bold">
                  בית המייצג
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8">
              <div className="mb-3 flex justify-between text-[11px] text-white/75 uppercase font-black tracking-widest">
                <span className="text-amber-300">היעד: {rewards[0]?.title || "אלוף האיוונט"}</span>
                <span>{eventPoints} / 500</span>
              </div>
              <div className="h-3 w-full rounded-full overflow-hidden border border-white/10 bg-white/[0.08] p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (eventPoints / 500) * 100)}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-300 shadow-[0_0_20px_rgba(251,191,36,0.6)]"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="relative overflow-hidden rounded-[2.5rem] border border-amber-500/20 bg-[#18120f] p-8 flex flex-col justify-center items-center text-center shadow-2xl"
          >
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
            <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
              <Clock3 className="text-amber-500/80 mb-6" size={48} />
            </motion.div>

            <div className="relative z-10 space-y-5">
              <div
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black uppercase border mb-2 ${
                  isUpcoming
                    ? "bg-sky-500/10 text-sky-300 border-sky-400/25"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    isUpcoming ? "bg-sky-300" : "bg-emerald-400"
                  }`}
                />
                {statusLabel}
              </div>

              <h2 className="font-cinzel text-3xl font-black text-amber-50">{statusText}</h2>

              <div className="flex gap-3 justify-center">
                {[
                  { label: "ימים", value: countdown.days },
                  { label: "שעות", value: countdown.hours },
                  { label: "דקות", value: countdown.minutes },
                  { label: "שניות", value: countdown.seconds },
                ].map((part) => (
                  <div
                    key={part.label}
                    className={`rounded-2xl p-4 min-w-[75px] border backdrop-blur-sm transition-transform hover:-translate-y-1 ${
                      isUpcoming
                        ? "bg-gradient-to-b from-sky-500/10 to-slate-900/40 border-sky-400/20"
                        : "bg-gradient-to-b from-amber-500/10 to-amber-900/20 border-amber-500/20"
                    }`}
                  >
                    <div
                      className={`text-3xl font-black drop-shadow-md ${
                        isUpcoming ? "text-sky-200" : "text-amber-400"
                      }`}
                    >
                      {String(part.value).padStart(2, "0")}
                    </div>
                    <div
                      className={`mt-1 text-[9px] uppercase tracking-widest font-bold ${
                        isUpcoming ? "text-sky-100/50" : "text-amber-200/50"
                      }`}
                    >
                      {part.label}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-base text-white/[0.78]">
                {isUpcoming
                  ? "הדף כבר מוכן, אבל צבירת הנקודות תתחיל אוטומטית רק בזמן הפתיחה."
                  : "כל פעולה נתמכת ברחבי הטירה נספרת לניקוד האיוונט בזמן שהוא חי."}
              </p>
            </div>
          </motion.div>
        </section>

        <section className="mt-20 grid gap-8 xl:grid-cols-[1.2fr_0.8fr] relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-[2.7rem] border border-amber-500/20 bg-gradient-to-br from-white/[0.05] to-black/35 p-8 shadow-2xl"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-cinzel text-3xl font-black text-amber-50">{EVENT_LEADERBOARD_COPY.title}</h2>
                <p className="mt-2 text-base leading-relaxed text-white/[0.78]">
                  {EVENT_LEADERBOARD_COPY.explainer}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center">
                <div className="font-cinzel text-2xl font-black text-amber-300">{participantCount}</div>
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/55">{EVENT_LEADERBOARD_COPY.participants}</div>
              </div>
            </div>

            {leaderboard.length === 0 ? (
              <div className="mt-8 rounded-[2rem] border border-dashed border-white/12 bg-white/[0.03] p-8 text-center text-base text-white/[0.7]">
                {isUpcoming
                  ? EVENT_LEADERBOARD_COPY.upcomingEmpty
                  : EVENT_LEADERBOARD_COPY.liveEmpty}
              </div>
            ) : (
              <div className="mt-8 space-y-3">
                {leaderboard.map((profile, index) => {
                  const rewardForRank = rewards.find((reward) => reward.rank === index + 1);
                  const profilePoints = getProfileLiveEventPoints(profile);

                  return (
                    <div
                      key={profile.id || `${profile.full_name}-${index}`}
                      className="flex items-center gap-4 rounded-[1.8rem] border border-white/10 bg-white/[0.05] px-5 py-4"
                    >
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl font-cinzel text-lg font-black ${
                        index === 0
                          ? "bg-amber-500/20 text-amber-300"
                          : index === 1
                            ? "bg-slate-300/15 text-slate-200"
                            : index === 2
                              ? "bg-orange-500/20 text-orange-300"
                              : "bg-white/8 text-white/80"
                      }`}>
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-cinzel text-lg font-black text-white">{profile.full_name || EVENT_LEADERBOARD_COPY.guest}</p>
                          {profile.house && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
                              {profile.house}
                            </span>
                          )}
                          {rewardForRank?.title && (
                            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                              {rewardForRank.title}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-white/60">
                          {index === 0 ? EVENT_LEADERBOARD_COPY.leadingNow : `מקום ${index + 1} בדירוג החי.`}
                        </p>
                      </div>
                      <div className="text-left">
                        <div className="font-cinzel text-2xl font-black text-amber-300">{profilePoints}</div>
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">{EVENT_LEADERBOARD_COPY.points}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-5"
          >
            <div className="rounded-[2.5rem] border border-emerald-400/20 bg-emerald-500/10 p-7">
              <h3 className="font-cinzel text-sm font-black uppercase tracking-[0.22em] text-emerald-300">{EVENT_LEADERBOARD_COPY.yourStatusTitle}</h3>
              <p className="mt-4 text-lg leading-relaxed text-white/[0.84]">{currentUserStatus}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                  <div className="font-cinzel text-2xl font-black text-emerald-300">{eventPoints}</div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">{EVENT_LEADERBOARD_COPY.yourPoints}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                  <div className="font-cinzel text-2xl font-black text-amber-300">{currentUserRank || "—"}</div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">{EVENT_LEADERBOARD_COPY.yourPlace}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[2.5rem] border border-sky-400/20 bg-sky-500/10 p-7">
              <h3 className="font-cinzel text-sm font-black uppercase tracking-[0.22em] text-sky-200">{EVENT_LEADERBOARD_COPY.leaderTitle}</h3>
              <p className="mt-4 text-lg leading-relaxed text-white/[0.84]">
                {leadingWizard
                  ? `${leadingWizard.full_name || EVENT_LEADERBOARD_COPY.guest} במקום ראשון עם ${getProfileLiveEventPoints(leadingWizard)} נקודות.`
                  : EVENT_LEADERBOARD_COPY.noLeader}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-white/[0.72]">
                {EVENT_LEADERBOARD_COPY.tieBreak}
              </p>
            </div>
          </motion.div>
        </section>

        <section className="mt-24 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 px-2 gap-4">
            <div>
              <h2 className="font-cinzel text-4xl font-black text-amber-50 drop-shadow-lg">
                משימות האיוונט
              </h2>
              <p className="text-amber-100/80 text-lg mt-2 font-light leading-relaxed">
                עזרו לצוות הטירה, מצאו רמזים, ואספו נקודות לבית שלכם.
              </p>
            </div>
            <Link
              href="/quests"
              className="inline-flex items-center gap-2 text-xs font-black text-amber-400 hover:text-amber-300 bg-amber-500/10 px-5 py-2.5 rounded-full border border-amber-500/20 transition-all hover:scale-105 uppercase tracking-widest"
            >
              היכנסו ליומן המטלות
              <Search size={14} />
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {missions.map((mission, idx) => {
              const IconComponent = (mission.icon ? ICON_MAP[mission.icon] : undefined) || HelpCircle;
              const tone = getAccentTone(mission.color);

              return (
                <motion.div
                  key={mission.title || `mission-${idx}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * idx }}
                >
                  <Link
                    href={mission.href || "/"}
                    className="group block h-full rounded-[2rem] border border-white/[0.12] bg-[#1a1410] p-7 transition-all hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] relative overflow-hidden"
                  >
                    <div
                      className="absolute right-0 top-0 h-32 w-32 rounded-full blur-[50px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{ background: tone.glow }}
                    />

                    <div className="relative z-10 flex items-center justify-between">
                      <div
                        className="rounded-2xl border p-4"
                        style={{ background: tone.bg, color: tone.text, borderColor: tone.border }}
                      >
                        <IconComponent size={24} />
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-black text-amber-400 tracking-widest shadow-inner">
                        +{mission.points || 0} איוונט
                      </span>
                    </div>

                    <div className="relative z-10 mt-5">
                      <h3 className="font-cinzel text-xl font-black text-amber-50 transition-colors group-hover:text-amber-200">
                        {mission.title}
                      </h3>
                      <p className="mt-3 text-base font-light leading-relaxed text-white/[0.72]">
                        {mission.description}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {missions.length === 0 && (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center text-white/55 font-crimson text-lg italic">
              המשימות של האיוונט יתפרסמו כאן ברגע שיוגדרו בלוח הבקרה.
            </div>
          )}
        </section>

        <section className="mt-28 grid gap-8 lg:grid-cols-3 relative z-10">
          <div className="lg:col-span-2 rounded-[3rem] bg-gradient-to-br from-amber-600/20 via-amber-900/10 to-black p-[1px] shadow-2xl">
            <div className="h-full rounded-[2.9rem] border border-amber-500/[0.18] bg-[#120d09] p-10 md:p-14 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-amber-500/5 blur-[80px] pointer-events-none" />

              <h2 className="mb-10 font-cinzel text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 to-amber-500">
                היכל התהילה — הפרסים
              </h2>

              <div className="relative z-10 grid gap-6 sm:grid-cols-2">
                {rewards.map((reward) => {
                  const IconComponent = (reward.icon ? ICON_MAP[reward.icon] : undefined) || Gift;

                  return (
                    <div
                      key={reward.rank || reward.title}
                      className="flex items-start gap-5 rounded-3xl border border-white/10 bg-white/[0.07] p-5 transition-colors hover:bg-white/[0.1]"
                    >
                      <div className="mt-1 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2 text-amber-400">
                        <IconComponent size={22} />
                      </div>
                      <div>
                        <div className="text-lg font-black text-amber-50">
                          {reward.title}{" "}
                          <span className="text-[10px] font-cinzel tracking-widest text-amber-500">
                            (מקום {reward.rank})
                          </span>
                        </div>
                        <div className="mt-1.5 text-base font-light leading-relaxed text-white/[0.72]">
                          {reward.description}
                        </div>
                        <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-amber-400/80">
                          {reward.galleons} גליאונים | {reward.points} נקודות בית
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {rewards.length === 0 && (
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center text-white/55 font-crimson text-lg italic">
                  הפרסים של האיוונט יתפרסמו כאן ברגע שיוגדרו במערכת.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="rounded-[2.5rem] bg-gradient-to-br from-amber-500 to-amber-700 p-8 text-[#1a0d02] shadow-[0_15px_30px_rgba(245,158,11,0.2)]"
            >
              <h3 className="mb-3 font-cinzel text-3xl font-black leading-tight">זקוקים לרמז?</h3>
              <p className="mb-8 text-base font-bold leading-relaxed opacity-80">
                צוות המדריכים נמצא כאן כדי לעזור לכם לפענח את חידות החג ולצבור נקודות.
              </p>
              <Link
                href={supportForumHref}
                className="inline-flex items-center gap-2 rounded-full bg-[#1a0d02] px-7 py-3.5 text-sm font-black text-amber-400 transition-transform hover:scale-105 hover:bg-black shadow-lg"
              >
                פתיחת פנייה לצוות
                <Coffee size={16} />
              </Link>
            </motion.div>

            <div className="rounded-[2.5rem] border border-white/10 bg-[#1a1410] p-8 text-center shadow-lg">
              <Tent className="mx-auto mb-5 text-amber-500/40 drop-shadow-md" size={48} />
              <h4 className="font-cinzel text-sm font-black text-amber-500/80 uppercase tracking-widest">
                מאהל המשתתפים
              </h4>
              <p className="mt-3 text-sm leading-relaxed text-white/[0.72]">
                {isUpcoming
                  ? "המאהל כבר מוכן והדף יישאר מסונכרן אוטומטית עם שעת הפתיחה שהוגדרה בלוח הבקרה."
                  : "האירוע חי עכשיו והמערכת סופרת נקודות בזמן אמת עד שעת הסיום שהוגדרה."}
              </p>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        .font-cinzel {
          font-family: "Cinzel", serif;
        }

        .event-readable .text-white\/40 {
          color: rgba(255, 255, 255, 0.72) !important;
        }

        .event-readable .text-white\/50 {
          color: rgba(255, 255, 255, 0.76) !important;
        }

        .event-readable .text-white\/55 {
          color: rgba(255, 255, 255, 0.8) !important;
        }

        .event-readable .text-white\/68 {
          color: rgba(255, 255, 255, 0.85) !important;
        }
      `}</style>
    </main>
  );
}

export default function DynamicEventPage() {
  return <LiveEventExperience />;
}
