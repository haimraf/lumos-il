"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
    MessagesSquare, Lock, ChevronLeft, MessageSquare, Home, Hash, Clock, Sparkles
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
    last_thread?: {
        id: string;
        title: string;
        created_at: string;
        author_name: string;
        author_house: string | null;
        author_id: string | null;
    } | null;
}

const HOUSE_THEMES: Record<string, { color: string; bg: string; icon: string; border: string; glow: string; nameHe: string; accent: string }> = {
    Gryffindor: { color: "#f87171", bg: "rgba(220,38,38,0.07)", border: "rgba(220,38,38,0.25)", icon: "🦁", glow: "rgba(220,38,38,0.4)", nameHe: "גריפינדור", accent: "#dc2626" },
    Slytherin:  { color: "#34d399", bg: "rgba(5,150,105,0.07)",  border: "rgba(5,150,105,0.25)",  icon: "🐍", glow: "rgba(5,150,105,0.4)",   nameHe: "סלית'רין",  accent: "#059669" },
    Ravenclaw:  { color: "#60a5fa", bg: "rgba(37,99,235,0.07)",  border: "rgba(37,99,235,0.25)",  icon: "🦅", glow: "rgba(37,99,235,0.4)",   nameHe: "רייבנקלו",  accent: "#2563eb" },
    Hufflepuff: { color: "#fbbf24", bg: "rgba(217,119,6,0.07)",  border: "rgba(217,119,6,0.25)",  icon: "🦡", glow: "rgba(217,119,6,0.4)",   nameHe: "הפלפאף",   accent: "#d97706" },
    Unknown:    { color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", icon: "🧙", glow: "rgba(255,255,255,0.1)", nameHe: "טרם סווג", accent: "#6b7280" },
};

function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return "ממש עכשיו";
    if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק'`;
    if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שע'`;
    if (diff < 604800) return `לפני ${Math.floor(diff / 86400)} ימים`;
    return date.toLocaleDateString("he-IL");
}

export default function ForumsPage() {
    const [supabase] = useState(() => createClient());
    const [forums, setForums] = useState<Forum[]>([]);
    const [userHouse, setUserHouse] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userYear, setUserYear] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(true);
    const { sendOwl } = useOwlMail();

    const getData = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase.from('profiles').select('house, role, year').eq('id', session.user.id).single();
                setUserHouse(profile?.house || null);
                setUserRole(profile?.role || null);
                setUserYear(profile?.year || 1);
            } else {
                setUserYear(0);
            }

            const { data: forumsData } = await supabase
                .from('forums')
                .select(`*, threads(id, title, created_at, forum_posts(id), profiles(full_name, username, house))`)
                .order('created_at', { ascending: true });

            if (forumsData) {
                const formattedForums = forumsData.map((f: any) => {
                    const sortedThreads = [...(f.threads || [])].sort((a: any, b: any) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    );
                    const latest = sortedThreads[0];
                    return {
                        ...f,
                        thread_count: f.threads?.length || 0,
                        post_count: f.threads?.reduce((acc: number, t: any) => acc + (t.forum_posts?.length || 0), 0) || 0,
                        last_thread: latest ? {
                            id: latest.id,
                            title: latest.title,
                            created_at: latest.created_at,
                            author_name: latest.profiles?.full_name || latest.profiles?.username || "קוסם אנונימי",
                            author_house: latest.profiles?.house || "Unknown",
                            author_id: latest.profiles?.id || null
                        } : null
                    };
                });
                setForums(formattedForums);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => { getData(); }, [getData]);

    if (isLoading) return (
        <div className="min-h-screen bg-[#060910] flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-amber-500/40 animate-pulse" />
        </div>
    );

    const publicForums = forums.filter(f => !f.house_restriction);
    const houseForums = forums.filter(f => f.house_restriction);
    const totalThreads = forums.reduce((a, f) => a + (f.thread_count || 0), 0);
    const totalPosts = forums.reduce((a, f) => a + (f.post_count || 0), 0);

    return (
        <div className="min-h-screen bg-[#060910] text-white font-assistant pt-24 pb-20" dir="rtl">
            <style>{`
                .forums-grid-bg {
                    background-image: radial-gradient(rgba(245,158,11,0.025) 1px, transparent 1px);
                    background-size: 36px 36px;
                }
                .forum-block {
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 16px;
                    overflow: hidden;
                }
                .forum-block-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 20px;
                    background: rgba(255,255,255,0.03);
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .forum-col-header {
                    display: grid;
                    grid-template-columns: 1fr 72px 72px 200px;
                    gap: 0;
                    padding: 8px 20px;
                    background: rgba(0,0,0,0.25);
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                }
                @media (max-width: 768px) {
                    .forum-col-header { display: none; }
                    .forum-row-grid { grid-template-columns: 1fr !important; }
                    .forum-col-stats, .forum-col-lastpost { display: none; }
                }
                .forum-row-grid {
                    display: grid;
                    grid-template-columns: 1fr 72px 72px 200px;
                    gap: 0;
                    align-items: center;
                    padding: 0;
                    border-bottom: 1px solid rgba(255,255,255,0.03);
                    transition: background 0.2s;
                }
                .forum-row-grid:last-child { border-bottom: none; }
                .forum-row-grid:hover { background: rgba(255,255,255,0.025); }
                .forum-row-grid.locked { opacity: 0.45; pointer-events: none; }
                .forum-col-main { padding: 16px 20px; display: flex; align-items: center; gap: 14px; min-width: 0; }
                .forum-col-stats { padding: 16px 8px; text-align: center; }
                .forum-col-lastpost { padding: 12px 16px; }
                .forum-icon {
                    width: 42px; height: 42px; border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.3rem; flex-shrink: 0; border: 1px solid;
                    transition: transform 0.3s;
                }
                .forum-row-grid:hover .forum-icon { transform: scale(1.08); }
                .stat-num {
                    font-family: 'Cinzel', serif;
                    font-size: 1rem; font-weight: 700;
                    color: rgba(255,255,255,0.7);
                    line-height: 1;
                }
                .stat-label {
                    font-size: 9px; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.1em;
                    color: rgba(255,255,255,0.2);
                    margin-top: 3px;
                }
                .lastpost-title {
                    font-size: 11px; font-weight: 600;
                    color: rgba(255,255,255,0.55);
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                    max-width: 160px;
                    margin-bottom: 4px;
                }
                .lastpost-meta {
                    font-size: 10px; color: rgba(255,255,255,0.25);
                    display: flex; align-items: center; gap: 4px;
                }
                .stats-bar {
                    display: flex; gap: 24px; align-items: center;
                    padding: 12px 20px;
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 12px;
                    margin-bottom: 28px;
                }
                .stats-bar-item {
                    display: flex; align-items: center; gap: 8px;
                    font-size: 12px; color: rgba(255,255,255,0.35);
                }
                .stats-bar-item strong {
                    font-family: 'Cinzel', serif;
                    color: rgba(255,255,255,0.7);
                    font-size: 13px;
                }
            `}</style>

            <div className="forums-grid-bg min-h-screen">
                <div className="max-w-5xl mx-auto px-4 md:px-6">

                    {/* breadcrumb + title */}
                    <header className="mb-8 pt-2 space-y-3">
                        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20">
                            <Link href="/" className="hover:text-amber-500 transition-colors flex items-center gap-1.5"><Home size={10} /> הוגוורטס</Link>
                            <ChevronLeft size={10} />
                            <span className="text-amber-500/60">היכל הפורומים</span>
                        </nav>
                        <h1 className="font-cinzel text-4xl md:text-5xl font-black text-white tracking-tighter">היכל הפורומים</h1>
                    </header>

                    {/* stats bar */}
                    <div className="stats-bar">
                        <div className="stats-bar-item">
                            <Hash size={13} className="text-amber-500/50" />
                            <span><strong>{totalThreads.toLocaleString()}</strong> נושאים</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="stats-bar-item">
                            <MessageSquare size={13} className="text-amber-500/50" />
                            <span><strong>{totalPosts.toLocaleString()}</strong> הודעות</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="stats-bar-item">
                            <MessagesSquare size={13} className="text-amber-500/50" />
                            <span><strong>{forums.length}</strong> פורומים</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* public forums */}
                        <ForumSection
                            title="פורומים כלליים"
                            accentColor="#f59e0b"
                            forums={publicForums}
                            userYear={userYear}
                            userRole={userRole}
                            userHouse={userHouse}
                        />

                        {/* house forums */}
                        <ForumSection
                            title="חדרי המועדון והבתים"
                            accentColor="rgba(255,255,255,0.3)"
                            forums={houseForums}
                            userYear={userYear}
                            userRole={userRole}
                            userHouse={userHouse}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
}

function ForumSection({ title, accentColor, forums, userYear, userRole, userHouse }: {
    title: string; accentColor: string;
    forums: Forum[]; userYear: number; userRole: string | null; userHouse: string | null;
}) {
    if (!forums.length) return null;
    return (
        <div className="forum-block">
            {/* category header */}
            <div className="forum-block-header" style={{ borderRight: `3px solid ${accentColor}` }}>
                <span className="font-cinzel text-xs font-black uppercase tracking-widest" style={{ color: accentColor }}>
                    {title}
                </span>
                <span className="text-[10px] text-white/20 mr-auto">{forums.length} פורומים</span>
            </div>

            {/* column headers */}
            <div className="forum-col-header">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/20">פורום</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/20 text-center">נושאים</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/20 text-center">הודעות</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/20">פוסט אחרון</span>
            </div>

            {/* forum rows */}
            {forums.map((forum) => (
                <ForumRow
                    key={forum.id}
                    forum={forum}
                    userYear={userYear}
                    userRole={userRole}
                    userHouse={userHouse}
                />
            ))}
        </div>
    );
}

function ForumRow({ forum, userYear, userRole, userHouse }: any) {
    const isLocked = !!(forum.house_restriction && forum.house_restriction !== userHouse && userRole !== 'מנהל') ||
        !!(forum.min_year && userYear < forum.min_year && userRole !== 'מנהל');

    const theme = forum.house_restriction ? HOUSE_THEMES[forum.house_restriction] : null;
    const lastPosterTheme = forum.last_thread?.author_house ? HOUSE_THEMES[forum.last_thread.author_house] : HOUSE_THEMES["Unknown"];

    const iconStyle = theme
        ? { background: theme.bg, borderColor: theme.border }
        : { background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.12)" };

    return (
        <Link
            href={isLocked ? "#" : `/forums/${forum.slug}`}
            onClick={(e) => isLocked && e.preventDefault()}
            className={`forum-row-grid ${isLocked ? "locked" : ""}`}
        >
            {/* main info column */}
            <div className="forum-col-main">
                <div className="forum-icon" style={iconStyle}>
                    {isLocked
                        ? <Lock size={18} className="text-white/20" />
                        : (theme ? theme.icon : <MessagesSquare size={20} className="text-amber-500/60" />)
                    }
                </div>
                <div className="min-w-0">
                    <div className={`font-cinzel font-black text-base leading-tight truncate mb-1 ${
                        isLocked ? "text-white/20" : theme ? "" : "text-white/85"
                    }`} style={theme && !isLocked ? { color: theme.color } : {}}>
                        {forum.name}
                    </div>
                    <div className="text-xs text-white/25 truncate leading-snug">
                        {isLocked ? "🔒 הגישה חסומה" : forum.description}
                    </div>
                </div>
            </div>

            {/* threads count */}
            <div className="forum-col-stats">
                <div className="stat-num">{(forum.thread_count || 0).toLocaleString()}</div>
                <div className="stat-label">נושאים</div>
            </div>

            {/* posts count */}
            <div className="forum-col-stats">
                <div className="stat-num">{(forum.post_count || 0).toLocaleString()}</div>
                <div className="stat-label">הודעות</div>
            </div>

            {/* last post column */}
            <div className="forum-col-lastpost">
                {forum.last_thread && !isLocked ? (
                    <>
                        <div className="lastpost-title" title={forum.last_thread.title}>
                            {forum.last_thread.title}
                        </div>
                        <div className="lastpost-meta">
                            {forum.last_thread.author_id ? (
                                <Link
                                    href={`/wizard/${forum.last_thread.author_id}`}
                                    onClick={e => e.stopPropagation()}
                                    style={{ color: lastPosterTheme.color, fontWeight: 700, fontSize: "10px" }}
                                    className="hover:underline"
                                >
                                    {forum.last_thread.author_name}
                                </Link>
                            ) : (
                                <span style={{ color: lastPosterTheme.color, fontWeight: 700, fontSize: "10px" }}>
                                    {forum.last_thread.author_name}
                                </span>
                            )}
                            <span className="text-white/15">•</span>
                            <Clock size={9} />
                            <span>{timeAgo(forum.last_thread.created_at)}</span>
                        </div>
                    </>
                ) : (
                    <span className="text-[11px] text-white/15 italic">אין פוסטים עדיין</span>
                )}
            </div>
        </Link>
    );
}
