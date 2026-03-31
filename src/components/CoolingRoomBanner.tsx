"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Snowflake, Clock, ChevronDown, ChevronUp, MessageSquare, BookOpen, LayoutGrid } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const RESTRICTED_AREAS = [
    { icon: MessageSquare, label: "הנביא היומי - תגובות" },
    { icon: BookOpen, label: "הספרייה - תגובות לפרקים" },
    { icon: LayoutGrid, label: "הפורומים - פוסטים" },
];

export default function CoolingRoomBanner() {
    const { profile, refreshProfile } = useAuth();
    const [supabase] = useState(() => createClient());
    const [now, setNow] = useState<number | null>(null);
    const [expanded, setExpanded] = useState(false);
    const refreshRequestedRef = useRef(false);
    const isCooling = profile?.status === "cooling" && Boolean(profile?.ban_expires_at);
    const banReason = profile?.ban_reason || "הפרת כללי הטירה";
    const expiryTime = isCooling && profile?.ban_expires_at ? new Date(profile.ban_expires_at).getTime() : null;

    const timeLeft = useMemo(() => {
        if (!expiryTime || now === null) return "";

        const diff = expiryTime - now;
        if (diff <= 0) return "";

        const hours = Math.floor(diff / 3_600_000);
        const minutes = Math.floor((diff % 3_600_000) / 60_000);
        const seconds = Math.floor((diff % 60_000) / 1_000);

        return hours > 0
            ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
            : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }, [expiryTime, now]);

    useEffect(() => {
        if (!isCooling || !expiryTime) {
            refreshRequestedRef.current = false;
            return;
        }

        const interval = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [expiryTime, isCooling]);

    useEffect(() => {
        if (!isCooling || !expiryTime || now === null) {
            refreshRequestedRef.current = false;
            return;
        }

        if (now >= expiryTime && !refreshRequestedRef.current) {
            refreshRequestedRef.current = true;
            void refreshProfile();
            return;
        }

        if (now < expiryTime) {
            refreshRequestedRef.current = false;
        }
    }, [expiryTime, isCooling, now, refreshProfile]);

    useEffect(() => {
        if (!profile?.id) return;

        const channel = supabase
            .channel(`cooling-banner-${profile.id}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "profiles",
                    filter: `id=eq.${profile.id}`,
                },
                () => {
                    void refreshProfile();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id, refreshProfile, supabase]);

    return (
        <AnimatePresence>
            {isCooling && timeLeft && (
                <motion.div
                    initial={{ opacity: 0, x: 40, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 40, scale: 0.9 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    style={{ position: "fixed", bottom: "14rem", right: "1.5rem", maxWidth: "290px", zIndex: 9000 }}
                    role="alert"
                    aria-live="polite"
                    aria-label={`לחש השתקה פעיל. הצינון יסתיים בעוד ${timeLeft}`}
                >
                    <div className="bg-[#080d1e]/95 backdrop-blur-xl border border-blue-500/25 rounded-3xl shadow-[0_0_50px_rgba(59,130,246,0.12)] overflow-hidden" dir="rtl">
                        <div className="px-5 pt-5 pb-4 flex items-center gap-4">
                            <div className="relative shrink-0" aria-hidden="true">
                                <div className="absolute inset-0 rounded-2xl bg-blue-500/20 animate-ping opacity-40" />
                                <div className="relative w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center">
                                    <Snowflake size={20} className="text-blue-400" />
                                </div>
                            </div>

                            <div className="flex-1 text-right">
                                <p className="font-cinzel text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">
                                    לחש השתקה פעיל
                                </p>
                                <div className="flex items-center gap-2 justify-end">
                                    <span className="font-cinzel font-black text-xl text-white tabular-nums" aria-label={`זמן נותר: ${timeLeft}`} aria-live="off">
                                        {timeLeft}
                                    </span>
                                    <Clock size={12} className="text-blue-400/50" aria-hidden="true" />
                                </div>
                            </div>

                            <button
                                onClick={() => setExpanded((previous) => !previous)}
                                className="shrink-0 w-7 h-7 rounded-full bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-white/30 hover:text-blue-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-1 focus:ring-offset-transparent"
                                aria-expanded={expanded}
                                aria-controls="cooling-details"
                                aria-label={expanded ? "סגור פרטים" : "הצג פרטים"}
                            >
                                {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                            </button>
                        </div>

                        <div className="h-px mx-5 bg-blue-500/10" aria-hidden="true">
                            <motion.div
                                className="h-full bg-gradient-to-r from-blue-500/60 to-blue-400/20"
                                animate={{ scaleX: [1, 0.95, 1] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                style={{ transformOrigin: "right" }}
                            />
                        </div>

                        <AnimatePresence>
                            {expanded && (
                                <motion.div
                                    id="cooling-details"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-5 pt-4 pb-5 space-y-4">
                                        <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 space-y-1 text-right">
                                            <p className="text-[9px] text-blue-400/60 uppercase tracking-widest font-black">סיבת ההשתקה</p>
                                            <p className="font-assistant text-sm text-white/65 leading-snug">{banReason}</p>
                                        </div>

                                        <div className="space-y-2" role="list" aria-label="אזורים חסומים">
                                            <p className="w-full text-[9px] text-white/20 uppercase tracking-widest font-black text-right">
                                                הגישה לתגובות חסומה ב:
                                            </p>
                                            {RESTRICTED_AREAS.map(({ icon: Icon, label }) => (
                                                <div key={label} className="flex items-center gap-2.5 flex-row-reverse justify-end" role="listitem">
                                                    <span className="font-assistant text-xs text-white/45">{label}</span>
                                                    <div className="w-6 h-6 rounded-lg bg-blue-500/8 flex items-center justify-center shrink-0" aria-hidden="true">
                                                        <Icon size={12} className="text-blue-400/50" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <p className="text-[10px] text-blue-400/40 italic font-assistant leading-relaxed text-right border-t border-white/5 pt-3">
                                            עם סיום הצינון, הגישה המלאה לטירה תחזור.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
