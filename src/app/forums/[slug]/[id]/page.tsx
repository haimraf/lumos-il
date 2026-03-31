"use client";

import { useEffect, useState, useCallback, useRef, useMemo, memo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getRoleColor, getRoleColorFromDB } from "@/lib/roleColor";
import Link from "next/link";
import dynamic from 'next/dynamic';
import {
    ChevronLeft, Clock, Reply, Zap, Home, Flag, AtSign,
    EyeOff, AlertTriangle, Loader2, Mars, Venus, Eye, Timer, Lock, MessageSquare, Pin
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import { logActivityEvent } from "@/lib/activityEvents";
import { enrichContent } from "@/utils/enrichContent";
import { sanitizeHtml } from "@/utils/sanitize";

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false }) as any;

const PATRONUS_MAP: Record<string, string> = {
    stag: "צבי", otter: "לוטרה", wolf: "זאב", doe: "צביה",
    hare: "ארנב בר", boar: "חזיר בר", cat: "חתול", eagle: "נשר",
    lion: "אריה", dolphin: "דולפין", fox: "שועל", owl: "ינשוף",
    horse: "סוס", tiger: "נמר", swan: "ברבור", bear: "דוב",
    dragon: "דרקון", butterfly: "פרפר", phoenix: "פיניקס", serpent: "נחש",
};
import 'react-quill-new/dist/quill.snow.css';
import { getYearFromProfile, getYearTitle, getYearLabel } from "@/lib/yearSystem";

/**
 * LUMOS IL • THREAD VIEW V8
 * ✅ ציטוטים • inline styles (לא תלוי ב-CSS specificity של Quill)
 * ✅ סמן אחרי ציטוט • נוחת מחוץ לblockquote
 * ✅ התראות • useRef במקום DOMParser (Quill מסנן data-*)
 * ✅ מיוט • תוקן
 * ✅ Cooldown 30 שניות
 * ✅ Presence מחובר
 */

const HOUSE_CONFIG: Record<string, {
    accent: string; bg: string; badge: string;
    nameHe: string; textColor: string; glow: string;
}> = {
    Gryffindor: {
        accent: "#dc2626", bg: "rgba(220,38,38,0.06)", badge: "bg-red-900/40 text-red-300 border-red-700/50",
        nameHe: "גריפינדור", textColor: "text-red-400", glow: "shadow-[0_0_20px_rgba(220,38,38,0.4)]",
    },
    Slytherin: {
        accent: "#059669", bg: "rgba(5,150,105,0.07)", badge: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
        nameHe: "סלית'רין", textColor: "text-emerald-400", glow: "shadow-[0_0_20px_rgba(5,150,105,0.4)]",
    },
    Ravenclaw: {
        accent: "#2563eb", bg: "rgba(37,99,235,0.07)", badge: "bg-blue-900/40 text-blue-300 border-blue-700/50",
        nameHe: "רייבנקלו", textColor: "text-blue-400", glow: "shadow-[0_0_20px_rgba(37,99,235,0.4)]",
    },
    Hufflepuff: {
        accent: "#fbbf24", bg: "rgba(251,191,36,0.07)", badge: "bg-amber-900/40 text-amber-300 border-amber-700/50",
        nameHe: "הפלפאף", textColor: "text-amber-400", glow: "shadow-[0_0_20px_rgba(251,191,36,0.4)]",
    },
};

const PREFIX_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
    "דיון": { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", border: "rgba(59,130,246,0.3)" },
    "שאלה": { bg: "rgba(244,63,94,0.12)", text: "#fb7185", border: "rgba(244,63,94,0.3)" },
    "תיאוריה": { bg: "rgba(139,92,246,0.12)", text: "#a78bfa", border: "rgba(139,92,246,0.3)" },
    "פרסום": { bg: "rgba(16,185,129,0.12)", text: "#34d399", border: "rgba(16,185,129,0.3)" },
};

const SPELLS = [
    { type: 'lumos', icon: '💡', name: 'לומוס', color: 'text-yellow-300', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
    { type: 'amortentia', icon: '💖', name: 'אמורטנציה', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
    { type: 'riddikulus', icon: '😂', name: 'רידיקולוס', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { type: 'incendio', icon: '🔥', name: 'אינסנדיו', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' }
];

const COOLDOWN_MS = 30_000;
const LEGACY_BANNED_ROLE_HE = "\u05d0\u05e1\u05d9\u05e8 \u05d0\u05d6\u05e7\u05d1\u05d0\u05df";

// Inline style string לblockquote • עוקף את כל CSS specificity של Quill
const BLOCKQUOTE_STYLE = [
    "display:block",
    "border-right:3px solid #f59e0b",
    "border-left:none",
    "border-top:none",
    "border-bottom:none",
    "border-inline-start:none",
    "padding:10px 16px 10px 12px",
    "padding-inline-start:0",
    "margin:12px 0",
    "margin-inline-start:0",
    "background:rgba(245,158,11,0.06)",
    "border-radius:0 6px 6px 0",
    "color:rgba(255,255,255,0.65)",
    "font-style:italic",
    "font-size:0.95em",
    "line-height:1.6",
].join(";");

/* ─────────────────── Avatar ─────────────────── */
function Avatar({
    house, avatarUrl, isOnline, className = "w-10 h-10 text-xl"
}: { house?: string | null; avatarUrl?: string | null; isOnline?: boolean; className?: string }) {
    const emoji = house === "Gryffindor" ? "🦁"
        : house === "Slytherin" ? "🐍"
            : house === "Ravenclaw" ? "🦅"
                : house === "Hufflepuff" ? "🦡" : "🧙";
    const config = house ? HOUSE_CONFIG[house] : null;
    return (
        <div className="relative inline-block group">
            <div
                className={`rounded-xl overflow-hidden flex items-center justify-center border shrink-0 transition-all duration-500 ${className} ${config ? `group-hover:${config.glow} group-hover:scale-105` : ''}`}
                style={{
                    background: config ? config.bg : "rgba(255,255,255,0.04)",
                    borderColor: config ? config.accent + "40" : "rgba(255,255,255,0.08)"
                }}
            >
                {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    : emoji
                }
            </div>
            {isOnline && (
                <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#060910] animate-pulse" />
            )}
        </div>
    );
}

/* ─────────────────── PostContent ─────────────────── */
// memo + useMemo: מונע re-render של iframe יוטיוב כשמקלידים בתיבת התגובות
const PostContent = memo(function PostContent({ content }: { content: string }) {
    const html = useMemo(() => sanitizeHtml(enrichContent(content)), [content]);
    return (
        <div
            className="post-body flex-1 text-white/80 text-base leading-relaxed break-words whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
});

/* ─────────────────── CooldownBar ─────────────────── */
function CooldownBar({ remaining, total }: { remaining: number; total: number }) {
    const pct = ((total - remaining) / total) * 100;
    return (
        <div className="flex items-center gap-3 text-xs text-amber-400/70">
            <Timer size={12} />
            <span>המתן {Math.ceil(remaining / 1000)} שניות</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                    className="h-full bg-amber-500/60 rounded-full transition-all duration-1000"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

/* ─────────────────── Main Page ─────────────────── */
export default function ThreadViewPage() {
    const { id } = useParams();
    const router = useRouter();
    const [supabase] = useState(() => createClient());
    const { sendOwl } = useOwlMail();
    const quillRef = useRef<any>(null);

    const [forum, setForum] = useState<any>(null);
    const [thread, setThread] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [replyContent, setReplyContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
    const [globalOnlineIds, setGlobalOnlineIds] = useState<Set<string>>(new Set());
    const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
    const [reportingPost, setReportingPost] = useState<any>(null);
    const [reportReason, setReportReason] = useState("");
    const [isReporting, setIsReporting] = useState(false);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const [roleColors, setRoleColors] = useState<Record<string, string>>({});
    useEffect(() => { getRoleColorFromDB(supabase).then(setRoleColors); }, [supabase]);

    // ✅ משתמשים המחוברים באתר כולו (לא רק באשכול)
    const fetchGlobalOnline = useCallback(async () => {
        const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data } = await supabase.from('online_users').select('id').gte('last_seen', cutoff);
        if (data) setGlobalOnlineIds(new Set(data.map((u: any) => u.id)));
    }, [supabase]);

    useEffect(() => {
        fetchGlobalOnline();
        const interval = setInterval(fetchGlobalOnline, 60_000);
        return () => clearInterval(interval);
    }, [fetchGlobalOnline]);

    // ✅ useRef לשמירת מי צוטט/תויג • לא תלוי ב-HTML parsing
    const pendingQuotes = useRef<string[]>([]);
    const pendingMentions = useRef<string[]>([]);

    // ✅ רשימת הדרגות שמקבלות גישות ניהול בעמוד האשכול
    const STAFF_ROLES = ['מייסד', 'ראש הוגוורטס', 'שומר הטירה', 'פרופסור', 'צוות Lumos', 'מנהל', 'מנחה'];

    /* ── Auth init • רץ ראשון, מפריד מ-fetchData ── */
    useEffect(() => {
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setCurrentUser(session.user);
                // שליפת user_groups
                const { data: profile } = await supabase.from('profiles').select('*, user_groups(name)').eq('id', session.user.id).single();
                setUserProfile(profile);

                const groupData = profile?.user_groups;
                const roleName = groupData ? (Array.isArray(groupData) ? groupData[0]?.name : (groupData as any).name) : profile?.role;
                const normalizedRole = profile?.status === "active" && profile?.role === "אסיר אזקבאן" ? null : roleName;
                setUserRole((profile?.status === "active" && profile?.role === LEGACY_BANNED_ROLE_HE ? null : roleName) || normalizedRole || null);

                const { data: blocks } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", session.user.id);
                if (blocks) setBlockedUserIds(blocks.map((b: any) => b.blocked_id));
            }
        };
        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            window.setTimeout(() => {
                void (async () => {
            if (session?.user) {
                setCurrentUser(session.user);
                const { data: profile } = await supabase.from('profiles').select('*, user_groups(name)').eq('id', session.user.id).single();
                setUserProfile(profile);

                const groupData = profile?.user_groups;
                const roleName = groupData ? (Array.isArray(groupData) ? groupData[0]?.name : (groupData as any).name) : profile?.role;
                const normalizedRole = profile?.status === "active" && profile?.role === "אסיר אזקבאן" ? null : roleName;
                setUserRole((profile?.status === "active" && profile?.role === LEGACY_BANNED_ROLE_HE ? null : roleName) || normalizedRole || null);

                const { data: blocks } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", session.user.id);
                if (blocks) setBlockedUserIds(blocks.map((b: any) => b.blocked_id));
                    } else {
                        setCurrentUser(null);
                        setUserProfile(null);
                        setUserRole(null);
                        setBlockedUserIds([]);
                    }
                })();
            }, 0);
        });
        return () => subscription.unsubscribe();
    }, [supabase]);

    /* ── Fetch (רק thread + posts, ללא auth) ── */
    const fetchData = useCallback(async (showLoading = true) => {
        if (!id) return;
        if (showLoading) setIsLoading(true);
        try {
            const { data: threadData, error: threadError } = await supabase
                .from('threads').select('*').eq('id', id).single();
            if (threadError || !threadData) { router.push('/forums'); return; }
            setThread(threadData);

            // Increment views bypassing RLS using an RPC function
            supabase.rpc('increment_thread_views', { thread_id: id }).then(() => { });

            // Mark as read in localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem(`thread_read_${id}`, Date.now().toString());
            }

            const { data: forumData } = await supabase
                .from('forums').select('*').eq('id', threadData.forum_id).single();
            if (forumData) setForum(forumData);

            // Select only columns that definitely exist in profiles • omit 'username' which may not exist
            const { data: postsData, error: postsError } = await supabase
                .from('forum_posts')
                .select(`*, profiles(house, role, wand_type, full_name, email, signature, patronus, avatar_url, year, gender, created_at, id, is_ghost, user_groups(name, color)), post_reactions(spell_type, user_id)`)
                .eq('thread_id', id)
                .order('created_at', { ascending: true });

            let finalPosts = postsData || [];
            if (postsError) {
                console.error('[ThreadView] posts query failed:', postsError.message);
                // Try minimal fallback select
                const { data: fallbackPosts } = await supabase
                    .from('forum_posts')
                    .select('*, profiles(house, full_name, avatar_url, role, user_groups(name, color)), post_reactions(spell_type, user_id)')
                    .eq('thread_id', id)
                    .order('created_at', { ascending: true });
                finalPosts = fallbackPosts || [];
            }

            // Manual join for post_reactions.profiles to bypass strict FK issues in Supabase
            const reactorIds = new Set<string>();
            finalPosts.forEach((p: any) => {
                if (p.post_reactions) p.post_reactions.forEach((r: any) => reactorIds.add(r.user_id));
            });

            if (reactorIds.size > 0) {
                const { data: rpData } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, house, role, user_groups(name, color)')
                    .in('id', Array.from(reactorIds));

                if (rpData) {
                    const profileMap = Object.fromEntries(rpData.map(p => [p.id, p]));
                    finalPosts.forEach((p: any) => {
                        if (p.post_reactions) {
                            p.post_reactions.forEach((r: any) => { r.profiles = profileMap[r.user_id]; });
                        }
                    });
                }
            }

            setPosts((finalPosts as any) || []);
        } catch (e) { console.error('[ThreadView] fetchData error:', e); }
        finally { setIsLoading(false); }
    }, [id, supabase, router]);

    useEffect(() => { fetchData(true); }, [fetchData]);

    /* ── Presence ── */
    useEffect(() => {
        if (!id || !currentUser) return;
        const channel = supabase.channel(`thread-presence-${id}`)
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const ids = new Set(Object.values(state).flat().map((u: any) => u.user_id));
                setOnlineUserIds(ids);
            })
            .subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') await channel.track({ user_id: currentUser.id });
            });
        return () => { supabase.removeChannel(channel); };
    }, [id, currentUser, supabase]);

    /* ── Live Thread Posts (WebSockets) ── */
    useEffect(() => {
        if (!id) return;
        const postsChannel = supabase.channel(`live-posts-${id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_posts', filter: `thread_id=eq.${id}` }, (payload) => {
                // If the insert is NOT from the current user (optimistic UI handles it immediately), fetch silently
                if (payload.new.user_id !== currentUser?.id) {
                    fetchData(false);
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'forum_posts', filter: `thread_id=eq.${id}` }, () => {
                fetchData(false);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'forum_posts', filter: `thread_id=eq.${id}` }, () => {
                fetchData(false);
            })
            .subscribe();

        return () => { supabase.removeChannel(postsChannel); };
    }, [id, currentUser, supabase, fetchData]);

    /* ── Cooldown ticker ── */
    useEffect(() => {
        if (cooldownRemaining <= 0) {
            if (cooldownInterval.current) clearInterval(cooldownInterval.current);
            return;
        }
        cooldownInterval.current = setInterval(() => {
            setCooldownRemaining(prev => {
                if (prev <= 1000) { clearInterval(cooldownInterval.current!); return 0; }
                return prev - 1000;
            });
        }, 1000);
        return () => { if (cooldownInterval.current) clearInterval(cooldownInterval.current); };
    }, [cooldownRemaining]);

    /* ── Quote ── */
    const handleQuote = (post: any) => {
        if (!quillRef.current) return;
        const quill = quillRef.current.getEditor();
        const author = post.profiles?.full_name || 'קוסם';
        const color = post.profiles?.house ? HOUSE_CONFIG[post.profiles.house].accent : '#f59e0b';

        // ✅ רשום מי צוטט • לפני כל שינוי ב-editor
        pendingQuotes.current.push(post.user_id);

        const cleanContent = post.content.replace(/<\/?p[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

        // ✅ Inline styles • Quill לא יכול לדרוס אותם
        const quoteHtml = `<blockquote style="${BLOCKQUOTE_STYLE}">` +
            `<strong style="color:${color};font-style:normal;font-weight:700">${author} כתב/ה:</strong>` +
            `<br>${cleanContent}` +
            `</blockquote>`;

        const insertIndex = quill.getLength() - 1;
        quill.clipboard.dangerouslyPasteHTML(insertIndex, quoteHtml);

        // ✅ insertText מוסיף שורה חדשה ריאלית מחוץ ל-blockquote
        setTimeout(() => {
            const endIndex = quill.getLength();
            quill.insertText(endIndex, '\n', 'user');
            quill.setSelection(endIndex + 1, 0);
            quill.focus();
            document.getElementById('fast-reply-area')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
    };

    /* ── Mention ── */
    const handleMention = (post: any) => {
        if (!quillRef.current) return;
        const quill = quillRef.current.getEditor();
        const author = post.profiles?.full_name || post.profiles?.username || 'קוסם';
        const color = post.profiles?.house ? HOUSE_CONFIG[post.profiles.house].accent : '#fbbf24';

        // ✅ רשום מי תויג
        pendingMentions.current.push(post.user_id);

        const range = quill.getSelection() || { index: quill.getLength(), length: 0 };
        const mentionHtml = `<strong style="color:${color};font-weight:700">@${author}</strong>&nbsp;`;
        quill.clipboard.dangerouslyPasteHTML(range.index, mentionHtml);
        setTimeout(() => { quill.setSelection(quill.getLength(), 0); quill.focus(); }, 100);
    };

    /* ── Mute / Unmute ── */
    const handleToggleMute = async (targetUserId: string) => {
        if (!currentUser) return;
        const isCurrentlyMuted = blockedUserIds.includes(targetUserId);
        if (isCurrentlyMuted) {
            await supabase.from("blocks").delete()
                .eq("blocker_id", currentUser.id)
                .eq("blocked_id", targetUserId);
            setBlockedUserIds(prev => prev.filter(uid => uid !== targetUserId));
            sendOwl("השתקה בוטלה", "תוכן המשתמש יוצג שוב.", "success");
        } else {
            if (!confirm("להסתיר את ההודעות של משתמש זה?")) return;
            await supabase.from("blocks").insert({ blocker_id: currentUser.id, blocked_id: targetUserId });
            setBlockedUserIds(prev => [...prev, targetUserId]);
            sendOwl("משתמש הושתק", "ניתן לבטל בכל עת.", "info");
        }
    };

    /* ── Report ── */
    const handleSendReport = async () => {
        if (!reportReason || !reportingPost || !currentUser) return;
        setIsReporting(true);
        await supabase.from("reports").insert([{
            reporter_id: currentUser.id,
            target_id: reportingPost.id,
            target_type: "forum_post",
            reason: reportReason,
            content_preview: reportingPost.content.substring(0, 100),
            status: "pending"
        }]);
        sendOwl("הדיווח נשלח", "משרד הקסמים קיבל את הדיווח.", "success");
        setReportingPost(null); setReportReason(""); setIsReporting(false);
    };

    /* ── Magic Reaction Spells ── */
    const handleCastSpell = async (postId: string, spellType: string) => {
        if (!currentUser) return;

        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const reactions = post.post_reactions || [];
        const userExistingSpell = reactions.find((r: any) => r.user_id === currentUser.id);
        const isRemoving = userExistingSpell && userExistingSpell.spell_type === spellType;

        // Optimistic UI
        setPosts(prev => prev.map(p => {
            if (p.id !== postId) return p;
            let newReactions = (p.post_reactions || []).filter((r: any) => r.user_id !== currentUser.id);
            if (!isRemoving) {
                newReactions.push({
                    user_id: currentUser.id,
                    spell_type: spellType,
                    profiles: {
                        full_name: userProfile?.full_name || 'אתה',
                        username: userProfile?.username,
                        avatar_url: userProfile?.avatar_url,
                        house: userProfile?.house,
                        role: userProfile?.role,
                        user_groups: userProfile?.user_groups
                    }
                });
            }
            return { ...p, post_reactions: newReactions };
        }));

        try {
            await supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', currentUser.id);
            if (!isRemoving) {
                await supabase.from('post_reactions').insert({ post_id: postId, user_id: currentUser.id, spell_type: spellType });

                // התראה לבעל ההודעה אלא אם זה הוא עצמו
                if (post.user_id !== currentUser.id) {
                    const spellObj = SPELLS.find(s => s.type === spellType);
                    const currentThreadId = Array.isArray(id) ? id[0] : id;
                    await supabase.from('notifications').insert({
                        user_id: post.user_id,
                        actor_id: currentUser.id,
                        type: 'reaction',
                        target_url: `/forums/thread/${currentThreadId}`,
                        content: `הטיל/ה ${spellObj?.name || 'לחש'} ${spellObj?.icon || ''} על ההודעה שלך באשכול: ${thread?.title || ''}`,
                        is_read: false,
                    });
                }
            }
        } catch (err) {
            console.error('[Spells] Error casting spell:', err);
        }
    };

    /* ── Send Notification ── */
    const sendNotification = async (toUserId: string, type: 'quote' | 'mention') => {
        if (!currentUser || toUserId === currentUser.id) return;
        const label = type === 'quote' ? 'ציטטו' : 'תייגו';
        await supabase.from('notifications').insert({
            user_id: toUserId,
            actor_id: currentUser.id,
            type: type,
            target_url: `/forums/thread/${id}`,
            content: `${label} אותך בשרשור: ${thread?.title || ''}`,
            is_read: false,
        });
    };

    /* ── Reply ── */
    const handleReply = async () => {
        const stripped = replyContent.replace(/<[^>]+>/g, '').trim();
        if (!stripped || isSubmitting || !currentUser) return;
        const isLegacyRoleBanned = userProfile?.role === LEGACY_BANNED_ROLE_HE && !userProfile?.status;
        if (userProfile?.status === 'active' && userProfile?.role === LEGACY_BANNED_ROLE_HE) {
            userProfile.role = null;
        }

        if (userProfile?.status === 'banned' || isLegacyRoleBanned) {
            sendOwl("גישה נדחתה", "כרגע אין לך אפשרות לשלוח הודעות בפורום.", "error");
            return;
        }

        if (userProfile?.status === 'banned') {
            sendOwl("גישה נדחתה", "אסירים מאזקבאן לא יכולים לשלוח ינשופים.", "error");
            return;
        }

        // Cooldown check
        const lastPost = posts[posts.length - 1];
        if (lastPost?.user_id === currentUser.id && !STAFF_ROLES.includes(userRole || '')) {
            const elapsed = Date.now() - new Date(lastPost.created_at).getTime();
            if (elapsed < COOLDOWN_MS) {
                const remaining = COOLDOWN_MS - elapsed;
                setCooldownRemaining(remaining);
                sendOwl("חוקי הקסם", `המתן ${Math.ceil(remaining / 1000)} שניות.`, "error");
                return;
            }
        }

        setIsSubmitting(true);
        const threadId = Array.isArray(id) ? id[0] : id;
        try {
            const { error } = await supabase.rpc('create_forum_reply_secure', {
                p_thread_id: threadId,
                p_content: replyContent,
            });

            if (error) {
                sendOwl("שגיאת שליחה", error.message, "error");
                return;
            }

            if (!error) {
                // ✅ Clear out mentions of users whose name was deleted from the text
                const activeMentions = pendingMentions.current.filter(uid => {
                    const p = posts.find(x => x.user_id === uid);
                    const name = p?.profiles?.full_name || p?.profiles?.username;
                    return name && (stripped.includes(`@${name}`) || stripped.includes(name));
                });

                const activeQuotes = pendingQuotes.current.filter(uid => {
                    const p = posts.find(x => x.user_id === uid);
                    const name = p?.profiles?.full_name || p?.profiles?.username;
                    return name && stripped.includes(name);
                });

                const uniqueQuoted = [...new Set(activeQuotes)];
                const uniqueMentioned = [...new Set(
                    activeMentions.filter(uid => !uniqueQuoted.includes(uid))
                )];

                // 👻 רוחות רפאים לא שולחות התראות לאחרים (Shadowban)
                if (!userProfile?.is_ghost) {
                    // התראה לבעל האשכול על תגובה חדשה
                    if (thread?.author_id && thread.author_id !== currentUser.id) {
                        await supabase.from('notifications').insert({
                            user_id: thread.author_id,
                            actor_id: currentUser.id,
                            type: 'reply',
                            target_url: `/forums/thread/${threadId}`,
                            content: `הגיב/ה לאשכול שלך: ${thread.title || ''}`,
                            is_read: false,
                        });
                    }

                    await Promise.all([
                        ...uniqueQuoted.map(uid => sendNotification(uid, 'quote')),
                        ...uniqueMentioned.map(uid => sendNotification(uid, 'mention')),
                    ]);
                }

                // איפוס
                pendingQuotes.current = [];
                pendingMentions.current = [];

                await logActivityEvent(supabase, {
                    actorId: currentUser.id,
                    eventType: "forum_reply_created",
                    icon: "🦉",
                    title: "הגיב/ה בדיון בפורום",
                    subtitle: thread?.title || null,
                    description: stripped.slice(0, 140) || null,
                    targetType: "thread",
                    targetId: threadId,
                    targetUrl: `/forums/thread/${threadId}`,
                });
                void logActivityEvent(supabase, {
                    actorId: currentUser.id,
                    eventType: "forum_post_created",
                    icon: "🦉",
                    title: "פרסם/ה פוסט בפורום",
                    subtitle: thread?.title || null,
                    targetType: "thread",
                    targetId: threadId,
                    targetUrl: `/forums/thread/${threadId}`,
                });
                setReplyContent("");
                fetchData(false);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ─────────────── Render ─────────────── */
    if (isLoading) return (
        <div className="min-h-screen bg-[#060910] flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#060910] text-white font-assistant" dir="rtl">
            {/* SEO JSON-LD for DiscussionForumPosting */}
            {thread && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "DiscussionForumPosting",
                            "mainEntityOfPage": {
                                "@type": "WebPage",
                                "@id": typeof window !== 'undefined' ? window.location.href : ""
                            },
                            "headline": thread.title,
                            "datePublished": thread.created_at,
                            "author": {
                                "@type": "Person",
                                "name": posts[0]?.profiles?.full_name || "קוסם"
                            },
                            "commentCount": posts.length > 0 ? posts.length - 1 : 0,
                            "interactionStatistic": {
                                "@type": "InteractionCounter",
                                "interactionType": "https://schema.org/CommentAction",
                                "userInteractionCount": posts.length > 0 ? posts.length - 1 : 0
                            }
                        })
                    }}
                />
            )}
            <style>{`
                /* ── Quill editor base ── */
                .reply-editor .ql-editor {
                    text-align: right; direction: rtl;
                    min-height: 160px; color: #fff;
                    font-size: 1.05rem; line-height: 1.7;
                }
                .reply-editor .ql-container {
                    background: rgba(255,255,255,0.02);
                    border-radius: 0 0 14px 14px;
                    border-color: rgba(245,158,11,0.15) !important;
                }
                .reply-editor .ql-toolbar {
                    background: rgba(255,255,255,0.03);
                    border-radius: 14px 14px 0 0;
                    border-color: rgba(245,158,11,0.15) !important;
                }
                .reply-editor .ql-snow .ql-stroke { stroke: rgba(255,255,255,0.5) !important; }
                .reply-editor .ql-snow .ql-fill   { fill:   rgba(255,255,255,0.5) !important; }
                .reply-editor .ql-snow.ql-toolbar button:hover .ql-stroke { stroke: #f59e0b !important; }

                /* ── ציטוטים בpost-body ── */
                .post-body blockquote {
                    border-right: 3px solid #f59e0b !important;
                    border-left: none !important; border-top: none !important; border-bottom: none !important;
                    border-inline-start: none !important;
                    padding: 10px 16px 10px 12px !important; padding-inline-start: 0 !important;
                    margin: 12px 0 !important; margin-inline-start: 0 !important;
                    background: rgba(245,158,11,0.06) !important;
                    border-radius: 0 6px 6px 0 !important;
                    color: rgba(255,255,255,0.65) !important; font-style: italic !important;
                    font-size: 0.95em !important; line-height: 1.6 !important;
                }
                .post-body blockquote * {
                    border: none !important; background: transparent !important;
                    margin-inline-start: 0 !important; padding-inline-start: 0 !important;
                }
                .post-body p { margin: 0 0 0.6em; }
                .post-body p:last-child { margin-bottom: 0; }

                /* ── YouTube embed ── */
                .yt-embed-wrapper {
                    position: relative;
                    width: min(100%, 400px);
                    padding-bottom: min(56.25%, 225px);
                    height: 0;
                    margin: 14px 0;
                    border-radius: 10px;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.07);
                }
                .yt-embed-wrapper iframe {
                    position: absolute;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    border: none;
                }

                /* ── Inline links ── */
                .post-body .post-link {
                    color: #f59e0b;
                    text-decoration: underline;
                    text-underline-offset: 2px;
                    word-break: break-all;
                    transition: color 0.15s;
                }
                .post-body .post-link:hover { color: #fbbf24; }

                /* ── Action buttons ── */
                .action-btn {
                    display: inline-flex; align-items: center; gap: 4px;
                    padding: 3px 10px; border-radius: 6px; font-size: 11px;
                    border: 1px solid rgba(255,255,255,0.07);
                    background: rgba(255,255,255,0.04);
                    color: rgba(255,255,255,0.35);
                    transition: all 0.15s ease; cursor: pointer;
                }
                .action-btn:hover {
                    background: rgba(245,158,11,0.12);
                    border-color: rgba(245,158,11,0.3);
                    color: #f59e0b;
                }

                /* ── Post sidebar ── */
                .post-sidebar-stat {
                    display: flex; flex-direction: column; align-items: center;
                    padding: 5px 0; border-top: 1px solid rgba(255,255,255,0.04);
                    margin-top: 6px;
                }
                .post-sidebar-stat-num {
                    font-family: 'Cinzel', serif; font-weight: 700;
                    font-size: 0.85rem; color: rgba(255,255,255,0.5); line-height: 1;
                }
                .post-sidebar-stat-label {
                    font-size: 9px; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.08em;
                    color: rgba(255,255,255,0.2); margin-top: 2px;
                }

                /* ── Thread header ── */
                .thread-header {
                    position: relative; margin-bottom: 28px;
                    border-radius: 16px; overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.07);
                    background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
                    padding: 24px 28px;
                }
                .thread-header-glow {
                    position: absolute; inset: 0; pointer-events: none;
                    background: linear-gradient(90deg, rgba(245,158,11,0.07) 0%, transparent 60%);
                }
                .thread-header-divider {
                    display: flex; align-items: center; gap: 16px;
                    margin-top: 14px; padding-top: 14px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                    font-size: 11px; color: rgba(255,255,255,0.25);
                }
            `}</style>

            <div className="max-w-5xl mx-auto px-4 pt-24 pb-24">

                {/* ── Breadcrumb ── */}
                <nav className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/25 mb-8">
                    <Link href="/" className="hover:text-amber-500 transition-colors flex items-center gap-1">
                        <Home size={10} /> ראשי
                    </Link>
                    <ChevronLeft size={9} />
                    <Link href="/forums" className="hover:text-amber-500 transition-colors">פורומים</Link>
                    {forum && <>
                        <ChevronLeft size={9} />
                        <Link href={`/forums/${forum.slug}`} className="text-amber-500/80 hover:text-amber-500 transition-colors">
                            {forum.name}
                        </Link>
                    </>}
                </nav>

                {/* ── Thread Header ── */}
                <div className="thread-header">
                    <div className="thread-header-glow" />
                    <div className="relative flex flex-wrap items-start gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                {thread?.prefix && (
                                    <span
                                        className="text-[9px] font-black px-3 py-1 rounded-md tracking-widest uppercase border"
                                        style={PREFIX_CONFIG[thread.prefix]
                                            ? {
                                                background: PREFIX_CONFIG[thread.prefix].bg,
                                                color: PREFIX_CONFIG[thread.prefix].text,
                                                borderColor: PREFIX_CONFIG[thread.prefix].border,
                                            }
                                            : {
                                                background: "rgba(255,255,255,0.06)",
                                                color: "rgba(255,255,255,0.5)",
                                                borderColor: "rgba(255,255,255,0.12)",
                                            }
                                        }
                                    >
                                        {thread.prefix}
                                    </span>
                                )}
                                {thread?.is_locked && <Lock size={14} className="text-white/30" />}
                            </div>
                            <h1 className="font-cinzel text-2xl md:text-3xl font-black leading-tight text-white/90">
                                {thread?.title}
                            </h1>
                        </div>
                    </div>
                    <div className="thread-header-divider">
                        <span className="flex items-center gap-1.5">
                            <MessageSquare size={11} />
                            {posts.length} תגובות
                        </span>
                        <span className="text-white/10">•</span>
                        <span className="flex items-center gap-1.5">
                            <Eye size={11} />
                            {((thread?.views || 0) + 1).toLocaleString()} צפיות
                        </span>
                        <span className="text-white/10">•</span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                            {onlineUserIds.size} מקוונים כעת
                        </span>

                        {/* ── Mod controls ── */}
                        {STAFF_ROLES.includes(userRole || '') && thread && (
                            <div className="flex items-center gap-1.5 mr-auto">
                                <button
                                    onClick={async () => {
                                        const pinned = !thread.is_pinned;
                                        const { error } = await supabase.from('threads').update({ is_pinned: pinned }).eq('id', thread.id);
                                        if (!error) setThread((prev: any) => ({ ...prev, is_pinned: pinned }));
                                    }}
                                    title={thread.is_pinned ? "בטל עיגון" : "עגן שרשור"}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-cinzel uppercase transition-all"
                                    style={{
                                        background: thread.is_pinned ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
                                        color: thread.is_pinned ? "#fbbf24" : "rgba(255,255,255,0.3)",
                                        border: `1px solid ${thread.is_pinned ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.07)"}`,
                                    }}
                                >
                                    <Pin size={10} /> {thread.is_pinned ? "מעוגן" : "עגן"}
                                </button>
                                <button
                                    onClick={async () => {
                                        const locked = !thread.is_locked;
                                        const { error } = await supabase.from('threads').update({ is_locked: locked }).eq('id', thread.id);
                                        if (!error) setThread((prev: any) => ({ ...prev, is_locked: locked }));
                                    }}
                                    title={thread.is_locked ? "פתח נעילה" : "נעל שרשור"}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-cinzel uppercase transition-all"
                                    style={{
                                        background: thread.is_locked ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)",
                                        color: thread.is_locked ? "#f87171" : "rgba(255,255,255,0.3)",
                                        border: `1px solid ${thread.is_locked ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.07)"}`,
                                    }}
                                >
                                    <Lock size={10} /> {thread.is_locked ? "נעול" : "נעל"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Pinned / Locked / Pensieve banners ── */}
                {(() => {
                    const ageInMs = thread ? Date.now() - new Date(thread.last_activity_at || thread.created_at).getTime() : 0;
                    const sixMonths = 1000 * 60 * 60 * 24 * 30 * 6;
                    const isPensieve = thread?.is_locked || ageInMs > sixMonths;

                    return (
                        <>
                            {isPensieve && (
                                <div className="flex flex-col items-center justify-center p-8 mb-6 rounded-3xl border border-blue-500/30 bg-blue-500/10 relative overflow-hidden backdrop-blur-md shadow-[0_0_50px_rgba(59,130,246,0.15)]">
                                    <div className="absolute inset-0 bg-blue-400/5 blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />

                                    <h3 className="font-cinzel text-xl md:text-2xl text-blue-300 mx-auto tracking-widest uppercase font-black mb-3 relative z-10 drop-shadow-[0_0_10px_rgba(147,197,253,0.8)]">
                                        ✨ זיכרון מהגיגית ✨
                                    </h3>
                                    <p className="font-crimson text-blue-200/80 text-center max-w-lg text-base md:text-lg relative z-10 leading-relaxed italic">
                                        אשכול זה ישן ונחתם לנצח כזיכרון בתוך הגיגית של הוגוורטס.
                                        <br /> הטקסטים כאן צפים בזמן, לא ניתן להגיב עליהם, אך ניתן לעיין בהם בשקט.
                                    </p>
                                </div>
                            )}

                            {thread?.is_pinned && !isPensieve && (
                                <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] mb-2">
                                    <Pin size={15} className="text-amber-400 shrink-0" />
                                    <div>
                                        <span className="font-cinzel font-black text-amber-400 text-xs uppercase tracking-widest">שרשור מעוגן</span>
                                        <span className="font-crimson text-amber-400/60 text-sm mr-3 italic">• נעוץ על ידי צוות הטירה לנוחות הקהילה</span>
                                    </div>
                                </div>
                            )}
                            {thread?.is_locked && !isPensieve && (
                                <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] mb-2">
                                    <Lock size={15} className="text-red-400 shrink-0" />
                                    <div>
                                        <span className="font-cinzel font-black text-red-400 text-xs uppercase tracking-widest">שרשור נעול</span>
                                        <span className="font-crimson text-red-400/60 text-sm mr-3 italic">• שרשור זה נסגר ואין אפשרות להוסיף תגובות חדשות</span>
                                    </div>
                                </div>
                            )}
                        </>
                    );
                })()}

                {/* ── Posts ── */}
                <div className="space-y-5">
                    {posts.map((post, index) => {
                        // 🛑 סינון רוחות רפאים (Shadowban)
                        if (post.profiles?.is_ghost && post.user_id !== currentUser?.id) {
                            return null;
                        }

                        const isMuted = blockedUserIds.includes(post.user_id);
                        const isOnline = onlineUserIds.has(post.user_id) || globalOnlineIds.has(post.user_id);
                        const config = post.profiles?.house ? HOUSE_CONFIG[post.profiles.house] : null;
                        const isSelf = currentUser?.id === post.user_id;

                        const ageInMs = thread ? Date.now() - new Date(thread.last_activity_at || thread.created_at).getTime() : 0;
                        const sixMonths = 1000 * 60 * 60 * 24 * 30 * 6;
                        const isPensieveMode = thread?.is_locked || ageInMs > sixMonths;

                        if (isMuted) return (
                            <div key={post.id} className="flex items-center justify-between px-5 py-3 rounded-xl border border-white/[0.04] bg-white/[0.01] text-white/20 text-xs italic">
                                <span>הודעה מוסתרת</span>
                                <button
                                    onClick={() => handleToggleMute(post.user_id)}
                                    className="flex items-center gap-1 text-amber-500/60 hover:text-amber-500 transition-colors"
                                >
                                    <Eye size={12} /> הצג
                                </button>
                            </div>
                        );

                        return (
                            <article
                                key={post.id}
                                className={`group rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col md:flex-row transition-all duration-300 hover:border-white/10 ${isPensieveMode ? "opacity-75 grayscale-[25%] hover:opacity-100 hover:grayscale-0" : ""}`}
                                style={{
                                    background: config
                                        ? `linear-gradient(135deg, ${config.accent}08 0%, rgba(6,9,16,0.8) 60%)`
                                        : "rgba(255,255,255,0.02)"
                                }}
                            >
                                {/* Sidebar */}
                                <aside className="w-full md:w-44 shrink-0 p-4 flex flex-row flex-wrap items-center gap-3 md:flex-col md:items-center md:gap-1.5 border-b md:border-b-0 md:border-l border-white/[0.04] bg-black/20">
                                    <Avatar house={post.profiles?.house} avatarUrl={post.profiles?.avatar_url} isOnline={isOnline} className="w-14 h-14 text-2xl mb-1" />

                                    {/* name */}
                                    <Link
                                        href={`/wizard/${post.user_id}`}
                                        className="font-cinzel font-black text-sm text-center leading-tight hover:underline"
                                        style={{ color: (post.profiles as any)?.user_groups?.color || getRoleColor(post.profiles?.role, post.profiles?.house, roleColors) }}
                                    >
                                        {post.profiles?.full_name || "קוסם אנונימי"}
                                    </Link>

                                    {/* group/role badge + gender */}
                                    {(() => {
                                        const pGrp = (post.profiles as any)?.user_groups as { name: string; color: string } | null;
                                        const badgeLabel = pGrp?.name || post.profiles?.role || "חבר";
                                        const badgeColor = pGrp?.color || getRoleColor(post.profiles?.role, post.profiles?.house, roleColors);
                                        return (
                                            <div className="flex items-center gap-1">
                                                <span style={{
                                                    fontSize: "9px", fontWeight: 900, fontFamily: "'Cinzel', serif",
                                                    textTransform: "uppercase", letterSpacing: "0.1em",
                                                    color: badgeColor, background: `${badgeColor}18`,
                                                    border: `1px solid ${badgeColor}40`,
                                                    padding: "1px 8px", borderRadius: "999px",
                                                }}>{badgeLabel}</span>
                                                {post.profiles?.gender === 'male'
                                                    ? <Mars size={9} className="text-blue-400" />
                                                    : <Venus size={9} className="text-pink-400" />}
                                            </div>
                                        );
                                    })()}

                                    {/* house badge */}
                                    {config && (
                                        <span className={`text-[9px] px-2.5 py-0.5 rounded border mt-0.5 font-bold tracking-wide ${config.badge}`}>
                                            {config.nameHe}
                                        </span>
                                    )}

                                    {/* year at hogwarts */}
                                    {post.profiles?.created_at && (
                                        <span className="text-[9px] text-white/20 font-bold">
                                            שנה {getYearLabel(getYearFromProfile(post.profiles))} • {getYearTitle(getYearFromProfile(post.profiles))}
                                        </span>
                                    )}

                                    {/* patronus */}
                                    {post.profiles?.patronus && (
                                        <span className="text-[10px] text-white/30 flex items-center gap-1">
                                            🔮 {PATRONUS_MAP[post.profiles.patronus] || post.profiles.patronus}
                                        </span>
                                    )}

                                    {/* online status */}
                                    {isOnline ? (
                                        <span className="text-[9px] text-emerald-400/80 flex items-center gap-1 mt-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                                            מקוון
                                        </span>
                                    ) : (
                                        <span className="text-[9px] text-white/15">לא מקוון</span>
                                    )}

                                    {/* join date */}
                                    {post.profiles?.created_at && (
                                        <div className="post-sidebar-stat w-full">
                                            <span className="post-sidebar-stat-label">הצטרפ/ה</span>
                                            <span className="post-sidebar-stat-num" style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>
                                                {new Date(post.profiles.created_at).toLocaleDateString("he-IL", { year: "numeric", month: "short" })}
                                            </span>
                                        </div>
                                    )}
                                </aside>

                                {/* Content */}
                                <div className="flex-1 p-5 flex flex-col min-w-0">
                                    {/* post header bar */}
                                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/[0.05]">
                                        <span className="flex items-center gap-1.5 text-[10px] text-white/25">
                                            <Clock size={9} />
                                            {new Date(post.created_at).toLocaleString("he-IL", {
                                                year: "numeric", month: "short", day: "numeric",
                                                hour: "2-digit", minute: "2-digit"
                                            })}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {currentUser && !isSelf && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <button onClick={() => handleQuote(post)} className="action-btn" aria-label="צטט משתמש">
                                                        <Reply size={10} /> ציטוט
                                                    </button>
                                                    <button onClick={() => handleMention(post)} className="action-btn" aria-label="תייג משתמש">
                                                        <AtSign size={10} /> תיוג
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleMute(post.user_id)}
                                                        className="p-1.5 rounded text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all"
                                                        title="השתקה"
                                                        aria-label="השתק משתמש"
                                                    >
                                                        <EyeOff size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => setReportingPost(post)}
                                                        className="p-1.5 rounded text-white/20 hover:text-red-400 hover:bg-red-500/[0.06] transition-all"
                                                        title="דיווח"
                                                        aria-label="דווח על הודעה"
                                                    >
                                                        <Flag size={12} />
                                                    </button>
                                                </div>
                                            )}
                                            <span
                                                className="text-[10px] font-bold font-mono text-white/15 px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05]"
                                                title={`פוסט מספר ${index + 1}`}
                                            >
                                                #{index + 1}
                                            </span>
                                        </div>
                                    </div>
                                    <PostContent content={post.content} />

                                    {/* ── Reaction Spells (Footer) ── */}
                                    <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {SPELLS.map(spell => {
                                                const spellReactions = (post.post_reactions || []).filter((r: any) => r.spell_type === spell.type);
                                                const count = spellReactions.length;
                                                const hasCast = spellReactions.some((r: any) => r.user_id === currentUser?.id);

                                                if (count === 0 && !hasCast) return null;

                                                return (
                                                    <div key={spell.type} className="relative group/reactor">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); handleCastSpell(post.id, spell.type); }}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all border ${hasCast ? `bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]` : 'bg-white/[0.02] border-white/[0.05] text-white/40 hover:bg-white/[0.08]'}`}
                                                        >
                                                            <span className="text-sm">{spell.icon}</span> <span>{count}</span>
                                                        </button>

                                                        {/* Hover list of reactors */}
                                                        {count > 0 && (
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/reactor:flex flex-col gap-2 p-3 rounded-2xl bg-[#070b14]/95 backdrop-blur-xl border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.8)] z-[100] min-w-[140px] max-w-[220px] animate-in slide-in-from-bottom-2 fade-in zoom-in-95 pointer-events-auto">
                                                                <span className="text-[10px] text-white/50 pb-1.5 border-b border-white/5 px-1 font-bold text-center tracking-widest">{spell.name}</span>
                                                                <div className="max-h-[140px] overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pr-1">
                                                                    {spellReactions.map((r: any, idx: number) => {
                                                                        const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                                                                        const pColor = prof?.user_groups?.color || getRoleColor(prof?.role, prof?.house, roleColors);
                                                                        return (
                                                                            <div
                                                                                key={idx}
                                                                                style={{ color: pColor || '#e2e8f0', backgroundColor: pColor ? `${pColor}15` : 'rgba(255,255,255,0.05)' }}
                                                                                className="flex items-center gap-2 px-2 py-1.5 rounded-full shadow-inner border border-transparent hover:border-white/10 transition-colors w-full"
                                                                            >
                                                                                <Avatar avatarUrl={prof?.avatar_url} house={prof?.house} className="w-5 h-5 shrink-0 text-[8px]" />
                                                                                <span className="text-xs truncate font-cinzel font-bold text-right flex-1">
                                                                                    {prof?.full_name || prof?.username || 'קוסם'}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}

                                            {currentUser && !isPensieveMode && (
                                                <div className="relative group/spells ml-2 pb-1">
                                                    <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white/90 hover:border-white/20 transition-all shadow-sm">
                                                        <span>+</span> 🪄 לחש
                                                    </button>
                                                    <div className="absolute top-0 right-1/2 translate-x-1/2 -mt-[3.5rem] hidden group-hover/spells:block z-[100] pb-4">
                                                        {/* Facebook-style floating dock */}
                                                        <div className="flex items-center gap-1 p-1.5 rounded-[2rem] bg-gradient-to-t from-black/90 to-[#0a0d14]/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_15px_35px_rgba(0,0,0,0.5),auto_auto_30px_rgba(255,255,255,0.02)_inset] animate-in slide-in-from-bottom-3 zoom-in-95 duration-200 origin-bottom">
                                                            {SPELLS.map(spell => (
                                                                <div key={spell.type} className="relative group/icon">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.preventDefault(); handleCastSpell(post.id, spell.type); }}
                                                                        className={`flex items-center justify-center p-2 rounded-full hover:scale-125 hover:-translate-y-1.5 active:scale-90 transition-all duration-300 origin-bottom hover:${spell.bg} hover:border-transparent cursor-pointer`}
                                                                    >
                                                                        <span className="text-xl drop-shadow-lg filter group-hover/icon:brightness-110">
                                                                            {spell.icon}
                                                                        </span>
                                                                    </button>
                                                                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-max px-2 py-0.5 bg-black/90 backdrop-blur-md rounded-full text-[10px] uppercase font-black tracking-wider text-white opacity-0 scale-75 group-hover/icon:opacity-100 group-hover/icon:scale-100 transition-all duration-200 pointer-events-none origin-bottom border border-white/10 shadow-xl">
                                                                        {spell.name}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>

                {/* ── Reply Area ── */}
                {thread?.is_locked ? (
                    <div className="mt-12 rounded-2xl border border-white/[0.06] bg-white/[0.01] p-8 text-center space-y-2">
                        <div className="flex items-center justify-center gap-2 text-white/30">
                            <Lock size={18} />
                            <span className="font-cinzel text-sm font-black uppercase tracking-widest">השרשור נעול</span>
                        </div>
                        <p className="font-crimson text-white/25 text-base italic">
                            שרשור זה נסגר ואין אפשרות להוסיף תגובות חדשות
                        </p>
                    </div>
                ) : currentUser ? (
                    <div id="fast-reply-area" className="mt-12 rounded-2xl border border-amber-500/10 bg-black/20 overflow-hidden">
                        <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.05]">
                            <Zap size={14} className="text-amber-500" />
                            <span className="font-cinzel text-sm font-black text-amber-500/80 uppercase tracking-widest">תגובה מהירה</span>
                            {userProfile && (
                                <Avatar house={userProfile.house} avatarUrl={userProfile.avatar_url} className="w-6 h-6 text-xs mr-auto" />
                            )}
                        </div>
                        <div className="p-6 flex flex-col">
                            <div className="reply-editor mb-4" style={{ maxHeight: 300, overflowY: "auto" }}>
                                <ReactQuill
                                    ref={quillRef}
                                    theme="snow"
                                    value={replyContent}
                                    onChange={setReplyContent}
                                    placeholder="הקלד את הלחש שלך..."
                                />
                            </div>
                            {cooldownRemaining > 0 && (
                                <div className="mb-4">
                                    <CooldownBar remaining={cooldownRemaining} total={COOLDOWN_MS} />
                                </div>
                            )}
                            <div className="flex items-center justify-between sticky bottom-0 bg-black/60 backdrop-blur-sm py-3 -mx-6 px-6 mt-1 border-t border-white/[0.04]">
                                <span className="text-[10px] text-white/20">
                                    {replyContent.replace(/<[^>]+>/g, '').length} תווים
                                </span>
                                <button
                                    onClick={handleReply}
                                    disabled={isSubmitting || cooldownRemaining > 0}
                                    className="px-8 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-amber-950 font-cinzel font-black text-sm rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {isSubmitting ? "שולח..." : "שליחת ינשוף 🦉"}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mt-12 rounded-2xl border border-white/[0.06] bg-white/[0.01] p-8 text-center text-white/30 text-sm">
                        <Link href="/" className="text-amber-500 hover:underline">התחבר</Link> כדי להשתתף בשיחה
                    </div>
                )}
            </div>

            {/* ── Report Modal ── */}
            {reportingPost && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="bg-[#0e1117] text-white w-full max-w-sm rounded-2xl border border-red-900/40 p-7 space-y-5 shadow-2xl">
                        <h4 className="font-cinzel text-lg font-bold text-red-400 flex items-center gap-2">
                            <AlertTriangle size={20} /> דיווח על הודעה
                        </h4>
                        <div className="space-y-2">
                            {["תוכן פוגעני", "ספאם / הצפה", "שפה לא הולמת", "אחר"].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setReportReason(r)}
                                    className={`w-full text-right px-4 py-3 rounded-xl border text-sm transition-all ${reportReason === r
                                        ? 'bg-red-900/40 border-red-600/60 text-red-200'
                                        : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={handleSendReport}
                                disabled={!reportReason || isReporting}
                                className="flex-1 py-3 bg-red-700 hover:bg-red-600 rounded-xl font-bold text-sm transition-colors disabled:opacity-40"
                            >
                                שלח דיווח
                            </button>
                            <button
                                onClick={() => { setReportingPost(null); setReportReason(""); }}
                                className="flex-1 py-3 bg-white/[0.06] hover:bg-white/10 rounded-xl text-sm transition-colors"
                            >
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

