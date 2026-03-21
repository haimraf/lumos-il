"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import EmojiPicker, { Theme } from "emoji-picker-react";
import {
    Wand2, ChevronRight, Sparkles, Zap, Info, Shield,
    Users, Flag, AlertTriangle, EyeOff, Eye, Loader2, Smile, Ghost
} from "lucide-react";
import { getRoleColor, getRoleDisplay, getRoleColorFromDB } from "@/lib/roleColor";

/**
 * LUMOS IL - THE GREAT HALL V5
 * ✅ כל הלוגיקה ללא שינוי
 * ✅ עיצוב משופר — bubbles, gradients, avatars
 * ✅ נגישות — aria-label, role, keyboard nav, focus styles
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


export default function GreatHall() {
    const supabase = createClient();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [myId, setMyId] = useState<string | null>(null);
    const [myName, setMyName] = useState<string>("קוסם/ת");
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
            .then(({ data }) => { if (data) setUserGroups(data); });
    }, [supabase]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
            const { data: { session } } = await supabase.auth.getSession();
            if (!session || !isMounted) return;

            const userId = session.user.id;
            setMyId(userId);

            const extractedName = session.user.email ? session.user.email.split("@")[0] : "קוסם/ת";
            setMyName(extractedName);

            const { data: profileCheck } = await supabase
                .from("profiles").select("full_name, role, house, group_id, user_groups(name, color)").eq("id", userId).single();

            if (!profileCheck?.full_name || profileCheck.full_name === "Wizard") {
                await supabase.from("profiles").update({ full_name: extractedName }).eq("id", userId);
            }

            const { data: blocks } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", userId);
            if (blocks && isMounted) setBlockedUserIds(blocks.map(b => b.blocked_id));

            const { data } = await supabase
                .from("messages")
                .select("*, profiles(house, role, wand_type, full_name, email, signature, avatar_url, user_groups(name, color))")
                .order("created_at", { ascending: true })
                .limit(50);

            if (data && isMounted) setMessages(data as any);
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
                        .select("*, profiles(house, role, wand_type, full_name, email, signature, avatar_url, user_groups(name, color))")
                        .eq("id", payload.new.id).single();
                    if (m && isMounted) setMessages(prev => [...prev, m as any]);
                })
                .subscribe(async (status) => {
                    if (status === "SUBSCRIBED" && isMounted) {
                        const rawGrp = profileCheck?.user_groups as any;
                        const pcGrp = (Array.isArray(rawGrp) ? rawGrp[0] : rawGrp) as { name: string; color: string } | null;
                        await channel.track({
                            user_id: userId,
                            name: profileCheck?.full_name || extractedName,
                            role: profileCheck?.role || "תלמיד/ה",
                            house: profileCheck?.house || "Unknown",
                            group_id: (profileCheck as any)?.group_id || null,
                            group_name: pcGrp?.name || null,
                            group_color: pcGrp?.color || null,
                        });
                    }
                });
        };

        setup();
        return () => { isMounted = false; supabase.removeChannel(channel); };
    }, [supabase]);

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
            await supabase.from("messages").insert({ content, user_id: myId });
        } catch {
            setNewMessage(content);
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
        if (!error) { alert("הדיווח התקבל."); setReportingMessage(null); setReportReason(""); }
        setIsReporting(false);
    };

    /* ── Loading ── */
    if (isLoading) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4" aria-live="polite" aria-label="טוען את האולם הגדול">
            <div className="w-12 h-12 border-t-2 border-amber-500 rounded-full animate-spin" role="status" />
            <p className="font-cinzel text-amber-500 tracking-widest animate-pulse">לומוס מקסימה...</p>
        </div>
    );

    /* ─────────────────────────── RENDER ─────────────────────────── */
    return (
        <>
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
                className="relative w-full max-w-full md:max-w-7xl mx-auto px-2 md:px-4 py-2 md:py-4 flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden"
                dir="rtl"
                role="main"
                aria-label="האולם הגדול — צ'אט קהילתי"
            >
                {/* ── Nav ── */}
                <nav className="flex justify-between items-center mb-4 px-1 shrink-0" aria-label="ניווט ראשי">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard"
                            className="magic-focus p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                            aria-label="חזרה ללוח הבקרה"
                        >
                            <ChevronRight size={22} />
                        </Link>
                        <h1 className="font-cinzel text-lg md:text-2xl font-black tracking-widest flex items-center gap-2 text-white">
                            האולם הגדול
                            <Sparkles className="text-amber-500" size={16} aria-hidden="true" />
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* גלימת היעלמות */}
                        <button
                            onClick={() => setHideSignatures(s => !s)}
                            className={`magic-focus flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all font-cinzel text-[10px] font-black uppercase tracking-widest ${hideSignatures
                                    ? 'bg-amber-500 text-amber-950 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                                    : 'bg-white/[0.04] text-white/35 border-white/[0.08] hover:bg-white/[0.08]'
                                }`}
                            aria-pressed={hideSignatures}
                            aria-label={hideSignatures ? "הסר גלימת היעלמות מהחתימות" : "הטל גלימת היעלמות על החתימות"}
                            title={hideSignatures ? "הצג חתימות" : "הסתר חתימות"}
                        >
                            <Ghost size={13} className={hideSignatures ? "animate-pulse" : ""} aria-hidden="true" />
                            <span className="hidden sm:inline">{hideSignatures ? "מוסתרות" : "גלימת היעלמות"}</span>
                        </button>

                        {/* Online count */}
                        <div
                            className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-full"
                            aria-live="polite"
                            aria-label={`${onlineUsers.length} משתמשים מחוברים`}
                        >
                            <span className="online-dot w-2 h-2 bg-emerald-400 rounded-full" aria-hidden="true" />
                            <span className="text-emerald-300 text-[10px] font-black uppercase font-cinzel tracking-wider">
                                {onlineUsers.length} נוכחים
                            </span>
                        </div>
                    </div>
                </nav>

                {/* ── Body ── */}
                <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden min-h-0">

                    {/* Sidebar */}
                    <aside
                        className="hidden lg:flex flex-col gap-4 w-72 shrink-0 overflow-y-auto chat-scroll"
                        aria-label="פאנל צדדי — נוכחים ודרגות"
                    >
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
                        {/* Messages */}
                        <div
                            className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 chat-scroll"
                            role="log"
                            aria-live="polite"
                            aria-label="הודעות האולם הגדול"
                            tabIndex={0}
                        >
                            {messages.length === 0 && (
                                <div className="h-full flex items-center justify-center opacity-20 font-cinzel text-xl text-white text-center px-4">
                                    האולם שקט... היה הראשון להטיל לחש! ✨
                                </div>
                            )}

                            {messages.map((msg) => {
                                const isMe = myId === msg.user_id;
                                const isMuted = blockedUserIds.includes(msg.user_id);
                                const h = HOUSE_CONFIG[msg.profiles?.house || "Unknown"] || HOUSE_CONFIG["Unknown"];
                                const msgGrp = msg.profiles?.user_groups as { name: string; color: string } | null;
                                const dg = msgGrp
                                    ? { name: msgGrp.name, color: msgGrp.color }
                                    : getRoleDisplay(msg.profiles?.role, roleColors);

                                let displayName = "קוסם/ת";
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
                                            <span className="font-crimson italic text-sm">ההודעה של {displayName} מוסתרת</span>
                                            <button
                                                onClick={() => handleToggleMute(msg.user_id, displayName, true)}
                                                className="magic-focus flex items-center gap-1 font-cinzel text-[10px] bg-white/[0.07] px-2.5 py-1 rounded-full hover:bg-white/15 transition-colors text-white/60 shrink-0"
                                                aria-label={`בטל השתקה של ${displayName}`}
                                            >
                                                <Eye size={11} aria-hidden="true" /> ביטול
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
                                                    ? <img src={msg.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    : h.icon
                                                }
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                {/* Name + badges */}
                                                <div className={`flex flex-wrap items-center gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <Link
                                                        href={`/wizard/${msg.user_id}`}
                                                        className="font-cinzel text-sm font-black tracking-wide hover:underline"
                                                        style={{ color: getRoleColor(msg.profiles?.role, msg.profiles?.house, roleColors) }}
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
                                                    <p className="text-white text-base md:text-lg font-assistant leading-relaxed break-words select-text">
                                                        {msg.content}
                                                    </p>

                                                    {/* Signature area */}
                                                    {!hideSignatures && (
                                                        <div className="mt-3 pt-3 border-t border-white/[0.07] flex items-end justify-between gap-3">
                                                            <div className="flex-1 text-white/30 text-xs">
                                                                {msg.profiles?.signature ? (
                                                                    <span className="italic font-crimson" dangerouslySetInnerHTML={{ __html: msg.profiles.signature }} />
                                                                ) : (
                                                                    <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest">
                                                                        <Wand2 size={9} className="text-amber-500/30" aria-hidden="true" />
                                                                        {msg.profiles?.wand_type || "שרביט טרם נבחר"}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {/* Action buttons — מופיעים ב-hover */}
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
                            <div ref={messagesEndRef} aria-hidden="true" />
                        </div>

                        {/* Emoji picker */}
                        {showEmojiPicker && (
                            <div ref={emojiPickerRef} className="absolute bottom-20 right-2 md:bottom-24 md:right-4 z-50 animate-in slide-in-from-bottom-4 duration-200">
                                <EmojiPicker theme={Theme.DARK} onEmojiClick={onEmojiClick} searchDisabled skinTonesDisabled />
                            </div>
                        )}

                        {/* Input */}
                        <form
                            onSubmit={sendMessage}
                            className="p-3 md:p-4 border-t border-white/[0.06] flex gap-2 items-center z-10"
                            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}
                            aria-label="שליחת הודעה"
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
                                    placeholder="ללחוש הודעה לאולם..."
                                    disabled={!myId || isSending}
                                    aria-label="הקלד הודעה"
                                    autoComplete="off"
                                    maxLength={500}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!newMessage.trim() || isSending}
                                className="magic-focus bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-amber-950 p-3.5 rounded-xl transition-all shadow-lg active:scale-95 shrink-0 flex items-center justify-center w-12 h-12"
                                aria-label="שלח הודעה"
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
                            <AlertTriangle size={20} aria-hidden="true" /> דיווח על הודעה
                        </h2>
                        <div className="space-y-2" role="radiogroup" aria-label="סיבת הדיווח">
                            {["הצפה (Spam)", "שפה פוגענית", "הטרדה", "אחר"].map(r => (
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
                                {isReporting ? "שולח..." : "שלח דיווח"}
                            </button>
                            <button
                                onClick={() => { setReportingMessage(null); setReportReason(""); }}
                                className="magic-focus flex-1 py-3 bg-white/[0.05] hover:bg-white/10 rounded-xl text-sm transition-colors"
                            >
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}