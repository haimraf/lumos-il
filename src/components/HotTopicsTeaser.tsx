"use client";

import { useState, useEffect } from "react";
import { Flame, Clock, MessageSquare, ArrowLeft, User, TrendingUp, Zap } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { motion } from "framer-motion";

function timeAgo(dateString: string) {
    if (!dateString) return "...";
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    if (seconds < 60) return "ממש עכשיו";
    if (minutes < 60) return `לפני ${minutes} דק'`;
    if (hours < 24) return `לפני ${hours} שעות`;
    if (days === 1) return "אתמול";
    return `לפני ${days} ימים`;
}

const HOUSE_COLORS: Record<string, { text: string; bg: string; border: string; glow: string }> = {
    Gryffindor: { text: "text-red-400", bg: "rgba(220,38,38,0.08)", border: "rgba(220,38,38,0.25)", glow: "rgba(220,38,38,0.15)" },
    Slytherin: { text: "text-emerald-400", bg: "rgba(5,150,105,0.08)", border: "rgba(5,150,105,0.25)", glow: "rgba(5,150,105,0.15)" },
    Ravenclaw: { text: "text-blue-400", bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.25)", glow: "rgba(37,99,235,0.15)" },
    Hufflepuff: { text: "text-amber-400", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.25)", glow: "rgba(251,191,36,0.15)" },
};

const HOUSE_HEX: Record<string, string> = {
    Gryffindor: '#f87171',
    Slytherin: '#34d399',
    Ravenclaw: '#60a5fa',
    Hufflepuff: '#fbbf24',
};

type Topic = {
    id: string;
    title: string;
    created_at: string;
    last_activity_at: string;
    reply_count: number;
    forums: { name: string; slug: string } | null;
    profiles: {
        full_name: string | null;
        username: string | null;
        house: string | null;
        avatar_url: string | null;
        user_groups: { name: string; color: string } | null;
    } | null;
};

export default function HotTopicsTeaser() {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchHotTopics() {
            try {
                const selectQuery = `
                    id, title, created_at, last_activity_at,
                    forums ( name, slug ),
                    profiles!threads_author_id_fkey ( full_name, username, house, avatar_url, user_groups(name, color) ),
                    forum_posts ( id )
                `;

                const { data, error } = await supabase
                    .from("threads")
                    .select(selectQuery)
                    .order("last_activity_at", { ascending: false })
                    .limit(12);

                if (error) throw error;

                // כאן התיקון - אנחנו מוודאים ש-forums ו-profiles הם אובייקטים ולא מערכים
                const processed: Topic[] = (data || []).map((t: any) => {
                    const forumObj = Array.isArray(t.forums) ? t.forums[0] : t.forums;
                    const profileObj = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;

                    return {
                        id: t.id,
                        title: t.title,
                        created_at: t.created_at,
                        last_activity_at: t.last_activity_at,
                        reply_count: t.forum_posts?.length || 0,
                        forums: forumObj || null,
                        profiles: profileObj || null
                    };
                });

                const sortedByHeat = [...processed].sort((a, b) => b.reply_count - a.reply_count);
                const hottest = sortedByHeat[0];

                const others = processed
                    .filter(t => t.id !== hottest?.id)
                    .slice(0, 2);

                setTopics(hottest ? [hottest, ...others] : []);
            } catch (e) {
                console.error("Error fetching hot topics:", e);
            } finally {
                setIsLoading(false);
            }
        }
        fetchHotTopics();
    }, [supabase]);

    return (
        <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-12">
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                    <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                        <Flame className="text-amber-500 relative z-10" size={24} />
                        <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full animate-pulse" />
                    </div>
                    <div>
                        <h3 className="font-cinzel text-2xl md:text-3xl font-black text-white tracking-wide">
                            הלחשושים החמים
                        </h3>
                        <p className="text-[10px] md:text-xs text-white/30 uppercase tracking-[0.2em] font-cinzel mt-1">
                            דיונים פעילים במסדרונות
                        </p>
                    </div>
                </div>
                <Link
                    href="/forums"
                    className="hidden md:flex items-center gap-2 text-[10px] text-amber-500/60 hover:text-amber-400 transition-all font-black uppercase tracking-widest border border-amber-500/10 hover:border-amber-500/30 bg-white/5 px-5 py-2.5 rounded-xl"
                >
                    כל הפורומים <ArrowLeft size={12} />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-64 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] animate-pulse" />
                    ))
                ) : topics.length > 0 ? (
                    topics.map((topic, index) => {
                        const house = topic.profiles?.house || null;
                        const houseTheme = house ? HOUSE_COLORS[house] : null;
                        const authorName = topic.profiles?.full_name || topic.profiles?.username || "קוסם אנונימי";
                        const isHottest = index === 0;
                        const groupColor = (topic.profiles?.user_groups as any)?.color || null;
                        const nameColor = groupColor || (house ? HOUSE_HEX[house] : 'rgba(255,255,255,0.5)');

                        return (
                            <motion.div
                                key={topic.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="h-full"
                            >
                                <Link
                                    href={`/forums/thread/${topic.id}`}
                                    className="group relative flex flex-col h-full p-7 rounded-[2rem] border transition-all duration-500 overflow-hidden bg-[#0a0a0c] hover:-translate-y-2 active:scale-[0.98]"
                                    style={{
                                        borderColor: isHottest && houseTheme ? houseTheme.border : "rgba(255,255,255,0.06)",
                                        boxShadow: isHottest && houseTheme ? `0 20px 40px -15px ${houseTheme.glow}` : "none",
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-6 relative z-10">
                                        {isHottest ? (
                                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 font-black text-[9px] text-amber-500 uppercase tracking-widest">
                                                <TrendingUp size={10} /> הכי חם
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 font-black text-[9px] text-white/40 uppercase tracking-widest">
                                                <Zap size={10} className="fill-white/20" /> פעילות טרייה
                                            </span>
                                        )}
                                        <span className="text-[9px] font-black uppercase tracking-wider text-white/20">
                                            {topic.forums?.name}
                                        </span>
                                    </div>

                                    <h4 className="font-cinzel text-lg md:text-xl font-black text-white/90 group-hover:text-white leading-tight transition-colors mb-auto line-clamp-3 relative z-10">
                                        {topic.title}
                                    </h4>

                                    <div className="mt-8 pt-5 border-t border-white/[0.05] flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                                                {topic.profiles?.avatar_url ? (
                                                    <img src={topic.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={14} className="text-white/20" />
                                                )}
                                            </div>
                                            <span className="text-[11px] font-bold truncate max-w-[80px]" style={{ color: nameColor }}>
                                                {authorName.split('@')[0]}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 text-[10px] font-black text-white/30">
                                            <div className="flex items-center gap-1.5">
                                                <MessageSquare size={12} className="text-white/20" />
                                                <span className="tabular-nums">{topic.reply_count}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={12} className="text-white/20" />
                                                <span>{timeAgo(topic.last_activity_at)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {houseTheme && (
                                        <div className="absolute -bottom-10 -right-10 w-32 h-32 blur-[50px] opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
                                            style={{ background: houseTheme.glow }} />
                                    )}
                                </Link>
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="col-span-3 text-center py-20 opacity-40">
                        <p className="font-crimson italic text-xl text-white">המסדרונות שקטים... פתחו את הדיון הראשון!</p>
                    </div>
                )}
            </div>
        </section>
    );
}