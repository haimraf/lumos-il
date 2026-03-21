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
import { enrichContent } from "@/utils/enrichContent";

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
 * LUMOS IL — THREAD VIEW V8
 * ✅ ציטוטים — inline styles (לא תלוי ב-CSS specificity של Quill)
 * ✅ סמן אחרי ציטוט — נוחת מחוץ לblockquote
 * ✅ התראות — useRef במקום DOMParser (Quill מסנן data-*)
 * ✅ מיוט — תוקן
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
    "דיון":    { bg: "rgba(59,130,246,0.12)",  text: "#60a5fa", border: "rgba(59,130,246,0.3)"  },
    "שאלה":   { bg: "rgba(244,63,94,0.12)",   text: "#fb7185", border: "rgba(244,63,94,0.3)"   },
    "תיאוריה":{ bg: "rgba(139,92,246,0.12)",  text: "#a78bfa", border: "rgba(139,92,246,0.3)"  },
    "פרסום":  { bg: "rgba(16,185,129,0.12)",  text: "#34d399", border: "rgba(16,185,129,0.3)"  },
};

const COOLDOWN_MS = 30_000;

// Inline style string לblockquote — עוקף את כל CSS specificity של Quill
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
    const html = useMemo(() => enrichContent(content), [content]);
    return (
        <div
            className="post-body flex-1 text-white/80 text-base leading-relaxed break-words"
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
    const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
    const [reportingPost, setReportingPost] = useState<any>(null);
    const [reportReason, setReportReason] = useState("");
    const [isReporting, setIsReporting] = useState(false);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const [roleColors, setRoleColors] = useState<Record<string, string>>({});
    useEffect(() => { getRoleColorFromDB(supabase).then(setRoleColors); }, [supabase]);

    // ✅ useRef לשמירת מי צוטט/תויג — לא תלוי ב-HTML parsing
    const pendingQuotes = useRef<string[]>([]);
    const pendingMentions = useRef<string[]>([]);

    /* ── Auth init — רץ ראשון, מפריד מ-fetchData ── */
    useEffect(() => {
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setCurrentUser(session.user);
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                setUserProfile(profile);
                setUserRole(profile?.role || null);
                const { data: blocks } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", session.user.id);
                if (blocks) setBlockedUserIds(blocks.map((b: any) => b.blocked_id));
            }
        };
        initAuth();

        // גם מאזין לשינויים (incognito, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                setCurrentUser(session.user);
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                setUserProfile(profile);
                setUserRole(profile?.role || null);
                const { data: blocks } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", session.user.id);
                if (blocks) setBlockedUserIds(blocks.map((b: any) => b.blocked_id));
            } else {
                setCurrentUser(null);
                setUserProfile(null);
                setUserRole(null);
                setBlockedUserIds([]);
            }
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

            const { data: forumData } = await supabase
                .from('forums').select('*').eq('id', threadData.forum_id).single();
            if (forumData) setForum(forumData);

            // Select only columns that definitely exist in profiles — omit 'username' which may not exist
            const { data: postsData, error: postsError } = await supabase
                .from('forum_posts')
                .select(`*, profiles(house, role, wand_type, full_name, email, signature, patronus, avatar_url, year, gender, created_at, id, user_groups(name, color))`)
                .eq('thread_id', id)
                .order('created_at', { ascending: true });

            if (postsError) {
                console.error('[ThreadView] posts query failed:', postsError.message);
                // Try minimal fallback select
                const { data: fallbackPosts } = await supabase
                    .from('forum_posts')
                    .select('*, profiles(house, full_name, avatar_url, role, user_groups(name, color))')
                    .eq('thread_id', id)
                    .order('created_at', { ascending: true });
                setPosts((fallbackPosts as any) || []);
            } else {
                setPosts((postsData as any) || []);
            }
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

        // ✅ רשום מי צוטט — לפני כל שינוי ב-editor
        pendingQuotes.current.push(post.user_id);

        const cleanContent = post.content.replace(/<\/?p[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

        // ✅ Inline styles — Quill לא יכול לדרוס אותם
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

        // Cooldown check
        const lastPost = posts[posts.length - 1];
        if (lastPost?.user_id === currentUser.id && userRole !== 'מנהל') {
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
            const { error } = await supabase.from('forum_posts').insert([{
                thread_id: threadId,
                user_id: currentUser.id,
                content: replyContent,
            }]);

            if (error) {
                sendOwl("שגיאת שליחה", error.message, "error");
                return;
            }

            if (!error) {
                // ✅ useRef — לא תלוי ב-HTML שQuill מחזיר
                const uniqueQuoted = [...new Set(pendingQuotes.current)];
                const uniqueMentioned = [...new Set(
                    pendingMentions.current.filter(uid => !uniqueQuoted.includes(uid))
                )];

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

                // איפוס
                pendingQuotes.current = [];
                pendingMentions.current = [];

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
                        <span className="text-white/10">·</span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                            {onlineUserIds.size} מקוונים כעת
                        </span>

                        {/* ── Mod controls ── */}
                        {(userRole === 'מנהל' || userRole === 'מנחה') && thread && (
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

                {/* ── Pinned / Locked banners ── */}
                {thread?.is_pinned && (
                    <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] mb-2">
                        <Pin size={15} className="text-amber-400 shrink-0" />
                        <div>
                            <span className="font-cinzel font-black text-amber-400 text-xs uppercase tracking-widest">שרשור מעוגן</span>
                            <span className="font-crimson text-amber-400/60 text-sm mr-3 italic">— נעוץ על ידי צוות הטירה לנוחות הקהילה</span>
                        </div>
                    </div>
                )}
                {thread?.is_locked && (
                    <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] mb-2">
                        <Lock size={15} className="text-red-400 shrink-0" />
                        <div>
                            <span className="font-cinzel font-black text-red-400 text-xs uppercase tracking-widest">שרשור נעול</span>
                            <span className="font-crimson text-red-400/60 text-sm mr-3 italic">— שרשור זה נסגר ואין אפשרות להוסיף תגובות חדשות</span>
                        </div>
                    </div>
                )}

                {/* ── Posts ── */}
                <div className="space-y-5">
                    {posts.map((post, index) => {
                        const isMuted = blockedUserIds.includes(post.user_id);
                        const isOnline = onlineUserIds.has(post.user_id);
                        const config = post.profiles?.house ? HOUSE_CONFIG[post.profiles.house] : null;
                        const isSelf = currentUser?.id === post.user_id;

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
                                className="group rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col md:flex-row transition-all duration-300 hover:border-white/10"
                                style={{
                                    background: config
                                        ? `linear-gradient(135deg, ${config.accent}08 0%, rgba(6,9,16,0.8) 60%)`
                                        : "rgba(255,255,255,0.02)"
                                }}
                            >
                                {/* Sidebar */}
                                <aside className="w-full md:w-44 shrink-0 p-4 flex flex-col items-center gap-1.5 border-l border-white/[0.04] bg-black/20">
                                    <Avatar house={post.profiles?.house} avatarUrl={post.profiles?.avatar_url} isOnline={isOnline} className="w-14 h-14 text-2xl mb-1" />

                                    {/* name */}
                                    <Link
                                        href={`/wizard/${post.user_id}`}
                                        className="font-cinzel font-black text-sm text-center leading-tight hover:underline"
                                        style={{ color: getRoleColor(post.profiles?.role, post.profiles?.house, roleColors) }}
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
                                            שנה {getYearLabel(getYearFromProfile(post.profiles))} · {getYearTitle(getYearFromProfile(post.profiles))}
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
                                            <span className="post-sidebar-stat-label">הצטרף/ה</span>
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
                                                    <button onClick={() => handleQuote(post)} className="action-btn">
                                                        <Reply size={10} /> ציטוט
                                                    </button>
                                                    <button onClick={() => handleMention(post)} className="action-btn">
                                                        <AtSign size={10} /> תיוג
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleMute(post.user_id)}
                                                        className="p-1.5 rounded text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all"
                                                        title="השתקה"
                                                    >
                                                        <EyeOff size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => setReportingPost(post)}
                                                        className="p-1.5 rounded text-white/20 hover:text-red-400 hover:bg-red-500/[0.06] transition-all"
                                                        title="דיווח"
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
                        <Link href="/login" className="text-amber-500 hover:underline">התחבר</Link> כדי להשתתף בשיחה
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