"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Bell, X, Trash2 } from "lucide-react";
import Link from "next/link";

/**
 * LUMOS IL - NOTIFICATION DROPDOWN V2.3 (The Stability Fix)
 * תיקון קריטי: החזרת ה-Dependencies למערך ריק למניעת קריסת useEffect.
 * כולל ניקוי ניסוחים ("תגובה מצוטטת") ושפה א-בינארית.
 */

export default function NotificationDropdown() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    const formatContent = (content: string, type: string) => {
        if (type === 'quote') return content.replace('ציטוט שלך בדיון', 'בתגובה מצוטטת לדיון');
        if (type === 'tag') return content.replace('תיוג שלך בדיון', 'בתיוג בתוך הדיון');
        if (type === 'duel_challenge') return 'מאתגר אותך לקרב בזירה ⚔️';
        if (type === 'duel_missed') return content;
        if (type === 'duel_result') return content;
        return content;
    };

    const deleteNotification = async (id: string) => {
        const { error } = await supabase.from('notifications').delete().eq('id', id);
        if (error) { console.error('delete notification error:', error); return; }
        setNotifications(prev => {
            const updated = prev.filter(n => n.id !== id);
            setUnreadCount(updated.filter(n => !n.is_read).length);
            return updated;
        });
    };

    const deleteAll = async () => {
        if (!userId) return;
        const { error } = await supabase.from('notifications').delete().eq('user_id', userId);
        if (error) { console.error('deleteAll error:', error); return; }
        setNotifications([]);
        setUnreadCount(0);
    };

    // ✨ שימוש ב-useCallback כדי לשמור על הפונקציה יציבה
    const fetchNotifications = useCallback(async (uid: string) => {
        const { data } = await supabase
            .from('notifications')
            .select(`*, actor_profile:actor_id (full_name, house)`)
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(10);

        setNotifications(data || []);
        setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    }, [supabase]);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
                fetchNotifications(session.user.id);
            }
        };
        init();
        // ✨ החזרנו ל-[] כדי שה-Next.js לא יקרוס יותר!
    }, []);

    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`user-notifs-${userId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            }, () => fetchNotifications(userId))
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userId, supabase, fetchNotifications]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative flex items-center justify-center" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label={`התראות${unreadCount > 0 ? ` — ${unreadCount} לא נקראו` : ""}`}
                aria-haspopup="true"
                aria-expanded={isOpen}
                className="p-2 text-white/40 hover:text-amber-400 relative group outline-none transition-all active:scale-90 flex items-center justify-center"
            >
                <Bell size={20} className={unreadCount > 0 ? "animate-bounce text-amber-500" : ""} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 min-w-[16px] h-[16px] bg-red-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-[#020617] shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                        {unreadCount > 9 ? "+9" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] md:hidden" onClick={() => setIsOpen(false)}></div>

                    <div
                        className="fixed md:absolute top-[70px] md:top-[calc(100%+10px)] left-1/2 -translate-x-1/2 bg-[#0a0f1a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-[1000] animate-in fade-in slide-in-from-top-2 duration-200"
                        dir="rtl"
                        role="dialog"
                        aria-label="התראות"
                        style={{ width: '90vw', maxWidth: '320px', minWidth: '300px' }}
                    >
                        <div className="p-4 border-b border-white/5 flex items-center justify-between gap-2">
                            <h3 className="font-cinzel text-xs text-white uppercase tracking-widest font-black">התראות אחרונות</h3>
                            <div className="flex items-center gap-1">
                                {notifications.length > 0 && (
                                    <button
                                        onClick={deleteAll}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                        title="מחק את כל ההתראות"
                                    >
                                        <Trash2 size={11} /> מחק הכל
                                    </button>
                                )}
                                <button onClick={() => setIsOpen(false)} className="md:hidden text-white/40 hover:text-white p-1">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[60vh] md:max-h-[350px] overflow-y-auto custom-scrollbar">
                            {notifications.length > 0 ? (
                                notifications.map((n) => (
                                    <div key={n.id} className={`flex items-start gap-2 border-b border-white/[0.03] group ${!n.is_read ? 'bg-amber-500/[0.05]' : ''}`}>
                                        <Link
                                            href={n.target_url}
                                            onClick={() => setIsOpen(false)}
                                            className="flex items-start gap-3 p-4 flex-1 min-w-0 hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex-1 min-w-0 text-right">
                                                <p className="text-sm md:text-xs text-white/80 leading-relaxed">
                                                    {n.actor_profile?.full_name ? (
                                                        <>
                                                            <span className="font-bold text-amber-500">{n.actor_profile.full_name}</span>
                                                            {" "}{formatContent(n.content?.replace(n.actor_profile.full_name, '').trim(), n.type)}
                                                        </>
                                                    ) : (
                                                        <span>{formatContent(n.content, n.type)}</span>
                                                    )}
                                                </p>
                                                <span className="text-[10px] md:text-[9px] text-white/20 mt-1 block uppercase tracking-tighter">
                                                    {new Date(n.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            {!n.is_read && <div className="w-2 h-2 bg-amber-500 rounded-full mt-1 shrink-0 shadow-[0_0_8px_#f59e0b]"></div>}
                                        </Link>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-2 mt-2 ml-1 shrink-0 text-white/20 hover:text-red-400 transition-all rounded-lg hover:bg-red-500/10"
                                            title="מחק התראה"
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center text-white/20 text-[10px] font-cinzel tracking-widest uppercase">אין מכתבים חדשים בנמצא</div>
                            )}
                        </div>

                        <Link
                            href="/dashboard?tab=notifications"
                            onClick={() => setIsOpen(false)}
                            className="p-4 bg-white/5 text-center block text-[10px] font-black uppercase text-white/30 hover:text-white hover:bg-amber-500/10 transition-all rounded-b-2xl border-t border-white/5"
                        >
                            לכל ההתראות בטירה
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}