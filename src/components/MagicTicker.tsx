"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation"; // הייבוא
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
    Coins,
    Trophy,
    Flame,
    Skull,
    Bird,
    Leaf,
    Newspaper
} from "lucide-react";
import Link from "next/link";

export default function MagicTicker() {
    const supabase = createClient();
    const { profile } = useAuth();
    const pathname = usePathname(); // הגדרת הנתיב לחישוב המיקום

    const [data, setData] = useState({
        houses: { Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 },
        latestNews: { id: "", title: "מחפש סקופים..." }
    });

    const fetchTickerData = useCallback(async () => {
        const { data: profiles } = await supabase.from('profiles').select('house, points_contributed');
        const points = profiles?.reduce((acc: any, curr: any) => {
            if (curr.house && acc[curr.house] !== undefined) acc[curr.house] += curr.points_contributed || 0;
            return acc;
        }, { Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 });

        const { data: news } = await supabase.from('news').select('id, title').order('created_at', { ascending: false }).limit(1).single();

        setData({
            houses: points || { Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 },
            latestNews: { id: news?.id || "", title: news?.title || "הנביא היומי בדרך..." }
        });
    }, [supabase]);

    useEffect(() => {
        fetchTickerData();
        const channel = supabase
            .channel('ticker_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                () => { fetchTickerData(); }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [supabase, fetchTickerData]);

    return (
        <div
            data-magic-ticker
            /* הגדלנו את הערכים כדי לדחוף את הסרגל עוד קצת למטה לפי התמונה השנייה שלך */
            className="w-full bg-[#020408]/95 border-t border-amber-600/20 py-2 md:py-3 px-3 md:px-8"
            dir="rtl"
        >
            <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex-1 flex justify-start min-w-0">
                    <Link
                        href={data.latestNews.id ? `/news?article=${data.latestNews.id}` : "#"}
                        className="group flex items-center gap-2 md:gap-3 bg-white/5 hover:bg-amber-500/10 p-2 rounded-xl transition-all border border-white/5 hover:border-amber-500/30 overflow-hidden max-w-full"
                    >
                        <div className="bg-amber-500/20 p-1.5 md:p-2 rounded-lg shrink-0">
                            <Newspaper size={16} className="text-amber-400 animate-pulse md:w-[18px] md:h-[18px]" />
                        </div>
                        <div className="flex flex-col overflow-hidden min-w-0">
                            <span className="text-[8px] md:text-[9px] font-cinzel text-amber-500/60 uppercase font-black">הנביא היומי</span>
                            <span className="text-[10px] md:text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                                {data.latestNews.title}
                            </span>
                        </div>
                    </Link>
                </div>

                <div className="flex-1 hidden md:flex justify-center items-center gap-4 lg:gap-8">
                    <HouseStat label="GRY" points={data.houses.Gryffindor} color="text-red-500" icon={Flame} glow="0 0 15px rgba(239, 68, 68, 0.6)" />
                    <HouseStat label="SLY" points={data.houses.Slytherin} color="text-emerald-400" icon={Skull} glow="0 0 15px rgba(52, 211, 153, 0.6)" />
                    <HouseStat label="RAV" points={data.houses.Ravenclaw} color="text-blue-400" icon={Bird} glow="0 0 15px rgba(96, 165, 250, 0.6)" />
                    <HouseStat label="HUF" points={data.houses.Hufflepuff} color="text-amber-400" icon={Leaf} glow="0 0 15px rgba(251, 191, 36, 0.6)" />
                </div>

                <div className="flex-1 flex justify-end items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-1.5 md:gap-2 bg-gradient-to-l from-amber-500/30 to-transparent px-2 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-amber-500/40">
                        <Coins size={16} className="text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)] md:w-5 md:h-5" />
                        <span className="text-amber-400 font-cinzel font-black text-sm md:text-lg">{profile?.galleons?.toLocaleString() || 0}</span>
                    </div>
                    <Link href="/house-cup" className="group p-0.5 md:p-1">
                        <Trophy size={22} className="text-amber-500 group-hover:scale-110 transition-transform drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] md:w-7 md:h-7" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

function HouseStat({ label, points, color, icon: Icon, glow }: any) {
    return (
        <div className="flex flex-col items-center gap-0.5 group">
            <div className="flex items-center gap-1 md:gap-1.5">
                <Icon size={12} className={`${color} md:w-[14px] md:h-[14px]`} style={{ filter: `drop-shadow(${glow})` }} />
                <span className={`font-cinzel text-[9px] md:text-[10px] font-black ${color} tracking-tighter`}>{label}</span>
            </div>
            <span className="font-cinzel text-base md:text-lg font-black text-white leading-none" style={{ textShadow: glow }}>
                {points.toLocaleString()}
            </span>
        </div>
    );
}