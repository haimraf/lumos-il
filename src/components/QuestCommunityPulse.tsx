"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, Flame, Sparkles, Users, WandSparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { formatHebrewRelativeTime } from "@/lib/dateTime";
import { getSafeInternalHref } from "@/lib/hrefs";
import { normalizeLegacyDisplayText } from "@/lib/legacyText";
import {
  HOUSE_IDS,
  getHouseLabel,
  getHouseVisualTheme,
  resolveHouseId,
  withAlpha,
  type HouseId,
} from "@/lib/houses";

type PulseEvent = {
  id: string;
  actor_id: string | null;
  event_type: string | null;
  actor_name: string | null;
  actor_house: string | null;
  title: string | null;
  subtitle: string | null;
  icon: string | null;
  target_url: string | null;
  created_at: string | null;
};

type HouseMomentum = Record<HouseId, number>;

const EMPTY_MOMENTUM: HouseMomentum = {
  Gryffindor: 0,
  Slytherin: 0,
  Ravenclaw: 0,
  Hufflepuff: 0,
};

const COMMUNITY_GOAL = 18;
const RECENT_EVENT_LIMIT = 4;
const MOMENTUM_EVENT_TYPES = new Set([
  "story_published",
  "chapter_published",
  "forum_thread_created",
  "forum_reply_created",
  "news_comment_created",
  "news_poll_voted",
  "library_chapter_read",
  "arena_duel_completed",
  "duel_tied",
  "quest_trivia_completed",
  "quest_niffler_found",
  "quest_snitch_caught",
]);

function safeTimeAgo(dateString: string | null) {
  return formatHebrewRelativeTime(dateString, {
    invalidLabel: "לא ידוע",
    maxRelativeDays: 1,
  });
}

function pulseNarration(
  total: number,
  remaining: number,
  leaderLabel: string,
  leaderValue: number,
  ownLabel: string | null,
  ownValue: number,
) {
  if (total === 0) {
    return "הטירה שקטה מדי כרגע. די בניצוץ קסם אחד כדי להחזיר חיים למסדרונות.";
  }

  if (remaining > 0) {
    if (ownLabel && ownValue > 0) {
      return `${ownLabel} כבר בתנועה עם ${ownValue} ניצוצות קסם. עוד ${remaining} מעשים קסומים יפתחו את שער ההתעוררות של היום.`;
    }

    return `${leaderLabel} מוביל/ה כרגע את זרם הקסם עם ${leaderValue} ניצוצות. עוד ${remaining} מעשים קסומים יפתחו את שער ההתעוררות של היום.`;
  }

  if (ownLabel && ownValue === leaderValue) {
    return `${ownLabel} מוביל/ה כעת את זרם הקסם של הטירה. זה הזמן של שאר הבתים להגיב.`;
  }

  return `שער ההתעוררות היומי כבר נפתח. ${leaderLabel} מוביל/ה כרגע עם ${leaderValue} ניצוצות קסם גלויים.`;
}

function houseStatusLine(houseId: HouseId, momentum: number) {
  if (momentum <= 0) {
    return "שערי הבית עדיין ממתינים לניצוץ הראשון של היום.";
  }

  switch (houseId) {
    case "Gryffindor":
      return "שאגת האריות מהדהדת במסדרונות.";
    case "Slytherin":
      return "נחישות נחשית מורגשת במעמקי הצינוק.";
    case "Ravenclaw":
      return "רוח של תבונה מנשבת במגדלים.";
    case "Hufflepuff":
      return "נאמנות וחריצות מעירות את חממות הטירה.";
    default:
      return "הבית כבר מורגש היום במסדרונות.";
  }
}

function getDisplayActorName(actorName: string | null) {
  if (!actorName) return "מישהו בטירה";
  if (actorName.includes("קוסמ")) return "דמות מן הטירה";
  return actorName;
}

function normalizePulseEvent(event: PulseEvent): PulseEvent {
  return {
    ...event,
    actor_name: event.actor_name ? normalizeLegacyDisplayText(event.actor_name) : null,
    title: event.title ? normalizeLegacyDisplayText(event.title) : null,
    subtitle: event.subtitle ? normalizeLegacyDisplayText(event.subtitle) : null,
    icon: event.icon ? normalizeLegacyDisplayText(event.icon) : null,
  };
}

export default function QuestCommunityPulse({ currentHouse }: { currentHouse?: string | null }) {
  const [supabase] = useState(() => createClient());
  const [isLoading, setIsLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState<PulseEvent[]>([]);
  const [houseMomentum, setHouseMomentum] = useState<HouseMomentum>(EMPTY_MOMENTUM);
  const [lastRefreshLabel, setLastRefreshLabel] = useState("ינשוף מאזין");

  const fetchPulse = useCallback(async () => {
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [recentResponse, momentumResponse] = await Promise.all([
      supabase
        .from("activity_events")
        .select("id, actor_id, event_type, actor_name, actor_house, title, subtitle, icon, target_url, created_at")
        .eq("visibility", "public")
        .neq("event_type", "admin_test_event")
        .order("created_at", { ascending: false })
        .limit(RECENT_EVENT_LIMIT),
      supabase
        .from("activity_events")
        .select("event_type, actor_house, created_at")
        .eq("visibility", "public")
        .gte("created_at", sinceIso)
        .limit(300),
    ]);

    const nextMomentum = { ...EMPTY_MOMENTUM };
    (momentumResponse.data || []).forEach((row) => {
      if (!row.event_type || !MOMENTUM_EVENT_TYPES.has(row.event_type)) return;
      const houseId = resolveHouseId(row.actor_house);
      if (!houseId) return;
      nextMomentum[houseId] += 1;
    });

    const recentEventsRaw = (recentResponse.data as PulseEvent[] | null) || [];
    const actorIds = Array.from(new Set(
      recentEventsRaw
        .map((event) => event.actor_id)
        .filter((actorId): actorId is string => typeof actorId === "string" && actorId.length > 0),
    ));

    let recentEventsResolved = recentEventsRaw;

    if (actorIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", actorIds);

      const nameById = new Map(
        (profilesData || [])
          .filter((profile) => typeof profile.id === "string" && typeof profile.full_name === "string" && profile.full_name.trim().length > 0)
          .map((profile) => [profile.id, profile.full_name] as [string, string]),
      );

      recentEventsResolved = recentEventsRaw.map((event) =>
        normalizePulseEvent({
          ...event,
          actor_name: (event.actor_id && nameById.get(event.actor_id)) || event.actor_name,
        }),
      );
    } else {
      recentEventsResolved = recentEventsRaw.map(normalizePulseEvent);
    }

    setRecentEvents(recentEventsResolved);
    setHouseMomentum(nextMomentum);
    setLastRefreshLabel(Object.values(nextMomentum).some((value) => value > 0) ? "עודכן עכשיו על ידי ינשוף" : "ינשוף מאזין");
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => {
      void fetchPulse();
    }, 0);

    const channel = supabase
      .channel("quest-community-pulse")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_events" }, () => {
        void fetchPulse();
      })
      .subscribe();

    return () => {
      window.clearTimeout(initialLoadId);
      void supabase.removeChannel(channel);
    };
  }, [fetchPulse, supabase]);

  const ownHouseId = resolveHouseId(currentHouse);
  const rankedHouses = useMemo(() => {
    return HOUSE_IDS.map((houseId) => ({
      id: houseId,
      label: getHouseLabel(houseId) || houseId,
      momentum: houseMomentum[houseId] || 0,
      theme: getHouseVisualTheme(houseId)!,
    })).sort((left, right) => right.momentum - left.momentum);
  }, [houseMomentum]);

  const totalMomentum = useMemo(
    () => rankedHouses.reduce((sum, house) => sum + house.momentum, 0),
    [rankedHouses],
  );
  const activeHouses = useMemo(
    () => rankedHouses.filter((house) => house.momentum > 0).length,
    [rankedHouses],
  );
  const leadingHouse = rankedHouses[0];
  const ownHouse = rankedHouses.find((house) => house.id === ownHouseId) || null;
  const remaining = Math.max(0, COMMUNITY_GOAL - totalMomentum);
  const progressPercent = Math.min(100, Math.round((totalMomentum / COMMUNITY_GOAL) * 100));
  const ownHouseGap = ownHouse ? Math.max(0, (leadingHouse?.momentum || 0) - ownHouse.momentum) : 0;
  const liveCopy = pulseNarration(
    totalMomentum,
    remaining,
    leadingHouse?.label || "הטירה",
    leadingHouse?.momentum || 0,
    ownHouse?.label || null,
    ownHouse?.momentum || 0,
  );

  return (
    <section className="mb-10 rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-cinzel text-[11px] uppercase tracking-[0.25em] text-white/35">דופק הטירה</p>
          <h2 className="mt-1 font-cinzel text-2xl font-black text-white">הדים ממסדרונות הוגוורטס</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-cinzel uppercase tracking-[0.22em] text-emerald-100">
            {lastRefreshLabel}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-cinzel uppercase tracking-[0.22em] text-white/55">
            {totalMomentum} ניצוצות קסם פעילים
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black font-cinzel uppercase tracking-[0.22em] text-amber-100">
              <Flame size={12} className="text-amber-300" />
              זרם הקסם הנוכחי
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black font-cinzel uppercase tracking-[0.22em] text-cyan-100">
              <Users size={12} className="text-cyan-300" />
              {activeHouses} בתים מעוררים את הקסם
            </span>
          </div>

          <h3 className="mt-4 font-cinzel text-2xl font-black text-white">{liveCopy}</h3>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/60">
            זהו לא יומן המשימות האישי שלכם. כאן מהדהדים המעשים של כולם: כל לחש שהוטל, כל פרק שנפתח וכל משימה שהושלמה בלומוס מזרימים כוח לבית שלכם ומפיחים חיים חדשים בין קירות הטירה.
          </p>

          <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-bold text-white/55">
              <span>יעד התעוררות הטירה (יומי)</span>
              <span>{totalMomentum}/{COMMUNITY_GOAL}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-cyan-400 to-emerald-400 transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70">
                {remaining > 0 ? `עוד ${remaining} מעשים קסומים כדי להשלים את ההילה היומית` : "ההילה היומית של הוגוורטס כבר הושלמה"}
              </span>
              {ownHouse && (
                <span
                  className="rounded-full border px-3 py-1"
                  style={{
                    borderColor: withAlpha(ownHouse.theme.palette.readable, 0.28),
                    background: withAlpha(ownHouse.theme.palette.primary, 0.18),
                    color: ownHouse.theme.palette.contrast,
                  }}
                >
                  {ownHouse.label}: {ownHouse.momentum} ניצוצות קסם
                  {ownHouseGap > 0 ? ` · עוד ${ownHouseGap} כדי להשתוות לקצב המוביל` : " · הבית שלך בקצב המוביל"}
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {rankedHouses.map((house, index) => (
              <div
                key={house.id}
                className="rounded-[1.35rem] border p-4 transition-all duration-300"
                style={{
                  borderColor: house.theme.mutedBorder,
                  background: house.theme.surface,
                  boxShadow: ownHouseId === house.id ? house.theme.shadow : "none",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-cinzel text-xs font-black uppercase tracking-[0.18em]" style={{ color: house.theme.text }}>
                      {house.label}
                    </div>
                    <div className="mt-2 text-2xl font-black text-white">{house.momentum}</div>
                  </div>
                  <div
                    className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
                    style={{
                      color: house.theme.badgeText,
                      background: house.theme.badgeBackground,
                      border: `1px solid ${house.theme.badgeBorder}`,
                    }}
                  >
                    #{index + 1}
                  </div>
                </div>
                <div className="mt-3 text-[11px] leading-relaxed text-white/60">
                  {houseStatusLine(house.id, house.momentum)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/forums"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white/80 transition-all hover:border-white/20 hover:bg-white/[0.06]"
            >
              <WandSparkles size={14} />
              להצית את השיח בפורומים
            </Link>
            <Link
              href="/great-hall"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white/80 transition-all hover:border-white/20 hover:bg-white/[0.06]"
            >
              <Activity size={14} />
              להיכנס לאולם הגדול ולראות מי פה
            </Link>
            <Link
              href="/news"
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-black text-cyan-100 transition-all hover:border-cyan-300/35 hover:bg-cyan-500/15"
            >
              לעקוב אחרי ההדים בנביא היומי
              <ArrowLeft size={14} />
            </Link>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-cinzel text-[10px] uppercase tracking-[0.24em] text-white/35">מגילת הפעילות הכללית</p>
              <h3 className="mt-1 font-cinzel text-lg font-black text-white">הדים אחרונים מהטירה</h3>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-cinzel uppercase tracking-[0.2em] text-white/45">
              ציבורי בלבד
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="min-h-[88px] animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
              ))}
            </div>
          ) : recentEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
              <Sparkles className="mx-auto mb-3 text-cyan-300/50" size={20} />
              <p className="text-sm leading-relaxed text-white/50">
                עדיין אין הד ציבורי פתוח. לחש אחד, תגובה אחת או משימה אחת יכולים להעיר מחדש את המסדרונות.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event) => {
                const eventHouseId = resolveHouseId(event.actor_house);
                const eventTheme = eventHouseId ? getHouseVisualTheme(eventHouseId) : null;
                const href = getSafeInternalHref(event.target_url, "/map");
                const actorName = getDisplayActorName(event.actor_name);

                return (
                  <Link
                    key={event.id}
                    href={href}
                    className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-500/10 text-xl">
                          {event.icon || "✨"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm leading-relaxed text-white/85">
                            <span style={{ color: eventTheme?.text || "#f8fafc" }} className="font-black">
                              {actorName}
                            </span>
                            <span className="text-white/30"> · </span>
                            <span>{event.title || "פתח/ה תנועה חדשה"}</span>
                          </div>
                          {event.subtitle && (
                            <div className="mt-1 text-xs leading-relaxed text-white/55">
                              {event.subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-[10px] font-cinzel uppercase tracking-[0.18em] text-white/25">
                        {safeTimeAgo(event.created_at)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
