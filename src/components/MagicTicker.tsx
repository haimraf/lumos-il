"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bird, Coins, Flame, Leaf, Newspaper, Skull, Sparkles, Star, Trophy, type LucideIcon } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { NextActionRecommendation } from "@/lib/gameplay/nextActionEngine";

type HouseMeta = {
    label: string;
    short: string;
    color: string;
    glow: string;
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

const HOUSE_META: Record<string, HouseMeta> = {
    Gryffindor: { label: "גריפינדור", short: "GRY", color: "#ef4444", glow: "rgba(239,68,68,0.6)", icon: Flame },
    Slytherin: { label: "סלית'רין", short: "SLY", color: "#34d399", glow: "rgba(52,211,153,0.6)", icon: Skull },
    Ravenclaw: { label: "רייבנקלו", short: "RAV", color: "#60a5fa", glow: "rgba(96,165,250,0.6)", icon: Bird },
    Hufflepuff: { label: "הפלפאף", short: "HUF", color: "#fbbf24", glow: "rgba(251,191,36,0.6)", icon: Leaf },
};

const HOUSE_ORDER = ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"] as const;

function getParticipantName(participant: DuelParticipantRow | DuelParticipantRow[] | null) {
    if (Array.isArray(participant)) {
        return participant[0]?.full_name || null;
    }

    return participant?.full_name || null;
}

type MagicTickerProps = {
    nextAction?: NextActionRecommendation | null;
    nextActionLoading?: boolean;
};

export default function MagicTicker({ nextAction = null, nextActionLoading = false }: MagicTickerProps) {
    const { profile } = useAuth();
    const [supabase] = useState(() => createClient());
    const [houses, setHouses] = useState<Record<string, number>>({
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

        const nextPoints: Record<string, number> = {
            Gryffindor: 0,
            Slytherin: 0,
            Ravenclaw: 0,
            Hufflepuff: 0,
        };

        (profiles as ProfilePointsRow[] | null)?.forEach((entry) => {
            if (entry.house && nextPoints[entry.house] !== undefined) {
                nextPoints[entry.house] += entry.points_contributed || 0;
            }
        });
        setHouses(nextPoints);

        const nextItems: { id: string; title: string; href: string }[] = ((news as NewsTickerRow[] | null) || []).map((article) => ({
            id: article.id,
            title: article.title,
            href: `/news?article=${article.id}`,
        }));

        ((recentDuels as DuelTickerRow[] | null) || []).forEach((duel) => {
            const winnerName = getParticipantName(duel.winner);
            const loserName =
                duel.winner_id === duel.challenger_id
                    ? getParticipantName(duel.opponent)
                    : getParticipantName(duel.challenger);

            if (winnerName && loserName) {
                nextItems.push({
                    id: `duel-${duel.id}`,
                    title: `${winnerName} ניצח את ${loserName} בדו-קרב!`,
                    href: "/arena",
                });
            }
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

    const leadingHouse = HOUSE_ORDER.reduce((currentLeader, currentHouse) =>
        houses[currentLeader] >= houses[currentHouse] ? currentLeader : currentHouse
    );
    const leadingMeta = HOUSE_META[leadingHouse];
    const LeadingIcon = leadingMeta.icon;
    const galleons = profile?.galleons ?? 0;
    const missionHref = nextAction?.href || "/quests";
    const missionTitle = nextActionLoading
        ? "מגבש את הצעד הבא שלך"
        : nextAction?.title || "פתח/י את לוח המשימות";
    const missionBadge = nextAction?.urgency === "high" ? "דחוף" : nextAction?.urgency === "medium" ? "פעיל" : null;

    return (
        <div
            data-magic-ticker
            className="w-full border-t border-amber-500/10 py-1 md:py-2.5 backdrop-blur-xl bg-[#020408]/70 relative z-10"
            dir="rtl"
        >
            <div className="w-full max-w-7xl mx-auto flex items-center gap-2 md:gap-4 px-3 md:px-6">
                <div className="flex items-center gap-2 shrink-0">
                    <div
                        className="flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-1 md:py-1.5 rounded-xl"
                        style={{
                            background: "linear-gradient(to left, rgba(245,158,11,0.2), rgba(245,158,11,0.07))",
                            border: "1px solid rgba(245,158,11,0.3)",
                        }}
                    >
                        <Coins size={15} style={{ color: "#fbbf24", filter: "drop-shadow(0 0 6px rgba(245,158,11,0.7))" }} />
                        <span className="font-cinzel font-black text-sm md:text-base tabular-nums" style={{ color: "#fbbf24" }}>
                            {galleons.toLocaleString()}
                        </span>
                    </div>
                    <Link href="/house-cup" className="group p-1" aria-label={`מוביל גביע הבתים: ${leadingMeta.label}`}>
                        <LeadingIcon
                            size={20}
                            className="transition-transform group-hover:scale-110"
                            style={{
                                color: leadingMeta.color,
                                filter: `drop-shadow(0 0 10px ${leadingMeta.glow})`,
                            }}
                        />
                    </Link>
                    <Link href="/house-cup" className="group p-1">
                        <Trophy
                            size={20}
                            className="transition-transform group-hover:scale-110"
                            style={{
                                color: "#f59e0b",
                                filter: "drop-shadow(0 0 10px rgba(245,158,11,0.5))",
                            }}
                        />
                    </Link>
                </div>

                <div className="hidden md:flex items-center gap-5 shrink-0">
                    {HOUSE_ORDER.map((house) => {
                        const meta = HOUSE_META[house];
                        const Icon = meta.icon;
                        const isLeading = house === leadingHouse;
                        return (
                            <div
                                key={house}
                                className="flex items-center gap-1.5 transition-all duration-300"
                                style={{ opacity: isLeading ? 1 : 0.55 }}
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
                                        className="font-cinzel font-black text-[9px] tracking-wider"
                                        style={{ color: meta.color, opacity: isLeading ? 1 : 0.7 }}
                                    >
                                        {meta.short}
                                        {isLeading && (
                                            <Star size={7} className="inline mr-0.5 mb-0.5" style={{ fill: meta.color, color: meta.color }} />
                                        )}
                                    </span>
                                    <span
                                        className="font-cinzel font-black tabular-nums"
                                        style={{
                                            fontSize: isLeading ? "1.05rem" : "0.9rem",
                                            color: isLeading ? meta.color : "rgba(255,255,255,0.6)",
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

                <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
                    {profile && (
                        <Link
                            href={missionHref}
                            className="hidden lg:flex items-center gap-2 shrink-0 rounded-xl border border-amber-500/20 bg-amber-500/[0.08] px-2.5 py-1.5 shadow-[0_0_16px_rgba(245,158,11,0.08)] transition-all hover:border-amber-500/35 hover:bg-amber-500/[0.12]"
                            aria-label={`מה כדאי לעשות עכשיו: ${missionTitle}`}
                        >
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/20 bg-black/20">
                                <Sparkles size={12} className="text-amber-400" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-cinzel text-[8px] font-black uppercase tracking-[0.24em] text-amber-300/75">
                                        מה עכשיו
                                    </span>
                                    {missionBadge && (
                                        <span className="rounded-full border border-amber-500/15 bg-black/20 px-1.5 py-0.5 font-assistant text-[9px] font-bold text-amber-100/80">
                                            {missionBadge}
                                        </span>
                                    )}
                                </div>
                                <p className="max-w-[220px] truncate font-assistant text-xs font-semibold text-white/82">
                                    {missionTitle}
                                </p>
                            </div>
                        </Link>
                    )}

                    <div
                        className="hidden sm:flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg"
                        style={{
                            background: "rgba(245,158,11,0.1)",
                            border: "1px solid rgba(245,158,11,0.2)",
                        }}
                    >
                        <Newspaper size={12} style={{ color: "#fbbf24" }} className="animate-pulse" />
                        <span className="font-cinzel text-[9px] font-black text-amber-500/80 uppercase tracking-widest whitespace-nowrap">
                            עדכונים חיים
                        </span>
                    </div>

                    <div className="flex-1 min-w-0 overflow-hidden relative" style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}>
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
                                        <Link href={item.href} className="hover:text-amber-400 transition-colors cursor-pointer whitespace-nowrap">
                                            {item.title}
                                        </Link>
                                        <span className="mx-3 text-amber-600/40 shrink-0">✦</span>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <span className="text-xs text-white/20 italic font-crimson whitespace-nowrap flex items-center h-full">
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
