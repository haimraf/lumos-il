"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bird, Coins, Flame, Leaf, Newspaper, Skull, Star, Trophy, type LucideIcon } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { NextActionRecommendation } from "@/lib/gameplay/nextActionEngine";
import { HOUSE_IDS, getHousePalette, withAlpha, type HouseId } from "@/lib/houses";

type HouseMeta = {
  label: string;
  short: string;
  color: string;
  glow: string;
  accent: string;
  icon: LucideIcon;
};

type ProfilePointsRow = {
  house: string | null;
  points_contributed: number | null;
};

type NewsTickerRow = {
  id: string;
  title: string;
};

type DuelParticipantRow = {
  full_name: string | null;
};

type DuelTickerRow = {
  id: string;
  winner_id: string | null;
  challenger_id: string | null;
  opponent_id: string | null;
  winner: DuelParticipantRow | DuelParticipantRow[] | null;
  challenger: DuelParticipantRow | DuelParticipantRow[] | null;
  opponent: DuelParticipantRow | DuelParticipantRow[] | null;
};

const HOUSE_ICON_MAP: Record<HouseId, LucideIcon> = {
  Gryffindor: Flame,
  Slytherin: Skull,
  Ravenclaw: Bird,
  Hufflepuff: Leaf,
};

const HOUSE_META: Record<HouseId, HouseMeta> = HOUSE_IDS.reduce((acc, houseId) => {
  const palette = getHousePalette(houseId);
  if (!palette) return acc;

  acc[houseId] = {
    label: palette.label,
    short: palette.shortLabel,
    color: palette.readable,
    glow: withAlpha(palette.readable, 0.5),
    accent: palette.primary,
    icon: HOUSE_ICON_MAP[houseId],
  };

  return acc;
}, {} as Record<HouseId, HouseMeta>);

function getParticipantName(participant: DuelParticipantRow | DuelParticipantRow[] | null) {
  if (Array.isArray(participant)) return participant[0]?.full_name || null;
  return participant?.full_name || null;
}

type MagicTickerProps = {
  nextAction?: NextActionRecommendation | null;
  nextActionLoading?: boolean;
};

export default function MagicTicker({ nextAction = null, nextActionLoading = false }: MagicTickerProps) {
  const { profile } = useAuth();
  const [supabase] = useState(() => createClient());
  const [houses, setHouses] = useState<Record<HouseId, number>>({
    Gryffindor: 0,
    Slytherin: 0,
    Ravenclaw: 0,
    Hufflepuff: 0,
  });
  const [tickerItems, setTickerItems] = useState<{ id: string; title: string; href: string }[]>([]);
  const [tickerReady, setTickerReady] = useState(false);

  const fetchTickerData = useCallback(async () => {
    const [{ data: profiles }, { data: news }, { data: recentDuels }] = await Promise.all([
      supabase.from("profiles").select("house, points_contributed"),
      supabase.from("news").select("id, title").order("created_at", { ascending: false }).limit(5),
      supabase
        .from("duels")
        .select(`
          id,
          winner_id,
          challenger_id,
          opponent_id,
          winner:profiles!duels_winner_id_fkey(full_name),
          challenger:profiles!duels_challenger_id_fkey(full_name),
          opponent:profiles!duels_opponent_id_fkey(full_name)
        `)
        .eq("status", "finished")
        .order("finished_at", { ascending: false })
        .limit(3),
    ]);

    const nextPoints: Record<HouseId, number> = {
      Gryffindor: 0,
      Slytherin: 0,
      Ravenclaw: 0,
      Hufflepuff: 0,
    };

    (profiles as ProfilePointsRow[] | null)?.forEach((entry) => {
      if (!entry.house || !(entry.house in nextPoints)) return;
      nextPoints[entry.house as HouseId] += entry.points_contributed || 0;
    });
    setHouses(nextPoints);

    const nextItems: { id: string; title: string; href: string }[] = ((news as NewsTickerRow[] | null) || []).map((article) => ({
      id: article.id,
      title: article.title,
      href: `/news?article=${article.id}`,
    }));

    ((recentDuels as DuelTickerRow[] | null) || []).forEach((duel) => {
      const winnerName = getParticipantName(duel.winner);
      const loserName = duel.winner_id === duel.challenger_id
        ? getParticipantName(duel.opponent)
        : getParticipantName(duel.challenger);

      if (!winnerName || !loserName) return;
      nextItems.push({
        id: `duel-${duel.id}`,
        title: `${winnerName} ניצח/ה את ${loserName} בדו-קרב!`,
        href: "/arena",
      });
    });

    setTickerItems(nextItems);
    setTickerReady(true);
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchTickerData();
    });

    const profilesChannel = supabase
      .channel("ticker-profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void fetchTickerData();
      })
      .subscribe();

    const newsChannel = supabase
      .channel("ticker-news")
      .on("postgres_changes", { event: "*", schema: "public", table: "news" }, () => {
        void fetchTickerData();
      })
      .subscribe();

    const duelsChannel = supabase
      .channel("ticker-duels")
      .on("postgres_changes", { event: "*", schema: "public", table: "duels" }, () => {
        void fetchTickerData();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(profilesChannel);
      void supabase.removeChannel(newsChannel);
      void supabase.removeChannel(duelsChannel);
    };
  }, [fetchTickerData, supabase]);

  const leadingHouse = HOUSE_IDS.reduce((currentLeader, currentHouse) =>
    houses[currentLeader] >= houses[currentHouse] ? currentLeader : currentHouse
  );
  const leadingMeta = HOUSE_META[leadingHouse];
  const galleons = profile?.galleons ?? 0;
  const missionTitle = nextActionLoading
    ? "מגבש את הצעד הבא שלך"
    : nextAction?.title || "לוח המשימות מחכה לך";

  return (
    <div
      data-magic-ticker
      className="relative z-10 w-full border-t border-amber-500/10 bg-[#020408]/70 py-1 backdrop-blur-xl md:py-2.5"
      dir="rtl"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-3 md:gap-4 md:px-6">
        <div className="flex shrink-0 items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-xl px-2 py-1 md:gap-1.5 md:px-2.5 md:py-1.5"
            style={{
              background: "linear-gradient(to left, rgba(245,158,11,0.2), rgba(245,158,11,0.07))",
              border: "1px solid rgba(245,158,11,0.3)",
            }}
          >
            <Coins size={15} style={{ color: "#fbbf24", filter: "drop-shadow(0 0 6px rgba(245,158,11,0.7))" }} />
            <span className="font-cinzel text-sm font-black tabular-nums md:text-base" style={{ color: "#fbbf24" }}>
              {galleons.toLocaleString()}
            </span>
          </div>

          <Link href="/house-cup" className="group p-1" aria-label={`מוביל גביע הבתים: ${leadingMeta.label}`}>
            <Trophy
              size={18}
              className="transition-transform group-hover:scale-110"
              style={{ color: "#f59e0b", filter: "drop-shadow(0 0 10px rgba(245,158,11,0.5))" }}
            />
          </Link>
        </div>

        <div className="hidden shrink-0 items-center gap-5 md:flex">
          {HOUSE_IDS.map((house) => {
            const meta = HOUSE_META[house];
            const Icon = meta.icon;
            const isLeading = house === leadingHouse;
            const leadingSurface = `linear-gradient(135deg, ${withAlpha(meta.accent, 0.32)}, ${withAlpha(meta.color, 0.14)})`;

            return (
              <div
                key={house}
                className="flex items-center gap-1.5 transition-all duration-300"
                style={{
                  opacity: isLeading ? 1 : 0.78,
                  padding: isLeading ? "0.34rem 0.62rem" : "0.14rem 0",
                  borderRadius: "0.95rem",
                  background: isLeading ? leadingSurface : "transparent",
                  border: isLeading ? `1px solid ${withAlpha(meta.color, 0.38)}` : "1px solid transparent",
                  boxShadow: isLeading ? `0 0 24px ${withAlpha(meta.color, 0.2)}` : "none",
                }}
              >
                <Icon
                  size={13}
                  style={{
                    color: meta.color,
                    filter: isLeading ? `drop-shadow(0 0 8px ${meta.glow})` : "none",
                  }}
                />
                <div className="flex flex-col leading-none">
                  <span
                    className="font-cinzel text-[9px] font-black tracking-wider"
                    style={{ color: meta.color, opacity: isLeading ? 1 : 0.88 }}
                  >
                    {meta.short}
                    {isLeading && (
                      <Star size={7} className="mb-0.5 mr-0.5 inline" style={{ fill: meta.color, color: meta.color }} />
                    )}
                  </span>
                  <span
                    className="font-cinzel font-black tabular-nums"
                    style={{
                      fontSize: isLeading ? "1.05rem" : "0.9rem",
                      color: meta.color,
                      textShadow: isLeading ? `0 0 12px ${meta.glow}` : "none",
                      transition: "all 0.3s",
                    }}
                  >
                    {houses[house].toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <div
            className="hidden shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 sm:flex"
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
            aria-label={missionTitle}
          >
            <Newspaper size={12} style={{ color: "#fbbf24" }} className="animate-pulse" />
            <span className="whitespace-nowrap font-cinzel text-[9px] font-black uppercase tracking-widest text-amber-500/80">
              עדכונים חיים
            </span>
          </div>

          <div
            className="relative min-w-0 flex-1 overflow-hidden"
            style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}
          >
            {tickerReady && tickerItems.length > 0 ? (
              <div
                className="flex w-max items-center text-xs font-bold"
                style={{
                  color: "rgba(255,255,255,0.55)",
                  animation: "ticker-scroll-rtl 45s linear infinite",
                }}
              >
                {[...tickerItems, ...tickerItems].map((item, index) => (
                  <span key={`${item.id}-${index}`} className="flex items-center">
                    <Link href={item.href} className="cursor-pointer whitespace-nowrap transition-colors hover:text-amber-400">
                      {item.title}
                    </Link>
                    <span className="mx-3 shrink-0 text-amber-600/40">✦</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="flex h-full items-center whitespace-nowrap font-crimson text-xs italic text-white/20">
                הנביא היומי בדרך...
              </span>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ticker-scroll-rtl {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }
      `}</style>
    </div>
  );
}
