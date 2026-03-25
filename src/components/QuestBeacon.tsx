"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle, Sparkles, X, Zap } from "lucide-react";
import type { NextActionRecommendation } from "@/lib/gameplay/nextActionEngine";

type QuestBeaconProps = {
    isAuthenticated: boolean;
    hidden?: boolean;
    nextAction: NextActionRecommendation | null;
    nextActionLoading?: boolean;
};

function urgencyLabel(urgency: NextActionRecommendation["urgency"] | undefined) {
    if (urgency === "high") return "דחוף";
    if (urgency === "medium") return "פעיל";
    return "זורם";
}

export default function QuestBeacon({
    isAuthenticated,
    hidden = false,
    nextAction,
    nextActionLoading = false,
}: QuestBeaconProps) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const beaconRef = useRef<HTMLDivElement>(null);
    const previousRouteStateRef = useRef({ pathname, hidden });

    useEffect(() => {
        const previous = previousRouteStateRef.current;
        previousRouteStateRef.current = { pathname, hidden };

        const shouldClose = previous.pathname !== pathname || (previous.hidden === false && hidden === true);
        if (!shouldClose) return;

        const closeTimer = window.setTimeout(() => {
            setIsOpen(false);
        }, 0);

        return () => {
            window.clearTimeout(closeTimer);
        };
    }, [hidden, pathname]);

    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (beaconRef.current && !beaconRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        window.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            window.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen]);

    if (!isAuthenticated || hidden) return null;

    const missionHref = nextAction?.href || "/quests";
    const missionTitle = nextActionLoading
        ? "מגבש את הצעד הבא שלך"
        : nextAction?.title || "פתח/י את לוח המשימות";
    const missionReason = nextAction?.reason || "כל פעולה טובה מחזירה אותך ללולאה של משימה, תגמול והשפעה על הבית.";
    const gainLabel = nextAction?.gainLabel || "התקדמות, תגמול והשפעה במקום אחד";
    const progressLabel = nextAction?.progressLabel || "מוכן למסע הבא";
    const houseImpactLabel = nextAction?.houseImpactLabel || "התקדמות אישית מחזקת גם את הבית שלך";
    const urgency = nextAction?.urgency;
    const pulseClass = urgency === "high" ? "animate-pulse" : "";

    return (
        <div
            ref={beaconRef}
            className="fixed left-4 z-[10003] md:left-6"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
            dir="rtl"
        >
            <div
                id="quest-beacon-panel"
                className={`absolute bottom-full left-0 mb-3 origin-bottom-left transition-all duration-200 ${isOpen ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-2 scale-95 opacity-0"}`}
                style={{ width: "min(22rem, calc(100vw - 2rem))" }}
            >
                <div className="overflow-hidden rounded-[1.9rem] border border-amber-500/20 bg-[#070d1a]/96 shadow-[0_24px_70px_rgba(2,6,23,0.55)] backdrop-blur-2xl">
                    <div className="border-b border-white/[0.07] px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.28em] text-amber-300/75">
                                    מה כדאי לעשות עכשיו?
                                </p>
                                <p className="mt-1 font-assistant text-sm font-semibold text-white/90">
                                    {missionTitle}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                aria-label="סגור משימה"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/45 transition-colors hover:text-white"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3 px-4 py-4">
                        <p className="text-sm leading-6 text-white/65">{missionReason}</p>

                        <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-amber-500/15 bg-amber-500/[0.08] px-3 py-1 text-xs font-semibold text-amber-100/90">
                                {gainLabel}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/70">
                                {progressLabel}
                            </span>
                        </div>

                        <p className="text-xs leading-5 text-white/45">{houseImpactLabel}</p>

                        <div className="space-y-2.5">
                            <Link
                                href={missionHref}
                                onClick={() => setIsOpen(false)}
                                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-center font-assistant text-sm font-bold text-amber-950 transition-colors hover:bg-amber-400"
                            >
                                <Zap size={14} />
                                לצעד הבא
                            </Link>
                            <Link
                                href="/faq"
                                onClick={() => setIsOpen(false)}
                                className="flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-center font-assistant text-sm font-semibold text-white/65 transition-colors hover:text-white"
                            >
                                <HelpCircle size={14} className="text-amber-400/70" />
                                הסבר מהיר
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <button
                type="button"
                onClick={() => setIsOpen((value) => !value)}
                aria-expanded={isOpen}
                aria-controls="quest-beacon-panel"
                aria-label={`מה כדאי לעשות עכשיו: ${missionTitle}`}
                className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-[#0b1325]/92 shadow-[0_16px_40px_rgba(245,158,11,0.16)] backdrop-blur-xl transition-transform duration-200 hover:scale-105 active:scale-95 md:h-16 md:w-16"
            >
                <div className={`absolute inset-1 rounded-full bg-amber-500/10 ${pulseClass}`} />
                <div className="relative flex flex-col items-center justify-center leading-none">
                    <Sparkles size={14} className="mb-0.5 text-amber-300" />
                    <span className="font-cinzel text-[11px] font-black tracking-[0.18em] text-amber-100 md:text-xs">XP</span>
                </div>
                <span className="absolute -right-1 -top-1 rounded-full border border-amber-500/20 bg-amber-500 px-1.5 py-0.5 font-cinzel text-[9px] font-black text-amber-950 shadow-[0_0_18px_rgba(245,158,11,0.28)]">
                    {urgencyLabel(urgency)}
                </span>
            </button>
        </div>
    );
}
