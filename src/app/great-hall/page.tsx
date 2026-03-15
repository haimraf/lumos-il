"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
    Send,
    Wand2,
    ChevronRight,
    Sparkles,
    Zap,
    Info,
    Shield,
    Users
} from "lucide-react";

/**
 * LUMOS IL - THE GREAT HALL V3.2
 * תיקון: הוספת Cleanup ל-WebSockets למניעת באג רשימת מחוברים ריקה במעבר עמודים.
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
    Gryffindor: { label: 'גריפינדור', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50', icon: '🦁' },
    Slytherin: { label: 'סליתרין', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', icon: '🐍' },
    Ravenclaw: { label: 'רייבנקלו', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50', icon: '🦅' },
    Hufflepuff: { label: 'הפלפאף', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/50', icon: '🦡' },
    'Unknown': { label: 'טרם סווג', color: 'text-slate-200', bg: 'bg-slate-500/20', border: 'border-slate-500/30', icon: '✨' }
};

const RANK_CONFIG: Record<string, { label: string; class: string }> = {
    'מנהל': { label: 'מנהל', class: 'bg-amber-500 text-amber-950 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]' },
    'פרופסור': { label: 'פרופסור', class: 'bg-purple-600 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]' },
    'מדריך': { label: 'מדריך', class: 'bg-blue-600 text-white border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.2)]' },
    'תלמיד/ה': { label: 'תלמיד/ה', class: 'bg-white/20 text-white border-white/30' }
};

const UNIQUE_RANKS = ['מנהל', 'פרופסור', 'מדריך', 'תלמיד/ה'];

export default function GreatHall() {
    const supabase = createClient();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [myId, setMyId] = useState<string | null>(null);
    const [myName, setMyName] = useState<string>("קוסם/ת");
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    useEffect(() => {
        let isMounted = true;
        // חשוב: הגדרת הערוץ מחוץ ל-setup כדי שנוכל לסגור אותו בסוף
        const channel = supabase.channel('great_hall_v2');

        const setup = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session || !isMounted) return;

            setMyId(session.user.id);
            const extractedName = session.user.email ? session.user.email.split('@')[0] : "קוסם/ת";
            setMyName(extractedName);

            const { data } = await supabase
                .from('messages')
                .select('*, profiles(house, role, wand_type, full_name, email)')
                .order('created_at', { ascending: true })
                .limit(50);

            if (data && isMounted) setMessages(data as any);
            if (isMounted) setIsLoading(false);
            setTimeout(scrollToBottom, 300);

            channel
                .on('presence', { event: 'sync' }, () => {
                    if (!isMounted) return;
                    const state = channel.presenceState();
                    const rawUsers = Object.values(state).flat();

                    const uniqueUsersMap = new Map();
                    rawUsers.forEach((u: any) => {
                        if (u.user_id) uniqueUsersMap.set(u.user_id, u);
                    });

                    setOnlineUsers(Array.from(uniqueUsersMap.values()));
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
                    const { data: m } = await supabase
                        .from('messages')
                        .select('*, profiles(house, role, wand_type, full_name, email)')
                        .eq('id', payload.new.id)
                        .single();
                    if (m && isMounted) {
                        setMessages(prev => [...prev, m as any]);
                        setTimeout(scrollToBottom, 50);
                    }
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED' && isMounted) {
                        const { data: p } = await supabase.from('profiles').select('role, house').eq('id', session.user.id).single();
                        await channel.track({
                            user_id: session.user.id,
                            name: extractedName,
                            role: p?.role || 'תלמיד/ה',
                            house: p?.house || 'Unknown'
                        });
                    }
                });
        };

        setup();

        // הלחש המסיר: סוגר את ערוץ התקשורת כשעוזבים את העמוד
        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !myId) return;
        const content = newMessage;
        setNewMessage("");
        await supabase.from('messages').insert({ content, user_id: myId });
    };

    if (isLoading) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-t-2 border-amber-500 rounded-full animate-spin"></div>
            <p className="font-cinzel text-amber-500 tracking-widest animate-pulse">לומוס מקסימה...</p>
        </div>
    );

    return (
        <div className="relative w-full max-w-7xl mx-auto px-4 py-4 flex flex-col h-[calc(100vh-120px)]" dir="rtl">

            <nav className="flex justify-between items-center mb-6 px-2">
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
                    <span className="text-emerald-300 text-[11px] font-black uppercase font-cinzel tracking-wider">{onlineUsers.length} נוכחים</span>
                </div>
            </nav>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">

                <aside className="hidden lg:flex flex-col gap-6 w-80 shrink-0 overflow-y-auto custom-scrollbar">

                    <section className="bg-white/[0.04] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                        <h3 className="font-cinzel text-[11px] tracking-[0.4em] text-white/80 uppercase mb-8 border-b border-white/10 pb-4 flex items-center gap-2 font-bold">
                            <Users size={14} className="text-amber-500" /> נוכחים בהיכל
                        </h3>
                        <div className="space-y-6">
                            {onlineUsers.map((u, i) => {
                                const h = HOUSE_CONFIG[u.house] || HOUSE_CONFIG['Unknown'];
                                const r = RANK_CONFIG[u.role] || RANK_CONFIG['תלמיד/ה'];
                                return (
                                    <div key={i} className="flex items-start gap-4">
                                        <span className="text-2xl pt-1">{h.icon}</span>
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-base font-bold tracking-wide text-white leading-tight">{u.name}</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className={`text-[8px] px-2 py-0.5 rounded-full border leading-none font-black uppercase tracking-widest ${r.class}`}>{r.label}</span>
                                                <span className={`text-[8px] px-2 py-0.5 rounded-full border leading-none font-black uppercase tracking-widest ${h.bg} ${h.border} ${h.color}`}>{h.label}</span>
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
                                {UNIQUE_RANKS.map(key => (
                                    <span key={key} className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest shadow-md ${RANK_CONFIG[key].class}`}>
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
                                {Object.entries(HOUSE_CONFIG).filter(([k]) => k !== 'Unknown').map(([k, h]) => (
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

                <section className="flex-1 flex flex-col bg-black/60 border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-12 custom-scrollbar" role="log" aria-live="polite">
                        {messages.map((msg) => {
                            const isMe = myId === msg.user_id;
                            const h = HOUSE_CONFIG[msg.profiles?.house || 'Unknown'] || HOUSE_CONFIG['Unknown'];
                            const r = RANK_CONFIG[msg.profiles?.role || 'תלמיד/ה'] || RANK_CONFIG['תלמיד/ה'];

                            let displayName = "קוסם/ת";
                            if (isMe) {
                                displayName = myName;
                            } else if (msg.profiles?.full_name && msg.profiles.full_name !== 'Wizard') {
                                displayName = msg.profiles.full_name;
                            } else if (msg.profiles?.email) {
                                displayName = msg.profiles.email.split('@')[0];
                            }

                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}>

                                    <div className={`flex items-center gap-3 mb-3 px-2 ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
                                        <span className="text-3xl drop-shadow-md">{h.icon}</span>
                                        <div className={`flex flex-col sm:flex-row items-baseline gap-2 ${isMe ? 'text-right' : 'text-left'}`}>
                                            <span className="text-base font-cinzel font-black text-white tracking-widest min-h-[24px]">
                                                {displayName}
                                            </span>
                                            <div className="flex gap-2">
                                                <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest shadow-sm ${r.class}`}>
                                                    {r.label}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest shadow-sm ${h.bg} ${h.border} ${h.color}`}>
                                                    {h.label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`relative max-w-[95%] md:max-w-[75%] p-6 rounded-[2.5rem] border transition-all shadow-xl ${isMe
                                            ? 'rounded-tl-none border-white/20 bg-white/[0.08]'
                                            : `rounded-tr-none ${h.border} ${h.bg}`
                                        }`}>
                                        <p className="text-white text-lg md:text-xl font-crimson leading-relaxed text-right break-words select-text">
                                            {msg.content}
                                        </p>
                                        <div className="mt-5 flex flex-col md:flex-row justify-between md:items-center gap-3 text-white/40 text-[10px] border-t border-white/10 pt-4">
                                            <span className="italic font-mono uppercase tracking-widest flex items-center gap-2 font-bold">
                                                <Wand2 size={12} className="text-amber-500/40" />
                                                {msg.profiles?.wand_type || 'שרביט טרם נבחר'}
                                            </span>
                                            <time className="shrink-0 font-bold bg-black/40 px-3 py-1 rounded-full border border-white/5">
                                                {new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                            </time>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={sendMessage} className="p-6 bg-black/80 border-t border-white/10 flex gap-4 items-center">
                        <div className="flex-1 relative">
                            <input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="w-full bg-white/[0.08] border border-white/20 rounded-2xl px-6 py-5 text-white font-crimson text-xl focus:outline-none focus:border-amber-500/50 transition-all text-right shadow-inner placeholder:text-white/20"
                                placeholder="לחש הודעה לאולם..."
                            />
                            <Wand2 className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        </div>
                        <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-amber-950 p-5 rounded-2xl transition-all shadow-xl active:scale-95 shrink-0">
                            <Zap size={24} />
                        </button>
                    </form>
                </section>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.4); border-radius: 10px; }
            `}</style>
        </div>
    );
}