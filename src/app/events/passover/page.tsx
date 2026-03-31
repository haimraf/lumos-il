"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  getLiveEventHref,
  getLiveEventLabel,
  getLiveEventPhase,
  getLiveEventStart,
  getProfileLiveEventPoints,
  LIVE_EVENTS_CATALOG_KEY,
  LIVE_EVENT_SETTINGS_KEY,
  type LiveEventSettings,
} from "@/lib/liveEvent";
import { useReducedMotion } from "framer-motion";
import { getHouseIcon, getHouseLabel, getHousePalette, withAlpha } from "@/lib/houses";

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
  explainer: "כאן יופיעו המצטיינים של מסדר החירות. הדירוג בשעון החול הזה יקבע מי יזכה בפרסים הגדולים בסוף החג.",
  participants: "\u05DE\u05E9\u05EA\u05EA\u05E4\u05D9\u05DD \u05E2\u05DD \u05E0\u05D9\u05E7\u05D5\u05D3",
  upcomingEmpty: "הפסגה עדיין מחכה לגיבור או לגיבורה הראשונים. ברגע שהאיוונט ייפתח ויתחילו להיצבר נקודות, הטבלה תתמלא כאן.",
  liveEmpty: "הפסגה עדיין ממתינה למשתתפים הראשונים. ברגע שתושלם המשימה הראשונה, הדירוג יתחיל להופיע כאן.",
  guest: "\u05E7\u05D5\u05E1\u05DD/\u05EA",
  leadingNow: "\u05DE\u05D5\u05D1\u05D9\u05DC/\u05D4 \u05D0\u05EA \u05D4\u05D0\u05D9\u05D5\u05D5\u05E0\u05D8 \u05DB\u05E8\u05D2\u05E2.",
  points: "\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA",
  yourStatusTitle: "\u05DE\u05D4 \u05D4\u05DE\u05E6\u05D1 \u05E9\u05DC\u05DA",
  yourPoints: "\u05D4\u05E0\u05D9\u05E7\u05D5\u05D3 \u05E9\u05DC\u05DA",
  yourPlace: "\u05D4\u05DE\u05E7\u05D5\u05DD \u05E9\u05DC\u05DA",
  leaderTitle: "\u05DE\u05D9 \u05DE\u05D5\u05D1\u05D9\u05DC \u05DB\u05E8\u05D2\u05E2",
  noLeader: "הפסגה עדיין מחכה לגיבור או לגיבורה הראשונים.",
  tieBreak: "טיפ: במקרה של שוויון בנקודות, הקוסם או המכשפה שהצטרפו לקהילה מוקדם יותר יקבלו את היתרון.",
  rankedNowPrefix: "\u05D0\u05EA/\u05D4 \u05DB\u05E8\u05D2\u05E2 \u05D1\u05DE\u05E7\u05D5\u05DD ",
  noTopTenYet: "\u05E6\u05D1\u05E8\u05EA \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA, \u05D0\u05D1\u05DC \u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05E0\u05DB\u05E0\u05E1\u05EA \u05DC\u05D8\u05D5\u05E4 10.",
  noPersonalRank: "המסע שלך טרם התחיל. ברגע שתשלים את המשימה הראשונה שלך, הדירוג יופיע כאן.",
};

function useCountdown(target: string) {
  const targetMs = useMemo(() => new Date(target).getTime(), [target]);
  // אתחול לזמן הנוכחי כדי למנוע קפיצות במספרים בטעינה הראשונה
  const [now, setNow] = useState(() => Date.now()); 

  useEffect(() => {
    // עדכון כל שנייה בדיוק
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const diff = Math.max(0, targetMs - now);
  const totalSeconds = Math.floor(diff / 1000);

  return {
    isDone: diff <= 0 && targetMs > 0, // וידוא שתאריך לא תקין לא מחזיר מיד true
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

function getEventHouseStyles(house: string | null | undefined) {
  const palette = getHousePalette(house);
  if (!palette) {
    return {
      label: house || "-",
      icon: "✨",
      nameColor: "#f8e7a1",
      borderColor: "rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.08)",
      badgeBackground: "rgba(255,255,255,0.05)",
      badgeText: "rgba(255,255,255,0.72)",
      glow: "rgba(255,255,255,0.12)",
    };
  }

  const readableColor = palette.id === "Hufflepuff" ? palette.contrast : palette.secondary;
  return {
    label: getHouseLabel(house) || palette.label,
    icon: getHouseIcon(house) || palette.icon,
    nameColor: readableColor,
    borderColor: withAlpha(palette.secondary, 0.35),
    background: `linear-gradient(135deg, ${withAlpha(palette.primary, 0.18)}, ${withAlpha(palette.secondary, 0.12)})`,
    badgeBackground: withAlpha(palette.primary, 0.16),
    badgeText: palette.id === "Hufflepuff" ? palette.secondary : palette.contrast,
    glow: withAlpha(palette.secondary, 0.2),
  };
}

export function LiveEventExperience({ initialEventConfig = null }: LiveEventExperienceProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const prefersReducedMotion = useReducedMotion();
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
  const eventHref = getLiveEventHref(liveEvent);
  const eventUrl = `https://lumos-il.co.il${eventHref}`;
  const eventStart = getLiveEventStart(liveEvent) || undefined;
  const eventEnd = getLiveEventEnd(liveEvent) || undefined;
  const countdownTarget = eventPhase === "upcoming"
    ? getLiveEventStart(liveEvent) || DEFAULT_END
    : getLiveEventEnd(liveEvent) || DEFAULT_END;
  const countdown = useCountdown(countdownTarget);
  const missions = liveEvent.missions as EventMission[];
  const rewards = liveEvent.rewards;
  const eventTagline = liveEvent.tagline || (eventPhase === "upcoming" ? "מתחיל בקרוב" : "איוונט חי, חכם ומתעדכן");
  const eventDescription = liveEvent.description || (
    eventPhase === "upcoming"
      ? "איוונט קהילתי עם שעון חול קסום, משימות, טבלת מובילים ופרסים שייפתחו ברגע שהאירוע יתחיל."
      : "איוונט קהילתי חי עם משימות, ניקוד אישי, טבלת מובילים ופרסים שמסתנכרנים עם הפעילות שלכם ברחבי הטירה."
  );
  const supportForumHref = liveEvent.support_forum_href || "/forums/feedback-and-suggestions";
  const leadingWizard = leaderboard[0] || null;
  const userHouseStyles = getEventHouseStyles(userProfile?.house);
  const leadingWizardHouseStyles = getEventHouseStyles(leadingWizard?.house);
  const statusText = eventPhase === "upcoming" ? "פתיחת השערים בעוד:" : "סגירת השערים בעוד:";
  const progressTarget = (liveEvent.progress_target as number) || 500;
  const progressValue = Math.min(100, Math.max(0, (eventPoints / progressTarget) * 100));
  const countdownSummary = `${statusText} ${countdown.days} ימים, ${countdown.hours} שעות, ${countdown.minutes} דקות ו-${countdown.seconds} שניות.`;
  const eventStructuredData = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: eventLabel,
    description: eventDescription,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: eventPhase === "upcoming"
      ? "https://schema.org/EventScheduled"
      : eventPhase === "live"
        ? "https://schema.org/EventInProgress"
        : eventPhase === "ended"
          ? "https://schema.org/EventCompleted"
          : "https://schema.org/EventScheduled",
    startDate: eventStart,
    endDate: eventEnd,
    url: eventUrl,
    image: ["https://lumos-il.co.il/logo.png"],
    inLanguage: "he-IL",
    location: {
      "@type": "VirtualLocation",
      url: eventUrl,
    },
    organizer: {
      "@type": "Organization",
      name: "LUMOS IL",
      url: "https://lumos-il.co.il",
    },
  }), [eventDescription, eventEnd, eventLabel, eventPhase, eventStart, eventUrl]);

  const refreshLeaderboardData = useCallback(async () => {
    try {
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
        return;
      }

      setUserProfile(null);
    } catch {
      // Silently handle — the 30-second refresh cycle will retry automatically
    }
  }, [supabase]);

  const refreshEventConfig = useCallback(async () => {
    try {
      if (initialEventConfig?.slug) {
        const refreshedEvent = await fetchLiveEventBySlug(supabase, initialEventConfig.slug);
        if (refreshedEvent) {
          setEventConfig(refreshedEvent);
          return refreshedEvent;
        }

        setEventConfig(initialEventConfig);
        return initialEventConfig;
      }

      const featuredEvent = await fetchLiveEventSettings(supabase);
      setEventConfig(featuredEvent);

      if (featuredEvent?.slug && featuredEvent.slug !== "passover") {
        router.replace(`/events/${featuredEvent.slug}`);
      }

      return featuredEvent;
    } catch {
      return eventConfig;
    }
  }, [initialEventConfig, eventConfig, router, supabase]);

  useEffect(() => {
    if (countdown.isDone && eventPhase !== "ended") {
      void refreshEventConfig();
    }
  }, [countdown.isDone, eventPhase, refreshEventConfig]);

  useEffect(() => {
    const fetchData = async () => {
      const refreshedEvent = await refreshEventConfig();
      if (!initialEventConfig?.slug && refreshedEvent?.slug && refreshedEvent.slug !== "passover") {
        return;
      }
      await refreshLeaderboardData();

      setLoading(false);
    };

    void fetchData();
  }, [initialEventConfig, refreshEventConfig, refreshLeaderboardData]);

  useEffect(() => {
    const refreshOnReturn = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void refreshEventConfig();
      void refreshLeaderboardData();
    };

    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshEventConfig();
        void refreshLeaderboardData();
      }
    }, 30000);
    const siteSettingsChannel = supabase
      .channel(`live-event-page-sync-${initialEventConfig?.slug || "featured"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        (payload: any) => {
          const key = payload?.new?.key || payload?.old?.key;
          if (key === LIVE_EVENT_SETTINGS_KEY || key === LIVE_EVENTS_CATALOG_KEY) {
            void refreshEventConfig();
          }
        },
      )
      .subscribe();
    const profilesChannel = supabase
      .channel(`live-event-scoreboard-sync-${initialEventConfig?.slug || "featured"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload: any) => {
          const nextProfile = payload?.new || {};
          const prevProfile = payload?.old || {};
          const pointsChanged = payload?.eventType !== "UPDATE"
            || nextProfile.event_points !== prevProfile.event_points
            || nextProfile.passover_points !== prevProfile.passover_points
            || nextProfile.group_id !== prevProfile.group_id
            || nextProfile.full_name !== prevProfile.full_name
            || nextProfile.house !== prevProfile.house;

          if (pointsChanged) {
            void refreshLeaderboardData();
          }
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
      window.clearInterval(interval);
      void supabase.removeChannel(siteSettingsChannel);
      void supabase.removeChannel(profilesChannel);
    };
  }, [initialEventConfig?.slug, refreshEventConfig, refreshLeaderboardData, supabase]);

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
  const statusDate = isUpcoming
    ? formatEventDate(getLiveEventStart(liveEvent))
    : formatEventDate(getLiveEventEnd(liveEvent));

  const currentUserStatus = currentUserRank
    ? `${EVENT_LEADERBOARD_COPY.rankedNowPrefix}${currentUserRank}.`
    : eventPoints > 0
      ? EVENT_LEADERBOARD_COPY.noTopTenYet
      : EVENT_LEADERBOARD_COPY.noPersonalRank;

  return (
    <main
      className="event-readable min-h-screen bg-[#120d09] text-[#fef3c7] overflow-x-hidden selection:bg-amber-500/30 text-[1.02rem]"
      dir="rtl"
      aria-labelledby="live-event-title"
    >
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventStructuredData) }}
      />
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/old-map.png')] opacity-[0.04]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-700/25 via-[#120d09] to-[#080503]" />
        <motion.div
          animate={prefersReducedMotion ? undefined : { y: [0, -20, 0], opacity: [0.5, 0.8, 0.5] }}
          transition={prefersReducedMotion ? undefined : { repeat: Infinity, duration: 5, ease: "easeInOut" }}
          className="absolute top-[10%] left-[15%] w-[30vw] h-[30vw] bg-amber-600/10 blur-[120px] rounded-full"
        />
        <motion.div
          animate={prefersReducedMotion ? undefined : { y: [0, 30, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={prefersReducedMotion ? undefined : { repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[5%] right-[10%] w-[40vw] h-[40vw] bg-emerald-900/10 blur-[150px] rounded-full"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="text-center space-y-6 pt-10">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.3em] text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          >
            <Star size={14} className="animate-spin-slow text-amber-300" />
            {eventTagline}
          </motion.div>

          <motion.h1
            id="live-event-title"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={prefersReducedMotion ? undefined : { delay: 0.1, type: "spring" }}
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
            initial={prefersReducedMotion ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={prefersReducedMotion ? undefined : { delay: 0.3 }}
            className="group relative overflow-hidden rounded-[2.5rem] border border-amber-500/20 bg-gradient-to-br from-white/[0.04] to-black/40 p-8 backdrop-blur-xl shadow-2xl"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-cinzel text-xs font-black text-amber-500/80 uppercase tracking-widest">
                  יומן המסע שלך
                </h3>
                <p className="text-3xl font-black text-white drop-shadow-md">
                  {userProfile?.full_name || "אורח מן הטירה"}
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
              <div
                className="rounded-3xl p-6 border text-center transition-transform hover:scale-105"
                style={{
                  background: userHouseStyles.background,
                  borderColor: userHouseStyles.borderColor,
                  boxShadow: `0 0 24px ${userHouseStyles.glow}`,
                }}
              >
                <div
                  className="text-4xl font-black"
                  style={{ color: userHouseStyles.nameColor }}
                >
                  {userHouseStyles.icon} {userHouseStyles.label}
                </div>
                <div className="text-[11px] uppercase tracking-widest mt-2 font-bold" style={{ color: withAlpha(userHouseStyles.nameColor, 0.7) }}>
                  בית המייצג
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8">
              <div className="mb-3 flex justify-between text-[11px] text-white/75 uppercase font-black tracking-widest">
                <span className="text-amber-300">היעד: {rewards[0]?.title || "אלוף האיוונט"}</span>
                <span>{eventPoints} / {progressTarget}</span>
              </div>
              <div
                className="h-3 w-full rounded-full overflow-hidden border border-white/10 bg-white/[0.08] p-0.5"
                role="progressbar"
                aria-label="התקדמות ניקוד באיוונט"
                aria-valuemin={0}
                aria-valuemax={progressTarget}
                aria-valuenow={Math.min(progressTarget, eventPoints)}
                aria-valuetext={`${eventPoints} מתוך ${progressTarget} נקודות`}
              >
                <motion.div
                  initial={prefersReducedMotion ? false : { width: 0 }}
                  animate={{ width: `${progressValue}%` }}
                  transition={prefersReducedMotion ? undefined : { duration: 1.5, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-300 shadow-[0_0_20px_rgba(251,191,36,0.6)]"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={prefersReducedMotion ? undefined : { delay: 0.4 }}
            className="relative overflow-hidden rounded-[2.5rem] border border-amber-500/20 bg-[#18120f] p-8 flex flex-col justify-center items-center text-center shadow-2xl"
            role="region"
            aria-labelledby="event-countdown-title"
            aria-describedby="event-countdown-summary"
          >
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
            <motion.div
              animate={prefersReducedMotion ? undefined : { rotate: [0, 5, -5, 0] }}
              transition={prefersReducedMotion ? undefined : { repeat: Infinity, duration: 4 }}
            >
              <Clock3 className="text-amber-500/80 mb-6" size={48} />
            </motion.div>

            <div className="relative z-10 space-y-5">
              <p id="event-countdown-summary" className="sr-only">{countdownSummary}</p>
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

              <h2 id="event-countdown-title" className="font-cinzel text-3xl font-black text-amber-50">{statusText}</h2>

              <div className="flex gap-3 justify-center" role="timer" aria-label={countdownSummary}>
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
                  ? "שערי הטירה ייפתחו בקרוב. שעון החול הקסום יתחיל לספור את נקודות האיוונט ברגע שהספירה לאחור תסתיים."
                  : "כל פעולה נתמכת ברחבי הטירה נספרת לניקוד האיוונט בזמן שהוא חי."}
              </p>
            </div>
          </motion.div>
        </section>

        <section className="mt-20 grid gap-8 xl:grid-cols-[1.2fr_0.8fr] relative z-10" aria-labelledby="event-leaderboard-title">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? undefined : { delay: 0.45 }}
            className="rounded-[2.7rem] border border-amber-500/20 bg-gradient-to-br from-white/[0.05] to-black/35 p-8 shadow-2xl"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="event-leaderboard-title" className="font-cinzel text-3xl font-black text-amber-50">{EVENT_LEADERBOARD_COPY.title}</h2>
                <p className="mt-2 text-base leading-relaxed text-white/[0.78]">
                  {EVENT_LEADERBOARD_COPY.explainer}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center" aria-live="polite">
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
              <ol className="mt-8 space-y-3 list-none p-0 m-0">
                {leaderboard.map((profile, index) => {
                  const rewardForRank = rewards.find((reward) => reward.rank === index + 1);
                  const profilePoints = getProfileLiveEventPoints(profile);
                  const profileHouseStyles = getEventHouseStyles(profile.house);

                  return (
                    <li
                      key={profile.id || `${profile.full_name}-${index}`}
                      className="flex items-center gap-4 rounded-[1.8rem] border border-white/10 bg-white/[0.05] px-5 py-4"
                      aria-label={`${profile.full_name || EVENT_LEADERBOARD_COPY.guest}, מקום ${index + 1}, ${profilePoints} נקודות`}
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
                            <span
                              className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                              style={{
                                borderColor: profileHouseStyles.borderColor,
                                background: profileHouseStyles.badgeBackground,
                                color: profileHouseStyles.badgeText,
                              }}
                            >
                              {profileHouseStyles.icon} {profileHouseStyles.label}
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
                    </li>
                  );
                })}
              </ol>
            )}
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? undefined : { delay: 0.5 }}
            className="space-y-5"
          >
            <div className="rounded-[2.5rem] border border-emerald-400/20 bg-emerald-500/10 p-7" aria-live="polite">
              <h3 className="font-cinzel text-sm font-black uppercase tracking-[0.22em] text-emerald-300">{EVENT_LEADERBOARD_COPY.yourStatusTitle}</h3>
              <p className="mt-4 text-lg leading-relaxed text-white/[0.84]">{currentUserStatus}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                  <div className="font-cinzel text-2xl font-black text-emerald-300">{eventPoints}</div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">{EVENT_LEADERBOARD_COPY.yourPoints}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                  <div className="font-cinzel text-2xl font-black text-amber-300">{currentUserRank || "-"}</div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">{EVENT_LEADERBOARD_COPY.yourPlace}</div>
                </div>
              </div>
              {(() => {
                if (!currentUserRank || currentUserRank <= 1 || eventPoints <= 0) return null;
                const personAbove = leaderboard[currentUserRank - 2];
                if (!personAbove) return null;
                const pointsAbove = getProfileLiveEventPoints(personAbove);
                const gap = pointsAbove - eventPoints;
                if (gap <= 0) return null;
                return (
                  <p className="mt-4 text-[11px] text-amber-300/70 font-black uppercase tracking-widest text-center">
                    עוד {gap} נקודות לעקוף את מקום {currentUserRank - 1}
                  </p>
                );
              })()}
            </div>

            <div
              className="rounded-[2.5rem] border p-7"
              style={{
                borderColor: leadingWizardHouseStyles.borderColor,
                background: leadingWizard ? leadingWizardHouseStyles.background : "rgba(14,165,233,0.10)",
                boxShadow: leadingWizard ? `0 0 24px ${leadingWizardHouseStyles.glow}` : "none",
              }}
            >
              <h3 className="font-cinzel text-sm font-black uppercase tracking-[0.22em]" style={{ color: leadingWizard ? leadingWizardHouseStyles.nameColor : "#bae6fd" }}>{EVENT_LEADERBOARD_COPY.leaderTitle}</h3>
              <p className="mt-4 text-lg leading-relaxed text-white/[0.84]">
                {leadingWizard
                  ? `${leadingWizard.full_name || EVENT_LEADERBOARD_COPY.guest} ${leadingWizardHouseStyles.label ? `מ-${leadingWizardHouseStyles.label}` : ""} במקום ראשון עם ${getProfileLiveEventPoints(leadingWizard)} נקודות.`
                  : EVENT_LEADERBOARD_COPY.noLeader}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-white/[0.72]">
                {EVENT_LEADERBOARD_COPY.tieBreak}
              </p>
            </div>
          </motion.div>
        </section>

        <section className="mt-24 relative z-10" aria-labelledby="event-missions-title">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 px-2 gap-4">
            <div>
              <h2 id="event-missions-title" className="font-cinzel text-4xl font-black text-amber-50 drop-shadow-lg">
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

          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">
            {missions.map((mission, idx) => {
              const IconComponent = (mission.icon ? ICON_MAP[mission.icon] : undefined) || HelpCircle;
              const tone = getAccentTone(mission.color);

              return (
                <motion.li
                  key={mission.title || `mission-${idx}`}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={prefersReducedMotion ? undefined : { delay: 0.1 * idx }}
                >
                  <Link
                    href={mission.href || "/"}
                    aria-label={`${mission.title || "משימת איוונט"} - ${mission.points || 0} נקודות איוונט`}
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
                </motion.li>
              );
            })}
          </ul>

          {missions.length === 0 && (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center text-white/55 font-crimson text-lg italic">
              המשימות של האיוונט יתפרסמו כאן ברגע שיוגדרו בלוח הבקרה.
            </div>
          )}
        </section>

        <section className="mt-28 grid gap-8 lg:grid-cols-3 relative z-10" aria-labelledby="event-rewards-title">
          <div className="lg:col-span-2 rounded-[3rem] bg-gradient-to-br from-amber-600/20 via-amber-900/10 to-black p-[1px] shadow-2xl">
            <div className="h-full rounded-[2.9rem] border border-amber-500/[0.18] bg-[#120d09] p-10 md:p-14 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-amber-500/5 blur-[80px] pointer-events-none" />

              <h2 id="event-rewards-title" className="mb-10 font-cinzel text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 to-amber-500">
                היכל התהילה - הפרסים
              </h2>

              <ol className="relative z-10 grid gap-6 sm:grid-cols-2 list-none p-0 m-0">
                {rewards.map((reward) => {
                  const IconComponent = (reward.icon ? ICON_MAP[reward.icon] : undefined) || Gift;

                  return (
                    <li
                      key={reward.rank || reward.title}
                      className="flex items-start gap-5 rounded-3xl border border-white/10 bg-white/[0.07] p-5 transition-colors hover:bg-white/[0.1]"
                      aria-label={`${reward.title || "פרס"} למקום ${reward.rank || "לא מוגדר"}, ${reward.galleons || 0} גליאונים ו-${reward.points || 0} נקודות בית`}
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
                    </li>
                  );
                })}
              </ol>

              {rewards.length === 0 && (
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center text-white/55 font-crimson text-lg italic">
                  הפרסים של האיוונט יתפרסמו כאן ברגע שיוגדרו במערכת.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <motion.div
              whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
              className="rounded-[2.5rem] bg-gradient-to-br from-amber-500 to-amber-700 p-8 text-[#1a0d02] shadow-[0_15px_30px_rgba(245,158,11,0.2)]"
            >
              <h3 className="mb-3 font-cinzel text-3xl font-black leading-tight">זקוקים לרמז?</h3>
              <p className="mb-8 text-base font-bold leading-relaxed opacity-80">
                צוות המדריכים נמצא כאן כדי לעזור לכם לפענח את חידות החג ולצבור נקודות.
              </p>
              <Link
                href={supportForumHref}
                aria-label="פתיחת פנייה לצוות המדריכים"
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
                  : "האיוונט חי עכשיו, ושעון החול של הטירה סופר נקודות בזמן אמת עד שעת הסיום שנקבעה."}
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

        @media (prefers-reduced-motion: reduce) {
          .event-readable *,
          .event-readable *::before,
          .event-readable *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }

          .event-readable .group:hover,
          .event-readable a:hover {
            transform: none !important;
          }
        }
      `}</style>
    </main>
  );
}

export default function DynamicEventPage() {
  return <LiveEventExperience />;
}
