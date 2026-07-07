"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Activity, Crown, Shield, Sparkles, Trophy, Zap } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { HOUSE_IDS, getHouseLabel, getHouseVisualTheme, resolveHouseId, withAlpha, type HouseId, type HouseVisualTheme } from "@/lib/houses";

type ProfileRow = {
  house: string | null;
  points_contributed: number | null;
  full_name: string | null;
};

type ActivityRow = {
  actor_house: string | null;
  created_at: string | null;
};

type HouseChampion = {
  name: string;
  points: number;
};

type HouseCardMeta = {
  id: HouseId;
  label: string;
  theme: HouseVisualTheme;
};

const HOUSE_META: HouseCardMeta[] = HOUSE_IDS.map((houseId) => ({
  id: houseId,
  label: getHouseLabel(houseId) || houseId,
  theme: getHouseVisualTheme(houseId)!,
}));

const EMPTY_POINTS: Record<HouseId, number> = {
  Gryffindor: 0,
  Slytherin: 0,
  Ravenclaw: 0,
  Hufflepuff: 0,
};

const EMPTY_CHAMPIONS: Record<HouseId, HouseChampion> = {
  Gryffindor: { name: "טרם נקבע", points: 0 },
  Slytherin: { name: "טרם נקבע", points: 0 },
  Ravenclaw: { name: "טרם נקבע", points: 0 },
  Hufflepuff: { name: "טרם נקבע", points: 0 },
};

function momentumCopy(value: number) {
  if (value >= 8) return "לוהט";
  if (value >= 4) return "מתחמם";
  if (value >= 1) return "בתנועה";
  return "שקט";
}

function liveNarration(args: {
  leaderLabel: string;
  runnerLabel?: string;
  leaderGap: number;
  surgingLabel: string;
  surgingMomentum: number;
  leaderChanged: boolean;
  biggestGainLabel?: string;
  biggestGainValue: number;
}) {
  if (args.leaderChanged && args.runnerLabel) {
    return `${args.leaderLabel} עקפה את ${args.runnerLabel} ועלתה לראש גביע הבתים.`;
  }

  if (args.leaderGap <= 25 && args.runnerLabel) {
    return `המרוץ צמוד במיוחד: רק ${args.leaderGap} נקודות מפרידות בין ${args.leaderLabel} ל-${args.runnerLabel}.`;
  }

  if (args.surgingMomentum >= 5 && args.surgingLabel !== args.leaderLabel) {
    return `${args.surgingLabel} מתחממת מאחור עם ${args.surgingMomentum} פעולות פעילות ביממה האחרונה.`;
  }

  if (args.biggestGainLabel && args.biggestGainValue > 0) {
    return `${args.biggestGainLabel} דוחפת קדימה עם קפיצה של ${args.biggestGainValue} נקודות מאז העדכון הקודם.`;
  }

  if (args.runnerLabel) {
    return `${args.leaderLabel} מחזיקה כרגע ביתרון של ${args.leaderGap} נקודות על ${args.runnerLabel}.`;
  }

  return `${args.leaderLabel} מחזיקה כרגע במושכות המירוץ.`;
}

export default function HouseCupLeaderboard() {
  const [supabase] = useState(() => createClient());
  const { profile } = useAuth();
  const [housePoints, setHousePoints] = useState<Record<HouseId, number>>(EMPTY_POINTS);
  const [houseMomentum, setHouseMomentum] = useState<Record<HouseId, number>>(EMPTY_POINTS);
  const [houseChampions, setHouseChampions] = useState<Record<HouseId, HouseChampion>>(EMPTY_CHAMPIONS);
  const [liveCopy, setLiveCopy] = useState("הגביע פתוח וכל פעולה בטירה עדיין יכולה להזיז את המאזן.");
  const [lastRefreshLabel, setLastRefreshLabel] = useState("מתעדכן בזמן אמת");
  const [highlightHouse, setHighlightHouse] = useState<HouseId | null>(null);
  const previousPointsRef = useRef<Record<HouseId, number>>(EMPTY_POINTS);
  const previousLeaderRef = useRef<HouseId | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchBoard = async () => {
      const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [{ data: profiles }, { data: activity }] = await Promise.all([
        supabase.from("profiles").select("house, points_contributed, full_name"),
        supabase
          .from("activity_events")
          .select("actor_house, created_at")
          .gte("created_at", dayAgoIso)
          .limit(500),
      ]);

      const nextPoints: Record<HouseId, number> = { ...EMPTY_POINTS };
      const nextMomentum: Record<HouseId, number> = { ...EMPTY_POINTS };
      const nextChampions: Record<HouseId, HouseChampion> = { ...EMPTY_CHAMPIONS };

      (profiles as ProfileRow[] | null)?.forEach((row) => {
        const houseId = resolveHouseId(row.house);
        if (!houseId) return;

        nextPoints[houseId] += row.points_contributed || 0;

        if ((row.points_contributed || 0) > nextChampions[houseId].points) {
          nextChampions[houseId] = {
            name: row.full_name || "חבר קהילה",
            points: row.points_contributed || 0,
          };
        }
      });

      (activity as ActivityRow[] | null)?.forEach((row) => {
        const houseId = resolveHouseId(row.actor_house);
        if (!houseId) return;
        nextMomentum[houseId] += 1;
      });

      const sortedByPoints = [...HOUSE_META].sort((a, b) => nextPoints[b.id] - nextPoints[a.id]);
      const leader = sortedByPoints[0];
      const runnerUp = sortedByPoints[1];
      const surgingHouse = [...HOUSE_META].sort((a, b) => nextMomentum[b.id] - nextMomentum[a.id])[0];

      let biggestGainHouse: HouseId | null = null;
      let biggestGainValue = 0;

      HOUSE_META.forEach((house) => {
        const diff = nextPoints[house.id] - previousPointsRef.current[house.id];
        if (diff > biggestGainValue) {
          biggestGainValue = diff;
          biggestGainHouse = house.id;
        }
      });

      const leaderChanged = previousLeaderRef.current != null && previousLeaderRef.current !== leader.id;
      previousLeaderRef.current = leader.id;
      previousPointsRef.current = nextPoints;

      setHousePoints(nextPoints);
      setHouseMomentum(nextMomentum);
      setHouseChampions(nextChampions);
      setLastRefreshLabel(biggestGainValue > 0 ? "עודכן עכשיו" : "מעודכן לרגע זה");
      setLiveCopy(
        liveNarration({
          leaderLabel: leader.label,
          runnerLabel: runnerUp?.label,
          leaderGap: Math.max(0, nextPoints[leader.id] - (runnerUp ? nextPoints[runnerUp.id] : 0)),
          surgingLabel: surgingHouse.label,
          surgingMomentum: nextMomentum[surgingHouse.id],
          leaderChanged,
          biggestGainLabel: biggestGainHouse ? HOUSE_META.find((house) => house.id === biggestGainHouse)?.label : undefined,
          biggestGainValue,
        })
      );

      if (biggestGainHouse && biggestGainValue > 0) {
        setHighlightHouse(biggestGainHouse);
        if (highlightTimeoutRef.current !== null) {
          window.clearTimeout(highlightTimeoutRef.current);
        }
        highlightTimeoutRef.current = window.setTimeout(() => {
          setHighlightHouse(null);
          highlightTimeoutRef.current = null;
        }, 2200);
      }
    };

    void fetchBoard();

    const profilesChannel = supabase
      .channel("house-cup-profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void fetchBoard();
      })
      .subscribe();

    const eventsChannel = supabase
      .channel("house-cup-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_events" }, () => {
        void fetchBoard();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(profilesChannel);
      void supabase.removeChannel(eventsChannel);
    };
  }, [supabase]);

  const rankedHouses = useMemo(() => (
    [...HOUSE_META]
      .map((house) => ({
        ...house,
        points: housePoints[house.id] || 0,
        momentum: houseMomentum[house.id] || 0,
        champion: houseChampions[house.id],
      }))
      .sort((a, b) => b.points - a.points)
  ), [houseChampions, houseMomentum, housePoints]);

  const leader = rankedHouses[0];
  const runnerUp = rankedHouses[1];
  const leaderGap = Math.max(0, leader.points - (runnerUp?.points || 0));
  const highestMomentum = Math.max(...rankedHouses.map((house) => house.momentum), 1);
  const maxPoints = Math.max(...rankedHouses.map((house) => house.points), 100);
  const ownHouseId = resolveHouseId(profile?.house);
  const ownHouse = rankedHouses.find((house) => house.id === ownHouseId);
  const ownShare = ownHouse && ownHouse.points > 0
    ? Math.round(((profile?.points_contributed || 0) / ownHouse.points) * 100)
    : 0;
  const topMomentumHouse = [...rankedHouses].sort((a, b) => b.momentum - a.momentum)[0];

  return (
    <section className="w-full py-8" dir="rtl">
      <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.42)] backdrop-blur-2xl md:p-7">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 font-cinzel text-[10px] font-black uppercase tracking-[0.24em] text-amber-100">
                <Trophy size={12} className="text-amber-300" />
                גביע הבתים
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 font-cinzel text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100">
                <Activity size={12} className="text-emerald-300" />
                {lastRefreshLabel}
              </span>
            </div>

            <h2 className="max-w-3xl font-cinzel text-2xl font-black text-white md:text-3xl" role="status" aria-live="polite">
              {liveCopy}
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
              הבית המוביל כרגע הוא <span style={{ color: leader.theme.text }}>{leader.label}</span>, אבל כל דו-קרב, תגובה,
              קריאה או משימה יכולים להפוך את המאזן מחדש.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <SummaryChip label="פער לפסגה" value={`${leaderGap} נק׳`} color="#fbbf24" />
              <SummaryChip label="מומנטום חם" value={`${topMomentumHouse.label} · ${topMomentumHouse.momentum} פעולות`} color="#6ee7b7" />
              <SummaryChip
                label="תרומתך"
                value={ownHouseId ? `${profile?.points_contributed || 0} נק׳ · ${ownShare}% מהבית` : "התחברו כדי לראות השפעה"}
                color="#93c5fd"
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5 md:p-6">
            <p className="font-cinzel text-[10px] uppercase tracking-[0.24em] text-white/35">שורת המירוץ</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border p-4" style={{ borderColor: leader.theme.badgeBorder, background: leader.theme.surfaceStrong }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-cinzel text-xs font-black" style={{ color: withAlpha(leader.theme.text, 0.92) }}>מוביל נוכחי</p>
                    <p className="mt-1 font-cinzel text-xl font-black" style={{ color: leader.theme.text }}>{leader.label}</p>
                  </div>
                  <Crown className="text-amber-300" size={24} />
                </div>
                <p className="mt-3 text-sm text-white/65">
                  {leader.points.toLocaleString()} נקודות, יתרון של {leaderGap.toLocaleString()} על המקום השני.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-white/70">
                  <Zap size={16} className="text-cyan-300" />
                  <p className="font-cinzel text-xs font-black uppercase tracking-[0.18em]">מומנטום 24 שעות</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/60">
                  {topMomentumHouse.label} היא הבית הפעיל ביותר כרגע עם {topMomentumHouse.momentum} פעולות שנרשמו ביומן הפעילות.
                </p>
              </div>

              <Link
                href="/house-cup"
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 font-cinzel text-sm font-black uppercase tracking-[0.18em] text-cyan-100 transition-all hover:border-cyan-300/40 hover:bg-cyan-500/15"
              >
                להיכל הגביע
                <Sparkles size={14} />
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {rankedHouses.map((house, index) => {
            const gapToLeader = Math.max(0, leader.points - house.points);
            const progressWidth = Math.max(10, Math.round((house.points / maxPoints) * 100));
            const momentumWidth = Math.max(8, Math.round((house.momentum / highestMomentum) * 100));
            const isOwnHouse = ownHouseId === house.id;
            const isLeading = house.id === leader.id;
            const isHighlighted = highlightHouse === house.id;

            return (
              <article
                key={house.id}
                className={`relative overflow-hidden rounded-[2rem] border bg-black/20 p-5 transition-all duration-500 ${isHighlighted ? "scale-[1.02]" : ""}`}
                style={{
                  borderColor: isHighlighted ? house.theme.border : house.theme.mutedBorder,
                  boxShadow: isHighlighted ? house.theme.shadow : `0 0 22px ${house.theme.softGlow}`,
                }}
              >
                <div className="pointer-events-none absolute inset-0" style={{ background: house.theme.surface }} />
                <div className="relative">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full border px-2.5 py-1 font-cinzel text-[10px] font-black uppercase tracking-[0.18em]"
                          style={{
                            color: house.theme.badgeText,
                            background: house.theme.badgeBackground,
                            borderColor: house.theme.badgeBorder,
                          }}
                        >
                          מקום {index + 1}
                        </span>
                        {isOwnHouse && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-cinzel text-[10px] font-black uppercase tracking-[0.18em] text-white/75">
                            הבית שלך
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 font-cinzel text-2xl font-black" style={{ color: house.theme.text }}>{house.label}</h3>
                    </div>
                    {isLeading ? <Crown className="text-amber-300" size={22} /> : <Shield className="text-white/25" size={20} />}
                  </div>

                  <p className="font-cinzel text-3xl font-black text-white">{house.points.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-white/55">
                    {isLeading ? `מובילה כרגע ב-${leaderGap.toLocaleString()} נקודות` : `חסרות עוד ${gapToLeader.toLocaleString()} נקודות לפסגה`}
                  </p>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-white/45">
                      <span>מרחק מהובלה</span>
                      <span>{progressWidth}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        role="progressbar"
                        aria-label={`מרחק מהובלה של ${house.label}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progressWidth}
                        className="h-full rounded-full"
                        style={{ width: `${progressWidth}%`, background: `linear-gradient(to left, ${house.theme.progressStart}, ${house.theme.progressEnd})` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-bold">
                      <span className="text-white/55">מומנטום</span>
                      <span style={{ color: house.theme.text }}>{momentumCopy(house.momentum)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        role="progressbar"
                        aria-label={`מומנטום ל-24 שעות של ${house.label}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={momentumWidth}
                        className="h-full rounded-full"
                        style={{ width: `${momentumWidth}%`, background: `linear-gradient(to left, ${house.theme.progressStart}, ${house.theme.progressEnd})` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-white/45">{house.momentum} פעולות פעילות נרשמו לבית הזה ביממה האחרונה.</p>
                  </div>

                  <div className="mt-4 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <p className="text-white/35">אלוף הבית כרגע</p>
                      <p className="mt-1 font-cinzel font-black text-white/85">{house.champion.name}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-white/35">תרומה מובילה</p>
                      <p className="mt-1 font-cinzel font-black" style={{ color: house.theme.text }}>
                        {house.champion.points.toLocaleString()} נק׳
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SummaryChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-2xl border px-3 py-2"
      style={{
        borderColor: withAlpha(color, 0.22),
        background: withAlpha(color, 0.08),
      }}
    >
      <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-1 text-sm font-bold leading-relaxed text-white">{value}</p>
    </div>
  );
}
