"use client";

import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { sanitizeInline } from "@/utils/sanitize";
import Link from "next/link";
import EmojiPicker, { Theme } from "emoji-picker-react";
import {
    Wand2, ChevronRight, Sparkles, Zap, Info, Shield,
    Users, Flag, AlertTriangle, EyeOff, Eye, Loader2, Smile, Ghost,
    Volume2, VolumeX
} from "lucide-react";
import { useUIState } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";
import MemberOnlyNotice from "@/components/auth/MemberOnlyNotice";
import CommunityRecognition from "@/components/CommunityRecognition";
import { triggerAudioPlay } from "@/utils/audioTrigger";
import { getRoleColor, getRoleDisplay, getRoleColorFromDB } from "@/lib/roleColor";
import { getHouseIcon, getHouseLabel, getHousePalette, withAlpha } from "@/lib/houses";
import { useOwlMail } from "@/components/OwlMail";

/**
 * LUMOS IL - THE GREAT HALL V5
 * ✅ כל הלוגיקה ללא שינוי
 * ✅ עיצוב משופר • bubbles, gradients, avatars
 * ✅ נגישות • aria-label, role, keyboard nav, focus styles
 */

type Message = {
    id: string;
    content: string;
    user_id: string;
    created_at: string;
    profiles: {
        house: string | null;
        role: string | null;
        wand_type: string | null;
        full_name: string | null;
        email: string | null;
        signature: string | null;
        avatar_url: string | null;
        is_ghost: boolean | null;
        user_groups: { name: string; color: string } | null;
    };
};

const HOUSE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string; gradientFrom: string }> = {
    Gryffindor: { label: "גריפינדור", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: "🦁", gradientFrom: "from-red-900/20" },
    Slytherin: { label: "סליתרין", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: "🐍", gradientFrom: "from-emerald-900/20" },
    Ravenclaw: { label: "רייבנקלו", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: "🦅", gradientFrom: "from-blue-900/20" },
    Hufflepuff: { label: "הפלפאף", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: "🦡", gradientFrom: "from-amber-900/20" },
    Unknown: { label: "טרם סווג", color: "text-slate-300", bg: "bg-slate-500/10", border: "border-slate-500/20", icon: "✨", gradientFrom: "from-slate-900/20" },
};

const MESSAGE_URL_REGEX = /\b((?:https?:\/\/|www\.)[^\s<]+)/gi;
const EMOTICON_REGEX = /(<3|:-D|:D|:-\)|:\)|:-\(|:\(|;-\)|;\))/g;

const EMOTICON_MAP: Record<string, { emoji: string; label: string }> = {
    "<3": { emoji: "❤️", label: "לב" },
    ":D": { emoji: "😄", label: "חיוך גדול" },
    ":-D": { emoji: "😄", label: "חיוך גדול" },
    ":)": { emoji: "🙂", label: "חיוך" },
    ":-)": { emoji: "🙂", label: "חיוך" },
    ":(": { emoji: "🙁", label: "פנים עצובות" },
    ":-(": { emoji: "🙁", label: "פנים עצובות" },
    ";)": { emoji: "😉", label: "קריצה" },
    ";-)": { emoji: "😉", label: "קריצה" },
};

function splitTrailingUrlPunctuation(rawUrl: string) {
    let cleanUrl = rawUrl;
    let trailing = "";

    while (/[),.!?;:]$/.test(cleanUrl)) {
        trailing = cleanUrl.slice(-1) + trailing;
        cleanUrl = cleanUrl.slice(0, -1);
    }

    return { cleanUrl, trailing };
}

function toExternalHref(url: string) {
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function renderRichMessage(content: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    let key = 0;

    const pushPlainText = (text: string) => {
        let cursor = 0;

        for (const match of text.matchAll(EMOTICON_REGEX)) {
            const index = match.index ?? 0;
            if (index > cursor) {
                const chunk = text.slice(cursor, index);
                const lines = chunk.split("\n");
                lines.forEach((line, lineIndex) => {
                    if (line) nodes.push(<Fragment key={`text-${key++}`}>{line}</Fragment>);
                    if (lineIndex < lines.length - 1) nodes.push(<br key={`br-${key++}`} />);
                });
            }

            const emoticon = EMOTICON_MAP[match[0]];
            if (emoticon) {
                nodes.push(
                    <span key={`emoji-${key++}`} role="img" aria-label={emoticon.label}>
                        {emoticon.emoji}
                    </span>,
                );
            }

            cursor = index + match[0].length;
        }

        if (cursor < text.length) {
            const chunk = text.slice(cursor);
            const lines = chunk.split("\n");
            lines.forEach((line, lineIndex) => {
                if (line) nodes.push(<Fragment key={`text-${key++}`}>{line}</Fragment>);
                if (lineIndex < lines.length - 1) nodes.push(<br key={`br-${key++}`} />);
            });
        }
    };

    let lastIndex = 0;
    for (const match of content.matchAll(MESSAGE_URL_REGEX)) {
        const index = match.index ?? 0;
        const rawUrl = match[0];

        if (index > lastIndex) {
            pushPlainText(content.slice(lastIndex, index));
        }

        const { cleanUrl, trailing } = splitTrailingUrlPunctuation(rawUrl);
        nodes.push(
            <Fragment key={`link-wrap-${key++}`}>
                <a
                    href={toExternalHref(cleanUrl)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="break-all font-semibold text-amber-300 underline decoration-amber-500/40 underline-offset-4 transition-colors hover:text-amber-200"
                >
                    {cleanUrl}
                </a>
                {trailing ? <Fragment>{trailing}</Fragment> : null}
            </Fragment>,
        );

        lastIndex = index + rawUrl.length;
    }

    if (lastIndex < content.length) {
        pushPlainText(content.slice(lastIndex));
    }

    return nodes.length > 0 ? nodes : [content];
}


export default function GreatHall() {
    const [supabase] = useState(() => createClient());
    const { session, profile: authProfile, isLoading: authLoading } = useAuth();
    const { sendOwl } = useOwlMail();
    const sessionUser = session?.user ?? null;
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [myId, setMyId] = useState<string | null>(null);
    const [myName, setMyName] = useState<string>("אורח בטירה");
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [hideSignatures, setHideSignatures] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
    const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
    const [reportReason, setReportReason] = useState("");
    const [isReporting, setIsReporting] = useState(false);
    const [roleColors, setRoleColors] = useState<Record<string, string>>({});
    const [userGroups, setUserGroups] = useState<{ name: string; color: string }[]>([]);
    useEffect(() => {
        getRoleColorFromDB(supabase).then(setRoleColors);
        supabase.from('user_groups').select('name, color').order('display_order')
            .then(({ data }: { data: { name: string; color: string }[] | null }) => { if (data) setUserGroups(data); });
    }, [supabase]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ── במובייל: גלילה אוטומטית לתחתית הצ'אט + פוקוס על שדה הכתיבה ──
    useEffect(() => {
        if (!isLoading && inputRef.current && window.innerWidth < 768) {
            setTimeout(() => {
                // גוללים את מיכל הצ'אט הפנימי לתחתית (ולא את כל הדף!)
                const chatContainer = document.querySelector('.chat-scroll');
                if (chatContainer) {
                    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
                }
                // פוקוס לשדה הקלט • הוא כבר גלוי בתחתית ה-flex
                inputRef.current?.focus();
            }, 400);
        }
    }, [isLoading]);

    useEffect(() => {
        if (messagesEndRef.current) {
            // תופסים את הדיב שעוטף את הצ'אט (שיש לו את הקלאס chat-scroll)
            const chatContainer = messagesEndRef.current.closest('.chat-scroll');
            if (chatContainer) {
                // גוללים רק אותו פנימה, בלי להזיז את כל המסך!
                chatContainer.scrollTo({
                    top: chatContainer.scrollHeight,
                    behavior: "smooth"
                });
            }
        }
    }, [messages]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
                setShowEmojiPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        let isMounted = true;
        const channel = supabase.channel("great_hall_v2");

        const setup = async () => {
            if (authLoading) return;
            if (!sessionUser || !isMounted) {
                setMyId(null);
                setMyName("אורח בטירה");
                setMessages([]);
                setBlockedUserIds([]);
                setIsLoading(false);
                return;
            }

            const userId = sessionUser.id;
            setMyId(userId);

            const extractedName = sessionUser.email ? sessionUser.email.split("@")[0] : "אורח בטירה";
            const resolvedName = authProfile?.full_name || extractedName;
            setMyName(resolvedName);

            try {

            const { data: profileCheck } = await supabase
                .from("profiles").select("full_name, role, house, group_id, user_groups(name, color)").eq("id", userId).single();

            if (!profileCheck?.full_name || profileCheck.full_name === "Wizard") {
                await supabase.from("profiles").update({ full_name: resolvedName }).eq("id", userId);
            }

            const { data: blocks } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", userId);
            if (blocks && isMounted) setBlockedUserIds(blocks.map(b => b.blocked_id));

            const { data } = await supabase
                .from("messages")
                .select("*, profiles(house, role, wand_type, full_name, email, signature, avatar_url, is_ghost, user_groups(name, color))")
                .order("created_at", { ascending: false })
                .limit(50);

            if (data && isMounted) setMessages((data as any).reverse());
            if (isMounted) setIsLoading(false);

            channel
                .on("presence", { event: "sync" }, () => {
                    if (!isMounted) return;
                    const state = channel.presenceState();
                    const uniqueUsersMap = new Map();
                    Object.values(state).flat().forEach((u: any) => {
                        if (u.user_id) uniqueUsersMap.set(u.user_id, u);
                    });
                    setOnlineUsers(Array.from(uniqueUsersMap.values()));
                })
                .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
                    const { data: m } = await supabase
                        .from("messages")
                        .select("*, profiles(house, role, wand_type, full_name, email, signature, avatar_url, is_ghost, user_groups(name, color))")
                        .eq("id", payload.new.id).single();
                    if (m && isMounted) setMessages(prev => [...prev, m as any]);
                })
                .subscribe(async (status) => {
                    if (status === "SUBSCRIBED" && isMounted) {
                        const rawGrp = profileCheck?.user_groups as any;
                        const pcGrp = (Array.isArray(rawGrp) ? rawGrp[0] : rawGrp) as { name: string; color: string } | null;
                        await channel.track({
                            user_id: userId,
                            name: profileCheck?.full_name || resolvedName,
                            role: profileCheck?.role || "דמות בטירה",
                            house: profileCheck?.house || "Unknown",
                            group_id: (profileCheck as any)?.group_id || null,
                            group_name: pcGrp?.name || null,
                            group_color: pcGrp?.color || null,
                        });
                    }
                });
            } catch (error) {
                console.error("[GreatHall] setup failed:", error);
                if (isMounted) {
                    setMessages([]);
                    setBlockedUserIds([]);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        void setup();
        return () => { isMounted = false; supabase.removeChannel(channel); };
    }, [authLoading, authProfile?.full_name, sessionUser, supabase]);

    const onEmojiClick = (emojiObject: any) => {
        setNewMessage(prev => prev + emojiObject.emoji);
        inputRef.current?.focus();
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !myId || isSending) return;
        setIsSending(true);
        const content = newMessage.trim();
        setNewMessage("");
        setShowEmojiPicker(false);
        try {
            const { error } = await supabase.rpc("send_great_hall_message_secure", {
                p_content: content,
            });
            if (error) throw error;
        } catch (error: any) {
            setNewMessage(content);
            sendOwl("שגיאת ינשוף", error?.message || "לא ניתן היה לשלוח את ההודעה כרגע.", "error");
        } finally {
            setIsSending(false);
        }
    };

    const handleToggleMute = async (targetUserId: string, userName: string, isCurrentlyMuted: boolean) => {
        if (!myId) return;
        if (isCurrentlyMuted) {
            const { error } = await supabase.from("blocks").delete()
                .eq("blocker_id", myId).eq("blocked_id", targetUserId);
            if (!error) setBlockedUserIds(prev => prev.filter(id => id !== targetUserId));
        } else {
            if (confirm(`האם להסתיר את ההודעות של ${userName}?`)) {
                const { error } = await supabase.from("blocks").insert({ blocker_id: myId, blocked_id: targetUserId });
                if (!error || error.code === "23505") setBlockedUserIds(prev => [...prev, targetUserId]);
            }
        }
    };

    const handleSendReport = async () => {
        if (!reportReason || !reportingMessage || !myId) return;
        setIsReporting(true);
        const { error } = await supabase.from("reports").insert([{
            reporter_id: myId, target_id: reportingMessage.id,
            target_type: "chat", reason: reportReason,
            content_preview: reportingMessage.content, status: "pending",
        }]);
        if (!error) {
            sendOwl("הקובלנה הוגשה 🦉", "הדיווח הועבר לצוות הניהול. תודה על שמירת הטירה.", "magic");
            setReportingMessage(null);
            setReportReason("");
        } else {
            sendOwl("שגיאה בהגשה", "לא ניתן היה לשלוח את הדיווח. נסה שוב.", "error");
        }
        setIsReporting(false);
    };

    /* ── Loading ── */
    if (isLoading) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4" aria-live="polite" aria-label="מאיר את האולם הגדול">
            <div className="w-12 h-12 border-t-2 border-amber-500 rounded-full animate-spin" role="status" />
            <p className="font-cinzel text-amber-500 tracking-widest animate-pulse">לומוס מקסימה...</p>
        </div>
    );

    /* ───────── MuteToggle • replaces hidden footer FAB ───────── */
    if (!sessionUser) {
        return (
            <MemberOnlyNotice
                title="האולם הגדול לוחש רק לקוסמים מחוברים"
                description="כדי לראות את השיח החי, את מי שיושב עכשיו באולם ולשלוח הודעות בלי מסך ריק ומטעה, צריך קודם להיכנס לחשבון שלך בטירה."
                icon={Users}
            />
        );
    }

    function MuteToggle() {
        const { isMuted, toggleMute } = useUIState();
        const handleClick = () => {
            if (isMuted) triggerAudioPlay();
            toggleMute();
        };
        return (
            <button
                onClick={handleClick}
                className={`magic-focus flex items-center gap-1 px-2.5 py-1.5 rounded-full border transition-all ${
                    isMuted
                        ? 'bg-white/[0.04] text-white/35 border-white/[0.08] hover:bg-white/[0.08]'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}
                aria-label={isMuted ? "הפעל מוזיקה" : "השתק מוזיקה"}
                title={isMuted ? "הפעל מוזיקה" : "השתק"}
            >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} className="animate-pulse" />}
            </button>
        );
    }

    const ChatNav = ({ className = "" }: { className?: string }) => (
        <div className={`flex w-full flex-wrap items-center justify-between gap-2.5 ${className}`} aria-label="כותרת האולם הגדול">
            <div className="flex min-w-0 items-center gap-2">
                <Link
                    href="/dashboard"
                    className="magic-focus shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] hover:bg-white/10 transition-all text-white/50 hover:text-white"
                    aria-label="חזרה ללוח הבקרה"
                >
                    <ChevronRight size={16} />
                    <span className="hidden sm:inline font-cinzel text-[11px] font-black uppercase tracking-widest">חזרה</span>
                </Link>
                <div className="flex min-w-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
                    <Sparkles className="shrink-0 text-amber-500" size={12} aria-hidden="true" />
                    <span className="truncate font-cinzel text-[11px] md:text-xs font-black uppercase tracking-[0.24em] text-white/85">
                        האולם הגדול
                    </span>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
                <MuteToggle />
                <button
                    onClick={() => setHideSignatures((s) => !s)}
                    className={`magic-focus flex items-center gap-1 px-2.5 py-1.5 rounded-full border transition-all font-cinzel text-[11px] font-black uppercase tracking-widest ${
                        hideSignatures
                            ? 'bg-amber-500 text-amber-950 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                            : 'bg-white/[0.04] text-white/35 border-white/[0.08] hover:bg-white/[0.08]'
                    }`}
                    aria-label={hideSignatures ? "הצג חתימות" : "הסתר חתימות"}
                >
                    <Ghost size={14} className={hideSignatures ? "animate-pulse" : ""} aria-hidden="true" />
                    <span className="hidden lg:inline">{hideSignatures ? "מוסתרות" : "הסתר"}</span>
                </button>
                <div
                    className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1.5 rounded-full"
                    aria-live="polite"
                    title={`${onlineUsers.length} מחוברים עכשיו`}
                >
                    <span className="online-dot h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-300 text-[11px] md:text-xs font-black uppercase font-cinzel tracking-wider">
                        {onlineUsers.length}
                    </span>
                </div>
            </div>
        </div>
    );

    /* ─────────────────────────── RENDER ─────────────────────────── */
    return (
        <>
            {/* ── Ambient background glows ── */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 hidden h-[600px] w-[700px] rounded-full bg-amber-500/[0.035] blur-[160px] sm:block" />
                <div className="absolute bottom-0 left-0 hidden h-[500px] w-[600px] rounded-full bg-emerald-500/[0.025] blur-[140px] sm:block" />
                <div className="absolute left-1/2 top-1/2 hidden h-[400px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/[0.018] blur-[120px] md:block" />
            </div>

            <style>{`
                /* ── Scrollbar ── */
                .chat-scroll::-webkit-scrollbar { width: 4px; }
                .chat-scroll::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.25); border-radius: 10px; }
                .chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(245,158,11,0.45); }

                /* ── Emoji picker dark ── */
                .emoji-picker-react {
                    --epr-bg-color: #111 !important;
                    --epr-category-label-bg-color: #111 !important;
                    --epr-text-color: #f8fafc !important;
                    border-color: rgba(255,255,255,0.08) !important;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.9) !important;
                    border-radius: 1.5rem !important;
                }

                @media (max-width: 640px) {
                    .emoji-picker-react {
                        width: min(92vw, 340px) !important;
                        max-height: 48vh !important;
                    }
                }

                /* ── Message bubble animation ── */
                @keyframes bubbleIn {
                    from { opacity: 0; transform: translateY(8px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .bubble-in { animation: bubbleIn 0.25s cubic-bezier(0.22,1,0.36,1) forwards; }

                /* ── Focus ring ── */
                .magic-focus:focus-visible {
                    outline: 2px solid rgba(245,158,11,0.6);
                    outline-offset: 2px;
                }

                /* ── Input glow ── */
                .chat-input:focus {
                    border-color: rgba(245,158,11,0.4);
                    box-shadow: 0 0 0 3px rgba(245,158,11,0.08), inset 0 0 20px rgba(0,0,0,0.4);
                }

                /* ── Online dot ── */
                @keyframes onlinePulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.4); }
                    50%       { box-shadow: 0 0 0 4px rgba(52,211,153,0); }
                }
                .online-dot { animation: onlinePulse 2s ease-in-out infinite; }
            `}</style>

            <div
                className="relative mx-auto flex h-[calc(100dvh-148px)] w-full max-w-full flex-col overflow-hidden px-2 pb-2 pt-2 sm:h-[calc(100dvh-172px)] sm:pt-5 md:h-[calc(100dvh-188px)] md:max-w-7xl md:px-4 md:pb-4 md:pt-8"
                dir="rtl"
                role="main"
                aria-label="האולם הגדול • צ'אט קהילתי"
            >

                <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden min-h-0">

                    <div className="lg:hidden">
                        <CommunityRecognition placement="great-hall" compact />
                    </div>

                    {/* Sidebar */}
                    <aside
                        className="hidden lg:flex flex-col gap-4 w-72 shrink-0 overflow-y-auto chat-scroll"
                        aria-label="פאנל צדדי • נוכחים ודרגות"
                    >
                        <CommunityRecognition placement="great-hall" compact />

                        {/* Online users */}
                        <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
                            <h2 className="font-cinzel text-[10px] tracking-[0.35em] text-white/50 uppercase mb-5 border-b border-white/[0.06] pb-3 flex items-center gap-2 font-bold">
                                <Users size={12} className="text-amber-500" aria-hidden="true" /> נוכחים בהיכל
                            </h2>
                            <ul className="space-y-4" role="list">
                                {onlineUsers.map((u, i) => {
                                    const h = HOUSE_CONFIG[u.house] || HOUSE_CONFIG["Unknown"];
                                    const dg = u.group_id
                                        ? { name: u.group_name, color: u.group_color }
                                        : getRoleDisplay(u.role, roleColors);
                                    return (
                                        <li key={i} className="flex items-center gap-3">
                                            <span className="text-xl shrink-0" aria-hidden="true">{h.icon}</span>
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <span className="text-sm font-bold text-white truncate">{u.name}</span>
                                                <div className="flex gap-1 flex-wrap">
                                                    <span style={{
                                                        fontSize: "8px", fontWeight: 900, fontFamily: "'Cinzel', serif",
                                                        textTransform: "uppercase", letterSpacing: "0.12em",
                                                        padding: "1px 8px", borderRadius: "999px",
                                                        color: dg.color, background: `${dg.color}18`,
                                                        border: `1px solid ${dg.color}40`,
                                                    }}>{dg.name}</span>
                                                    <span className={`text-[8px] px-2 py-0.5 rounded-full border font-black uppercase tracking-widest ${h.bg} ${h.border} ${h.color}`}>{h.label}</span>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>

                        {/* Legend */}
                        <section className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-5">
                            <div>
                                <h2 className="font-cinzel text-[10px] tracking-[0.35em] text-amber-500/70 uppercase mb-3 border-b border-amber-500/15 pb-2 flex items-center gap-2 font-bold">
                                    <Info size={11} aria-hidden="true" /> דרגות
                                </h2>
                                <div className="flex flex-wrap gap-1.5">
                                    {userGroups.map(g => (
                                        <span key={g.name} style={{
                                            fontSize: "8px", fontWeight: 900, fontFamily: "'Cinzel', serif",
                                            textTransform: "uppercase", letterSpacing: "0.12em",
                                            padding: "2px 10px", borderRadius: "999px",
                                            color: g.color, background: `${g.color}18`, border: `1px solid ${g.color}40`,
                                        }}>{g.name}</span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h2 className="font-cinzel text-[10px] tracking-[0.35em] text-amber-500/70 uppercase mb-3 border-b border-amber-500/15 pb-2 flex items-center gap-2 font-bold">
                                    <Shield size={11} aria-hidden="true" /> בתים
                                </h2>
                                <ul className="space-y-2" role="list">
                                    {Object.entries(HOUSE_CONFIG).filter(([k]) => k !== "Unknown").map(([k, h]) => (
                                        <li key={k} className="flex items-center gap-2">
                                            <span aria-hidden="true">{h.icon}</span>
                                            <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest ${h.bg} ${h.border} ${h.color}`}>
                                                {h.label}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>
                    </aside>

                    {/* Chat area */}
                    <section
                        className="flex-1 min-h-0 flex flex-col rounded-2xl md:rounded-3xl border border-white/[0.07] overflow-hidden relative"
                        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(2,6,23,0.95) 100%)" }}
                        aria-label="אזור ההודעות"
                    >
                        {/* ── Desktop In-Chat Nav (Top Fixed) ── */}
                        {!isLoading && <ChatNav className="px-3 py-3 md:px-6 md:py-4 border-b border-white/[0.06] bg-black/30 backdrop-blur-md" />}

                        {/* Messages Area */}
                        <div
                            className="flex-1 overflow-y-auto chat-scroll custom-scrollbar p-3 md:p-6 pb-4"
                        >

                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
                                    <p className="font-cinzel text-xl text-white/70">האולם שקט...</p>
                                    <p className="font-crimson text-base text-white/40">היה הראשון להטיל לחש וישבר הדממה ✨</p>
                                </div>
                            )}

                            {messages.map((msg) => {
                                const isMe = myId === msg.user_id;
                                // 👻 הסתרת הודעות של רוחות רפאים (Shadowban)
                                if (msg.profiles?.is_ghost && !isMe) return null;
                                const isMuted = blockedUserIds.includes(msg.user_id);
                                const h = HOUSE_CONFIG[msg.profiles?.house || "Unknown"] || HOUSE_CONFIG["Unknown"];
                                const msgGrp = msg.profiles?.user_groups as { name: string; color: string } | null;
                                const dg = msgGrp
                                    ? { name: msgGrp.name, color: msgGrp.color }
                                    : getRoleDisplay(msg.profiles?.role, roleColors);

                        let displayName = "קול מן הטירה";
                                if (msg.profiles?.full_name && msg.profiles.full_name !== "Wizard") {
                                    displayName = msg.profiles.full_name;
                                } else if (msg.profiles?.email) {
                                    displayName = msg.profiles.email.split("@")[0];
                                } else if (isMe) {
                                    displayName = myName;
                                }

                                /* Muted */
                                if (isMuted) return (
                                    <div key={msg.id} className="flex justify-start bubble-in">
                                        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl border border-white/[0.04] bg-white/[0.02] text-white/30 max-w-[75%] gap-4">
                                            <span className="font-crimson italic text-sm">לחש השתקה הוטל על {displayName}</span>
                                            <button
                                                onClick={() => handleToggleMute(msg.user_id, displayName, true)}
                                                className="magic-focus flex items-center gap-1 font-cinzel text-[10px] bg-white/[0.07] px-2.5 py-1 rounded-full hover:bg-white/15 transition-colors text-white/60 shrink-0"
                                                aria-label={`הסר לחש השתקה מ-${displayName}`}
                                            >
                                                <Eye size={11} aria-hidden="true" /> הסר לחש
                                            </button>
                                        </div>
                                    </div>
                                );

                                return (
                                    <div key={msg.id} className={`flex w-full bubble-in ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex gap-2.5 max-w-[88%] md:max-w-[72%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>

                                            {/* Avatar */}
                                            <div
                                                className={`w-9 h-9 rounded-xl shrink-0 mt-1 overflow-hidden flex items-center justify-center text-xl border ${h.border} ${h.bg}`}
                                                aria-hidden="true"
                                                title={h.label}
                                            >
                                                {msg.profiles?.avatar_url
                                                    ? <img src={msg.profiles.avatar_url} alt={msg.profiles.full_name || "אווטאר"} className="w-full h-full object-cover" />
                                                    : h.icon
                                                }
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                {/* Name + badges */}
                                                <div className={`flex flex-wrap items-center gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <Link
                                                        href={`/wizard/${msg.user_id}`}
                                                        className="font-cinzel text-sm font-black tracking-wide hover:underline"
                                                        style={{ color: msgGrp?.color || getRoleColor(msg.profiles?.role, msg.profiles?.house, roleColors) }}
                                                    >
                                                        {displayName}
                                                    </Link>
                                                    <span style={{
                                                        fontSize: "8px", fontWeight: 900, fontFamily: "'Cinzel', serif",
                                                        textTransform: "uppercase", letterSpacing: "0.12em",
                                                        padding: "1px 8px", borderRadius: "999px",
                                                        color: dg.color, background: `${dg.color}18`,
                                                        border: `1px solid ${dg.color}40`,
                                                    }}>
                                                        {dg.name}
                                                    </span>
                                                </div>

                                                {/* Bubble */}
                                                <div
                                                    className={`group relative px-4 py-3 md:px-5 md:py-4 rounded-2xl border shadow-lg ${isMe
                                                        ? 'rounded-tl-sm bg-white/[0.07] border-white/[0.12] text-right'
                                                        : `rounded-tr-sm ${h.bg} ${h.border} text-right`
                                                        }`}
                                                    style={!isMe && msg.profiles?.house && HOUSE_CONFIG[msg.profiles.house]
                                                        ? { background: `linear-gradient(135deg, ${HOUSE_CONFIG[msg.profiles.house].gradientFrom.replace('from-', '').replace('/20', '')} 0%, transparent 80%)`.replace('from-', '') }
                                                        : undefined
                                                    }
                                                >
                                                    <p className="text-white text-base md:text-lg font-assistant leading-relaxed break-words whitespace-pre-wrap select-text">
                                                        {renderRichMessage(msg.content)}
                                                    </p>

                                                    {/* Signature area */}
                                                    {!hideSignatures && (
                                                        <div className="mt-3 pt-3 border-t border-white/[0.07] flex items-end justify-between gap-3">
                                                            <div className="flex-1 text-white/30 text-xs">
                                                                {msg.profiles?.signature ? (
                                                                    <span className="italic font-crimson" dangerouslySetInnerHTML={{ __html: sanitizeInline(msg.profiles.signature) }} />
                                                                ) : (
                                                                    <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest">
                                                                        <Wand2 size={9} className="text-amber-500/30" aria-hidden="true" />
                                                                        {msg.profiles?.wand_type || "שרביט טרם נבחר"}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {/* Action buttons • מופיעים ב-hover */}
                                                                {!isMe && (
                                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" role="group" aria-label="פעולות על הודעה">
                                                                        <button
                                                                            onClick={() => handleToggleMute(msg.user_id, displayName, false)}
                                                                            className="magic-focus p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/10 transition-all"
                                                                            aria-label={`השתק את ${displayName}`}
                                                                            title="השתק קוסם"
                                                                        >
                                                                            <EyeOff size={13} aria-hidden="true" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setReportingMessage(msg)}
                                                                            className="magic-focus p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                                            aria-label={`דווח על הודעה של ${displayName}`}
                                                                            title="דיווח"
                                                                        >
                                                                            <Flag size={13} aria-hidden="true" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                <time
                                                                    dateTime={msg.created_at}
                                                                    className="text-[9px] text-white/20 font-bold tabular-nums"
                                                                >
                                                                    {new Date(msg.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                                                                </time>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Minimal time when signatures hidden */}
                                                    {hideSignatures && (
                                                        <div className="mt-1.5 flex justify-end">
                                                            <time dateTime={msg.created_at} className="text-[9px] text-white/15 tabular-nums">
                                                                {new Date(msg.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                                                            </time>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} aria-hidden="true" className="h-4" />
                        </div>

                        {/* ── Mobile In-Chat Nav (Bottom) ── */}
                        {/* Emoji picker */}
                        {showEmojiPicker && (
                            <div ref={emojiPickerRef} className="absolute bottom-20 right-2 md:bottom-24 md:right-4 z-50 animate-in slide-in-from-bottom-4 duration-200">
                                <EmojiPicker theme={Theme.DARK} onEmojiClick={onEmojiClick} searchDisabled skinTonesDisabled />
                            </div>
                        )}

                        {/* Input */}
                        <form
                            onSubmit={sendMessage}
                            className="z-10 flex items-center gap-2 border-t border-white/[0.06] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-4"
                            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}
                            aria-label="שגר לחש לאולם"
                        >
                            <div className="flex-1 relative flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(p => !p)}
                                    className="magic-focus absolute right-3.5 text-white/30 hover:text-amber-400 transition-colors z-10 p-1"
                                    aria-label="פתח בחירת אמוג'י"
                                    aria-expanded={showEmojiPicker}
                                    title="אמוג'י"
                                >
                                    <Smile size={20} aria-hidden="true" />
                                </button>

                                <input
                                    ref={inputRef}
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage(e as any);
                                        }
                                    }}
                                    className="chat-input magic-focus w-full bg-white/[0.05] border border-white/[0.1] rounded-xl pr-11 pl-4 py-3.5 text-white font-assistant text-base focus:outline-none transition-all text-right placeholder:text-white/20"
                                    placeholder="לחשו קסם לאולם... (עד 500 תווים)"
                                    disabled={!myId || isSending}
                                    aria-label="לחוש אל האולם הגדול"
                                    autoComplete="off"
                                    maxLength={500}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!newMessage.trim() || isSending}
                                className="magic-focus bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-amber-950 p-3.5 rounded-xl transition-all shadow-lg active:scale-95 shrink-0 flex items-center justify-center w-12 h-12"
                                aria-label="שגר לחש"
                            >
                                {isSending
                                    ? <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                                    : <Zap size={20} aria-hidden="true" />
                                }
                            </button>
                        </form>
                    </section>
                </div>
            </div>

            {/* Report Modal */}
            {reportingMessage && (
                <div
                    className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
                    dir="rtl"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="report-title"
                >
                    <div className="bg-[#0e1117] text-white w-full max-w-sm rounded-2xl border border-red-900/30 p-7 space-y-5 shadow-2xl animate-in zoom-in duration-200">
                        <h2 id="report-title" className="font-cinzel text-lg font-bold text-red-400 flex items-center gap-2">
                            <AlertTriangle size={20} aria-hidden="true" /> הגשת קובלנה למשרד
                        </h2>
                        <div className="space-y-2" role="radiogroup" aria-label="סיבת הקובלנה">
                            {["הצפת לחשים (Spam)", "שפה פוגענית", "הטרדת קוסמים", "אחר"].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setReportReason(r)}
                                    role="radio"
                                    aria-checked={reportReason === r}
                                    className={`magic-focus w-full text-right px-4 py-3 rounded-xl border text-sm transition-all font-bold ${reportReason === r
                                        ? 'bg-red-900/40 border-red-600/50 text-red-200'
                                        : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] text-white/70'
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleSendReport}
                                disabled={!reportReason || isReporting}
                                className="magic-focus flex-1 py-3 bg-red-700 hover:bg-red-600 rounded-xl font-cinzel font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
                            >
                                {isReporting && <Loader2 size={14} className="animate-spin" />}
                                {isReporting ? "מגיש לאוסטרה..." : "הגש קובלנה"}
                            </button>
                            <button
                                onClick={() => { setReportingMessage(null); setReportReason(""); }}
                                className="magic-focus flex-1 py-3 bg-white/[0.05] hover:bg-white/10 rounded-xl text-sm transition-colors"
                            >
                                חזרה
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}


