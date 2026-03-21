"use client";

/**
 * MagicTraitsCard — רכיב תכונות קסומות מולדות
 * מוסיפים לדשבורד בתוך activeTab === 'overview', אחרי ה-ActionCards
 *
 * שימוש:
 * import MagicTraitsCard from "@/components/MagicTraitsCard";
 * <MagicTraitsCard profile={profile} theme={theme} />
 */

import { useEffect, useRef, useState } from "react";

const TRAITS_CONFIG = [
    {
        key: "courage",
        nameHe: "אומץ לב",
        nameEn: "Courage",
        icon: "⚔️",
        gradientFrom: "#dc2626",
        gradientTo: "#f87171",
        glow: "rgba(220,38,38,0.5)",
        glowSoft: "rgba(220,38,38,0.12)",
        desc: "הנכונות להתמודד עם הלא נודע",
    },
    {
        key: "wisdom",
        nameHe: "חכמה",
        nameEn: "Wisdom",
        icon: "📖",
        gradientFrom: "#1d4ed8",
        gradientTo: "#60a5fa",
        glow: "rgba(37,99,235,0.5)",
        glowSoft: "rgba(37,99,235,0.12)",
        desc: "עומק ההבנה והיכולת האינטלקטואלית",
    },
    {
        key: "cunning",
        nameHe: "ערמומיות",
        nameEn: "Cunning",
        icon: "🐍",
        gradientFrom: "#047857",
        gradientTo: "#34d399",
        glow: "rgba(5,150,105,0.5)",
        glowSoft: "rgba(5,150,105,0.12)",
        desc: "כושר ההמצאה והתחכום האסטרטגי",
    },
    {
        key: "loyalty",
        nameHe: "נאמנות",
        nameEn: "Loyalty",
        icon: "🦡",
        gradientFrom: "#b45309",
        gradientTo: "#fbbf24",
        glow: "rgba(245,158,11,0.5)",
        glowSoft: "rgba(245,158,11,0.12)",
        desc: "העומק של הקשרים שאתה יוצר",
    },
];

function useCountUp(target: number, duration = 1200, delay = 0) {
    const [value, setValue] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const start = performance.now() + delay;
        const tick = (now: number) => {
            if (now < start) { rafRef.current = requestAnimationFrame(tick); return; }
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [target, duration, delay]);

    return value;
}

function TraitBar({ trait, value, index, visible }: { trait: typeof TRAITS_CONFIG[0]; value: number; index: number; visible: boolean }) {
    const displayValue = useCountUp(visible ? value : 0, 900, index * 120);
    const barWidth = visible ? value : 0;

    return (
        <div
            className="group relative rounded-xl p-3 transition-all duration-300"
            style={{
                background: visible ? trait.glowSoft : "transparent",
                border: `1px solid ${visible ? trait.glow.replace("0.5", "0.15") : "rgba(255,255,255,0.04)"}`,
                transform: visible ? "translateX(0)" : "translateX(20px)",
                opacity: visible ? 1 : 0,
                transition: `transform 0.5s cubic-bezier(0.4,0,0.2,1) ${index * 80}ms, opacity 0.5s ease ${index * 80}ms, background 0.3s, border 0.3s`,
            }}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                    <span className="text-lg leading-none" style={{ filter: `drop-shadow(0 0 6px ${trait.glow})` }}>
                        {trait.icon}
                    </span>
                    <div>
                        <div className="font-cinzel text-[11px] font-black text-white/80 uppercase tracking-[0.15em] leading-tight">
                            {trait.nameHe}
                        </div>
                        <div className="font-cinzel text-[9px] text-white/20 leading-tight">
                            {trait.nameEn}
                        </div>
                    </div>
                </div>

                {/* Animated number */}
                <div
                    className="font-cinzel font-black text-2xl tabular-nums"
                    style={{ color: trait.gradientTo, textShadow: `0 0 12px ${trait.glow}` }}
                >
                    {displayValue}
                </div>
            </div>

            {/* Bar track */}
            <div
                className="relative h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.05)" }}
            >
                {/* Animated fill */}
                <div
                    className="absolute inset-y-0 right-0 rounded-full"
                    style={{
                        width: `${barWidth}%`,
                        background: `linear-gradient(to left, ${trait.gradientTo}, ${trait.gradientFrom})`,
                        boxShadow: `0 0 10px ${trait.glow}`,
                        transition: `width 1.1s cubic-bezier(0.4,0,0.2,1) ${index * 120}ms`,
                    }}
                />
                {/* Shimmer overlay */}
                {visible && (
                    <div
                        className="absolute inset-y-0 right-0 rounded-full pointer-events-none"
                        style={{
                            width: `${barWidth}%`,
                            background: "linear-gradient(to left, rgba(255,255,255,0.25), transparent)",
                            transition: `width 1.1s cubic-bezier(0.4,0,0.2,1) ${index * 120}ms`,
                        }}
                    />
                )}
            </div>

            {/* Desc on hover */}
            <div className="mt-1.5 overflow-hidden" style={{ maxHeight: 0, transition: "max-height 0.3s" }}>
            </div>
            <p className="text-[10px] text-white/20 font-crimson italic mt-1.5">{trait.desc}</p>
        </div>
    );
}

export default function MagicTraitsCard({ profile, theme }: { profile: any; theme: any }) {
    const traits = profile?.magic_traits;
    const [visible, setVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
            { threshold: 0.2 }
        );
        if (cardRef.current) observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, []);

    if (!traits || Object.values(traits).every((v: any) => v === 0)) return null;

    // Dominant trait
    const dominant = TRAITS_CONFIG.reduce((prev, curr) =>
        (traits[curr.key] || 0) > (traits[prev.key] || 0) ? curr : prev
    );
    const totalPower = TRAITS_CONFIG.reduce((sum, t) => sum + (traits[t.key] || 0), 0);

    return (
        <div
            ref={cardRef}
            className={`glass-panel rounded-[2.5rem] p-6 md:p-8 border ${theme.borderColor} shadow-2xl`}
            style={{ position: "relative", overflow: "hidden" }}
        >
            {/* Background glow orb */}
            <div
                className="absolute pointer-events-none"
                style={{
                    top: "-40px",
                    left: "-40px",
                    width: "200px",
                    height: "200px",
                    borderRadius: "50%",
                    background: dominant.glowSoft,
                    filter: "blur(60px)",
                    opacity: visible ? 1 : 0,
                    transition: "opacity 1s ease",
                }}
            />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-5 mb-5 relative">
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                        style={{
                            background: dominant.glowSoft,
                            border: `1px solid ${dominant.glow.replace("0.5", "0.2")}`,
                            boxShadow: `0 0 16px ${dominant.glowSoft}`,
                        }}
                    >
                        ✨
                    </div>
                    <div>
                        <h3 className="font-cinzel text-sm font-black text-white uppercase tracking-widest">
                            תכונות קסומות מולדות
                        </h3>
                        <p className="text-[10px] text-white/20 font-crimson italic mt-0.5">
                            נחשפו על ידי מצנפת המיון
                        </p>
                    </div>
                </div>

                {/* Dominant trait badge */}
                <div
                    className="text-center px-3 py-1.5 rounded-xl"
                    style={{
                        background: dominant.glowSoft,
                        border: `1px solid ${dominant.glow.replace("0.5", "0.2")}`,
                    }}
                >
                    <p className="text-[9px] text-white/30 uppercase font-cinzel tracking-widest">דומיננטי</p>
                    <p
                        className="font-cinzel font-black text-sm flex items-center gap-1 justify-center"
                        style={{ color: dominant.gradientTo }}
                    >
                        {dominant.icon} {dominant.nameHe}
                    </p>
                </div>
            </div>

            {/* Traits */}
            <div className="space-y-3">
                {TRAITS_CONFIG.map((trait, i) => (
                    <TraitBar
                        key={trait.key}
                        trait={trait}
                        value={traits[trait.key] || 0}
                        index={i}
                        visible={visible}
                    />
                ))}
            </div>

            {/* Footer — total power */}
            <div className="border-t border-white/[0.04] pt-4 mt-5 flex items-center justify-between">
                <p className="font-crimson text-sm text-white/20 italic">
                    "גדולתך נקבעת על ידי הבחירות שתעשה."
                </p>
                <div
                    className="font-cinzel text-xs font-black px-3 py-1 rounded-lg"
                    style={{
                        background: "rgba(255,255,255,0.04)",
                        color: "rgba(255,255,255,0.25)",
                        border: "1px solid rgba(255,255,255,0.07)",
                    }}
                >
                    כוח: {totalPower}
                </div>
            </div>
        </div>
    );
}
