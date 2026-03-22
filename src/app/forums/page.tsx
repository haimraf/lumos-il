"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
    MessagesSquare, Lock, ChevronLeft, MessageSquare, Home, Hash, Clock, Sparkles, Users, Trophy, Flame, Skull, Bird, Leaf
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import { getRoleColor, getRoleColorFromDB } from "@/lib/roleColor";

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
        author_role: string | null;
        author_id: string | null;
        author_group_color: string | null;
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

interface UserGroup {
    id: number;
    name: string;
    color: string;
    display_order: number;
}

const HOUSE_POINTS_META: Record<string, { icon: any; color: string; glow: string; nameHe: string }> = {
    Gryffindor: { icon: Flame,  color: "#ef4444", glow: "rgba(239,68,68,0.4)",   nameHe: "גריפינדור" },
    Slytherin:  { icon: Skull,  color: "#34d399", glow: "rgba(52,211,153,0.4)",  nameHe: "סליתרין"   },
    Ravenclaw:  { icon: Bird,   color: "#60a5fa", glow: "rgba(96,165,250,0.4)",  nameHe: "רייבנקלו"  },
    Hufflepuff: { icon: Leaf,   color: "#fbbf24", glow: "rgba(251,191,36,0.4)",  nameHe: "הפלפאף"    },
};
const HOUSE_ORDER = ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"] as const;

export default function ForumsPage() {
    const [supabase] = useState(() => createClient());
    const [forums, setForums] = useState<Forum[]>([]);
    const [userHouse, setUserHouse] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userYear, setUserYear] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(true);
    const [onlineCount, setOnlineCount] = useState<number>(0);
    const [groups, setGroups] = useState<UserGroup[]>([]);
    const [housePoints, setHousePoints] = useState<Record<string, number>>({ Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 });
    const [roleColors, setRoleColors] = useState<Record<string, string>>({});
    const [recentPosts, setRecentPosts] = useState<any[]>([]);
    const [recentThreads, setRecentThreads] = useState<any[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [forumStats, setForumStats] = useState<{ totalMembers: number; newestMember: any | null }>({ totalMembers: 0, newestMember: null });
    const { sendOwl } = useOwlMail();
    useEffect(() => { getRoleColorFromDB(supabase).then(setRoleColors); }, [supabase]);

    // Client-side polling for online users + groups + house points + stats
    const fetchSidebarData = useCallback(async () => {
        const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const [{ count }, { data: groupsData }, { data: profilesData }, { data: onlineUsersData }, { count: totalMembersCount }, { data: newestMemberData }] = await Promise.all([
            supabase.from("online_users").select("id", { count: "exact", head: true }).gte("last_seen", cutoff),
            supabase.from("user_groups").select("*").order("display_order"),
            supabase.from("profiles").select("house, points_contributed"),
            supabase.from("online_users").select("id, user_name, house").gte("last_seen", cutoff).eq("presence_type", "member").order("last_seen", { ascending: false }).limit(15),
            supabase.from("profiles").select("*", { count: "exact", head: true }),
            supabase.from("profiles").select("id, full_name, house").order("created_at", { ascending: false }).limit(1),
        ]);
        if (count !== null) setOnlineCount(count);
        if (groupsData) setGroups(groupsData);
        if (profilesData) {
            const pts: Record<string, number> = { Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 };
            profilesData.forEach((p: any) => {
                if (p.house && pts[p.house] !== undefined) pts[p.house] += p.points_contributed || 0;
            });
            setHousePoints(pts);
        }
        // Enrich online users with group color (same pattern as MaraudersMap)
        if (onlineUsersData && onlineUsersData.length > 0) {
            const userIds = onlineUsersData.map((u: any) => u.id).filter(Boolean);
            const { data: onlineProfiles } = await supabase
                .from("profiles")
                .select("id, user_groups(name, color)")
                .in("id", userIds);
            const groupMap: Record<string, string | null> = {};
            if (onlineProfiles) {
                onlineProfiles.forEach((p: any) => {
                    const g = p.user_groups as { name: string; color: string } | null;
                    groupMap[p.id] = g?.color || null;
                });
            }
            setOnlineUsers(onlineUsersData.map((u: any) => ({ ...u, group_color: groupMap[u.id] || null })));
        } else {
            setOnlineUsers([]);
        }
        setForumStats({
            totalMembers: totalMembersCount ?? 0,
            newestMember: newestMemberData?.[0] ?? null,
        });
    }, [supabase]);

    useEffect(() => {
        fetchSidebarData();
        const interval = setInterval(fetchSidebarData, 60_000);
        return () => clearInterval(interval);
    }, [fetchSidebarData]);

    const getData = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            console.log('[forums] session:', session?.user?.id ?? 'guest');
            if (session?.user) {
                const { data: profile, error: profileError } = await supabase.from('profiles').select('house, role, year').eq('id', session.user.id).single();
                console.log('[forums] profile:', profile, 'error:', profileError);
                setUserHouse(profile?.house || null);
                setUserRole(profile?.role || null);
                setUserYear(profile?.year || 1);
            } else {
                setUserYear(0);
            }

            const { data: forumsData, error: forumsError } = await supabase
                .from('forums')
                .select(`*, threads(id, title, created_at, forum_posts(id), profiles(id, full_name, username, house, role, user_groups(name, color)))`)
                .order('created_at', { ascending: true });

            console.log('[forums] forumsData:', forumsData, 'error:', forumsError);

            if (forumsData) {
                // Fetch last post per forum in one batch query
                const allThreadIds = forumsData.flatMap((f: any) => (f.threads || []).map((t: any) => t.id));
                const forumLastPostMap: Record<string, { post: any; thread: any }> = {};
                let rawPosts: any[] = [];

                if (allThreadIds.length > 0) {
                    const { data: rawPostsData } = await supabase
                        .from('forum_posts')
                        .select('id, created_at, user_id, thread_id, profiles(id, full_name, house, role, user_groups(name, color))')
                        .in('thread_id', allThreadIds)
                        .order('created_at', { ascending: false })
                        .limit(500);

                    rawPosts = rawPostsData || [];

                    // Build a thread_id -> forum mapping
                    const threadForumMap: Record<string, { thread: any; forumId: string }> = {};
                    for (const f of forumsData) {
                        for (const t of f.threads || []) {
                            threadForumMap[t.id] = { thread: t, forumId: f.id };
                        }
                    }

                    for (const p of rawPosts) {
                        const mapping = threadForumMap[p.thread_id];
                        if (!mapping) continue;
                        if (!forumLastPostMap[mapping.forumId]) {
                            forumLastPostMap[mapping.forumId] = { post: p, thread: mapping.thread };
                        }
                    }
                }

                const formattedForums = forumsData.map((f: any) => {
                    const lastEntry = forumLastPostMap[f.id];
                    const lastPost = lastEntry?.post;
                    const lastThread = lastEntry?.thread;
                    const lastPosterProfile = lastPost
                        ? (Array.isArray(lastPost.profiles) ? lastPost.profiles[0] : lastPost.profiles)
                        : null;

                    // Fallback: last created thread + its author
                    const sortedThreads = [...(f.threads || [])].sort((a: any, b: any) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    );
                    const fallbackThread = sortedThreads[0];
                    const fallbackProfile = fallbackThread
                        ? (Array.isArray(fallbackThread.profiles) ? fallbackThread.profiles[0] : fallbackThread.profiles)
                        : null;

                    const displayThread = lastThread || fallbackThread;
                    const displayAt = lastPost?.created_at || fallbackThread?.created_at;
                    const displayProfile = lastPosterProfile || fallbackProfile;
                    const displayUserId = lastPost?.user_id || displayProfile?.id || null;

                    return {
                        ...f,
                        thread_count: f.threads?.length || 0,
                        post_count: f.threads?.reduce((acc: number, t: any) => acc + (t.forum_posts?.length || 0), 0) || 0,
                        last_thread: displayThread ? {
                            id: displayThread.id,
                            title: displayThread.title,
                            created_at: displayAt,
                            author_name: displayProfile?.full_name || displayProfile?.username || "קוסם אנונימי",
                            author_house: displayProfile?.house || "Unknown",
                            author_role: displayProfile?.role || null,
                            author_id: displayUserId,
                            author_group_color: displayProfile?.user_groups?.color || null,
                        } : null
                    };
                });
                setForums(formattedForums);

                // Build thread lookup for recent activity widget
                const threadMap: Record<string, { id: string; title: string; forumName: string; forumSlug: string }> = {};
                const allThreadsFlat: any[] = [];
                for (const f of forumsData) {
                    for (const t of f.threads || []) {
                        threadMap[t.id] = { id: t.id, title: t.title, forumName: f.name, forumSlug: f.slug };
                        const author = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
                        allThreadsFlat.push({ ...t, forumName: f.name, forumSlug: f.slug, author });
                    }
                }

                // Recent threads (sorted by created_at)
                allThreadsFlat.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setRecentThreads(allThreadsFlat.slice(0, 8));

                // Recent posts (replies) — from the batch query above
                const enrichedPosts = rawPosts.slice(0, 8).map((p: any) => ({
                    ...p,
                    threadInfo: threadMap[p.thread_id] || null,
                    poster: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
                }));
                setRecentPosts(enrichedPosts);
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

                    {/* ── Main layout: forums + sidebar ── */}
                    <div className="flex gap-6 items-start">

                        {/* Main column — forum lists */}
                        <div className="flex-1 min-w-0 space-y-6">
                            <ForumSection
                                title="פורומים כלליים"
                                accentColor="#f59e0b"
                                forums={publicForums}
                                userYear={userYear}
                                userRole={userRole}
                                userHouse={userHouse}
                                roleColors={roleColors}
                            />
                            <ForumSection
                                title="חדרי המועדון והבתים"
                                accentColor="rgba(255,255,255,0.3)"
                                forums={houseForums}
                                userYear={userYear}
                                userRole={userRole}
                                userHouse={userHouse}
                                roleColors={roleColors}
                            />
                        </div>

                        {/* Sidebar — sticky on desktop, stacks below on mobile */}
                        <aside className="hidden lg:flex flex-col gap-4 w-[240px] shrink-0 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-4 custom-scrollbar">

                            {/* Recent Replies */}
                            <div className="rounded-2xl p-4 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <MessageSquare size={12} className="text-amber-500/50" />
                                    <span className="font-cinzel text-[9px] font-black uppercase tracking-widest text-white/35">תגובות אחרונות</span>
                                </div>
                                <div className="space-y-0.5">
                                    {recentPosts.length === 0 && <p className="text-[10px] text-white/20 italic text-center py-3">אין תגובות עדיין</p>}
                                    {recentPosts.map((p: any) => {
                                        const houseKey = p.poster?.house || "Unknown";
                                        const houseConf = HOUSE_THEMES[houseKey] || HOUSE_THEMES["Unknown"];
                                        const grpColor = p.poster?.user_groups?.color;
                                        const nameColor = grpColor || getRoleColor(p.poster?.role, p.poster?.house, roleColors);
                                        return (
                                            <Link key={p.id} href={p.threadInfo ? `/forums/thread/${p.threadInfo.id}` : "#"}
                                                className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/[0.04] transition-colors group">
                                                <span className="text-sm shrink-0 mt-px leading-none">{houseConf?.icon || "🧙"}</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-cinzel text-[10px] font-black text-white/70 truncate group-hover:text-white transition-colors leading-snug">
                                                        {p.threadInfo?.title || "—"}
                                                    </p>
                                                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                                        <span className="text-[9px] font-bold" style={{ color: nameColor }}>{p.poster?.full_name || "קוסם"}</span>
                                                        <span className="text-white/15 text-[9px]">·</span>
                                                        <span className="text-[9px] text-white/20">{timeAgo(p.created_at)}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* New Threads */}
                            <div className="rounded-2xl p-4 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <MessagesSquare size={12} className="text-amber-500/50" />
                                    <span className="font-cinzel text-[9px] font-black uppercase tracking-widest text-white/35">אשכולות חדשים</span>
                                </div>
                                <div className="space-y-0.5">
                                    {recentThreads.map((t: any) => {
                                        const houseKey = t.author?.house || "Unknown";
                                        const houseConf = HOUSE_THEMES[houseKey] || HOUSE_THEMES["Unknown"];
                                        const grpColor = t.author?.user_groups?.color;
                                        const nameColor = grpColor || getRoleColor(t.author?.role, t.author?.house, roleColors);
                                        return (
                                            <Link key={t.id} href={`/forums/thread/${t.id}`}
                                                className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/[0.04] transition-colors group">
                                                <span className="text-sm shrink-0 mt-px leading-none">{houseConf?.icon || "🧙"}</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-cinzel text-[10px] font-black text-white/70 truncate group-hover:text-white transition-colors leading-snug">
                                                        {t.title}
                                                    </p>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className="text-[9px] font-bold" style={{ color: nameColor }}>{t.author?.full_name || "קוסם"}</span>
                                                        <span className="text-white/15 text-[9px]">·</span>
                                                        <span className="text-[9px] text-white/20">{timeAgo(t.created_at)}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Who's Online */}
                            <div className="rounded-2xl p-4 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Users size={12} style={{ color: "#34d399" }} />
                                        <span className="font-cinzel text-[9px] font-black uppercase tracking-widest text-emerald-400/70">מחוברים עכשיו</span>
                                    </div>
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="font-cinzel text-[9px] font-black text-emerald-400">{onlineCount}</span>
                                    </div>
                                </div>
                                {onlineUsers.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {onlineUsers.map((u: any) => {
                                            const houseKey = u.house || "Unknown";
                                            const houseConf = HOUSE_THEMES[houseKey] || HOUSE_THEMES["Unknown"];
                                            const nameColor = u.group_color || houseConf.color;
                                            return (
                                                <Link key={u.id} href={`/wizard/${u.id}`}
                                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-all hover:opacity-80"
                                                    style={{ background: `${nameColor}12`, border: `1px solid ${nameColor}25`, color: nameColor }}
                                                    title={houseConf.nameHe}
                                                >
                                                    <span className="text-[10px] leading-none">{houseConf.icon}</span>
                                                    {u.user_name}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-white/20 italic text-center py-2">אין מחוברים כעת</p>
                                )}
                            </div>

                            {/* House Cup */}
                            <div className="rounded-2xl p-4 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Trophy size={12} style={{ color: "#f59e0b" }} />
                                    <span className="font-cinzel text-[9px] font-black uppercase tracking-widest text-amber-500/70">גביע הבתים</span>
                                </div>
                                {(() => {
                                    const maxPts = Math.max(...HOUSE_ORDER.map(h => housePoints[h]), 1);
                                    return (
                                        <div className="space-y-2.5">
                                            {HOUSE_ORDER.map(house => {
                                                const meta = HOUSE_POINTS_META[house];
                                                const Icon = meta.icon;
                                                const pts = housePoints[house];
                                                const pct = Math.round((pts / maxPts) * 100);
                                                return (
                                                    <div key={house}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <Icon size={10} style={{ color: meta.color }} />
                                                                <span className="font-cinzel text-[9px] font-black uppercase tracking-wider" style={{ color: meta.color }}>{meta.nameHe}</span>
                                                            </div>
                                                            <span className="font-cinzel text-[10px] font-black tabular-nums" style={{ color: meta.color }}>{pts.toLocaleString()}</span>
                                                        </div>
                                                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                                                            <div className="h-full rounded-full transition-all duration-700"
                                                                style={{ width: `${pct}%`, background: `linear-gradient(to left, ${meta.color}, ${meta.color}88)`, boxShadow: `0 0 6px ${meta.glow}` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Groups Legend */}
                            <div className="rounded-2xl p-4 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles size={12} style={{ color: "#a78bfa" }} />
                                    <span className="font-cinzel text-[9px] font-black uppercase tracking-widest text-purple-400/70">מקרא דרגות</span>
                                </div>
                                {groups.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-1">
                                        {groups.map(g => (
                                            <div key={g.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md"
                                                style={{ background: `${g.color}10`, border: `1px solid ${g.color}22` }}>
                                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: g.color, boxShadow: `0 0 4px ${g.color}80` }} />
                                                <span className="font-cinzel text-[9px] font-black truncate" style={{ color: g.color }}>{g.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-[10px] text-white/20 italic text-center py-3">טוען...</div>
                                )}
                            </div>

                            {/* Forum Statistics */}
                            <div className="rounded-2xl p-4 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Hash size={12} className="text-amber-500/50" />
                                    <span className="font-cinzel text-[9px] font-black uppercase tracking-widest text-white/35">סטטיסטיקות</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-white/30">קוסמים רשומים</span>
                                        <span className="font-cinzel text-[11px] font-black text-white/60">{forumStats.totalMembers.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-white/30">אשכולות</span>
                                        <span className="font-cinzel text-[11px] font-black text-white/60">{totalThreads.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-white/30">הודעות</span>
                                        <span className="font-cinzel text-[11px] font-black text-white/60">{totalPosts.toLocaleString()}</span>
                                    </div>
                                    {forumStats.newestMember && (
                                        <>
                                            <div className="w-full h-px bg-white/[0.05] my-1" />
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] text-white/30 shrink-0">חבר חדש</span>
                                                <Link href={`/wizard/${forumStats.newestMember.id}`}
                                                    className="text-[10px] font-bold truncate hover:underline"
                                                    style={{ color: HOUSE_THEMES[forumStats.newestMember.house || "Unknown"]?.color || "rgba(255,255,255,0.5)" }}>
                                                    {HOUSE_THEMES[forumStats.newestMember.house || "Unknown"]?.icon} {forumStats.newestMember.full_name}
                                                </Link>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                        </aside>
                    </div>

                </div>
            </div>
        </div>
    );
}

function ForumSection({ title, accentColor, forums, userYear, userRole, userHouse, roleColors }: {
    title: string; accentColor: string;
    forums: Forum[]; userYear: number; userRole: string | null; userHouse: string | null;
    roleColors: Record<string, string>;
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
                    roleColors={roleColors}
                />
            ))}
        </div>
    );
}

function ForumRow({ forum, userYear, userRole, userHouse, roleColors }: any) {
    const router = useRouter();
    const isLocked = !!(forum.house_restriction && forum.house_restriction !== userHouse && userRole !== 'מנהל') ||
        !!(forum.min_year && userYear < forum.min_year && userRole !== 'מנהל');

    const theme = forum.house_restriction ? HOUSE_THEMES[forum.house_restriction] : null;
    const lastPosterColor = forum.last_thread?.author_group_color || getRoleColor(forum.last_thread?.author_role, forum.last_thread?.author_house, roleColors);

    const iconStyle = theme
        ? { background: theme.bg, borderColor: theme.border }
        : { background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.12)" };

    return (
        <div
            onClick={() => !isLocked && router.push(`/forums/${forum.slug}`)}
            className={`forum-row-grid ${isLocked ? "locked" : "cursor-pointer"}`}
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
                                    style={{ color: lastPosterColor, fontWeight: 700, fontSize: "10px" }}
                                    className="hover:underline"
                                >
                                    {forum.last_thread.author_name}
                                </Link>
                            ) : (
                                <span style={{ color: lastPosterColor, fontWeight: 700, fontSize: "10px" }}>
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
        </div>
    );
}
