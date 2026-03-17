"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Sparkles } from "lucide-react";

export default function MagicTicker() {
    const [stats, setStats] = useState<string[]>(["מפעיל קסמי חיזוי..."]);
    const [onlineCount, setOnlineCount] = useState<number>(0);
    const supabase = createClient();

    useEffect(() => {
        // 1. הבאת הנתונים הסטטיים/מתעדכנים פחות
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

        // 2. חיבור ל-Realtime - התיקון הקריטי!
        let channel: any;

        const setupPresence = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return; // רק קוסמים מחוברים נספרים

            channel = supabase.channel('lumos_global_presence');

            channel.on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const rawUsers = Object.values(state).flat();

                // סופרים משתמשים ייחודיים בלבד (גם אם מישהו פתח בטלפון ובמחשב)
                const uniqueUsers = new Set(rawUsers.map((u: any) => u.user_id)).size;

                setOnlineCount(uniqueUsers);
            }).subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    // כאן אנחנו משדרים לכל הטירה "אני מחובר!" כדי שהספירה תהיה נכונה
                    await channel.track({ user_id: session.user.id });
                }
            });
        };

        setupPresence();

        return () => {
            clearInterval(interval);
            if (channel) supabase.removeChannel(channel);
        };
    }, [supabase]);

    // שילוב ההודעות הרגילות עם הודעת המחוברים בזמן אמת
    const displayMessages = [
        ...stats,
        `👥 קוסמים מחוברים כרגע: ${onlineCount > 0 ? onlineCount : 'טוען...'}`
    ];

    return (
        <div className="w-full bg-[#020617]/80 border-b border-amber-500/30 py-2.5 overflow-hidden whitespace-nowrap z-[100] backdrop-blur-md" dir="rtl">
            <div className="flex animate-marquee gap-16 items-center w-max">
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
                    100% { transform: translateX(33.33%); }
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