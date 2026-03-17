"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Sparkles } from "lucide-react";

export default function MagicTicker() {
    const [stats, setStats] = useState<string[]>(["מפעיל קסמי חיזוי..."]);
    const [onlineCount, setOnlineCount] = useState<number>(0);
    const supabase = createClient();

    useEffect(() => {
        // 1. הבאת הנתונים הסטטיים/מתעדכנים פחות (חדשות ובתים)
        const fetchTickerData = async () => {
            const { data: p } = await supabase.from('profiles').select('house, points_contributed');
            const sums = p?.reduce((acc: any, curr: any) => {
                if (curr.house && curr.house !== 'Unsorted') acc[curr.house] = (acc[curr.house] || 0) + (curr.points_contributed || 0);
                return acc;
            }, {});

            const { data: news } = await supabase.from('news').select('title').order('created_at', { ascending: false }).limit(1);

            const messages = [
                `🏆 גביע הבתים: גריפינדור (${sums?.Gryffindor || 0}) • סלית'רין (${sums?.Slytherin || 0}) • רייבנקלו (${sums?.Ravenclaw || 0}) • הפלפאף (${sums?.Hufflepuff || 0})`,
                news?.[0] ? `🗞️ חדש בנביא היומי: ${news[0].title}` : "🗞️ מהדורה חדשה של הנביא היומי בדרך...",
                "✨ השתמשו בלחש 'Lumos' כדי להאיר את הדרך!"
            ];
            setStats(messages);
        };

        fetchTickerData();
        const interval = setInterval(fetchTickerData, 60000);

        // 2. חיבור ל-Realtime עבור כמות המחוברים בטירה
        const channel = supabase.channel('lumos_global_presence');
        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            // ספירת כל המשתמשים המחוברים כרגע
            const totalOnline = Object.values(state).flat().length;
            setOnlineCount(totalOnline);
        }).subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    // שילוב ההודעות הרגילות עם הודעת המחוברים בזמן אמת
    const displayMessages = [
        ...stats,
        `👥 קוסמים מחוברים כרגע: ${onlineCount > 0 ? onlineCount : 'טוען...'}`
    ];

    return (
        <div className="w-full bg-[#020617]/80 border-b border-amber-500/30 py-2.5 overflow-hidden whitespace-nowrap z-[100] backdrop-blur-md" dir="rtl">
            {/* הוספנו w-max כדי להבטיח שהאנימציה תחשב נכון את הרוחב */}
            <div className="flex animate-marquee gap-16 items-center w-max">
                {/* משלשים את המערך כדי שהלולאה תהיה אינסופית וחלקה גם במסכים גדולים */}
                {[...displayMessages, ...displayMessages, ...displayMessages].map((text, i) => (
                    <span
                        key={i}
                        className="font-cinzel text-xs md:text-sm font-bold text-amber-400 flex items-center gap-3 tracking-[0.08em] drop-shadow-[0_0_8px_rgba(245,158,11,0.3)] hover:text-amber-200 transition-colors cursor-default"
                    >
                        <Sparkles size={14} className="text-amber-500" />
                        {text.toUpperCase()}
                    </span>
                ))}
            </div>

            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(33.33%); } /* מתוקן ל-RTL ולמערך המשולש */
                }
                .animate-marquee {
                    display: inline-flex;
                    animation: marquee 40s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
}