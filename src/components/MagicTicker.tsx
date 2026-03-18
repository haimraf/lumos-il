"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
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

export default function WizardHeader() {
    const supabase = createClient();
    const [data, setData] = useState({
        houses: { Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 },
        latestNews: { id: "", title: "מחפש סקופים..." },
        galleons: 0
    });

    const refreshData = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: profiles } = await supabase.from('profiles').select('house, points_contributed');
        const points = profiles?.reduce((acc: any, curr: any) => {
            if (curr.house && acc[curr.house] !== undefined) acc[curr.house] += curr.points_contributed || 0;
            return acc;
        }, { Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 });

        const { data: news } = await supabase.from('news').select('id, title').order('created_at', { ascending: false }).limit(1).single();

        let g = 0;
        if (session) {
            const { data: p } = await supabase.from('profiles').select('galleons').eq('id', session.user.id).single();
            g = p?.galleons || 0;
        }
        setData({ houses: points, latestNews: { id: news?.id || "", title: news?.title || "הנביא היומי בדרך..." }, galleons: g });
    }, [supabase]);

    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 30000);
        return () => clearInterval(interval);
    }, [refreshData]);

    return (
        /* z-10 מבטיח שהסרגל יהיה הכי נמוך שאפשר בשכבת ה-sticky */
        <div className="w-full bg-[#020408]/95 border-b-2 border-amber-600/30 py-3 px-4 md:px-8 z-10 sticky top-0 backdrop-blur-xl shadow-lg" dir="rtl">
            <div className="w-full flex items-center justify-between">

                {/* צד ימין (Start): חדשות */}
                <div className="flex-1 flex justify-start">
                    <Link
                        href={data.latestNews.id ? `/news?article=${data.latestNews.id}` : "#"}
                        className="group flex items-center gap-3 bg-white/5 hover:bg-amber-500/10 p-2 rounded-xl transition-all border border-white/5 hover:border-amber-500/30 overflow-hidden max-w-[250px] md:max-w-md"
                    >
                        <div className="bg-amber-500/20 p-2 rounded-lg shrink-0">
                            <Newspaper size={18} className="text-amber-400 animate-pulse" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-[9px] font-cinzel text-amber-500/60 uppercase font-black">הנביא היומי</span>
                            <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                                {data.latestNews.title}
                            </span>
                        </div>
                    </Link>
                </div>

                {/* מרכז (Center): גביע הבתים */}
                <div className="flex-1 hidden lg:flex justify-center items-center gap-8">
                    <HouseStat label="GRY" points={data.houses.Gryffindor} color="text-red-500" icon={Flame} glow="0 0 15px rgba(239, 68, 68, 0.6)" />
                    <HouseStat label="SLY" points={data.houses.Slytherin} color="text-emerald-400" icon={Skull} glow="0 0 15px rgba(52, 211, 153, 0.6)" />
                    <HouseStat label="RAV" points={data.houses.Ravenclaw} color="text-blue-400" icon={Bird} glow="0 0 15px rgba(96, 165, 250, 0.6)" />
                    <HouseStat label="HUF" points={data.houses.Hufflepuff} color="text-amber-400" icon={Leaf} glow="0 0 15px rgba(251, 191, 36, 0.6)" />
                </div>

                {/* צד שמאל (End): סטטוס אישי */}
                <div className="flex-1 flex justify-end items-center gap-4">
                    <div className="flex items-center gap-2 bg-gradient-to-l from-amber-500/30 to-transparent px-4 py-2 rounded-2xl border border-amber-500/40">
                        <Coins size={20} className="text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                        <span className="text-amber-400 font-cinzel font-black text-lg">{data.galleons}</span>
                    </div>
                    <Link href="/house-cup" className="group p-1">
                        <Trophy size={28} className="text-amber-500 group-hover:scale-110 transition-transform drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

function HouseStat({ label, points, color, icon: Icon, glow }: any) {
    return (
        <div className="flex flex-col items-center gap-0.5 group">
            <div className="flex items-center gap-1.5">
                <Icon size={14} className={`${color}`} style={{ filter: `drop-shadow(${glow})` }} />
                <span className={`font-cinzel text-[10px] font-black ${color} tracking-tighter`}>{label}</span>
            </div>
            <span className="font-cinzel text-lg font-black text-white leading-none" style={{ textShadow: glow }}>
                {points.toLocaleString()}
            </span>
        </div>
    );
}