"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
    MessagesSquare, MessageSquare, Lock, ChevronLeft, Users, MessageCircle, ShieldCheck, Home, Sparkles, Scroll, GraduationCap, Zap
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";

interface Forum {
    id: string;
    name: string;
    description: string;
    slug: string;
    house_restriction: string | null;
    min_year: number | null;
    thread_count?: number;
    post_count?: number;
}

const HOUSE_THEMES: Record<string, { color: string; bg: string; icon: string; border: string; glow: string; nameHe: string }> = {
    Gryffindor: { color: "text-red-400", bg: "rgba(220,38,38,0.07)", border: "rgba(220,38,38,0.2)", icon: "🦁", glow: "rgba(220,38,38,0.4)", nameHe: "גריפינדור" },
    Slytherin: { color: "text-emerald-400", bg: "rgba(5,150,105,0.07)", border: "rgba(5,150,105,0.2)", icon: "🐍", glow: "rgba(5,150,105,0.4)", nameHe: "סלית'רין" },
    Ravenclaw: { color: "text-blue-400", bg: "rgba(37,99,235,0.07)", border: "rgba(37,99,235,0.2)", icon: "🦅", glow: "rgba(37,99,235,0.4)", nameHe: "רייבנקלו" },
    Hufflepuff: { color: "text-amber-400", bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.2)", icon: "🦡", glow: "rgba(217,119,6,0.4)", nameHe: "הפלפאף" },
};

export default function ForumsPage() {
    const [forums, setForums] = useState<Forum[]>([]);
    const [userHouse, setUserHouse] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userYear, setUserYear] = useState<number>(1);
    const [globalStats, setGlobalStats] = useState({ users: 0, messages: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();
    const { sendOwl } = useOwlMail();

    const getData = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('house, role, year')
                    .eq('id', session.user.id)
                    .single();
                setUserHouse(profile?.house || null);
                setUserRole(profile?.role || null);
                setUserYear(profile?.year || 1);
            }

            const { data: forumsData } = await supabase
                .from('forums')
                .select(`*, threads (id, forum_posts (id))`)
                .order('created_at', { ascending: true });

            if (forumsData) {
                const formattedForums = forumsData.map((f: any) => ({
                    ...f,
                    thread_count: f.threads?.length || 0,
                    post_count: f.threads?.reduce((acc: number, t: any) => acc + (t.forum_posts?.length || 0), 0) || 0,
                }));
                setForums(formattedForums);
            }

            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { count: postCount } = await supabase.from('forum_posts').select('*', { count: 'exact', head: true });
            const { count: chatCount } = await supabase.from('messages').select('*', { count: 'exact', head: true });

            setGlobalStats({ users: userCount || 0, messages: (postCount || 0) + (chatCount || 0) });
        } catch (error) {
            console.error("Error fetching forum data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        getData();
    }, [getData]);

    if (isLoading) return (
        <div className="min-h-screen bg-[#060910] flex items-center justify-center">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500 animate-pulse" size={20} />
            </div>
        </div>
    );

    const publicForums = forums.filter(f => !f.house_restriction);
    const houseForums = forums.filter(f => f.house_restriction);

    return (
        <div className="min-h-screen bg-[#060910] text-white font-assistant pt-24" dir="rtl">
            <style>{`
                .forum-bg { background-image: radial-gradient(rgba(245, 158, 11, 0.03) 1px, transparent 1px); background-size: 40px 40px; }
                .category-strip { background: linear-gradient(90deg, rgba(245,158,11,0.15) 0%, transparent 100%); border-right: 4px solid #f59e0b; }
                .glass-card { background: rgba(10, 13, 20, 0.6); backdrop-blur: 15px; border: 1px solid rgba(255, 255, 255, 0.05); }
            `}</style>

            <div className="forum-bg min-h-screen pb-20">
                <div className="max-w-6xl mx-auto px-6 space-y-10">

                    <div className="space-y-6">
                        <nav className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                            <Link href="/" className="hover:text-amber-500 transition-colors flex items-center gap-1.5"><Home size={12} /> הוגוורטס</Link>
                            <ChevronLeft size={10} />
                            <span className="text-amber-500">היכל הפורומים</span>
                        </nav>
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h1 className="font-cinzel text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-lg">היכל הפורומים</h1>
                                <p className="text-white/40 italic font-crimson text-xl mt-3 flex items-center gap-2">
                                    <Sparkles size={18} className="text-amber-400 animate-pulse" />
                                    "המקום בו מילים הופכות לקסמים עתיקים"
                                </p>
                            </div>
                            <div className="flex items-center gap-5 bg-white/[0.03] p-5 rounded-3xl border border-white/10 backdrop-blur-md">
                                <div className="text-right">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-black">שנת לימודים</p>
                                    <p className="font-cinzel text-amber-500 font-black text-2xl tracking-widest">{userYear}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                    <GraduationCap className="text-amber-500" size={28} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <section className="space-y-1 shadow-2xl rounded-[2.5rem] overflow-hidden border border-white/[0.07] bg-[#0a0d14]/80 backdrop-blur-sm">
                        <div className="category-strip px-10 py-5 flex items-center justify-between">
                            <h2 className="font-cinzel text-sm font-black text-amber-500 uppercase tracking-[0.3em]">פורומים כלליים</h2>
                            <Zap size={16} className="text-amber-500/30" />
                        </div>
                        {publicForums.map((forum, i) => (
                            <ForumRow key={forum.id} forum={forum} userYear={userYear} userRole={userRole} userHouse={userHouse} isLast={i === publicForums.length - 1} sendOwl={sendOwl} />
                        ))}
                    </section>

                    <section className="space-y-1 shadow-2xl rounded-[2.5rem] overflow-hidden border border-white/[0.07] bg-[#0a0d14]/80 backdrop-blur-sm">
                        <div className="px-10 py-5 bg-gradient-to-r from-white/[0.03] to-transparent border-r-4 border-white/20">
                            <h2 className="font-cinzel text-sm font-black text-white/60 uppercase tracking-[0.3em]">חדרי המועדון והבתים</h2>
                        </div>
                        {houseForums.map((forum, i) => (
                            <ForumRow key={forum.id} forum={forum} userYear={userYear} userRole={userRole} userHouse={userHouse} isLast={i === houseForums.length - 1} sendOwl={sendOwl} />
                        ))}
                    </section>

                    <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl mt-8">
                        <div className="bg-black/40 px-10 py-6 border-b border-white/[0.05]">
                            <h3 className="font-cinzel text-sm font-black text-white/80 flex items-center gap-4">
                                <Scroll size={20} className="text-white/20" /> רשומות הטירה העתיקות
                            </h3>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-black/10">
                            <StatRow icon={<ShieldCheck size={22} />} label="מצב ההגנות" value="פעיל לחלוטין" highlight />
                            <StatRow icon={<MessageSquare size={22} />} label="סך הכל הודעות" value={globalStats.messages} />
                            <StatRow icon={<Users size={22} />} label="קוסמים רשומים" value={globalStats.users} />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

function StatRow({ icon, label, value, highlight }: any) {
    return (
        <div className="flex items-center justify-between p-8 rounded-[2rem] bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-amber-500/20 transition-all duration-500">
            <div className="flex items-center gap-5">
                <span className={`shrink-0 transition-colors duration-500 ${highlight ? "text-amber-500" : "text-white/30"}`}>{icon}</span>
                <div className="flex flex-col text-right">
                    <span className="text-white/20 text-[9px] uppercase font-black tracking-widest mb-1">רשומה</span>
                    <span className="text-white/40 text-[11px] font-black uppercase tracking-widest leading-none">{label}</span>
                </div>
            </div>
            <span className={`font-cinzel font-black text-3xl transition-all duration-500 ${highlight ? "text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]" : "text-white/90"}`}>
                {value}
            </span>
        </div>
    );
}

function ForumRow({ forum, userYear, userRole, userHouse, isLast, sendOwl }: { forum: Forum; userYear: number; userRole: string | null; userHouse: string | null; isLast: boolean; sendOwl: any }) {
    const theme = forum.house_restriction ? HOUSE_THEMES[forum.house_restriction] : null;

    const isHouseRestricted = !!(forum.house_restriction && forum.house_restriction !== userHouse && userRole !== 'מנהל');
    const isYearRestricted = !!(forum.min_year && userYear < forum.min_year && userRole !== 'מנהל');
    const isLocked = isHouseRestricted || isYearRestricted;

    const handleLockedClick = (e: React.MouseEvent) => {
        if (isLocked) {
            e.preventDefault();
            if (isHouseRestricted) {
                sendOwl("גישה נחסמה", `חדר זה מיועד רק לבני בית ${theme?.nameHe}.`, "error");
            } else if (isYearRestricted) {
                sendOwl("דרגה נמוכה מדי", `עליך להגיע לשנה ${forum.min_year} כדי להיכנס לכאן.`, "error");
            }
        }
    };

    return (
        <Link
            href={isLocked ? "#" : `/forums/${forum.slug}`}
            onClick={handleLockedClick}
            className={`group flex items-center gap-8 px-10 py-8 transition-all duration-500 relative overflow-hidden
                ${!isLast ? "border-b border-white/[0.04]" : ""}
                ${isLocked ? "cursor-not-allowed bg-black/40 grayscale-[0.5]" : "hover:bg-white/[0.03]"}`}
        >
            <div
                className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-4xl shrink-0 border-2 transition-all duration-700 shadow-xl ${!isLocked ? "group-hover:rotate-[10deg] group-hover:scale-110" : "opacity-40"}`}
                style={{
                    background: isLocked ? "rgba(255,255,255,0.02)" : (theme ? theme.bg : "rgba(245,158,11,0.03)"),
                    borderColor: isLocked ? "rgba(255,255,255,0.05)" : (theme ? theme.border : "rgba(245,158,11,0.15)"),
                }}
            >
                {isLocked ? <Lock size={26} className="text-white/20" /> : (theme ? theme.icon : <MessagesSquare size={30} className="text-amber-500/50" />)}
            </div>

            <div className="flex-1 min-w-0 relative z-10 text-right">
                <div className="flex items-center gap-5 flex-wrap mb-2">
                    <h3 className={`font-cinzel font-black text-2xl transition-all duration-500 ${isLocked ? "text-white/30" : theme ? theme.color : "text-white/90 group-hover:text-amber-400"}`}>
                        {forum.name}
                    </h3>
                </div>
                <p className={`text-base mt-2 truncate max-w-2xl font-crimson transition-colors duration-500 ${isLocked ? "text-red-400/30 italic" : "text-white/40 group-hover:text-white/70"}`}>
                    {isLocked ? "🔒 המעבר חסום על ידי לחש הגנה עתיק. נדרשת דרגה מתאימה." : forum.description}
                </p>
            </div>

            {!isLocked && (
                <div className="hidden sm:flex shrink-0 pr-6">
                    <div className="p-3 rounded-full bg-white/0 group-hover:bg-amber-500/10 transition-all duration-500">
                        <ChevronLeft size={24} className="text-white/10 group-hover:text-amber-500 group-hover:-translate-x-2 transition-all" />
                    </div>
                </div>
            )}
        </Link>
    );
}