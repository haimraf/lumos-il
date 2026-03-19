"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import EmojiPicker, { Theme } from "emoji-picker-react";
import {
    Wand2,
    ChevronRight,
    Sparkles,
    Zap,
    Info,
    Shield,
    Users,
    Flag,
    AlertTriangle,
    EyeOff,
    Eye,
    Loader2,
    Smile
} from "lucide-react";

/**
 * LUMOS IL - THE GREAT HALL V4.4 (Gold Edition + Emojis)
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
    };
};

const HOUSE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
    Gryffindor: { label: "גריפינדור", color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/50", icon: "🦁" },
    Slytherin: { label: "סליתרין", color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/50", icon: "🐍" },
    Ravenclaw: { label: "רייבנקלו", color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/50", icon: "🦅" },
    Hufflepuff: { label: "הפלפאף", color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/50", icon: "🦡" },
    Unknown: { label: "טרם סווג", color: "text-slate-200", bg: "bg-slate-500/20", border: "border-slate-500/30", icon: "✨" }
};

const RANK_CONFIG: Record<string, { label: string; class: string }> = {
    "מנהל": { label: "מנהל", class: "bg-amber-500 text-amber-950 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]" },
    "פרופסור": { label: "פרופסור", class: "bg-purple-600 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]" },
    "מדריך": { label: "מדריך", class: "bg-blue-600 text-white border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.2)]" },
    "תלמיד/ה": { label: "תלמיד/ה", class: "bg-white/20 text-white border-white/30" }
};

const UNIQUE_RANKS = ["מנהל", "פרופסור", "מדריך", "תלמיד/ה"];

export default function GreatHall() {
    const supabase = createClient();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [myId, setMyId] = useState<string | null>(null);
    const [myName, setMyName] = useState<string>("קוסם/ת");
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
    const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
    const [reportReason, setReportReason] = useState("");
    const [isReporting, setIsReporting] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
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
                .from("profiles")
                .select("full_name, role, house")
                .eq("id", userId)
                .single();

            if (!profileCheck?.full_name || profileCheck.full_name === "Wizard") {
                await supabase.from("profiles").update({ full_name: extractedName }).eq("id", userId);
            }

            const { data: blocks } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", userId);
            if (blocks && isMounted) {
                setBlockedUserIds(blocks.map((b) => b.blocked_id));
            }

            const { data } = await supabase
                .from("messages")
                .select("*, profiles(house, role, wand_type, full_name, email)")
                .order("created_at", { ascending: true })
                .limit(50);

            if (data && isMounted) setMessages(data as any);
            if (isMounted) setIsLoading(false);

            channel
                .on("presence", { event: "sync" }, () => {
                    if (!isMounted) return;
                    const state = channel.presenceState();
                    const rawUsers = Object.values(state).flat();
                    const uniqueUsersMap = new Map();

                    rawUsers.forEach((u: any) => {
                        if (u.user_id) uniqueUsersMap.set(u.user_id, u);
                    });

                    setOnlineUsers(Array.from(uniqueUsersMap.values()));
                })
                .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
                    const { data: m } = await supabase
                        .from("messages")
                        .select("*, profiles(house, role, wand_type, full_name, email)")
                        .eq("id", payload.new.id)
                        .single();

                    if (m && isMounted) {
                        setMessages((prev) => [...prev, m as any]);
                    }
                })
                .subscribe(async (status) => {
                    if (status === "SUBSCRIBED" && isMounted) {
                        await channel.track({
                            user_id: userId,
                            name: profileCheck?.full_name || extractedName,
                            role: profileCheck?.role || "תלמיד/ה",
                            house: profileCheck?.house || "Unknown"
                        });
                    }
                });
        };

        setup();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    const onEmojiClick = (emojiObject: any) => {
        setNewMessage((prevInput) => prevInput + emojiObject.emoji);
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
        } catch (error) {
            console.error("שגיאה בשליחת הודעה:", error);
            setNewMessage(content);
        } finally {
            setIsSending(false);
        }
    };

    const handleToggleMute = async (targetUserId: string, userName: string, isCurrentlyMuted: boolean) => {
        if (!myId) return;

        if (isCurrentlyMuted) {
            const { error } = await supabase
                .from("blocks")
                .delete()
                .eq("blocker_id", myId)
                .eq("blocked_id", targetUserId);

            if (!error) setBlockedUserIds((prev) => prev.filter((id) => id !== targetUserId));
        } else {
            if (confirm(`האם אתה בטוח שברצונך להסתיר את ההודעות של ${userName}?`)) {
                const { error } = await supabase
                    .from("blocks")
                    .insert({ blocker_id: myId, blocked_id: targetUserId });

                if (!error || error.code === "23505") {
                    setBlockedUserIds((prev) => [...prev, targetUserId]);
                }
            }
        }
    };

    const handleSendReport = async () => {
        if (!reportReason || !reportingMessage || !myId) return;
        setIsReporting(true);

        const { error } = await supabase.from("reports").insert([{
            reporter_id: myId,
            target_id: reportingMessage.id,
            target_type: "chat",
            reason: reportReason,
            content_preview: reportingMessage.content,
            status: "pending"
        }]);

        if (!error) {
            alert("הדיווח התקבל במשרד הקסמים.");
            setReportingMessage(null);
            setReportReason("");
        }

        setIsReporting(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-t-2 border-amber-500 rounded-full animate-spin"></div>
                <p className="font-cinzel text-amber-500 tracking-widest animate-pulse">לומוס מקסימה...</p>
            </div>
        );
    }

    return (
        <>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.4); border-radius: 10px; }
                .emoji-picker-react {
                    --epr-bg-color: #1a1a1a !important;
                    --epr-category-label-bg-color: #1a1a1a !important;
                    --epr-text-color: #f8fafc !important;
                    border-color: rgba(255,255,255,0.1) !important;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.8) !important;
                }
            `}</style>

            <div className="relative w-full max-w-full md:max-w-7xl mx-auto px-2 md:px-4 py-2 md:py-4 flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden" dir="rtl">
                <nav className="flex justify-between items-center mb-6 px-2 shrink-0">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white">
                            <ChevronRight size={24} />
                        </Link>
                        <h1 className="font-cinzel text-xl md:text-3xl font-black tracking-widest flex items-center gap-3 text-white">
                            האולם הגדול <Sparkles className="text-amber-500" size={18} />
                        </h1>
                    </div>

                    <div className="bg-emerald-500/20 border border-emerald-500/40 px-4 py-1.5 rounded-full flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34d399]"></span>
                        <span className="text-emerald-300 text-[11px] font-black uppercase font-cinzel tracking-wider">
                            {onlineUsers.length} נוכחים
                        </span>
                    </div>
                </nav>

                <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden min-h-0">
                    <aside className="hidden lg:flex flex-col gap-6 w-80 shrink-0 overflow-y-auto custom-scrollbar">
                        <section className="bg-white/[0.04] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                            <h3 className="font-cinzel text-[11px] tracking-[0.4em] text-white/80 uppercase mb-8 border-b border-white/10 pb-4 flex items-center gap-2 font-bold">
                                <Users size={14} className="text-amber-500" /> נוכחים בהיכל
                            </h3>
                            <div className="space-y-6">
                                {onlineUsers.map((u, i) => {
                                    const h = HOUSE_CONFIG[u.house] || HOUSE_CONFIG["Unknown"];
                                    const r = RANK_CONFIG[u.role] || RANK_CONFIG["תלמיד/ה"];

                                    return (
                                        <div key={i} className="flex items-start gap-4">
                                            <span className="text-2xl pt-1">{h.icon}</span>
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-base font-bold tracking-wide text-white leading-tight">{u.name}</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    <span className={`text-[8px] px-2 py-0.5 rounded-full border leading-none font-black uppercase tracking-widest ${r.class}`}>
                                                        {r.label}
                                                    </span>
                                                    <span className={`text-[8px] px-2 py-0.5 rounded-full border leading-none font-black uppercase tracking-widest ${h.bg} ${h.border} ${h.color}`}>
                                                        {h.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 shadow-xl space-y-8">
                            <div>
                                <h3 className="font-cinzel text-[11px] tracking-[0.4em] text-amber-500/90 uppercase mb-4 border-b border-amber-500/20 pb-2 flex items-center gap-2 font-bold">
                                    <Info size={14} /> דרגות
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {UNIQUE_RANKS.map((key) => (
                                        <span
                                            key={key}
                                            className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest shadow-md ${RANK_CONFIG[key].class}`}
                                        >
                                            {RANK_CONFIG[key].label}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-cinzel text-[11px] tracking-[0.4em] text-amber-500/90 uppercase mb-4 border-b border-amber-500/20 pb-2 flex items-center gap-2 font-bold">
                                    <Shield size={14} /> בתים
                                </h3>
                                <div className="space-y-3">
                                    {Object.entries(HOUSE_CONFIG)
                                        .filter(([k]) => k !== "Unknown")
                                        .map(([k, h]) => (
                                            <div key={k} className="flex items-center gap-3">
                                                <span className="text-xl">{h.icon}</span>
                                                <span className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest shadow-md ${h.bg} ${h.border} ${h.color}`}>
                                                    {h.label}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </section>
                    </aside>

                    <section className="flex-1 min-h-0 flex flex-col bg-black/60 border border-white/10 rounded-[1.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden relative">
                        <div className="flex-1 overflow-y-auto p-3 md:p-10 space-y-3 md:space-y-4 custom-scrollbar" role="log" aria-live="polite">
                            {messages.length === 0 && (
                                <div className="h-full flex items-center justify-center opacity-30 font-cinzel text-2xl text-white">
                                    האולם שקט... היה הראשון להטיל לחש!
                                </div>
                            )}

                            {messages.map((msg) => {
                                const isMe = myId === msg.user_id;
                                const h = HOUSE_CONFIG[msg.profiles?.house || "Unknown"] || HOUSE_CONFIG["Unknown"];
                                const r = RANK_CONFIG[msg.profiles?.role || "תלמיד/ה"] || RANK_CONFIG["תלמיד/ה"];

                                let displayName = "קוסם/ת";
                                if (msg.profiles?.full_name && msg.profiles.full_name !== "Wizard") {
                                    displayName = msg.profiles.full_name;
                                } else if (msg.profiles?.email) {
                                    displayName = msg.profiles.email.split("@")[0];
                                } else if (isMe) {
                                    displayName = myName;
                                }

                                const isMuted = blockedUserIds.includes(msg.user_id);

                                if (isMuted) {
                                    return (
                                        <div key={msg.id} className="flex w-full justify-start animate-in fade-in">
                                            <div className="flex items-center justify-between p-3 rounded-[2rem] border border-white/5 bg-white/[0.02] text-white/40 w-full max-w-[85%] md:max-w-[60%]">
                                                <span className="font-crimson italic text-sm">ההודעה של {displayName} הוסתרה.</span>
                                                <button
                                                    onClick={() => handleToggleMute(msg.user_id, displayName, true)}
                                                    className="flex items-center gap-1 font-cinzel text-[10px] bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors text-white/80"
                                                >
                                                    <Eye size={12} />ביטול השתקה
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={msg.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                                      <div className={`flex items-start w-full max-w-[85%] md:max-w-[70%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                            <span className="text-3xl drop-shadow-md shrink-0 mt-1">{h.icon}</span>

                                            <div className={`flex flex-col gap-2 flex-1 min-w-0 ${isMe ? "items-end" : "items-start"}`}>
                                                <div className={`flex flex-wrap items-center gap-1.5 md:gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                                                    <div className={`flex items-center gap-2 flex-wrap ${isMe ? "flex-row-reverse" : ""}`}>
                                                        <span className="text-base font-cinzel font-black text-white tracking-widest min-h-[24px]">
                                                            {displayName}
                                                        </span>

                                                        <div className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                                            <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest shadow-sm ${r.class}`}>
                                                                {r.label}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest shadow-sm ${h.bg} ${h.border} ${h.color}`}>
                                                                {h.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>


<div
  className={`relative w-fit max-w-[75%] p-3 md:p-6 ${
    isMe ? "mr-1" : "ml-1"
  } rounded-[1.25rem] md:rounded-[2.5rem] border shadow-xl group overflow-hidden ${
    isMe
      ? "rounded-tl-none border-white/20 bg-white/[0.08] text-right after:content-[''] after:absolute after:right-[-6px] after:top-4 after:border-8 after:border-transparent after:border-l-white/30 shadow-[0_0_20px_rgba(255,255,255,0.06)]"
      : `${h.border} ${h.bg} rounded-tr-none text-left after:content-[''] after:absolute after:left-[-8px] after:top-5 after:border-8 after:border-transparent after:border-r-white/20`
  }`}
>
                                                    <p className="text-white text-sm sm:text-base md:text-lg font-crimson leading-relaxed break-words select-text whitespace-pre-wrap">
                                                        {msg.content}
                                                    </p>

                                                    <div className="mt-5 flex items-center justify-between gap-4 text-white/40 text-[10px] border-t border-white/10 pt-4">
                                                        <span className="italic font-mono uppercase tracking-widest flex items-center gap-2 font-bold">
                                                            <Wand2 size={12} className="text-amber-500/40" />
                                                            {msg.profiles?.wand_type || "שרביט טרם נבחר"}
                                                        </span>

                                                        <div className="flex items-center gap-3">
                                                            {!isMe && (
                                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => handleToggleMute(msg.user_id, displayName, false)}
                                                                        className="hover:text-white p-1"
                                                                        title="השתק קוסם"
                                                                    >
                                                                        <EyeOff size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setReportingMessage(msg)}
                                                                        className="hover:text-red-400 p-1"
                                                                        title="דיווח למשרד הקסמים"
                                                                    >
                                                                        <Flag size={14} />
                                                                    </button>
                                                                </div>
                                                            )}

                                                            <time className="shrink-0 font-bold bg-black/40 px-3 py-1 rounded-full border border-white/5">
                                                                {new Date(msg.created_at).toLocaleTimeString("he-IL", {
                                                                    hour: "2-digit",
                                                                    minute: "2-digit"
                                                                })}
                                                            </time>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            <div ref={messagesEndRef} />
                        </div>

                        {showEmojiPicker && (
                            <div ref={emojiPickerRef} className="absolute bottom-20 right-2 md:bottom-28 md:right-6 z-50 animate-in slide-in-from-bottom-5">
                                <EmojiPicker
                                    theme={Theme.DARK}
                                    onEmojiClick={onEmojiClick}
                                    searchDisabled={true}
                                    skinTonesDisabled={true}
                                />
                            </div>
                        )}

                       <form onSubmit={sendMessage} className="p-3 md:p-6 bg-black/80 border-t border-white/10 flex gap-2 md:gap-4 items-center z-10 shrink-0">
                            <div className="flex-1 relative flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                                    className="absolute right-4 text-white/40 hover:text-amber-400 transition-colors z-10"
                                    title="הוסף סמיילי"
                                >
                                    <Smile size={24} />
                                </button>

                                <input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
className="w-full bg-white/[0.08] border border-white/20 rounded-2xl pr-12 pl-10 py-3 md:py-5 text-white font-crimson text-base md:text-xl focus:outline-none focus:border-amber-500/50 transition-all text-right shadow-inner placeholder:text-white/20"
                                    placeholder="ללחוש הודעה לאולם..."
                                    disabled={!myId || isSending}
                                />

                                <Wand2 className="absolute left-6 text-white/20" size={18} />
                            </div>

                            <button
                                type="submit"
                                disabled={!newMessage.trim() || isSending}
className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:hover:bg-amber-600 text-amber-950 p-3 md:p-5 rounded-2xl transition-all shadow-xl active:scale-95 shrink-0 flex items-center justify-center w-12 h-12 md:w-16 md:h-16"
                            >
                                {isSending ? <Loader2 size={24} className="animate-spin" /> : <Zap size={24} />}
                            </button>
                        </form>
                    </section>
                </div>
            </div>

            {reportingMessage && (
                <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" dir="rtl">
                    <div className="bg-[#111] text-white w-full max-w-md rounded-[2rem] border-2 border-red-900/50 p-8 space-y-6 shadow-2xl animate-in zoom-in duration-300">
                        <h4 className="font-cinzel text-xl font-bold text-red-500 flex items-center gap-2">
                            <AlertTriangle size={24} /> דיווח על הודעה באולם
                        </h4>

                        <div className="grid grid-cols-1 gap-3">
                            {["הצפה (Spam)", "שפה פוגענית", "הטרדה", "אחר"].map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setReportReason(r)}
                                    className={`w-full text-right p-4 rounded-xl border transition-all font-bold ${
                                        reportReason === r
                                            ? "bg-red-900/50 border-red-500 text-white"
                                            : "bg-white/5 border-white/10 hover:bg-white/10 text-white/80"
                                    }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={handleSendReport}
                                disabled={!reportReason || isReporting}
                                className="flex-1 py-4 bg-red-700 text-white rounded-xl font-cinzel font-bold hover:bg-red-600 disabled:opacity-30 flex items-center justify-center gap-2"
                            >
                                {isReporting && <Loader2 size={16} className="animate-spin" />}
                                {isReporting ? "שולח..." : "דיווח למשרד הקסמים"}
                            </button>

                            <button
                                onClick={() => setReportingMessage(null)}
                                className="flex-1 py-4 bg-white/10 text-white hover:bg-white/20 rounded-xl font-cinzel font-bold"
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
