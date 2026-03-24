"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import dynamic from 'next/dynamic';
import {
    ChevronLeft, Pin, Lock, MessageSquare, Clock, Plus, X, Home, Sparkles, Tag, Eye, CheckCheck
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import { getRoleColor, getRoleColorFromDB } from "@/lib/roleColor";

const ReactQuill = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => <div className="h-[220px] bg-white/5 animate-pulse rounded-lg" />,
});
import 'react-quill-new/dist/quill.snow.css';

interface Forum {
    id: string;
    name: string;
    description: string;
    slug: string;
    house_restriction: string | null;
}

interface Thread {
    id: string;
    title: string;
    author_id: string;
    prefix: string | null;
    is_pinned: boolean;
    is_locked: boolean;
    created_at: string;
    views?: number;
    reply_count?: number;
    last_post_at?: string;
    last_post_author_id?: string;
    last_post_profile?: {
        id: string;
        full_name: string | null;
        house: string | null;
        role: string | null;
        user_groups: { name: string; color: string } | null;
    };
    profiles: {
        full_name: string | null;
        house: string | null;
        role: string | null;
        is_online: boolean | null;
        avatar_url: string | null;
        user_groups: { name: string; color: string } | null;
    };
}

const PREFIX_CONFIG: Record<string, { bg: string; text: string; border: string; hex: string }> = {
    "דיון": { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", border: "rgba(59,130,246,0.25)", hex: "#3b82f6" },
    "שאלה": { bg: "rgba(244,63,94,0.12)", text: "#fb7185", border: "rgba(244,63,94,0.25)", hex: "#f43f5e" },
    "תיאוריה": { bg: "rgba(139,92,246,0.12)", text: "#a78bfa", border: "rgba(139,92,246,0.25)", hex: "#8b5cf6" },
    "פרסום": { bg: "rgba(16,185,129,0.12)", text: "#34d399", border: "rgba(16,185,129,0.25)", hex: "#10b981" },
};

const HOUSE_CONFIG: Record<string, { color: string; accent: string }> = {
    Gryffindor: { color: "#f87171", accent: "#dc2626" },
    Slytherin: { color: "#34d399", accent: "#059669" },
    Ravenclaw: { color: "#60a5fa", accent: "#2563eb" },
    Hufflepuff: { color: "#fbbf24", accent: "#d97706" },
};

const HOUSE_ICONS: Record<string, string> = {
    Gryffindor: "🦁", Slytherin: "🐍", Ravenclaw: "🦅", Hufflepuff: "🦡",
};

function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 0) return "ממש עכשיו";
    if (diff < 60) return "ממש עכשיו";
    if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק'`;
    if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שע'`;
    return date.toLocaleDateString("he-IL");
}

/* ─── Thread Row ─── */
function ThreadRow({ thread, canModerate, roleColors, isNew, onPin, onLock, onDelete }: {
    thread: Thread;
    canModerate?: boolean;
    roleColors?: Record<string, string>;
    isNew?: boolean;
    onPin?: (t: Thread) => void;
    onLock?: (t: Thread) => void;
    onDelete?: (t: Thread) => void;
}) {
    const router = useRouter();
    const houseConf = thread.profiles?.house ? HOUSE_CONFIG[thread.profiles.house] : null;
    const grp = thread.profiles?.user_groups as { name: string; color: string } | null;
    const nameColor = grp?.color || getRoleColor(thread.profiles?.role, thread.profiles?.house, roleColors);

    const lastProfile = thread.last_post_profile || thread.profiles;
    const lastAuthorId = thread.last_post_author_id || thread.author_id;
    const lastAt = thread.last_post_at || thread.created_at;
    const lastGrp = lastProfile?.user_groups as { name: string; color: string } | null;
    const lastNameColor = lastGrp?.color || getRoleColor(lastProfile?.role, (lastProfile as any)?.house, roleColors);
    const prefixConf = thread.prefix ? PREFIX_CONFIG[thread.prefix] : null;
    const icon = thread.profiles?.house ? HOUSE_ICONS[thread.profiles.house] : null;

    return (
        <div className={`thread-row group relative ${thread.is_pinned ? "is-pinned" : ""} ${thread.is_locked ? "is-locked" : ""}`}>
            {/* pinned indicator stripe */}
            {thread.is_pinned && (
                <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-amber-500/60 pointer-events-none rounded-r" />
            )}

            {/* main: icon + info — clickable via div onClick to avoid nested links */}
            <div
                className="thread-col-main min-w-0"
                onClick={() => router.push(`/forums/thread/${thread.id}`)}
                style={{ cursor: 'pointer' }}
            >
                <div
                    className="thread-icon"
                    style={{
                        background: thread.is_pinned
                            ? "rgba(245,158,11,0.12)"
                            : houseConf
                                ? `${houseConf.accent}12`
                                : "rgba(255,255,255,0.04)",
                        borderColor: thread.is_pinned
                            ? "rgba(245,158,11,0.3)"
                            : houseConf
                                ? `${houseConf.accent}30`
                                : "rgba(255,255,255,0.07)",
                    }}
                >
                    {thread.is_pinned
                        ? <Pin size={17} className="text-amber-400" />
                        : thread.is_locked
                            ? <Lock size={17} className="text-white/20" />
                            : <MessageSquare size={17} className={houseConf ? "" : "text-white/20"}
                                style={houseConf ? { color: houseConf.color } : {}} />
                    }
                </div>
                <div className="min-w-0 flex-1">
                    <div className="thread-title-row">
                        {prefixConf && (
                            <span
                                className="thread-prefix"
                                style={{ background: prefixConf.bg, color: prefixConf.text, border: `1px solid ${prefixConf.border}` }}
                            >
                                {thread.prefix}
                            </span>
                        )}

                        {/* באדג' נעוץ - זהוב ונושם */}
                        {thread.is_pinned && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] font-black uppercase tracking-tighter animate-pulse shrink-0">
                                <Pin size={10} className="fill-amber-400/20" /> נעוץ
                            </span>
                        )}

                        {/* באדג' NEW - ירוק זוהר לאשכולות שלא נקראו */}
                        {isNew && (
                            <span className="bg-emerald-500 text-emerald-950 text-[8px] font-black px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(52,211,153,0.4)] uppercase shrink-0 animate-in fade-in zoom-in">
                                NEW
                            </span>
                        )}

                        {/* באדג' נעול - אדום */}
                        {thread.is_locked && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-[8px] font-black uppercase tracking-tighter shrink-0">
                                <Lock size={10} /> נעול
                            </span>
                        )}

                        <span className={`thread-title ${thread.is_pinned ? "text-amber-200/90" : "text-white/90"} ${isNew ? "font-black" : ""}`}>
                            {thread.title}
                        </span>
                    </div>
                    <div className="thread-meta">
                        {icon && <span>{icon}</span>}
                        <Link
                            href={`/wizard/${thread.author_id}`}
                            onClick={e => e.stopPropagation()}
                            style={{ color: nameColor, fontWeight: 700 }}
                            className="hover:underline"
                        >
                            {thread.profiles?.full_name || "קוסם אנונימי"}
                        </Link>
                        <span className="text-white/15">·</span>
                        <Clock size={10} />
                        <span>{new Date(thread.created_at).toLocaleDateString("he-IL")}</span>
                        <span className="sm:hidden text-white/20">· {thread.reply_count || 0} תגובות</span>
                    </div>
                </div>
            </div>

            {/* replies */}
            <div
                onClick={() => router.push(`/forums/thread/${thread.id}`)}
                className="thread-col-stat cursor-pointer"
            >
                <span className="thread-stat-num">{thread.reply_count || 0}</span>
                <span className="thread-stat-label">תגובות</span>
            </div>

            {/* views */}
            <div className="thread-col-views">
                <span className="thread-stat-num">{(thread.views || 0).toLocaleString()}</span>
                <span className="thread-stat-label">צפיות</span>
            </div>

            {/* last reply + mod actions */}
            <div className="thread-col-lastpost" style={{ position: "relative" }}>
                <Link
                    href={`/wizard/${lastAuthorId}`}
                    onClick={e => e.stopPropagation()}
                    className="lastpost-author hover:underline"
                    style={{ color: lastNameColor }}
                >
                    {lastProfile?.full_name || "קוסם אנונימי"}
                </Link>
                <div className="lastpost-time">
                    <Clock size={9} />
                    {timeAgo(lastAt)}
                </div>

                {/* ── Mod actions — shown on hover for mods/admins ── */}
                {canModerate && (
                    <div className="mod-actions absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                            onClick={e => { e.stopPropagation(); onPin?.(thread); }}
                            title={thread.is_pinned ? "בטל עיגון" : "עגן שרשור"}
                            className="mod-btn"
                            style={{
                                background: thread.is_pinned ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.05)",
                                color: thread.is_pinned ? "#fbbf24" : "rgba(255,255,255,0.3)",
                                border: `1px solid ${thread.is_pinned ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.07)"}`,
                            }}
                        >
                            <Pin size={11} />
                        </button>
                        <button
                            onClick={e => { e.stopPropagation(); onLock?.(thread); }}
                            title={thread.is_locked ? "פתח נעילה" : "נעל שרשור"}
                            className="mod-btn"
                            style={{
                                background: thread.is_locked ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
                                color: thread.is_locked ? "#f87171" : "rgba(255,255,255,0.3)",
                                border: `1px solid ${thread.is_locked ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.07)"}`,
                            }}
                        >
                            <Lock size={11} />
                        </button>
                        <button
                            onClick={e => { e.stopPropagation(); onDelete?.(thread); }}
                            title="מחק שרשור"
                            className="mod-btn"
                            style={{ background: "rgba(239,68,68,0.08)", color: "rgba(239,68,68,0.5)", border: "1px solid rgba(239,68,68,0.15)" }}
                        >
                            <X size={11} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Main Page ─── */
export default function ForumThreadsPage() {
    const { slug } = useParams();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const { sendOwl } = useOwlMail();

    const [forum, setForum] = useState<Forum | null>(null);
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isNewThreadOpen, setIsNewThreadOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<"new" | "replies">("new");

    const [newThreadPrefix, setNewThreadPrefix] = useState("דיון");
    const [newThreadTitle, setNewThreadTitle] = useState("");
    const [newThreadContent, setNewThreadContent] = useState("");
    const [newThreadPinned, setNewThreadPinned] = useState(false);
    const [newThreadLocked, setNewThreadLocked] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [roleColors, setRoleColors] = useState<Record<string, string>>({});
    const [readMap, setReadMap] = useState<Record<string, number>>({});
    useEffect(() => { getRoleColorFromDB(supabase).then(setRoleColors); }, [supabase]);

    // Load read timestamps from localStorage after mount
    useEffect(() => {
        const map: Record<string, number> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('thread_read_')) {
                const tid = key.replace('thread_read_', '');
                map[tid] = parseInt(localStorage.getItem(key) || '0', 10);
            }
        }
        setReadMap(map);
    }, []);

    const fetchThreads = useCallback(async () => {
        if (!slug) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const myUserId = session?.user?.id || null;
            setCurrentUser(session?.user || null);

            const { data: forumData } = await supabase.from('forums').select('*').eq('slug', slug).single();
            if (!forumData) { router.push('/forums'); return; }

            const { data: profile } = await supabase.from('profiles')
                .select('house, role, user_groups(name)')
                .eq('id', session?.user?.id)
                .maybeSingle();

            // חילוץ הדרגה האמיתית מהקבוצות
            const groupData = profile?.user_groups;
            const currentRole = groupData ? (Array.isArray(groupData) ? groupData[0]?.name : (groupData as any).name) : profile?.role;

            // רשימת הדרגות המורשות
            const STAFF_ROLES_LIST = ['מייסד', 'ראש הוגוורטס', 'שומר הטירה', 'פרופסור', 'צוות Lumos'];
            const isStaff = currentRole ? STAFF_ROLES_LIST.includes(currentRole) : false;

            // התיקון: שימוש ב-isStaff במקום במילה הקשיחה 'מנהל'
            if (forumData.house_restriction && forumData.house_restriction !== profile?.house && !isStaff) {
                router.push('/forums'); return;
            }

            setUserRole(currentRole || null);
            setForum(forumData);

            const { data: threadsData } = await supabase
                .from('threads')
                .select('*, profiles(full_name, house, role, is_online, avatar_url, is_ghost, user_groups(name, color)), forum_posts(count)')
                .eq('forum_id', forumData.id)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });

            // Batch-fetch last post per thread
            const threadIds = (threadsData || []).map((t: any) => t.id);
            const lastPostMap: Record<string, any> = {};
            if (threadIds.length > 0) {
                const { data: lastPosts } = await supabase
                    .from('forum_posts')
                    .select('thread_id, created_at, user_id, profiles(id, full_name, house, role, is_ghost, user_groups(name, color))')
                    .in('thread_id', threadIds)
                    .order('created_at', { ascending: false });
                for (const p of lastPosts || []) {
                    // 👻 דלוג על הודעות של רוחות רפאים (Shadowban) כ"הודעה אחרונה"
                    const pProfile = Array.isArray((p as any).profiles) ? (p as any).profiles[0] : (p as any).profiles;
                    if (pProfile?.is_ghost && p.user_id !== myUserId) continue;
                    if (!lastPostMap[p.thread_id]) lastPostMap[p.thread_id] = p;
                }
            }

            const formattedThreads = threadsData?.map((t: any) => {
                const lp = lastPostMap[t.id];
                const lpProfileRaw = lp ? (Array.isArray(lp.profiles) ? lp.profiles[0] : lp.profiles) : null;
                const lpProfile = lpProfileRaw ? {
                    ...lpProfileRaw,
                    user_groups: Array.isArray(lpProfileRaw.user_groups) ? lpProfileRaw.user_groups[0] : lpProfileRaw.user_groups
                } : null;

                const tProfileRaw = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
                const tProfile = tProfileRaw ? {
                    ...tProfileRaw,
                    user_groups: Array.isArray(tProfileRaw.user_groups) ? tProfileRaw.user_groups[0] : tProfileRaw.user_groups
                } : null;

                return {
                    ...t,
                    profiles: tProfile,
                    is_pinned: t.is_pinned ?? false,
                    is_locked: t.is_locked ?? false,
                    reply_count: t.forum_posts?.[0]?.count || 0,
                    last_post_at: lp?.created_at,
                    last_post_author_id: lp?.user_id,
                    last_post_profile: lpProfile,
                };
            })?.filter((t: any) => {
                // 👻 הסתרת אשכולות שנפתחו על ידי רוחות רפאים
                if (t.profiles?.is_ghost && t.author_id !== myUserId) return false;
                return true;
            });

            setThreads(formattedThreads as any || []);
        } catch (err) { console.error(err); } finally { setIsLoading(false); }
    }, [slug, supabase, router]);

    useEffect(() => { fetchThreads(); }, [fetchThreads]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsNewThreadOpen(false);
        };
        if (isNewThreadOpen) document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isNewThreadOpen]);

    /* ── Mod actions ── */
    const handlePinThread = async (thread: Thread) => {
        const pinned = !thread.is_pinned;
        const { error } = await supabase.from('threads').update({ is_pinned: pinned }).eq('id', thread.id);
        if (!error) setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, is_pinned: pinned } : t));
    };

    const handleLockThread = async (thread: Thread) => {
        const locked = !thread.is_locked;
        const { error } = await supabase.from('threads').update({ is_locked: locked }).eq('id', thread.id);
        if (!error) setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, is_locked: locked } : t));
    };

    const handleDeleteThread = async (thread: Thread) => {
        if (!confirm(`למחוק את השרשור "${thread.title}"?`)) return;
        const { error } = await supabase.from('threads').delete().eq('id', thread.id);
        if (!error) setThreads(prev => prev.filter(t => t.id !== thread.id));
    };

    const STAFF_ROLES = ['מייסד', 'ראש הוגוורטס', 'שומר הטירה', 'פרופסור', 'צוות Lumos'];
    const canModerate = userRole ? STAFF_ROLES.includes(userRole) : false;

    const handleCreateThread = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanContent = newThreadContent.replace(/<[^>]*>?/gm, '').trim();
        if (!newThreadTitle.trim() || !cleanContent || !forum || !currentUser) return;

        if (cleanContent.length < 20) {
            sendOwl("הלחש קצר מדי", "עליך לכתוב לפחות 20 תווים כדי לפרסם.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: threadData, error: tError } = await supabase
                .from('threads')
                .insert([{
                    forum_id: forum.id,
                    author_id: currentUser.id,
                    title: newThreadTitle.trim(),
                    prefix: newThreadPrefix,
                    is_pinned: newThreadPinned,
                    is_locked: newThreadLocked,
                    last_post_at: new Date().toISOString(),
                    last_activity_at: new Date().toISOString()
                }])
                .select().single();
            if (tError) throw tError;

            const { error: pError } = await supabase
                .from('forum_posts')
                .insert([{ thread_id: threadData.id, user_id: currentUser.id, content: newThreadContent }]);

            if (pError) {
                // Thread was created but first post failed — delete the empty thread and report
                await supabase.from('threads').delete().eq('id', threadData.id);
                throw pError;
            }

            setNewThreadTitle("");
            setNewThreadContent("");
            setNewThreadPinned(false);
            setNewThreadLocked(false);
            setIsNewThreadOpen(false);
            fetchThreads();
            router.push(`/forums/thread/${threadData.id}`);
        } catch (err: any) {
            console.error("Thread creation failed:", err);

            // שליפת הודעת השגיאה מהדאטה-בייס (למשל 'גישה חסומה...')
            const errorMsg = err.message?.includes('גישה חסומה')
                ? err.message
                : "משהו השתבש, נסה שוב בעוד רגע.";

            sendOwl("שגיאה ביצירת דיון", errorMsg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isNewThreadOpen) {
                setIsNewThreadOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isNewThreadOpen]);

    if (isLoading) return (
        <div className="min-h-screen bg-[#060910] flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-amber-500/40 animate-pulse" />
        </div>
    );

    const houseConfig = forum?.house_restriction ? HOUSE_CONFIG[forum.house_restriction] : null;
    const sortedThreads = [...threads].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        if (sortBy === "replies") return (b.reply_count || 0) - (a.reply_count || 0);
        const aTime = new Date(a.last_post_at || a.created_at).getTime();
        const bTime = new Date(b.last_post_at || b.created_at).getTime();
        return bTime - aTime;
    });

    return (
        <div className="min-h-screen bg-[#060910] text-white font-assistant pt-24 pb-20" dir="rtl">
            <style>{`
                .tlist-bg { background-image: radial-gradient(rgba(245,158,11,0.02) 1px, transparent 1px); background-size: 36px 36px; }

                /* thread editor */
                .thread-editor .ql-editor { text-align: right; direction: rtl; min-height: 200px; color: #f1f5f9; }
                .thread-editor .ql-toolbar { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.1) !important; border-radius: 12px 12px 0 0; }
                .thread-editor .ql-container { border-color: rgba(255,255,255,0.1) !important; border-radius: 0 0 12px 12px; }

                /* thread list table */
                .thread-table {
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 14px;
                    overflow: hidden;
                    background: rgba(255,255,255,0.01);
                }
                .thread-col-headers {
                    display: grid;
                    grid-template-columns: 1fr 80px 80px 160px;
                    padding: 10px 20px;
                    background: rgba(0,0,0,0.3);
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                }
                @media (max-width: 640px) {
                    .thread-col-headers { display: none; }
                    .thread-row { grid-template-columns: 1fr !important; }
                    .thread-col-stat, .thread-col-views, .thread-col-lastpost { display: none !important; }
                }
                .thread-col-header-label {
                    font-size: 9px; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.12em;
                    color: rgba(255,255,255,0.2);
                }
                .thread-col-views {
                    padding: 14px 10px; text-align: center;
                }
                .thread-row {
                    display: grid;
                    grid-template-columns: 1fr 80px 80px 160px;
                    align-items: center;
                    border-bottom: 1px solid rgba(255,255,255,0.03);
                    position: relative;
                    transition: background 0.15s;
                    text-decoration: none;
                    color: inherit;
                }
                .thread-row:last-child { border-bottom: none; }
                .thread-row:hover { background: rgba(255,255,255,0.025); }
                .thread-col-main {
                    padding: 14px 20px;
                    display: flex; align-items: center; gap: 12px;
                    min-width: 0;
                }
                .thread-icon {
                    width: 36px; height: 36px; border-radius: 9px;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0; border: 1px solid;
                    transition: transform 0.25s;
                }
                .thread-row:hover .thread-icon { transform: scale(1.1); }
                .thread-title-row {
                    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
                    margin-bottom: 4px;
                }
                .thread-prefix {
                    font-size: 9px; font-weight: 700;
                    padding: 2px 7px; border-radius: 4px;
                    text-transform: uppercase; letter-spacing: 0.08em;
                    flex-shrink: 0;
                }
                .thread-title {
                    font-family: 'Cinzel', serif; font-weight: 700;
                    font-size: 0.93rem; color: rgba(255,255,255,0.82);
                    transition: color 0.15s; line-height: 1.3;
                }
                .thread-row:hover .thread-title { color: #fbbf24; }
                .thread-meta {
                    display: flex; align-items: center; gap: 5px;
                    font-size: 11px; color: rgba(255,255,255,0.28);
                }
                .thread-col-stat {
                    padding: 14px 10px; text-align: center;
                }
                .thread-stat-num {
                    display: block;
                    font-family: 'Cinzel', serif; font-weight: 700;
                    font-size: 1rem; color: rgba(255,255,255,0.65);
                    line-height: 1;
                }
                .thread-stat-label {
                    display: block;
                    font-size: 9px; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.08em;
                    color: rgba(255,255,255,0.2); margin-top: 3px;
                }
                .thread-col-lastpost {
                    padding: 14px 16px;
                }
                .lastpost-author {
                    font-size: 11px; font-weight: 700;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                    margin-bottom: 3px;
                }
                .lastpost-time {
                    display: flex; align-items: center; gap: 4px;
                    font-size: 10px; color: rgba(255,255,255,0.22);
                }

                /* pinned/locked row states */
                .thread-row.is-pinned { background: rgba(245,158,11,0.03); }
                .thread-row.is-pinned:hover { background: rgba(245,158,11,0.06); }
                .thread-row.is-locked { opacity: 0.72; }
                .thread-row.is-locked:hover { opacity: 0.9; }

                /* mod buttons */
                .mod-btn {
                    display: flex; align-items: center; justify-content: center;
                    width: 24px; height: 24px; border-radius: 6px;
                    cursor: pointer; transition: all 0.15s;
                    flex-shrink: 0;
                }
                .mod-btn:hover { filter: brightness(1.4); transform: scale(1.1); }

                /* sort bar */
                .sort-bar {
                    display: flex; align-items: center; gap: 8px;
                    padding: 10px 16px;
                    background: rgba(0,0,0,0.2);
                    border: 1px solid rgba(255,255,255,0.04);
                    border-radius: 10px;
                    margin-bottom: 14px;
                }
                .sort-btn {
                    font-size: 11px; font-weight: 700;
                    padding: 4px 12px; border-radius: 6px;
                    cursor: pointer; border: 1px solid transparent;
                    transition: all 0.15s;
                    color: rgba(255,255,255,0.35);
                    background: transparent;
                }
                .sort-btn:hover { color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.04); }
                .sort-btn.active {
                    color: #fbbf24;
                    background: rgba(245,158,11,0.1);
                    border-color: rgba(245,158,11,0.2);
                }
            `}</style>

            <div className="tlist-bg min-h-screen relative">

                {/* ambient glows */}
                <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 right-1/4 w-[600px] h-[500px] bg-amber-500/[0.03] rounded-full blur-[150px]" />
                    <div className="absolute bottom-1/3 left-0 w-[500px] h-[500px] bg-indigo-500/[0.025] rounded-full blur-[130px]" />
                </div>

                <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6">

                    {/* header */}
                    <div className="mb-8 pt-2 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-3">
                            <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/25">
                                <Link href="/" className="hover:text-amber-500 transition-colors flex items-center gap-1.5"><Home size={10} /> הוגוורטס</Link>
                                <ChevronLeft size={10} />
                                <Link href="/forums" className="hover:text-amber-500 transition-colors">פורומים</Link>
                                <ChevronLeft size={10} />
                                <span className="text-amber-500/70">{forum?.name}</span>
                            </nav>
                            <h1
                                className="font-cinzel text-4xl md:text-5xl font-black tracking-tighter"
                                style={houseConfig ? { color: houseConfig.color } : { color: "white" }}
                            >
                                {forum?.name}
                            </h1>
                            <p className="text-white/35 italic font-crimson text-lg">{forum?.description}</p>
                        </div>

                        {currentUser && (
                            <button
                                onClick={() => setIsNewThreadOpen(true)}
                                className="flex items-center gap-2.5 px-6 py-3.5 bg-amber-600 hover:bg-amber-500 text-amber-950 font-cinzel font-black text-sm rounded-xl transition-all shadow-lg shadow-amber-900/20 active:scale-95 shrink-0"
                            >
                                <Plus size={17} /> נושא חדש
                            </button>
                        )}
                    </div>

                    {/* sort bar */}
                    <div className="sort-bar">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/20 ml-2">מיון:</span>
                        <button className={`sort-btn ${sortBy === "new" ? "active" : ""}`} onClick={() => setSortBy("new")}>חדש ביותר</button>
                        <button className={`sort-btn ${sortBy === "replies" ? "active" : ""}`} onClick={() => setSortBy("replies")}>הכי פעיל</button>
                        <span className="mr-auto text-[10px] text-white/20">
                            {threads.length} נושאים
                        </span>
                        {currentUser && (
                            <button
                                onClick={() => {
                                    const now = Date.now();
                                    const newMap: Record<string, number> = { ...readMap };
                                    threads.forEach(t => {
                                        localStorage.setItem(`thread_read_${t.id}`, now.toString());
                                        newMap[t.id] = now;
                                    });
                                    setReadMap(newMap);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold text-white/30 hover:text-emerald-400 hover:bg-emerald-500/[0.08] border border-transparent hover:border-emerald-500/20 transition-all"
                                title="סמן את כל האשכולות כנקראו"
                            >
                                <CheckCheck size={12} /> סמן הכל כנקרא
                            </button>
                        )}
                    </div>

                    {/* thread table */}
                    <div className="thread-table">
                        <div className="thread-col-headers">
                            <span className="thread-col-header-label">אשכול</span>
                            <span className="thread-col-header-label text-center">תגובות</span>
                            <span className="thread-col-header-label text-center">צפיות</span>
                            <span className="thread-col-header-label">פוסט אחרון</span>
                        </div>

                        {sortedThreads.length > 0 ? (
                            sortedThreads.map((t) => {
                                const lastActivity = t.last_post_at || t.created_at;
                                const lastRead = readMap[t.id] || 0;
                                const isNew = !!lastActivity && new Date(lastActivity).getTime() > lastRead;
                                return (
                                    <ThreadRow
                                        key={t.id}
                                        thread={t}
                                        canModerate={canModerate}
                                        roleColors={roleColors}
                                        isNew={isNew}
                                        onPin={handlePinThread}
                                        onLock={handleLockThread}
                                        onDelete={handleDeleteThread}
                                    />
                                );
                            })
                        ) : (
                            <div className="py-24 text-center">
                                <Sparkles size={40} className="mx-auto mb-5 text-amber-500/10 animate-pulse" />
                                <p className="font-cinzel font-black text-xl text-white/15 tracking-widest uppercase">הדפים עדיין ריקים</p>
                                {currentUser && (
                                    <button
                                        onClick={() => setIsNewThreadOpen(true)}
                                        className="mt-6 px-6 py-2.5 bg-amber-600/80 hover:bg-amber-600 text-amber-950 font-cinzel font-black text-xs rounded-lg transition-all"
                                    >
                                        פתח דיון ראשון
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Modal: New Thread */}
            {isNewThreadOpen && (
                <div
                    className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300"
                    style={{ paddingTop: '120px' }}
                    onClick={(e) => e.target === e.currentTarget && setIsNewThreadOpen(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-title"
                        className="bg-[#0c0f18] border border-white/[0.08] w-full rounded-2xl shadow-2xl overflow-hidden relative flex flex-col"
                        dir="rtl"
                        style={{ maxWidth: '520px', maxHeight: '90vh' }}
                    >
                        <div className="shrink-0 px-6 py-4 border-b border-white/[0.06] bg-white/[0.03] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20">
                                    <Plus size={18} aria-hidden="true" />
                                </div>
                                <h3 id="modal-title" className="font-cinzel font-black text-lg text-white tracking-wide">פתיחת דיון חדש</h3>
                            </div>
                            <button onClick={() => setIsNewThreadOpen(false)} aria-label="סגור חלונית" className="text-white/20 hover:text-white/60 transition-colors p-1.5 hover:bg-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                                <X size={22} aria-hidden="true" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateThread} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                                {/* prefix */}
                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                                        <Tag size={11} /> סוג הדיון
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(PREFIX_CONFIG).map(([opt, conf]) => {
                                            const isActive = newThreadPrefix === opt;
                                            return (
                                                <button
                                                    key={opt} type="button"
                                                    onClick={() => setNewThreadPrefix(opt)}
                                                    className="px-4 py-2 rounded-lg text-xs font-black tracking-wide transition-all"
                                                    style={isActive
                                                        ? {
                                                            background: conf.bg,
                                                            borderColor: conf.border,
                                                            color: conf.text,
                                                            border: `1.5px solid ${conf.border}`,
                                                            boxShadow: `0 0 10px ${conf.border}`,
                                                            transform: "scale(1.05)",
                                                        }
                                                        : {
                                                            background: "rgba(255,255,255,0.05)",
                                                            border: "1.5px solid rgba(255,255,255,0.1)",
                                                            color: "rgba(255,255,255,0.55)",
                                                        }
                                                    }
                                                >
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* title */}
                                <div className="space-y-2.5">
                                    <label htmlFor="thread-title" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">כותרת הדיון</label>
                                    <input
                                        id="thread-title"
                                        required
                                        placeholder="על מה נדבר היום?"
                                        value={newThreadTitle}
                                        onChange={(e) => setNewThreadTitle(e.target.value)}
                                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-4 text-lg font-bold text-white placeholder:text-white/10 focus:outline-none focus:border-amber-500/30 focus:bg-white/[0.06] transition-all"
                                    />
                                </div>

                                {/* content */}
                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">תוכן הפוסט</label>
                                    <div className="thread-editor rounded-xl overflow-hidden border border-white/[0.06] ql-rtl">
                                        <ReactQuill theme="snow" value={newThreadContent} onChange={setNewThreadContent} placeholder="שתף את הקסם שלך עם הקהילה..." />
                                    </div>
                                    {(() => {
                                        const len = newThreadContent.replace(/<[^>]*>?/gm, '').trim().length;
                                        return (
                                            <span
                                                className="text-[10px] font-bold"
                                                style={{ color: len >= 20 ? "rgba(52,211,153,0.6)" : len > 0 ? "rgba(251,191,36,0.6)" : "rgba(255,255,255,0.2)" }}
                                            >
                                                {len} / 20 תווים מינימום
                                                {len >= 20 && " ✓"}
                                            </span>
                                        );
                                    })()}
                                </div>

                                {/* Mod options */}
                                {canModerate && (
                                    <div className="flex items-center gap-4 pt-2 pb-1 border-t border-white/[0.05]">
                                        <span className="text-[10px] font-cinzel text-white/20 uppercase tracking-widest">אפשרויות מנחה:</span>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div
                                                onClick={() => setNewThreadPinned(p => !p)}
                                                className="w-8 h-4 rounded-full relative transition-all cursor-pointer"
                                                style={{ background: newThreadPinned ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.08)" }}
                                            >
                                                <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200"
                                                    style={{ right: newThreadPinned ? "2px" : "auto", left: newThreadPinned ? "auto" : "2px" }} />
                                            </div>
                                            <Pin size={12} className={newThreadPinned ? "text-amber-400" : "text-white/25"} />
                                            <span className="font-cinzel text-[10px] text-white/30">עגן שרשור</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div
                                                onClick={() => setNewThreadLocked(p => !p)}
                                                className="w-8 h-4 rounded-full relative transition-all cursor-pointer"
                                                style={{ background: newThreadLocked ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)" }}
                                            >
                                                <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200"
                                                    style={{ right: newThreadLocked ? "2px" : "auto", left: newThreadLocked ? "auto" : "2px" }} />
                                            </div>
                                            <Lock size={12} className={newThreadLocked ? "text-red-400" : "text-white/25"} />
                                            <span className="font-cinzel text-[10px] text-white/30">נעל שרשור</span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="shrink-0 flex justify-end gap-3 px-8 py-4 border-t border-white/[0.05] bg-white/[0.02]">
                                <button
                                    type="button"
                                    onClick={() => setIsNewThreadOpen(false)}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all"
                                >
                                    ביטול
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !newThreadTitle.trim() || newThreadContent.replace(/<[^>]*>?/gm, '').trim().length < 20}
                                    className="flex items-center gap-2.5 px-10 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-amber-950 font-cinzel font-black text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-900/20"
                                >
                                    {isSubmitting ? <div className="w-4 h-4 border-t-2 border-amber-950 rounded-full animate-spin" /> : <><Sparkles size={16} /> שליחת ינשוף</>}
                                </button>
                            </div>
                        </form>

                    </div>
                </div>
            )}
        </div>
    );
}
