"use client";

import { useState, useEffect } from "react";
import { Flame, Clock, MessageSquare, ArrowLeft, User, TrendingUp } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

function timeAgo(dateString: string) {
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
    reply_count: number;
    forums: { name: string; slug: string } | null;
    profiles: {
        full_name: string | null;
        username: string | null;
        house: string | null;
        avatar_url: string | null;
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
                    id, title, created_at,
                    forums ( name, slug ),
                    profiles!threads_author_id_fkey ( full_name, username, house, avatar_url ),
                    forum_posts ( id )
                `;

                const [{ data: recentData, error: e1 }, { data: newestData, error: e2 }] = await Promise.all([
                    supabase.from("threads").select(selectQuery).order("created_at", { ascending: false }).limit(20),
                    supabase.from("threads").select(selectQuery).order("created_at", { ascending: false }).limit(3),
                ]);

                if (e1) throw e1;
                if (e2) throw e2;

                const addCounts = (rows: any[]) => rows.map(t => ({
                    ...t,
                    reply_count: t.forum_posts?.length || 0,
                }));

                // Top 2 by reply count from last 20
                const topReplied = addCounts(recentData || [])
                    .sort((a, b) => b.reply_count - a.reply_count)
                    .slice(0, 2);

                // Newest 1
                const newest = addCounts(newestData || []).slice(0, 1);

                // Merge, deduplicate, take 3
                const seen = new Set<string>();
                const merged: Topic[] = [];
                for (const t of [...topReplied, ...newest]) {
                    if (!seen.has(t.id)) { seen.add(t.id); merged.push(t); }
                    if (merged.length === 3) break;
                }

                setTopics(merged);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }
        fetchHotTopics();
    }, [supabase]);

    return (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">

            {/* כותרת */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Flame className="text-amber-500 relative z-10" size={28} />
                        <div className="absolute inset-0 bg-amber-500 blur-xl opacity-50 rounded-full" />
                    </div>
                    <div>
                        <h3 className="font-cinzel text-xl md:text-3xl font-black text-white tracking-tight">
                            הלחשושים החמים
                        </h3>
                        <p className="text-[10px] text-white/25 uppercase tracking-widest font-cinzel mt-0.5">
                            דיונים פעילים באולם הגדול
                        </p>
                    </div>
                </div>
                <Link
                    href="/forums"
                    className="hidden md:flex items-center gap-2 text-xs text-amber-500/60 hover:text-amber-400 transition-colors font-cinzel uppercase tracking-widest border border-amber-500/15 hover:border-amber-500/30 px-4 py-2 rounded-full"
                >
                    כל הפורומים <ArrowLeft size={12} />
                </Link>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-52 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
                    ))
                ) : topics.length > 0 ? (
                    topics.map((topic, index) => {
                        const house = topic.profiles?.house || null;
                        const houseTheme = house ? HOUSE_COLORS[house] : null;
                        const authorName = (() => {
                            const name = topic.profiles?.full_name || topic.profiles?.username || "קוסם אנונימי";
                            return name.includes("@") ? name.split("@")[0] : name;
                        })();
                        const isHottest = index === 0;

                        return (
                            <Link
                                key={topic.id}
                                href={`/forums/thread/${topic.id}`}
                                className="group relative flex flex-col justify-between p-5 md:p-6 rounded-2xl border transition-all duration-500 overflow-hidden hover:-translate-y-1"
                                style={{
                                    background: houseTheme
                                        ? `linear-gradient(135deg, ${houseTheme.bg} 0%, rgba(2,6,23,0.95) 60%)`
                                        : "rgba(255,255,255,0.02)",
                                    borderColor: houseTheme ? houseTheme.border : "rgba(255,255,255,0.06)",
                                    boxShadow: isHottest && houseTheme
                                        ? `0 0 40px ${houseTheme.glow}`
                                        : "none",
                                }}
                            >
                                {/* Shimmer on hover */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

                                {/* Hot badge */}
                                {isHottest && (
                                    <div className="absolute top-4 left-4 flex items-center gap-1 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full">
                                        <TrendingUp size={9} className="text-amber-400" />
                                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">הכי חם</span>
                                    </div>
                                )}

                                <div className="relative z-10">
                                    {/* Forum name */}
                                    {topic.forums?.name && (
                                        <span className="inline-block text-[9px] font-black uppercase tracking-[0.2em] mb-3 mt-1"
                                            style={{ color: house ? HOUSE_HEX[house] : 'rgba(245,158,11,0.6)' }}>
                                            {topic.forums.name}
                                        </span>
                                    )}

                                    {/* Title */}
                                    <h4 className="font-cinzel text-base md:text-lg font-black text-white/90 group-hover:text-white line-clamp-2 leading-snug transition-colors mb-4">
                                        {topic.title}
                                    </h4>
                                </div>

                                {/* Footer */}
                                <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/[0.05]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-xs shrink-0"
                                            style={{ background: houseTheme ? houseTheme.bg : "rgba(255,255,255,0.05)", border: `1px solid ${houseTheme ? houseTheme.border : "rgba(255,255,255,0.1)"}` }}>
                                            {topic.profiles?.avatar_url
                                                ? <img src={topic.profiles.avatar_url} alt={authorName} className="w-full h-full object-cover" />
                                                : <User size={10} className={houseTheme?.text || "text-white/40"} />
                                            }
                                        </div>
                                        <span className={`text-xs font-bold ${houseTheme?.text || 'text-white/40'}`}>
                                            {authorName}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 text-[11px] text-white/25">
                                        <span className="flex items-center gap-1">
                                            <MessageSquare size={10} />
                                            {topic.reply_count}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={10} />
                                            {timeAgo(topic.created_at)}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div className="col-span-3 text-center text-white/20 font-crimson py-12 border border-white/[0.04] rounded-2xl bg-white/[0.01] italic">
                        אין עדיין לחשושים במסדרונות... פתחו את הדיון הראשון!
                    </div>
                )}
            </div>

            {/* Mobile link */}
            <div className="mt-6 flex justify-center md:hidden">
                <Link href="/forums" className="flex items-center gap-2 text-xs text-amber-500/50 font-cinzel uppercase tracking-widest">
                    לכל הפורומים <ArrowLeft size={12} />
                </Link>
            </div>
        </div>
    );
}