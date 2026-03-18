"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
    MessagesSquare,
    Lock,
    ChevronLeft,
    Users,
    MessageCircle,
    ShieldCheck,
    Home,
} from "lucide-react";

interface Forum {
    id: string;
    name: string;
    description: string;
    slug: string;
    house_restriction: string | null;
    thread_count?: number;
    post_count?: number;
}

const HOUSE_THEMES: Record<string, { color: string; bg: string; icon: string; border: string; glow: string }> = {
    Gryffindor: { color: "text-red-400", bg: "rgba(220,38,38,0.07)", border: "rgba(220,38,38,0.2)", icon: "🦁", glow: "rgba(220,38,38,0.08)" },
    Slytherin: { color: "text-emerald-400", bg: "rgba(5,150,105,0.07)", border: "rgba(5,150,105,0.2)", icon: "🐍", glow: "rgba(5,150,105,0.08)" },
    Ravenclaw: { color: "text-blue-400", bg: "rgba(37,99,235,0.07)", border: "rgba(37,99,235,0.2)", icon: "🦅", glow: "rgba(37,99,235,0.08)" },
    Hufflepuff: { color: "text-amber-400", bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.2)", icon: "🦡", glow: "rgba(217,119,6,0.08)" },
};

export default function ForumsPage() {
    const [forums, setForums] = useState<Forum[]>([]);
    const [userHouse, setUserHouse] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [globalStats, setGlobalStats] = useState({ users: 0, messages: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const getData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('house, role')
                    .eq('id', session.user.id)
                    .single();
                setUserHouse(profile?.house || null);
                setUserRole(profile?.role || null);
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
            setIsLoading(false);
        };
        getData();
    }, [supabase]);

    if (isLoading) return (
        <div className="min-h-screen bg-[#060910] flex items-center justify-center">
            <div className="w-8 h-8 border-t-2 border-amber-500/60 rounded-full animate-spin" />
        </div>
    );

    const publicForums = forums.filter(f => !f.house_restriction);
    const houseForums = forums.filter(f => f.house_restriction);

    return (
        <div className="min-h-screen bg-[#060910] text-white font-assistant" dir="rtl">
            <style>{`
                .forum-bg {
                    background-image:
                        linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px);
                    background-size: 40px 40px;
                }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .fade-up { animation: fadeUp 0.3s ease both; }
            `}</style>

            <div className="forum-bg min-h-screen">
                <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">

                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-xs font-bold text-white/30 font-cinzel tracking-wider">
                        <Link href="/" className="hover:text-white/60 transition-colors flex items-center gap-1">
                            <Home size={11} /> ראשי
                        </Link>
                        <ChevronLeft size={11} />
                        <span className="text-amber-500/70">פורומים</span>
                    </nav>

                    {/* Page title */}
                    <div className="fade-up text-center py-6 space-y-2">
                        <h1 className="font-cinzel text-3xl md:text-4xl font-black text-white">
                            היכל הפורומים
                        </h1>
                        <p className="text-sm text-white/25 italic font-crimson">"המקום בו מילים הופכות לקסמים"</p>
                    </div>

                    {/* Public forums */}
                    {publicForums.length > 0 && (
                        <section className="fade-up space-y-2" style={{ animationDelay: "60ms" }}>
                            <div className="px-1 mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/25">פורומים כלליים</span>
                            </div>
                            <div className="border border-white/[0.07] rounded-xl overflow-hidden">
                                {publicForums.map((forum, i) => (
                                    <ForumRow
                                        key={forum.id}
                                        forum={forum}
                                        isLocked={false}
                                        isLast={i === publicForums.length - 1}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* House forums */}
                    {houseForums.length > 0 && (
                        <section className="fade-up space-y-2" style={{ animationDelay: "120ms" }}>
                            <div className="px-1 mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/25">מועדוני הבתים</span>
                            </div>
                            <div className="border border-white/[0.07] rounded-xl overflow-hidden">
                                {houseForums.map((forum, i) => {
                                    const isLocked = !!(forum.house_restriction && forum.house_restriction !== userHouse && userRole !== 'מנהל');
                                    return (
                                        <ForumRow
                                            key={forum.id}
                                            forum={forum}
                                            isLocked={isLocked}
                                            isLast={i === houseForums.length - 1}
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Global stats footer */}
                    <div className="fade-up border border-white/[0.06] rounded-xl px-6 py-4 flex flex-wrap justify-around gap-4 bg-white/[0.015]" style={{ animationDelay: "180ms" }}>
                        <StatItem icon={<Users size={13} />} label={`${globalStats.users} קוסמים רשומים`} />
                        <StatItem icon={<MessageCircle size={13} />} label={`${globalStats.messages} הודעות`} />
                        <StatItem icon={<ShieldCheck size={13} />} label="משרד הקסמים מחובר" />
                    </div>

                </div>
            </div>
        </div>
    );
}

function StatItem({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex items-center gap-2 text-white/30 text-xs font-bold">
            <span className="text-amber-500/60">{icon}</span>
            {label}
        </div>
    );
}

function ForumRow({ forum, isLocked, isLast }: { forum: Forum; isLocked: boolean; isLast: boolean }) {
    const theme = forum.house_restriction ? HOUSE_THEMES[forum.house_restriction] : null;
    const href = isLocked ? "#" : `/forums/${forum.slug}`;

    return (
        <Link
            href={href}
            onClick={isLocked ? (e) => e.preventDefault() : undefined}
            className={`group flex items-center gap-4 px-5 py-4 transition-colors
                ${!isLast ? "border-b border-white/[0.05]" : ""}
                ${isLocked ? "opacity-40 cursor-not-allowed" : "hover:bg-white/[0.03]"}`}
            style={{ background: theme && !isLocked ? theme.bg : undefined }}
        >
            {/* Icon */}
            <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 border"
                style={{
                    background: theme ? theme.bg : "rgba(245,158,11,0.08)",
                    borderColor: theme ? theme.border : "rgba(245,158,11,0.15)",
                }}
            >
                {isLocked
                    ? <Lock size={15} className="text-white/30" />
                    : theme
                        ? <span>{theme.icon}</span>
                        : <MessagesSquare size={16} className="text-amber-500/70" />
                }
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-cinzel font-black text-base leading-tight transition-colors
                        ${isLocked ? "text-white/40" : theme ? theme.color : "text-white/90 group-hover:text-white"}`}>
                        {forum.name}
                    </h3>
                    {forum.house_restriction && (
                        <span
                            className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
                            style={{ borderColor: theme?.border, color: theme?.color as any, background: theme?.bg }}
                        >
                            מועדון פרטי
                        </span>
                    )}
                </div>
                {forum.description && (
                    <p className="text-xs text-white/30 mt-0.5 truncate">{forum.description}</p>
                )}
            </div>

            {/* Stats */}
            {!isLocked && (
                <div className="hidden sm:flex items-center gap-5 text-center shrink-0">
                    <div>
                        <p className="font-cinzel font-black text-sm text-white/70">{forum.thread_count}</p>
                        <p className="text-[9px] uppercase tracking-wider text-white/20">נושאים</p>
                    </div>
                    <div>
                        <p className="font-cinzel font-black text-sm text-white/70">{forum.post_count}</p>
                        <p className="text-[9px] uppercase tracking-wider text-white/20">הודעות</p>
                    </div>
                </div>
            )}

            {/* Arrow */}
            {!isLocked && (
                <ChevronLeft size={14} className="text-white/15 group-hover:text-white/40 transition-colors shrink-0" />
            )}
        </Link>
    );
}