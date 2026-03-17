"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { Feather, X, Sparkles, AlertTriangle, Megaphone } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type ToastType = "success" | "magic" | "error" | "info";

interface Toast {
    id: string;
    title: string;
    message: string;
    type: ToastType;
    isGlobal?: boolean;
}

interface ToastContextType {
    sendOwl: (title: string, message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useOwlMail = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useOwlMail must be used within an OwlMailProvider");
    return context;
};

export const OwlMailProvider = ({ children }: { children: React.ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const lastSent = useRef<{ title: string; message: string; time: number } | null>(null);

    const sendOwl = useCallback((title: string, message: string, type: ToastType = "info", isGlobal: boolean = false) => {
        const now = Date.now();

        // מניעת כפילויות (ספאם של ינשופים)
        if (lastSent.current &&
            lastSent.current.title === title &&
            lastSent.current.message === message &&
            now - lastSent.current.time < 2000) {
            return;
        }

        lastSent.current = { title, message, time: now };
        const id = Math.random().toString(36).substring(2, 9);

        setToasts((prev) => [...prev, { id, title, message, type, isGlobal }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, isGlobal ? 8000 : 4000);
    }, []);

    useEffect(() => {
        const supabase = createClient();

        const initRealtime = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const userId = session.user.id;

            const channel = supabase.channel('global_owl_updates')
                // 1. האזנה להכרזות מנהלים (Global)
                .on('broadcast', { event: 'ministry_announcement' }, (payload) => {
                    sendOwl(payload.payload.from || "משרד הקסמים", payload.payload.message, "magic", true);
                })
                // 2. האזנה לשינויים בדרגה/נקודות/גליאונים
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${userId}`
                }, (payload) => {
                    // בכל פעם שיש עדכון בפרופיל (כמו הניקוד שהוספנו ב-SQL)
                    sendOwl(
                        "עדכון ממשרד הקסמים",
                        "המאזן שלך התעדכן! זכית בנקודות וגליאונים.",
                        "success"
                    );
                })
                .subscribe();

            return channel;
        };

        const channelPromise = initRealtime();

        return () => {
            channelPromise.then(channel => {
                if (channel) supabase.removeChannel(channel);
            });
        };
    }, [sendOwl]);

    const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

    return (
        <ToastContext.Provider value={{ sendOwl }}>
            {children}

            <div className="fixed bottom-6 left-6 z-[99999] flex flex-col gap-3 pointer-events-none" dir="rtl">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto relative w-85 glass-panel rounded-2xl p-5 shadow-2xl flex items-start gap-4 border-l-4 transition-all duration-500 animate-in slide-in-from-left-10 ${toast.isGlobal ? "border-amber-400 bg-amber-900/90 ring-2 ring-amber-500" :
                                toast.type === "success" ? "border-emerald-500 bg-emerald-950/80" :
                                    toast.type === "magic" ? "border-amber-500 bg-amber-950/80" : "border-blue-500 bg-blue-950/80"
                            }`}
                    >
                        <div className="shrink-0 mt-1">
                            {toast.isGlobal ? <Megaphone className="text-amber-400 animate-bounce" size={24} /> :
                                toast.type === "success" ? <Sparkles className="text-emerald-400 animate-pulse" size={24} /> :
                                    <Feather className="text-amber-500" size={24} />}
                        </div>

                        <div className="flex-1 space-y-1 text-right">
                            <h4 className={`font-cinzel font-bold text-sm ${toast.isGlobal ? "text-amber-300" : "text-white"}`}>
                                {toast.title}
                            </h4>
                            <p className="font-assistant text-white/90 text-sm leading-tight">
                                {toast.message}
                            </p>
                        </div>

                        <button onClick={() => removeToast(toast.id)} className="text-white/20 hover:text-white transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};