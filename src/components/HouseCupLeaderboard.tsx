"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Activity, Crown, Shield, Sparkles, Trophy, Zap } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";

type HouseId = "Gryffindor" | "Slytherin" | "Ravenclaw" | "Hufflepuff";

type ProfileRow = {
  house: HouseId | null;
  points_contributed: number | null;
  full_name: string | null;
};

type ActivityRow = {
  actor_house: HouseId | null;
  created_at: string | null;
};

type HouseMeta = {
  id: HouseId;
  label: string;
  accent: string;
  glow: string;
  border: string;
  surface: string;
  pill: string;
  line: string;
};

type HouseChampion = {
  name: string;
  points: number;
};

function isHouseId(value: string | null | undefined): value is HouseId {
  return value === "Gryffindor" || value === "Slytherin" || value === "Ravenclaw" || value === "Hufflepuff";
}

const HOUSE_META: HouseMeta[] = [
  {
    id: "Gryffindor",
    label: "גריפינדור",
    accent: "text-red-300",
    glow: "shadow-[0_0_35px_rgba(248,113,113,0.18)]",
    border: "border-red-400/25",
    surface: "from-red-500/14 via-red-500/6 to-transparent",
    pill: "border-red-400/25 bg-red-500/10 text-red-100",
    line: "from-red-400 via-red-300 to-amber-200",
  },
  {
    id: "Slytherin",
    label: "סלית'רין",
    accent: "text-emerald-300",
    glow: "shadow-[0_0_35px_rgba(52,211,153,0.18)]",
    border: "border-emerald-400/25",
    surface: "from-emerald-500/14 via-emerald-500/6 to-transparent",
    pill: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
    line: "from-emerald-400 via-emerald-300 to-cyan-200",
  },
  {
    id: "Ravenclaw",
    label: "רייבנקלו",
    accent: "text-blue-300",
    glow: "shadow-[0_0_35px_rgba(96,165,250,0.18)]",
    border: "border-blue-400/25",
    surface: "from-blue-500/14 via-blue-500/6 to-transparent",
    pill: "border-blue-400/25 bg-blue-500/10 text-blue-100",
    line: "from-blue-400 via-sky-300 to-cyan-200",
  },
  {
    id: "Hufflepuff",
    label: "הפלפאף",
    accent: "text-amber-300",
    glow: "shadow-[0_0_35px_rgba(251,191,36,0.18)]",
    border: "border-amber-400/25",
    surface: "from-amber-500/14 via-amber-500/6 to-transparent",
    pill: "border-amber-400/25 bg-amber-500/10 text-amber-100",
    line: "from-amber-400 via-yellow-300 to-orange-200",
  },
];

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
  if (value >= 8) return "רותח";
  if (value >= 4) return "מתחמם";
  if (value >= 1) return "נע";
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
    return `המירוץ רותח: רק ${args.leaderGap} נקודות מפרידות בין ${args.leaderLabel} ל-${args.runnerLabel}.`;
  }

  if (args.surgingMomentum >= 5 && args.surgingLabel !== args.leaderLabel) {
    return `${args.surgingLabel} מגיעה חם מאחור עם ${args.surgingMomentum} פעולות פעילות ביממה האחרונה.`;
  }

  if (args.biggestGainLabel && args.biggestGainValue > 0) {
    return `${args.biggestGainLabel} דוחפת קדימה עם קפיצה של ${args.biggestGainValue} נקודות מאז העדכון הקודם.`;
  }

  if (args.runnerLabel) {
    return `${args.leaderLabel} שומרת כרגע על יתרון של ${args.leaderGap} נקודות על ${args.runnerLabel}.`;
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
        if (!isHouseId(row.house)) return;
        nextPoints[row.house] += row.points_contributed || 0;

        if ((row.points_contributed || 0) > nextChampions[row.house].points) {
          nextChampions[row.house] = {
            name: row.full_name || "חבר קהילה",
            points: row.points_contributed || 0,
          };
        }
      });

      (activity as ActivityRow[] | null)?.forEach((row) => {
        if (!isHouseId(row.actor_house)) return;
        nextMomentum[row.actor_house] += 1;
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
          biggestGainLabel: biggestGainHouse
            ? HOUSE_META.find((house) => house.id === biggestGainHouse)?.label
            : undefined,
          biggestGainValue,
        }),
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

  const rankedHouses = [...HOUSE_META]
    .map((house) => ({
      ...house,
      points: housePoints[house.id] || 0,
      momentum: houseMomentum[house.id] || 0,
      champion: houseChampions[house.id],
    }))
    .sort((a, b) => b.points - a.points);

  const leader = rankedHouses[0];
  const runnerUp = rankedHouses[1];
  const leaderGap = Math.max(0, leader.points - (runnerUp?.points || 0));
  const highestMomentum = Math.max(...rankedHouses.map((house) => house.momentum), 1);
  const maxPoints = Math.max(...rankedHouses.map((house) => house.points), 100);
  const ownHouse = rankedHouses.find((house) => house.id === profile?.house);
  const ownShare = ownHouse && ownHouse.points > 0 ? Math.round(((profile?.points_contributed || 0) / ownHouse.points) * 100) : 0;
  const topMomentumHouse = [...rankedHouses].sort((a, b) => b.momentum - a.momentum)[0];

  return (
    <section className="w-full py-8" dir="rtl">
      <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.42)] backdrop-blur-2xl md:p-7">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-cinzel font-black uppercase tracking-[0.24em] text-amber-100">
                <Trophy size={12} className="text-amber-300" />
                גביע הבתים
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-cinzel font-black uppercase tracking-[0.22em] text-emerald-100">
                <Activity size={12} className="text-emerald-300" />
                {lastRefreshLabel}
              </span>
            </div>

            <h2 className="max-w-3xl font-cinzel text-2xl font-black text-white md:text-3xl" role="status" aria-live="polite">
              {liveCopy}
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
              הבית המוביל כרגע הוא <span className={leader.accent}>{leader.label}</span>, אבל כל דו-קרב, תגובה,
              קריאה או משימה יכולה להפוך את המאזן מחדש.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <SummaryChip label="פער לפסגה" value={`${leaderGap} נק׳`} tone="amber" />
              <SummaryChip
                label="בית חם"
                value={`${topMomentumHouse.label} • ${topMomentumHouse.momentum} פעולות`}
                tone="emerald"
              />
              <SummaryChip
                label="תרומתך"
                value={profile?.house ? `${profile?.points_contributed || 0} נק׳ • ${ownShare}% מהבית` : "התחבר/י כדי לראות השפעה"}
                tone="blue"
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5 md:p-6">
            <p className="font-cinzel text-[10px] uppercase tracking-[0.24em] text-white/35">שורת המירוץ</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-cinzel text-xs font-black text-amber-100">מוביל נוכחי</p>
                    <p className={`mt-1 font-cinzel text-xl font-black ${leader.accent}`}>{leader.label}</p>
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
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-sm font-cinzel font-black uppercase tracking-[0.18em] text-cyan-100 transition-all hover:border-cyan-300/40 hover:bg-cyan-500/15"
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
            const isOwnHouse = profile?.house === house.id;
            const isLeading = house.id === leader.id;
            const isHighlighted = highlightHouse === house.id;

            return (
              <article
                key={house.id}
                className={`relative overflow-hidden rounded-[2rem] border bg-black/20 p-5 transition-all duration-500 ${house.border} ${house.glow} ${isHighlighted ? "scale-[1.02]" : ""}`}
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${house.surface}`} />
                <div className="relative">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-cinzel font-black uppercase tracking-[0.18em] ${house.pill}`}>
                          מקום {index + 1}
                        </span>
                        {isOwnHouse && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-cinzel font-black uppercase tracking-[0.18em] text-white/75">
                            הבית שלך
                          </span>
                        )}
                      </div>
                      <h3 className={`mt-3 font-cinzel text-2xl font-black ${house.accent}`}>{house.label}</h3>
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
                        aria-label={`מרחק ההובלה של ${house.label}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progressWidth}
                        className={`h-full rounded-full bg-gradient-to-r ${house.line}`}
                        style={{ width: `${progressWidth}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-bold">
                      <span className="text-white/55">מומנטום</span>
                      <span className={house.accent}>{momentumCopy(house.momentum)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        role="progressbar"
                        aria-label={`מומנטום ל-24 שעות של ${house.label}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={momentumWidth}
                        className={`h-full rounded-full bg-gradient-to-r ${house.line}`}
                        style={{ width: `${momentumWidth}%` }}
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
                      <p className={`mt-1 font-cinzel font-black ${house.accent}`}>{house.champion.points.toLocaleString()} נק׳</p>
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

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "amber" | "emerald" | "blue";
}) {
  const tones: Record<"amber" | "emerald" | "blue", string> = {
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-100",
  };

  return (
    <div className={`rounded-2xl border px-3 py-2 ${tones[tone]}`}>
      <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-1 text-sm font-bold leading-relaxed text-white">{value}</p>
    </div>
  );
}
