"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
    MessagesSquare, Lock, ChevronLeft, MessageSquare, Home, Hash, Clock, Sparkles, Users, Trophy, Flame, Skull, Bird, Leaf, Plus, X, Tag, Pin
} from "lucide-react";
import dynamic from "next/dynamic";

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false, loading: () => <div className="h-40 bg-white/[0.02] border border-white/[0.05] rounded-xl animate-pulse" /> });
import 'react-quill-new/dist/quill.snow.css';
import { useOwlMail } from "@/components/OwlMail";
import { getRoleColor, getRoleColorFromDB } from "@/lib/roleColor";
import { logActivityEvent } from "@/lib/activityEvents";
import { formatHebrewRelativeTime } from "@/lib/dateTime";
import { getHouseIcon, getHouseLabel, getHousePalette, getHouseReadableColor, resolveHouseId, withAlpha } from "@/lib/houses";

interface Forum {
    id: string;
    name: string;
    description: string;
    slug: string;
    category_id: string | null;
    staff_only_create: boolean;
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
    Gryffindor: { color: "#D3A625", bg: withAlpha("#740001", 0.12), border: withAlpha("#D3A625", 0.28), icon: "🦁", glow: withAlpha("#D3A625", 0.26), nameHe: "גריפינדור", accent: "#740001" },
    Slytherin: { color: "#D2D2D2", bg: withAlpha("#1A472A", 0.12), border: withAlpha("#D2D2D2", 0.22), icon: "🐍", glow: withAlpha("#D2D2D2", 0.2), nameHe: "סלית'רין", accent: "#1A472A" },
    Ravenclaw: { color: "#D8B98E", bg: withAlpha("#0E1A40", 0.16), border: withAlpha("#D8B98E", 0.24), icon: "🦅", glow: withAlpha("#D8B98E", 0.22), nameHe: "רייבנקלו", accent: "#0E1A40" },
    Hufflepuff: { color: "#EEB939", bg: withAlpha("#27251F", 0.18), border: withAlpha("#EEB939", 0.28), icon: "🦡", glow: withAlpha("#EEB939", 0.24), nameHe: "הפלפאף", accent: "#27251F" },
    Unknown: { color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", icon: "🧙", glow: "rgba(255,255,255,0.1)", nameHe: "טרם סווג", accent: "#6b7280" },
};

const PREFIX_CONFIG: Record<string, { text: string; bg: string; border: string }> = {
    "דיון": { text: "#60a5fa", bg: "rgba(37,99,235,0.1)", border: "rgba(37,99,235,0.3)" },
    "שאלה": { text: "#f87171", bg: "rgba(220,38,38,0.1)", border: "rgba(220,38,38,0.3)" },
    "תיאוריה": { text: "#a78bfa", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.3)" },
    "פרסום": { text: "#34d399", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)" },
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

function safeTimeAgo(dateString: string) {
    return formatHebrewRelativeTime(dateString, {
        invalidLabel: "לא ידוע",
        yesterdayLabel: null,
        maxRelativeDays: 6,
    });
}

interface Category {
    id: string;
    name: string;
    display_order: number;
}

interface UserGroup {
    id: number;
    name: string;
    color: string;
    display_order: number;
}

const HOUSE_POINTS_META: Record<string, { icon: any; color: string; glow: string; nameHe: string }> = {
    Gryffindor: { icon: Flame, color: "#D3A625", glow: withAlpha("#D3A625", 0.35), nameHe: "גריפינדור" },
    Slytherin: { icon: Skull, color: "#D2D2D2", glow: withAlpha("#D2D2D2", 0.28), nameHe: "סלית'רין" },
    Ravenclaw: { icon: Bird, color: "#D8B98E", glow: withAlpha("#D8B98E", 0.3), nameHe: "רייבנקלו" },
    Hufflepuff: { icon: Leaf, color: "#EEB939", glow: withAlpha("#EEB939", 0.32), nameHe: "הפלפאף" },
};
const HOUSE_ORDER = ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"] as const;
const LEGACY_BANNED_ROLE = "אסיר אזקבאן";

const LEGACY_BANNED_ROLE_HE = "\u05d0\u05e1\u05d9\u05e8 \u05d0\u05d6\u05e7\u05d1\u05d0\u05df";

export default function ForumsPage() {
    const [supabase] = useState(() => createClient());
    const [forums, setForums] = useState<Forum[]>([]);
    const [userHouse, setUserHouse] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userStatus, setUserStatus] = useState<string | null>(null);
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
    const [categories, setCategories] = useState<Category[]>([]);

    // Global Modal State
    const [isNewThreadOpen, setIsNewThreadOpen] = useState(false);
    const [newThreadPrefix, setNewThreadPrefix] = useState("דיון");
    const [newThreadTitle, setNewThreadTitle] = useState("");
    const [newThreadContent, setNewThreadContent] = useState("");
    const [selectedForumId, setSelectedForumId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newThreadPinned, setNewThreadPinned] = useState(false);
    const [newThreadLocked, setNewThreadLocked] = useState(false);

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

            if (session?.user) {
                // הוספנו את user_groups(name) לשליפה
                const { data: profile } = await supabase.from('profiles')
                    .select('house, role, status, year, user_groups(name)')
                    .eq('id', session.user.id)
                    .single();

                setUserHouse(profile?.house || null);
                setUserStatus(profile?.status || null);

                // חילוץ שם הדרגה מתוך הטבלה המקושרת (או נפילה אחורה ל-role הרגיל)
                const groupData = profile?.user_groups;
                const roleName = groupData ? (Array.isArray(groupData) ? groupData[0]?.name : (groupData as any).name) : profile?.role;

                const normalizedRole = profile?.status === 'active' && profile?.role === LEGACY_BANNED_ROLE_HE
                    ? null
                    : roleName;

                setUserRole(normalizedRole || null);
                setUserYear(profile?.year || 1);
            } else {
                setUserHouse(null);
                setUserRole(null);
                setUserStatus(null);
                setUserYear(0);
            }

            // --- תוספת: שליפת קטגוריות ---
            const { data: catsData } = await supabase
                .from('forum_categories')
                .select('*')
                .order('display_order', { ascending: true });

            if (catsData) setCategories(catsData);

            // --- עדכון: הוספנו category_id לשאילתה ---
            const { data: forumsData, error: forumsError } = await supabase
                .from('forums')
                .select(`*, category_id, threads(id, title, created_at, author_id, forum_posts(id), profiles(id, full_name, house, role, is_ghost, user_groups(name, color)))`)
                .order('created_at', { ascending: true });

            if (forumsData) {
                const allThreadIds = forumsData.flatMap((f: any) => (f.threads || []).map((t: any) => t.id));
                const forumLastPostMap: Record<string, { post: any; thread: any }> = {};
                let rawPosts: any[] = [];

                if (allThreadIds.length > 0) {
                    const { data: rawPostsData } = await supabase
                        .from('forum_posts')
                        .select('id, created_at, user_id, thread_id, profiles(id, full_name, house, role, is_ghost, user_groups(name, color))')
                        .in('thread_id', allThreadIds)
                        .order('created_at', { ascending: false })
                        .limit(500);

                    rawPosts = rawPostsData || [];

                    const threadForumMap: Record<string, { thread: any; forumId: string }> = {};
                    for (const f of forumsData) {
                        for (const t of f.threads || []) {
                            threadForumMap[t.id] = { thread: t, forumId: f.id };
                        }
                    }

                    for (const p of rawPosts) {
                        const mapping = threadForumMap[p.thread_id];
                        if (!mapping) continue;
                        // 👻 דלוג על הודעות של רוחות רפאים
                        const pProfile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                        if (pProfile?.is_ghost && p.user_id !== session?.user?.id) continue;
                        if (!forumLastPostMap[mapping.forumId]) {
                            forumLastPostMap[mapping.forumId] = { post: p, thread: mapping.thread };
                        }
                    }
                }

                const formattedForums = forumsData.map((f: any) => {
                    const lastEntry = forumLastPostMap[f.id];
                    const lastPost = lastEntry?.post;
                    const lastThread = lastEntry?.thread;
                    const lastPosterProfileRaw = lastPost ? (Array.isArray(lastPost.profiles) ? lastPost.profiles[0] : lastPost.profiles) : null;
                    const lastPosterProfile = lastPosterProfileRaw ? {
                        ...lastPosterProfileRaw,
                        user_groups: Array.isArray(lastPosterProfileRaw.user_groups) ? lastPosterProfileRaw.user_groups[0] : lastPosterProfileRaw.user_groups
                    } : null;

                    const sortedThreads = [...(f.threads || [])].sort((a: any, b: any) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    );
                    const fallbackThread = sortedThreads[0];
                    const fallbackProfileRaw = fallbackThread ? (Array.isArray(fallbackThread.profiles) ? fallbackThread.profiles[0] : fallbackThread.profiles) : null;
                    const fallbackProfile = fallbackProfileRaw ? {
                        ...fallbackProfileRaw,
                        user_groups: Array.isArray(fallbackProfileRaw.user_groups) ? fallbackProfileRaw.user_groups[0] : fallbackProfileRaw.user_groups
                    } : null;

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
                            author_group_color: (displayProfile?.user_groups as any)?.color || null,
                        } : null
                    };
                });
                setForums(formattedForums);

                const threadMap: Record<string, { id: string; title: string; forumName: string; forumSlug: string }> = {};
                const allThreadsFlat: any[] = [];
                for (const f of forumsData) {
                    for (const t of f.threads || []) {
                        threadMap[t.id] = { id: t.id, title: t.title, forumName: f.name, forumSlug: f.slug };
                        const author = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
                        allThreadsFlat.push({ ...t, forumName: f.name, forumSlug: f.slug, author });
                    }
                }

                // 👻 סינון אשכולות ופוסטים של רוחות רפאים מהסיידבר
                const visibleThreads = allThreadsFlat.filter((t: any) => {
                    if (t.author?.is_ghost && t.author_id !== session?.user?.id) return false;
                    return true;
                });
                visibleThreads.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setRecentThreads(visibleThreads.slice(0, 8));

                const visiblePosts = rawPosts.filter((p: any) => {
                    const poster = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                    if (poster?.is_ghost && p.user_id !== session?.user?.id) return false;
                    return true;
                });
                const enrichedPosts = visiblePosts.slice(0, 8).map((p: any) => ({
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

    // רשימת הדרגות מהטבלה שלך
    const STAFF_ROLES = ['מייסד', 'ראש הוגוורטס', 'שומר הטירה', 'פרופסור', 'צוות Lumos'];
    const canModerate = userRole ? STAFF_ROLES.includes(userRole) : false;

    const handleCreateGlobalThread = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            alert("עליך להיות מחובר כדי לשלוח ינשוף ולפתוח דיון.");
            return;
        }

        if (!selectedForumId) {
            alert("אנא בחר פורום מהרשימה.");
            return;
        }

        setIsSubmitting(true);

        try {
            const { data: profile } = await supabase.from('profiles')
                .select('house, role, status, year, user_groups(name)')
                .eq('id', session.user.id)
                .single();

            const isLegacyRoleBanned = profile?.role === LEGACY_BANNED_ROLE_HE && !profile?.status;

            if (profile?.status === 'active' && profile?.role === LEGACY_BANNED_ROLE_HE) {
                profile.role = null;
            }

            if (profile?.status === 'banned' || isLegacyRoleBanned) {
                setIsSubmitting(false);
                alert("הגישה חסומה כרגע לשליחת הודעות בקהילה.");
                return;
            }

            if (profile?.status === 'banned') {
                setIsSubmitting(false);
                alert("צו אזקבאן פעיל על החשבון הזה, ולכן אין גישה להטיל כשפים או לשלוח ינשופים בקהילה.");
                return;
            }

            if (profile?.status === 'active' && profile?.role === LEGACY_BANNED_ROLE) {
                profile.role = null;
            }

            // 🛑 בדיקת אזקבאן חמורה!
            if (profile?.role === 'אסיר אזקבאן') {
                setIsSubmitting(false);
                alert("צו אזקבאן פעיל על החשבון הזה, ולכן אין גישה להטיל כשפים או לשלוח ינשופים בקהילה.");
                return;
            }

            const forum = forums.find(f => f.id === selectedForumId);

                // בדיקה עדכנית לדרגה מתוך הדאטה-בייס כדי למנוע מעקפים
                const groupData = profile?.user_groups;
                const fetchedRoleName = groupData ? (Array.isArray(groupData) ? groupData[0]?.name : (groupData as any).name) : profile?.role;
                const isServerMod = fetchedRoleName ? STAFF_ROLES.includes(fetchedRoleName) : false;

                if (forum?.staff_only_create && !isServerMod) {
                    setIsSubmitting(false);
                    alert("עצרו! פורום זה מיועד להודעות רשמיות של משרד הקסמים בלבד. רק חברי צוות הנהלת הטירה יכולים לפתוח כאן דיונים.");
                    return;
                }
                // בדיקת הגבלת צוות
                if (forum?.staff_only_create && !canModerate) {
                    setIsSubmitting(false);
                    alert("רק חברי צוות הנהלת הטירה יכולים לפתוח דיונים בפורום זה.");
                    return;
                }

                if (!forum) {
                    setIsSubmitting(false);
                    console.error("❌ Forum not found in state:", selectedForumId);
                    return;
                }

                // בדיקת הרשאות לפורומים מיוחדים
                if (forum.house_restriction && profile?.house !== forum.house_restriction && !canModerate) {
                    setIsSubmitting(false);
                    alert("אין לך גישה לפרסם בפורום בית זה.");
                    return;
                }
                if (forum.min_year && (profile?.year || 1) < forum.min_year && !canModerate) {
                    setIsSubmitting(false);
                    alert(`פורום זה דורש שנת לימוד ${forum.min_year} לפחות.`);
                    return;
                }

                // נוודא שיש גם כותרת וגם תוכן תקין
                if (!newThreadTitle.trim() || !newThreadContent.replace(/<[^>]*>?/gm, '').trim()) {
                    setIsSubmitting(false);
                    alert("הודעה או כותרת ריקה אינן מורשות.");
                    return;
                }

                const contentStr = `<span style="display:inline-block; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:11px; margin-left:6px; background:${PREFIX_CONFIG[newThreadPrefix].bg}; color:${PREFIX_CONFIG[newThreadPrefix].text}; border:1px solid ${PREFIX_CONFIG[newThreadPrefix].border};">${newThreadPrefix}</span> ${newThreadContent}`;

                // 2. יצירת האשכול עם כל העמודות המעודכנות
                const { data: threadData, error: threadError } = await supabase.rpc('create_forum_thread_secure', {
                    p_forum_id: selectedForumId,
                    p_title: newThreadTitle.trim(),
                    p_content: contentStr,
                    p_prefix: newThreadPrefix,
                    p_is_pinned: canModerate ? newThreadPinned : false,
                    p_is_locked: canModerate ? newThreadLocked : false
                });

                const threadId = threadData?.thread_id;

                if (threadError || !threadId) {
                    setIsSubmitting(false);
                    console.error("❌ Supabase Thread Insert Error:", threadError);
                    alert(`שגיאה ביצירת נושא: ${threadError?.message || 'שגיאה לא ידועה בדאטה-בייס'}`);
                    return;
                }

                // 3. יצירת הודעת הפתיחה (הפוסט הראשון)
                await logActivityEvent(supabase, {
                    actorId: session.user.id,
                    eventType: "forum_thread_created",
                    icon: "📬",
                    title: "פתח/ה שרשור חדש בפורום",
                    subtitle: newThreadTitle.trim(),
                    description: forum?.name || null,
                    targetType: "thread",
                    targetId: threadId,
                    targetUrl: `/forums/thread/${threadId}`,
                });
                void logActivityEvent(supabase, {
                    actorId: session.user.id,
                    eventType: "forum_post_created",
                    icon: "📬",
                    title: "פרסם/ה פוסט בפורום",
                    subtitle: newThreadTitle.trim(),
                    targetType: "thread",
                    targetId: threadId,
                    targetUrl: `/forums/thread/${threadId}`,
                });

                // 4. הכל עבר בהצלחה! מעבירים את המשתמש לאשכול החדש
                setIsSubmitting(false);
                setIsNewThreadOpen(false);
                window.location.href = `/forums/thread/${threadId}`;

            } catch (err) {
                setIsSubmitting(false);
                console.error("❌ Unexpected execution error:", err);
                alert("אירעה שגיאה בלתי צפויה בשליחת הינשוף.");
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
            <div className="min-h-screen bg-[#060910] flex items-center justify-center" role="status" aria-live="polite" aria-label="טוען את היכל הפורומים">
                <Sparkles className="w-10 h-10 text-amber-500/40 animate-pulse" />
            </div>
        );

        const publicForums = forums.filter(f => !f.house_restriction);
        const houseForums = forums.filter(f => f.house_restriction);
        const totalThreads = forums.reduce((a, f) => a + (f.thread_count || 0), 0);
        const totalPosts = forums.reduce((a, f) => a + (f.post_count || 0), 0);

        return (
            <main className="min-h-screen bg-[#060910] text-white font-assistant pt-24 pb-20" dir="rtl" aria-label="היכל הפורומים של Lumos IL">
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
                    display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
                    padding: 12px 16px;
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 12px;
                    margin-bottom: 28px;
                }
                @media (min-width: 768px) {
                    .stats-bar { gap: 24px; padding: 12px 20px; }
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
                .ql-editor { text-align: right; direction: rtl; min-height: 200px; color: #f1f5f9; }
                .ql-toolbar { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.1) !important; border-radius: 12px 12px 0 0; }
                .ql-container { border-color: rgba(255,255,255,0.1) !important; border-radius: 0 0 12px 12px; }
            `}</style>

                <div className="forums-grid-bg min-h-screen">
                    <div className="max-w-5xl mx-auto px-4 md:px-6">

                        {/* breadcrumb + title */}
                        <header className="mb-8 pt-2 flex flex-col md:flex-row md:items-start justify-between gap-4" aria-labelledby="forums-page-title">
                            <div className="space-y-3">
                                <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20" aria-label="ניווט לפורומים">
                                    <Link href="/" className="hover:text-amber-500 transition-colors flex items-center gap-1.5"><Home size={10} /> הוגוורטס</Link>
                                    <ChevronLeft size={10} />
                                    <span className="text-amber-500/60">היכל הפורומים</span>
                                </nav>
                                <h1 id="forums-page-title" className="font-cinzel text-4xl md:text-5xl font-black text-white tracking-tighter">היכל הפורומים</h1>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsNewThreadOpen(true)}
                                aria-haspopup="dialog"
                                aria-expanded={isNewThreadOpen}
                                aria-controls="new-thread-dialog"
                                aria-label="פתיחת חלון ליצירת דיון חדש בפורומים"
                            className="mt-2 md:mt-0 self-start flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-amber-600/30 to-amber-700/10 hover:from-amber-500/40 hover:to-amber-600/20 border border-amber-500/40 hover:border-amber-400 text-amber-500 hover:text-amber-300 rounded-xl font-cinzel font-black transition-all shadow-[0_0_25px_rgba(245,158,11,0.15)] hover:shadow-[0_0_35px_rgba(245,158,11,0.3)] active:scale-95 group"
                            >
                                <Plus size={18} className="transition-transform group-hover:rotate-90" />
                                פתח אשכול חדש
                            </button>
                        </header>

                        {/* stats bar */}
                        <div className="stats-bar" role="region" aria-label="סטטיסטיקת פורומים">
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

                            {/* Main column — dynamic categories */}
                            <div className="flex-1 min-w-0 space-y-8">
                                {categories.length > 0 ? (
                                    <>
                                        {categories.map((category) => {
                                            const categoryForums = forums.filter(f => f.category_id === category.id);
                                            if (categoryForums.length === 0) return null;

                                            return (
                                                <ForumSection
                                                    key={category.id}
                                                    title={category.name}
                                                    accentColor={category.name.includes('בתים') ? "#fbbf24" : "#f59e0b"}
                                                    forums={categoryForums}
                                                    userYear={userYear}
                                                    userRole={userRole}
                                                    userHouse={userHouse}
                                                    roleColors={roleColors}
                                                    canModerate={canModerate}
                                                />
                                            );
                                        })}

                                        {/* גיבוי: מציג פורומים שאיכשהו נשארו בלי קטגוריה כדי שלא ייעלמו */}
                                        {forums.filter(f => !f.category_id).length > 0 && (
                                            <ForumSection
                                                title="פורומים נוספים"
                                                accentColor="#6b7280"
                                                forums={forums.filter(f => !f.category_id)}
                                                userYear={userYear}
                                                userRole={userRole}
                                                userHouse={userHouse}
                                                roleColors={roleColors}
                                                canModerate={canModerate}
                                            />
                                        )}
                                    </>
                                ) : (
                                    /* מוצג בזמן טעינה או אם יש תקלה בשליפת קטגוריות */
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
                                        ))}
                                    </div>
                                )}
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
                                        {recentPosts.length === 0 && (
                                            <Link href="/forums" className="block text-[10px] text-amber-400/50 italic text-center py-3 hover:text-amber-400 transition-colors">
                                                פתח את המסדרון הראשון →
                                            </Link>
                                        )}
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
                                                            <span className="text-[9px] text-white/20">{safeTimeAgo(p.created_at)}</span>
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
                                                            <span className="text-[9px] text-white/20">{safeTimeAgo(t.created_at)}</span>
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
                                            {groups.map(g => {
                                                const officialHouseColor = resolveHouseId(g.name) ? getHouseReadableColor(g.name) : null;
                                                const swatchColor = officialHouseColor || g.color;
                                                return (
                                                    <div key={g.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md"
                                                        style={{ background: withAlpha(swatchColor, 0.1), border: `1px solid ${withAlpha(swatchColor, 0.22)}` }}>
                                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: swatchColor, boxShadow: `0 0 4px ${withAlpha(swatchColor, 0.6)}` }} />
                                                        <span className="font-cinzel text-[9px] font-black truncate" style={{ color: swatchColor }}>{g.name}</span>
                                                    </div>
                                                );
                                            })}
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
                                                        style={{ color: getHouseReadableColor(forumStats.newestMember.house) || "rgba(255,255,255,0.5)" }}>
                                                        {(getHouseIcon(forumStats.newestMember.house) || "✨")} {forumStats.newestMember.full_name}
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

                {/* Modal: Global New Thread */}
                {isNewThreadOpen && (
                    <div
                        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300"
                        onClick={(e) => e.target === e.currentTarget && setIsNewThreadOpen(false)}
                    >
                        <div
                            id="new-thread-dialog"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="modal-title"
                            className="bg-[#0c0f18] border border-white/[0.08] w-full rounded-2xl shadow-2xl overflow-hidden relative flex flex-col"
                            dir="rtl"
                            style={{ maxWidth: '560px', maxHeight: '90vh' }}
                        >
                            <div className="shrink-0 px-6 py-4 border-b border-white/[0.06] bg-white/[0.03] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                        <Plus size={18} aria-hidden="true" />
                                    </div>
                                    <h3 id="modal-title" className="font-cinzel font-black text-lg text-white tracking-wide">פתיחת אשכול חדש בהיכל</h3>
                                </div>
                                <button onClick={() => setIsNewThreadOpen(false)} aria-label="סגור חלונית" className="text-white/20 hover:text-white/60 transition-colors p-1.5 hover:bg-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                                    <X size={22} aria-hidden="true" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateGlobalThread} className="flex flex-col flex-1 overflow-hidden">
                                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                                    {/* Forum Selection */}
                                    <div className="space-y-2.5">
                                        <label htmlFor="forum-select" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                                            <Home size={11} aria-hidden="true" /> בחירת פורום יעד
                                        </label>
                                        <select
                                            id="forum-select"
                                            required
                                            autoFocus
                                            value={selectedForumId}
                                            onChange={(e) => setSelectedForumId(e.target.value)}
                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-4 text-base font-bold text-white focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.06] transition-all cursor-pointer appearance-none hover:border-white/20 active:scale-[0.99]"
                                            style={{
                                                backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23f59e0b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                                                backgroundRepeat: 'no-repeat',
                                                backgroundPosition: 'left 1.25rem center',
                                                backgroundSize: '0.8rem auto',
                                                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
                                            }}
                                        >
                                            <option value="" disabled className="bg-[#0c0f18] text-white/40">בחר פורום מתוך הרשימה...</option>

                                            <optgroup label="פורומים כלליים" className="bg-[#0c0f18] text-amber-500">
                                                {publicForums.map(f => {
                                                    // מסתירים לגמרי פורומים של צוות
                                                    if (f.staff_only_create && !canModerate) return null;

                                                    // בודקים אם חסרה שנת לימוד
                                                    const isYearLocked = !!(f.min_year && userYear < f.min_year && !canModerate);

                                                    return (
                                                        <option
                                                            key={f.id}
                                                            value={f.id}
                                                            disabled={isYearLocked}
                                                            className="bg-[#0c0f18]"
                                                            style={{ color: isYearLocked ? "rgba(255,255,255,0.3)" : "white" }}
                                                        >
                                                            💬 {f.name} {isYearLocked ? `(דרושה שנה ${f.min_year})` : ''}
                                                        </option>
                                                    );
                                                })}
                                            </optgroup>

                                            {(canModerate || houseForums.some(f => f.house_restriction === userHouse)) && (
                                                <optgroup label="מועדוני הבתים" className="bg-[#0c0f18] text-white/40">
                                                    {houseForums.map(f => {
                                                        // מסתירים לגמרי פורומים של בתים אחרים או צוות
                                                        if (f.house_restriction !== userHouse && !canModerate) return null;
                                                        if (f.staff_only_create && !canModerate) return null;

                                                        // בודקים אם חסרה שנת לימוד גם בפורומי הבתים
                                                        const isYearLocked = !!(f.min_year && userYear < f.min_year && !canModerate);

                                                        // משיכת עיצוב הבית (צבע ואימוג'י)
                                                        const houseTheme = f.house_restriction ? HOUSE_THEMES[f.house_restriction] : null;

                                                        return (
                                                            <option
                                                                key={f.id}
                                                                value={f.id}
                                                                disabled={isYearLocked}
                                                                className="bg-[#0c0f18]"
                                                                style={{
                                                                    color: isYearLocked
                                                                        ? "rgba(255,255,255,0.3)"
                                                                        : (houseTheme ? houseTheme.color : "white")
                                                                }}
                                                            >
                                                                {houseTheme?.icon || "🏰"} {f.name} {isYearLocked ? `(דרושה שנה ${f.min_year})` : ''}
                                                            </option>
                                                        );
                                                    })}
                                                </optgroup>
                                            )}
                                        </select>
                                    </div>

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
                                                            ? { background: conf.bg, borderColor: conf.border, color: conf.text, border: `1.5px solid ${conf.border}`, boxShadow: `0 0 10px ${conf.border}`, transform: "scale(1.05)" }
                                                            : { background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }
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
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">תוכן הפירסום</label>
                                        <div className="thread-editor rounded-xl overflow-hidden border border-white/[0.06] ql-rtl">
                                            <ReactQuill theme="snow" value={newThreadContent} onChange={setNewThreadContent} placeholder="כתוב כאן את תוכן הדיון..." />
                                        </div>
                                        <div className="flex items-center justify-between">
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
                                        disabled={isSubmitting || !selectedForumId || !newThreadTitle.trim() || newThreadContent.replace(/<[^>]*>?/gm, '').trim().length < 20}
                                        className="flex items-center gap-2.5 px-10 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-amber-950 font-cinzel font-black text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-900/20"
                                    >
                                        {isSubmitting ? <div className="w-4 h-4 border-t-2 border-amber-950 rounded-full animate-spin" /> : <><Sparkles size={16} /> שליחת ינשוף</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        );
    }

    function ForumSection({ title, accentColor, forums, userYear, userRole, userHouse, roleColors, canModerate }: {
        title: string; accentColor: string;
        forums: Forum[]; userYear: number; userRole: string | null; userHouse: string | null;
        roleColors: Record<string, string>; canModerate: boolean;
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
                        canModerate={canModerate} // <--- מעבירים הלאה
                    />
                ))}
            </div>
        );
    }

    function ForumRow({ forum, userYear, userRole, userHouse, roleColors, canModerate }: any) {
        const router = useRouter();

        // התיקון הקריטי: משתמשים ב-canModerate במקום במחרוזת 'מנהל'
        const isLocked = !!(forum.house_restriction && forum.house_restriction !== userHouse && !canModerate) ||
            !!(forum.min_year && userYear < forum.min_year && !canModerate);

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
                        <div className={`font-cinzel font-black text-base leading-tight truncate mb-1 ${isLocked ? "text-white/20" : theme ? "" : "text-white/85"
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
                                <span>{safeTimeAgo(forum.last_thread.created_at)}</span>
                            </div>
                        </>
                    ) : (
                        <span className="text-[11px] text-white/15 italic">אין פוסטים עדיין</span>
                    )}
                </div>
            </div>
        );
    }
