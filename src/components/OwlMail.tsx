"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Feather, X, Sparkles, AlertTriangle } from "lucide-react";

// --- סוגי ההתראות ---
type ToastType = "success" | "magic" | "error" | "info";

interface Toast {
    id: string;
    title: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    sendOwl: (title: string, message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// --- הפונקציה שכל קומפוננטה תוכל לקרוא לה ---
export const useOwlMail = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useOwlMail must be used within an OwlMailProvider");
    return context;
};

// --- המעטפת (Provider) שתשב ב-Layout ---
export const OwlMailProvider = ({ children }: { children: React.ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const sendOwl = useCallback((title: string, message: string, type: ToastType = "info") => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, title, message, type }]);

        // הינשוף עף משם אחרי 4 שניות
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ sendOwl }}>
            {children}

            {/* אזור התצוגה של ההתראות (קופצות בצד שמאל למטה) */}
            <div className="fixed bottom-6 left-6 z-[200] flex flex-col gap-3 pointer-events-none" dir="rtl">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto relative w-80 glass-panel rounded-2xl p-4 shadow-2xl flex items-start gap-4 border-l-4 animate-in slide-in-from-left-10 fade-in duration-300 ${toast.type === "success" ? "border-emerald-500 bg-emerald-950/20" :
                                toast.type === "magic" ? "border-amber-500 bg-amber-950/20" :
                                    toast.type === "error" ? "border-red-500 bg-red-950/20" :
                                        "border-blue-500 bg-blue-950/20"
                            }`}
                    >
                        {/* אייקון לפי סוג */}
                        <div className="shrink-0 mt-1">
                            {toast.type === "magic" ? <Sparkles className="text-amber-500" size={20} /> :
                                toast.type === "success" ? <Feather className="text-emerald-500" size={20} /> :
                                    toast.type === "error" ? <AlertTriangle className="text-red-500" size={20} /> :
                                        <Feather className="text-blue-400" size={20} />}
                        </div>

                        {/* טקסט */}
                        <div className="flex-1">
                            <h4 className="font-cinzel font-bold text-white tracking-widest text-sm mb-1">{toast.title}</h4>
                            <p className="font-crimson text-white/70 text-sm leading-tight">{toast.message}</p>
                        </div>

                        {/* כפתור סגירה */}
                        <button onClick={() => removeToast(toast.id)} className="text-white/40 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};