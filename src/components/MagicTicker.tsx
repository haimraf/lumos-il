"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Coins, Trophy, Flame, Skull, Bird, Leaf, Newspaper, Star } from "lucide-react";
import Link from "next/link";

const HOUSE_META: Record<string, { label: string; short: string; color: string; glow: string; icon: any }> = {
    Gryffindor: { label: "גריפינדור", short: "GRY", color: "#ef4444", glow: "rgba(239,68,68,0.6)", icon: Flame },
    Slytherin: { label: "סליתרין", short: "SLY", color: "#34d399", glow: "rgba(52,211,153,0.6)", icon: Skull },
    Ravenclaw: { label: "רייבנקלו", short: "RAV", color: "#60a5fa", glow: "rgba(96,165,250,0.6)", icon: Bird },
    Hufflepuff: { label: "הפלפאף", short: "HUF", color: "#fbbf24", glow: "rgba(251,191,36,0.6)", icon: Leaf },
};

const HOUSE_ORDER = ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"] as const;

export default function MagicTicker() {
    const supabase = createClient();
    const { profile } = useAuth();
    const tickerRef = useRef<HTMLDivElement>(null);
    const animRef = useRef<number | null>(null);
    const posRef = useRef(0);

    const [houses, setHouses] = useState<Record<string, number>>({
        Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0,
    });
    const [latestNews, setLatestNews] = useState<{ id: string; title: string }[]>([]);
    const [tickerReady, setTickerReady] = useState(false);

    const fetchTickerData = useCallback(async () => {
        const [{ data: profiles }, { data: news }] = await Promise.all([
            supabase.from("profiles").select("house, points_contributed"),
            supabase.from("news").select("id, title").order("created_at", { ascending: false }).limit(5),
        ]);

        const points: Record<string, number> = { Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 };
        profiles?.forEach((p: any) => {
            if (p.house && points[p.house] !== undefined) points[p.house] += p.points_contributed || 0;
        });
        setHouses(points);
        setLatestNews(news || []);
        setTickerReady(true);
    }, [supabase]);

    useEffect(() => {
        fetchTickerData();
        const channel = supabase
            .channel("ticker_live")
            .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchTickerData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [supabase, fetchTickerData]);

    // Smooth CSS animation for scrolling ticker
    const tickerContent = latestNews.map(n => n.title).join("   ✦   ");

    // Leading house
    const leadingHouse = HOUSE_ORDER.reduce((a, b) => houses[a] >= houses[b] ? a : b);
    const leadingMeta = HOUSE_META[leadingHouse];
    const LeadingIcon = leadingMeta.icon;

    const galleons = profile?.galleons ?? 0;
    const userHouse = profile?.house ? HOUSE_META[profile.house] : null;

    return (
        <div
            data-magic-ticker
            className="w-full border-t py-1.5 md:py-2.5"
            style={{
                background: "rgba(2,4,8,0.96)",
                borderColor: "rgba(245,158,11,0.15)",
                backdropFilter: "blur(12px)",
            }}
            dir="rtl"
        >
            <div className="w-full max-w-7xl mx-auto flex items-center gap-2 md:gap-4 px-3 md:px-6">

                {/* ── Left: Galleons + trophy ── */}
                <div className="flex items-center gap-2 shrink-0">
                    <div
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                        style={{
                            background: "linear-gradient(to left, rgba(245,158,11,0.2), rgba(245,158,11,0.07))",
                            border: "1px solid rgba(245,158,11,0.3)",
                        }}
                    >
                        <Coins
                            size={15}
                            style={{ color: "#fbbf24", filter: "drop-shadow(0 0 6px rgba(245,158,11,0.7))" }}
                        />
                        <span
                            className="font-cinzel font-black text-sm md:text-base tabular-nums"
                            style={{ color: "#fbbf24" }}
                        >
                            {galleons.toLocaleString()}
                        </span>
                    </div>
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

                {/* ── Center: House scores ── */}
                <div className="hidden md:flex items-center gap-5 shrink-0">
                    {HOUSE_ORDER.map(house => {
                        const meta = HOUSE_META[house];
                        const Icon = meta.icon;
                        const isLeading = house === leadingHouse;
                        const isMyHouse = profile?.house === house;
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
                                            <Star
                                                size={7}
                                                className="inline mr-0.5 mb-0.5"
                                                style={{ fill: meta.color, color: meta.color }}
                                            />
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

                {/* ── Right: Scrolling news ticker ── */}
                <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
                    <div
                        className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg"
                        style={{
                            background: "rgba(245,158,11,0.1)",
                            border: "1px solid rgba(245,158,11,0.2)",
                        }}
                    >
                        <Newspaper size={12} style={{ color: "#fbbf24" }} className="animate-pulse" />
                        <span className="font-cinzel text-[9px] font-black text-amber-500/80 uppercase tracking-widest whitespace-nowrap">
                            הנביא
                        </span>
                    </div>

                    {/* Ticker track */}
                    <div className="flex-1 min-w-0 overflow-hidden relative" style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}>
                        {tickerReady && latestNews.length > 0 ? (
                            <div
                                className="whitespace-nowrap text-xs font-bold"
                                style={{
                                    color: "rgba(255,255,255,0.55)",
                                    animation: "ticker-scroll 30s linear infinite",
                                    display: "inline-block",
                                }}
                            >
                                {/* Duplicate for seamless loop */}
                                {[...latestNews, ...latestNews].map((n, i) => (
                                    <span key={`${n.id}-${i}`}>
                                        <Link
                                            href={n.id ? `/news?article=${n.id}` : "#"}
                                            className="hover:text-amber-400 transition-colors cursor-pointer"
                                        >
                                            {n.title}
                                        </Link>
                                        <span className="mx-3 text-amber-600/40">✦</span>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <span className="text-xs text-white/20 italic font-crimson">הנביא היומי בדרך...</span>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes ticker-scroll {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
}
