"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Sparkles, Trophy, Newspaper, Users } from "lucide-react";

export default function MagicTicker() {
    const [stats, setStats] = useState<string[]>(["טוען עדכונים מהטירה..."]);
    const supabase = createClient();

    useEffect(() => {
        const fetchTickerData = async () => {
            // 1. נביא את מצב גביע הבתים
            const { data: p } = await supabase.from('profiles').select('house, points_contributed');
            const sums = p?.reduce((acc: any, curr: any) => {
                if (curr.house && curr.house !== 'Unsorted') acc[curr.house] = (acc[curr.house] || 0) + (curr.points_contributed || 0);
                return acc;
            }, {});

            // 2. נביא את הכתבה האחרונה
            const { data: news } = await supabase.from('news').select('title').order('created_at', { ascending: false }).limit(1);

            const messages = [
                `🏆 מצב גביע הבתים: גריפינדור (${sums?.Gryffindor || 0}) | סלית'רין (${sums?.Slytherin || 0}) | רייבנקלו (${sums?.Ravenclaw || 0}) | הפלפאף (${sums?.Hufflepuff || 0})`,
                news?.[0] ? `🗞️ חדש בנביא היומי: ${news[0].title}` : "🗞️ מהדורה חדשה של הנביא היומי בדרך...",
                "✨ השתמשו בלחש 'לומוס' כדי להאיר את הדרך!",
                `👥 כרגע בטירה: קוסמים ומכשפות מכל רחבי הארץ בפעילות שיא`
            ];
            setStats(messages);
        };

        fetchTickerData();
        const interval = setInterval(fetchTickerData, 60000); // רענון כל דקה
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 py-2 overflow-hidden whitespace-nowrap z-[100] backdrop-blur-sm">
            <div className="flex animate-marquee gap-20 items-center">
                {[...stats, ...stats].map((text, i) => (
                    <span key={i} className="font-cinzel text-[11px] font-bold text-amber-500/80 flex items-center gap-3 tracking-[0.1em]">
                        <Sparkles size={12} className="text-amber-400" /> {text.toUpperCase()}
                    </span>
                ))}
            </div>

            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
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