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
    isGlobal?: boolean; // דגל להודעה גלובלית ממשרד הקסמים
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

    // פונקציית שליחה משודרגת
    const sendOwl = useCallback((title: string, message: string, type: ToastType = "info", isGlobal: boolean = false) => {
        const now = Date.now();

        if (lastSent.current &&
            lastSent.current.title === title &&
            lastSent.current.message === message &&
            now - lastSent.current.time < 2000) {
            return;
        }

        lastSent.current = { title, message, time: now };
        const id = Math.random().toString(36).substring(2, 9);

        setToasts((prev) => [...prev, { id, title, message, type, isGlobal }]);

        // הפתעה: הודעות גלובליות נשארות 6 שניות, רגילות 4
        const duration = isGlobal ? 6000 : 4000;

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);

    // --- ה"מקלט" שמאזין לשידורי משרד הקסמים בזמן אמת ---
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase.channel('lumos_global_presence');

        channel.on('broadcast', { event: 'ministry_announcement' }, (payload: any) => {
            // כשמגיעה הודעה גלובלית, הינשוף משתגר לכולם
            sendOwl(
                payload.payload.from || "הכרזה ממשרד הקסמים",
                payload.payload.message,
                "magic",
                true // סימון כגלובלי
            );
        }).subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sendOwl]);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ sendOwl }}>
            {children}

            <div className="fixed bottom-6 left-6 z-[200] flex flex-col gap-3 pointer-events-none" dir="rtl">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto relative w-80 glass-panel rounded-2xl p-5 shadow-2xl flex items-start gap-4 border-l-4 transition-all duration-500 ${toast.isGlobal
                                ? "animate-arrival border-amber-400 bg-amber-950/60 ring-2 ring-amber-500/30 shadow-amber-500/20"
                                : "animate-in slide-in-from-left-10 fade-in"
                            } ${toast.type === "success" ? "border-emerald-500 bg-emerald-950/40" :
                                toast.type === "magic" ? "border-amber-500 bg-amber-950/40" :
                                    toast.type === "error" ? "border-red-500 bg-red-950/40" :
                                        "border-blue-500 bg-blue-950/40"
                            }`}
                    >
                        {/* תג "דחוף" להודעות משרד הקסמים */}
                        {toast.isGlobal && (
                            <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg animate-pulse">
                                דחוף
                            </div>
                        )}

                        <div className="shrink-0 mt-1">
                            {toast.isGlobal ? <Megaphone className="text-amber-400 animate-bounce" size={22} /> :
                                toast.type === "magic" ? <Sparkles className="text-amber-500 animate-pulse" size={22} /> :
                                    toast.type === "success" ? <Feather className="text-emerald-500" size={22} /> :
                                        toast.type === "error" ? <AlertTriangle className="text-red-500" size={22} /> :
                                            <Feather className="text-blue-400" size={22} />}
                        </div>

                        <div className="flex-1 space-y-1">
                            <h4 className={`font-cinzel font-bold tracking-widest text-sm ${toast.isGlobal ? "text-amber-300" : "text-white"}`}>
                                {toast.title}
                            </h4>
                            <p className="font-crimson text-white/80 text-[15px] leading-snug">{toast.message}</p>
                        </div>

                        <button onClick={() => removeToast(toast.id)} className="text-white/20 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* אנימציית כניסה מיוחדת להכרזות */}
            <style>{`
                @keyframes arrival {
                    0% { opacity: 0; transform: translateX(-100px) scale(0.9); }
                    70% { transform: translateX(10px) scale(1.05); }
                    100% { opacity: 1; transform: translateX(0) scale(1); }
                }
                .animate-arrival {
                    animation: arrival 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
            `}</style>
        </ToastContext.Provider>
    );
};