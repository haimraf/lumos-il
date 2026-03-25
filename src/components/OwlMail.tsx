"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, AlertTriangle, Megaphone, Ghost, Trophy, Coins, Snowflake } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";

type ToastType = "success" | "magic" | "error" | "info" | "system";

interface Toast {
    id: string;
    title: string;
    message: string;
    type: ToastType;
    isGlobal?: boolean;
}

interface ToastContextType {
    sendOwl: (title: string, message: string, type?: ToastType, isGlobal?: boolean) => void;
}

type SystemMessage = {
    id: string;
    title?: string;
    message: string;
    isGlobal?: boolean;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useOwlMail = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useOwlMail must be used within an OwlMailProvider");
    return context;
};

export const OwlMailProvider = ({ children }: { children: React.ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const lastSent = useRef<{ title: string; message: string; time: number } | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const supabase = createClient();
    const { session } = useAuth();
    const pathname = usePathname();

    // ✅ ניקוי נכון של audio
    useEffect(() => {
        audioRef.current = new Audio("/sounds/magic-ding.mp3");
        audioRef.current.preload = "auto";
        return () => { audioRef.current = null; };
    }, []);

    const playMagicSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => { });
        }
    }, []);

    const sendOwl = useCallback((title: string, message: string, type: ToastType = "info", isGlobal: boolean = false) => {
        const now = Date.now();

        // ✅ הגדלת חלון מניעת כפילויות ל-5 שניות
        if (lastSent.current &&
            lastSent.current.title === title &&
            lastSent.current.message === message &&
            now - lastSent.current.time < 3000) {
            return;
        }

        lastSent.current = { title, message, time: now };
        const id = Math.random().toString(36).substring(2, 9);

        // ✅ מגבלת 4 הודעות במסך
        setToasts((prev) => [...prev.slice(-4), { id, title, message, type, isGlobal }]);
        playMagicSound();

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, isGlobal ? 8000 : 5000);
    }, [playMagicSound]);

    // ✅ טעינת הודעות מערכת מקובץ חיצוני
    useEffect(() => {
        const checkSystemMessages = async () => {
            try {
                const res = await fetch('/system_messages.json');
                if (!res.ok) return;
                const messages = await res.json() as SystemMessage[];
                
                // נבדוק מה כבר הוצג בעבר (בסשן הנוכחי)
                const shownIds = JSON.parse(sessionStorage.getItem('owl_shown_system_messages') || '[]');
                
                messages.forEach((msg) => {
                    if (!shownIds.includes(msg.id)) {
                        sendOwl(msg.title || "הודעת מערכת", msg.message, "system", msg.isGlobal);
                        shownIds.push(msg.id);
                    }
                });
                
                sessionStorage.setItem('owl_shown_system_messages', JSON.stringify(shownIds));
            } catch (e) {
                console.error("Failed to load system messages:", e);
            }
        };

        checkSystemMessages();
        const interval = setInterval(checkSystemMessages, 60000); // בדיקה כל דקה
        return () => clearInterval(interval);
    }, [sendOwl]);

    useEffect(() => {
        if (!session?.user?.id) return;
        const userId = session.user.id;

        const channel = supabase.channel(`user-notifications-owl-${userId}`)
            .on('broadcast', { event: 'ministry_announcement' }, (payload) => {
                sendOwl(payload.payload.from || "משרד הקסמים", payload.payload.message, "magic", true);
            })
            .on('broadcast', { event: 'system_message' }, (payload) => {
                sendOwl(payload.payload.title || "מערכת לומוס", payload.payload.message, "system", true);
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${userId}`
            }, (payload) => {
                // ✅ זיהוי קולינג רום
                if (payload.new.status === 'cooling' && payload.old.status !== 'cooling') {
                    sendOwl("לחש השתקה", "הוטל עליך עונש זמני בטירה. נסה שוב מאוחר יותר.", "error");
                    return;
                }

                // ✅ זיהוי שחרור חסימה — רק כשהסטטוס הקודם היה banned או cooling במפורש
                if (payload.new.status === 'active' &&
                    (payload.old.status === 'banned' || payload.old.status === 'cooling')) {
                    sendOwl("החסימה הוסרה", "ברוך שובך לטירה! התנהג יפה.", "success");
                    return;
                }

                const pointsChanged = payload.new.points_contributed !== payload.old.points_contributed;
                const moneyChanged = payload.new.galleons !== payload.old.galleons;
                const onQuestBoard = pathname?.startsWith("/quests");

                if (pointsChanged || moneyChanged) {
                    if (onQuestBoard) {
                        return;
                    }
                    const wasQuiz = lastSent.current?.title.includes("חידון") || lastSent.current?.title.includes("ציון");

                    if (wasQuiz) {
                        sendOwl("אוצר הטירה עודכן", "הגליאונים ונקודות הבית מהחידון נוספו למאזן שלך!", "magic");
                        return;
                    }

                    sendOwl("עדכון תקציבי", "נרשם שינוי במאזן הנקודות או הגליאונים שלך.", "success");
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [pathname, session, sendOwl, supabase]);

    const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

    return (
        <ToastContext.Provider value={{ sendOwl }}>
            {children}

            <div
                className="fixed bottom-6 left-6 z-[9999999] flex flex-col gap-3 pointer-events-none"
                dir="rtl"
                aria-live="polite"
                aria-atomic="false"
                aria-label="התראות מערכת"
            >
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        role={toast.type === "error" ? "alert" : "status"}
                        aria-atomic="true"
                        className={`pointer-events-auto relative w-80 md:w-96 rounded-3xl p-5 shadow-2xl flex items-start gap-4 border-l-4 transition-all duration-500 animate-in slide-in-from-left-10 backdrop-blur-2xl
                            ${toast.isGlobal
                                ? "border-amber-400 bg-[#0c1222]/95 ring-2 ring-amber-500/50"
                                : toast.type === "system" ? "border-blue-400 bg-[#0a0f1d]/95 ring-1 ring-blue-500/20"
                                : toast.type === "error" ? "border-red-500 bg-red-950/90"
                                    : toast.type === "success" ? "border-emerald-500 bg-emerald-950/90"
                                        : toast.type === "magic" ? "border-amber-500 bg-[#0c1222]/95"
                                            : "border-blue-500 bg-[#0c1222]/90"
                            }`}
                    >
                        {/* ✅ אייקון קולינג רום */}
                        <div className="shrink-0 mt-1">
                            {toast.isGlobal ? <Megaphone className="text-amber-400 animate-bounce" size={24} /> :
                                toast.type === "system" ? <div className="p-2 bg-blue-500/10 rounded-lg"><Megaphone className="text-blue-400" size={20} /></div> :
                                toast.type === "error" && toast.title.includes("השתקה")
                                    ? <Snowflake className="text-blue-400 animate-pulse" size={24} /> :
                                    toast.type === "error" ? <AlertTriangle className="text-red-400 animate-pulse" size={24} /> :
                                        toast.type === "success" ? <Coins className="text-emerald-400" size={24} /> :
                                            toast.type === "magic" ? <Trophy className="text-amber-400 animate-pulse" size={24} /> :
                                                <Ghost className="text-blue-400" size={24} />
                            }
                        </div>

                        <div className="flex-1 space-y-1 text-right font-assistant">
                            <h4 className={`font-cinzel font-black text-[10px] uppercase tracking-widest ${
                                toast.type === "error" ? "text-red-300" : 
                                toast.type === "system" ? "text-blue-300" :
                                "text-amber-500"
                                }`}>
                                {toast.title}
                            </h4>
                            <p className="text-white/90 text-sm leading-relaxed">
                                {toast.message}
                            </p>
                        </div>

                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-white/20 hover:text-white transition-colors p-1 self-start"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
