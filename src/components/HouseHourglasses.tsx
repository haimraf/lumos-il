"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

type HouseKey = "Gryffindor" | "Slytherin" | "Ravenclaw" | "Hufflepuff";

const HOUSE_CONFIG: Record<
    HouseKey,
    {
        title: string;
        icon: string;
        color: string;
        rgb: string;
        relic: "chalice" | "vial" | "orb" | "lantern";
        bannerDark: string;
        bannerLight: string;
        aura: string;
        motto: string;
        leaderLine: string;
        status: string[];
    }
> = {
    Gryffindor: {
        title: "גריפינדור",
        icon: "🦁",
        color: "#ef4444",
        rgb: "239,68,68",
        relic: "chalice",
        bannerDark: "#4a1111",
        bannerLight: "#b91c1c",
        aura: "rgba(239,68,68,0.24)",
        motto: "לב אמיץ ואש פנימית",
        leaderLine: "האש באולם נוטה אליו",
        status: ["מוביל", "בוער קדימה", "צובר תהילה", "מחכה לרגע הנכון"],
    },
    Slytherin: {
        title: "סלית'רין",
        icon: "🐍",
        color: "#10b981",
        rgb: "16,185,129",
        relic: "vial",
        bannerDark: "#0f2d24",
        bannerLight: "#059669",
        aura: "rgba(16,185,129,0.22)",
        motto: "תחבולה, שאיפה ודיוק",
        leaderLine: "הטירה לוחשת את שמו",
        status: ["מוביל", "זוחל בשקט", "אוסף כוח", "מחכה למהלך הגדול"],
    },
    Ravenclaw: {
        title: "רייבנקלו",
        icon: "🦅",
        color: "#3b82f6",
        rgb: "59,130,246",
        relic: "orb",
        bannerDark: "#10254d",
        bannerLight: "#2563eb",
        aura: "rgba(59,130,246,0.22)",
        motto: "שכל, תעוזה ותובנה",
        leaderLine: "האור עונה לו ראשון",
        status: ["מוביל", "חושב קדימה", "אוסף חכמה", "מתחיל לזהור"],
    },
    Hufflepuff: {
        title: "הפלפאף",
        icon: "🦡",
        color: "#f59e0b",
        rgb: "245,158,11",
        relic: "lantern",
        bannerDark: "#4b3207",
        bannerLight: "#d97706",
        aura: "rgba(245,158,11,0.24)",
        motto: "נאמנות, חום והתמדה",
        leaderLine: "האולם מחמם עבורו את האור",
        status: ["מוביל", "מתקדם בהתמדה", "ממלא אור", "צובר מומנטום"],
    },
};

const BASE_POINTS: Record<HouseKey, number> = {
    Gryffindor: 0,
    Slytherin: 0,
    Ravenclaw: 0,
    Hufflepuff: 0,
};

function clamp(n: number, min = 0, max = 1) {
    return Math.max(min, Math.min(max, n));
}

function rankHouses(points: Record<HouseKey, number>) {
    return (Object.entries(points) as [HouseKey, number][])
        .sort((a, b) => b[1] - a[1])
        .map(([key]) => key);
}

function getHouseStatus(rank: number, statuses: string[]) {
    return statuses[Math.min(rank, statuses.length - 1)] || statuses[statuses.length - 1];
}

function MagicalDust() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 36 }).map((_, i) => (
                <motion.span
                    key={i}
                    className="absolute rounded-full bg-white/30"
                    style={{
                        width: i % 5 === 0 ? 3 : 2,
                        height: i % 5 === 0 ? 3 : 2,
                        left: `${(i * 9.7) % 100}%`,
                        top: `${(i * 13.3) % 100}%`,
                        filter: "blur(0.5px)",
                    }}
                    animate={{
                        y: [0, -18, 0],
                        x: [0, i % 2 === 0 ? 6 : -6, 0],
                        opacity: [0.05, 0.22, 0.05],
                    }}
                    transition={{
                        duration: 5 + (i % 6),
                        repeat: Infinity,
                        delay: i * 0.18,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
}

function TorchGlow({ side }: { side: "left" | "right" }) {
    return (
        <div
            className={`absolute top-20 ${side === "left" ? "left-0" : "right-0"} w-28 h-72 pointer-events-none`}
            aria-hidden="true"
        >
            <motion.div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-amber-300/25 blur-xl"
                animate={{ opacity: [0.35, 0.65, 0.35], scale: [0.95, 1.08, 0.95] }}
                transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute top-8 left-1/2 -translate-x-1/2 w-20 h-40 rounded-full bg-gradient-to-b from-amber-300/15 via-orange-400/10 to-transparent blur-2xl"
                animate={{ opacity: [0.18, 0.34, 0.18] }}
                transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
    );
}

function HouseBanner({
    house,
    isLeading,
}: {
    house: HouseKey;
    isLeading: boolean;
}) {
    const config = HOUSE_CONFIG[house];

    return (
        <motion.div
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-0"
            animate={{
                rotate: [0, isLeading ? 0.8 : 0.35, 0, isLeading ? -0.8 : -0.35, 0],
                y: [0, 1.5, 0],
            }}
            transition={{
                duration: isLeading ? 5.5 : 7,
                repeat: Infinity,
                ease: "easeInOut",
            }}
            aria-hidden="true"
        >
            <svg width="108" height="150" viewBox="0 0 122 170" className="overflow-visible">
                <defs>
                    <linearGradient id={`banner-${house}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={config.bannerLight} />
                        <stop offset="100%" stopColor={config.bannerDark} />
                    </linearGradient>
                </defs>

                <path
                    d="M15 0 H107 V126 L61 160 L15 126 Z"
                    fill={`url(#banner-${house})`}
                    opacity={isLeading ? 0.95 : 0.76}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1.2"
                />
                <path
                    d="M25 20 H97 V112 L61 138 L25 112 Z"
                    fill="rgba(255,255,255,0.04)"
                    stroke="rgba(255,255,255,0.08)"
                />
                <text
                    x="61"
                    y="58"
                    textAnchor="middle"
                    fontSize="28"
                    fill="rgba(255,255,255,0.95)"
                >
                    {config.icon}
                </text>
                <text
                    x="61"
                    y="82"
                    textAnchor="middle"
                    fontSize="8"
                    letterSpacing="2.5"
                    fill="rgba(255,255,255,0.70)"
                    style={{ textTransform: "uppercase", fontWeight: 700 }}
                >
                    HOUSE
                </text>
            </svg>
        </motion.div>
    );
}

function LeaderHalo({
    rgb,
}: {
    rgb: string;
}) {
    return (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[48%] w-40 h-40 md:w-48 md:h-48 rounded-full blur-2xl"
                style={{
                    background: `radial-gradient(circle, rgba(${rgb},0.28) 0%, rgba(${rgb},0.08) 45%, transparent 75%)`,
                }}
                animate={{ scale: [0.94, 1.06, 0.94], opacity: [0.68, 1, 0.68] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />

            <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[48%] w-48 h-48 md:w-56 md:h-56 rounded-full border"
                style={{ borderColor: `rgba(${rgb},0.20)` }}
                animate={{ rotate: 360, scale: [0.98, 1.02, 0.98] }}
                transition={{
                    rotate: { duration: 18, repeat: Infinity, ease: "linear" },
                    scale: { duration: 3, repeat: Infinity },
                }}
            />

            <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[48%] w-56 h-56 md:w-64 md:h-64 rounded-full border"
                style={{ borderColor: `rgba(${rgb},0.12)` }}
                animate={{ rotate: -360 }}
                transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            />
        </div>
    );
}

function RelicShape({
    house,
    fillRatio,
    isLeading,
}: {
    house: HouseKey;
    fillRatio: number;
    isLeading: boolean;
}) {
    const config = HOUSE_CONFIG[house];
    const color = config.color;
    const particleCount = isLeading ? 16 : 9;
    const pulseScale = isLeading ? [1, 1.045, 1] : [1, 1.02, 1];

    if (config.relic === "chalice") {
        const liquidHeight = 58 * fillRatio;
        const liquidY = 108 - liquidHeight;

        return (
            <svg viewBox="0 0 180 220" className="w-full h-full overflow-visible" aria-hidden="true">
                <defs>
                    <linearGradient id={`glass-${house}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
                    </linearGradient>
                    <linearGradient id={`fill-${house}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.96" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.56" />
                    </linearGradient>
                    <clipPath id={`clip-${house}`}>
                        <path d="M46 46 H134 C130 82 118 105 101 120 H79 C62 105 50 82 46 46 Z" />
                    </clipPath>
                    <filter id={`glow-${house}`} x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <motion.g animate={{ scale: pulseScale }} transition={{ duration: 3, repeat: Infinity }}>
                    <ellipse
                        cx="90"
                        cy="198"
                        rx="48"
                        ry="10"
                        fill={color}
                        fillOpacity={isLeading ? 0.18 : 0.08}
                        filter={`url(#glow-${house})`}
                    />
                    <path
                        d="M46 46 H134 C130 82 118 105 101 120 H79 C62 105 50 82 46 46 Z"
                        fill="url(#glass-${house})"
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth="2"
                    />

                    <g clipPath={`url(#clip-${house})`}>
                        <motion.rect
                            x="40"
                            y={liquidY}
                            width="100"
                            height={liquidHeight}
                            fill={`url(#fill-${house})`}
                            animate={{ y: liquidY, height: liquidHeight }}
                            transition={{ duration: 1.1, ease: "easeInOut" }}
                        />
                        {liquidHeight > 4 && (
                            <motion.ellipse
                                cx="90"
                                cy={liquidY}
                                rx="40"
                                ry="4"
                                fill={color}
                                fillOpacity="0.22"
                                animate={{ cy: liquidY }}
                                transition={{ duration: 1.1, ease: "easeInOut" }}
                            />
                        )}
                    </g>

                    <path d="M80 120 H100 L106 152 H74 Z" fill="rgba(120,70,20,0.95)" />
                    <rect x="58" y="152" width="64" height="11" rx="5" fill="rgba(120,70,20,0.95)" />
                    <rect x="48" y="163" width="84" height="16" rx="8" fill="rgba(90,50,16,1)" />
                    <path d="M58 52 Q64 88 72 106" stroke="white" strokeOpacity="0.18" strokeWidth="1.5" fill="none" />
                </motion.g>

                {Array.from({ length: particleCount }).map((_, i) => (
                    <motion.circle
                        key={i}
                        r={i % 3 === 0 ? 2.2 : 1.4}
                        fill={color}
                        initial={{ cx: 90, cy: 100, opacity: 0 }}
                        animate={{
                            cx: [90, 60 + (i * 8) % 60, 90 + ((i % 2 ? 1 : -1) * (12 + (i % 4) * 3))],
                            cy: [110, 80 - (i % 5) * 10, 48],
                            opacity: [0, 0.95, 0],
                            scale: [0.6, 1, 0.7],
                        }}
                        transition={{
                            duration: 2.6 + (i % 4) * 0.25,
                            delay: i * 0.12,
                            repeat: Infinity,
                            ease: "easeOut",
                        }}
                    />
                ))}
            </svg>
        );
    }

    if (config.relic === "vial") {
        const liquidHeight = 76 * fillRatio;
        const liquidY = 118 - liquidHeight;

        return (
            <svg viewBox="0 0 180 220" className="w-full h-full overflow-visible" aria-hidden="true">
                <defs>
                    <linearGradient id={`glass-${house}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                    </linearGradient>
                    <linearGradient id={`fill-${house}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.90" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.46" />
                    </linearGradient>
                    <clipPath id={`clip-${house}`}>
                        <path d="M66 38 H114 V64 C114 72 122 82 126 90 C134 107 132 149 120 170 H60 C48 149 46 107 54 90 C58 82 66 72 66 64 Z" />
                    </clipPath>
                    <filter id={`glow-${house}`} x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <motion.g animate={{ scale: pulseScale }} transition={{ duration: 3, repeat: Infinity }}>
                    <ellipse
                        cx="90"
                        cy="198"
                        rx="42"
                        ry="9"
                        fill={color}
                        fillOpacity={isLeading ? 0.16 : 0.07}
                        filter={`url(#glow-${house})`}
                    />
                    <rect x="63" y="26" width="54" height="18" rx="6" fill="rgba(86,49,18,1)" />
                    <path
                        d="M66 38 H114 V64 C114 72 122 82 126 90 C134 107 132 149 120 170 H60 C48 149 46 107 54 90 C58 82 66 72 66 64 Z"
                        fill="url(#glass-${house})"
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth="2"
                    />

                    <g clipPath={`url(#clip-${house})`}>
                        <motion.rect
                            x="52"
                            y={liquidY}
                            width="76"
                            height={liquidHeight}
                            fill={`url(#fill-${house})`}
                            animate={{ y: liquidY, height: liquidHeight }}
                            transition={{ duration: 1.1, ease: "easeInOut" }}
                            filter={`url(#glow-${house})`}
                        />
                        {liquidHeight > 4 && (
                            <motion.ellipse
                                cx="90"
                                cy={liquidY}
                                rx="30"
                                ry="4"
                                fill={color}
                                fillOpacity="0.18"
                                animate={{ cy: liquidY }}
                                transition={{ duration: 1.1, ease: "easeInOut" }}
                            />
                        )}
                    </g>

                    {Array.from({ length: 7 }).map((_, i) => (
                        <motion.circle
                            key={i}
                            r={2 + (i % 2)}
                            fill="white"
                            fillOpacity="0.16"
                            initial={{ cx: 90, cy: 150 }}
                            animate={{
                                cx: [80 + i * 5, 84 + i * 4, 80 + i * 5],
                                cy: [160 - i * 6, 130 - i * 8, 88 - i * 8],
                                opacity: [0, 0.72, 0],
                            }}
                            transition={{
                                duration: 2.2 + i * 0.15,
                                repeat: Infinity,
                                delay: i * 0.22,
                                ease: "easeOut",
                            }}
                        />
                    ))}
                </motion.g>
            </svg>
        );
    }

    if (config.relic === "orb") {
        const glowScale = 0.65 + fillRatio * 0.55;

        return (
            <svg viewBox="0 0 180 220" className="w-full h-full overflow-visible" aria-hidden="true">
                <defs>
                    <radialGradient id={`orb-${house}`} cx="50%" cy="45%" r="50%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.95" />
                        <stop offset="30%" stopColor={color} stopOpacity="0.85" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.12" />
                    </radialGradient>
                    <filter id={`glow-${house}`} x="-60%" y="-60%" width="220%" height="220%">
                        <feGaussianBlur stdDeviation="12" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <motion.g animate={{ scale: pulseScale }} transition={{ duration: 3.2, repeat: Infinity }}>
                    <ellipse cx="90" cy="200" rx="42" ry="9" fill={color} fillOpacity={isLeading ? 0.16 : 0.07} />
                    <motion.circle
                        cx="90"
                        cy="92"
                        r={42}
                        fill={`url(#orb-${house})`}
                        filter={`url(#glow-${house})`}
                        animate={{ scale: [glowScale, glowScale * 1.06, glowScale] }}
                        transition={{ duration: 2.8, repeat: Infinity }}
                    />

                    <circle
                        cx="90"
                        cy="92"
                        r="50"
                        fill="rgba(255,255,255,0.05)"
                        stroke="rgba(255,255,255,0.14)"
                        strokeWidth="2"
                    />
                    <path d="M70 62 Q52 88 68 120" stroke="white" strokeOpacity="0.22" strokeWidth="1.3" fill="none" />
                    <path d="M106 54 Q126 70 122 102" stroke="white" strokeOpacity="0.14" strokeWidth="1" fill="none" />
                    <rect x="68" y="146" width="44" height="14" rx="6" fill="rgba(107,61,22,1)" />
                    <rect x="54" y="160" width="72" height="18" rx="8" fill="rgba(84,47,17,1)" />

                    {Array.from({ length: particleCount + 4 }).map((_, i) => {
                        const x = 90 + Math.cos((i / (particleCount + 4)) * Math.PI * 2) * (18 + (i % 3) * 8);
                        const y = 92 + Math.sin((i / (particleCount + 4)) * Math.PI * 2) * (14 + (i % 4) * 7);

                        return (
                            <motion.circle
                                key={i}
                                r={i % 4 === 0 ? 2.2 : 1.3}
                                fill={color}
                                initial={{ cx: x, cy: y, opacity: 0.25 }}
                                animate={{
                                    cx: [x, x + (i % 2 === 0 ? 4 : -4), x],
                                    cy: [y, y + (i % 3 === 0 ? -6 : 6), y],
                                    opacity: [0.2, 0.92, 0.25],
                                    scale: [0.7, 1.25, 0.7],
                                }}
                                transition={{
                                    duration: 2.2 + (i % 5) * 0.28,
                                    repeat: Infinity,
                                    delay: i * 0.08,
                                }}
                            />
                        );
                    })}
                </motion.g>
            </svg>
        );
    }

    const lanternFill = 0.3 + fillRatio * 0.7;

    return (
        <svg viewBox="0 0 180 220" className="w-full h-full overflow-visible" aria-hidden="true">
            <defs>
                <linearGradient id={`lantern-${house}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="white" stopOpacity={0.9 * lanternFill} />
                    <stop offset="35%" stopColor={color} stopOpacity={0.85 * lanternFill} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.12 * lanternFill} />
                </linearGradient>
                <filter id={`glow-${house}`} x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="12" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            <motion.g animate={{ scale: pulseScale }} transition={{ duration: 3, repeat: Infinity }}>
                <ellipse
                    cx="90"
                    cy="198"
                    rx="44"
                    ry="9"
                    fill={color}
                    fillOpacity={isLeading ? 0.18 : 0.08}
                    filter={`url(#glow-${house})`}
                />
                <path d="M72 30 Q90 14 108 30" stroke="rgba(146,94,35,1)" strokeWidth="6" fill="none" strokeLinecap="round" />
                <rect x="58" y="40" width="64" height="102" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
                <rect x="50" y="34" width="80" height="12" rx="6" fill="rgba(102,61,19,1)" />
                <rect x="50" y="140" width="80" height="14" rx="7" fill="rgba(102,61,19,1)" />
                <rect x="60" y="48" width="60" height="86" rx="8" fill={`url(#lantern-${house})`} filter={`url(#glow-${house})`} />

                <motion.path
                    d="M90 118 C73 104 72 84 90 70 C108 84 107 104 90 118 Z"
                    fill={color}
                    fillOpacity={0.18 + 0.4 * fillRatio}
                    animate={{
                        d: [
                            "M90 118 C73 104 72 84 90 70 C108 84 107 104 90 118 Z",
                            "M90 118 C70 102 74 80 90 66 C106 80 110 102 90 118 Z",
                            "M90 118 C73 104 72 84 90 70 C108 84 107 104 90 118 Z",
                        ],
                    }}
                    transition={{ duration: 2.4, repeat: Infinity }}
                />

                {Array.from({ length: particleCount }).map((_, i) => (
                    <motion.circle
                        key={i}
                        r={i % 3 === 0 ? 2 : 1.2}
                        fill={color}
                        initial={{ cx: 90, cy: 108, opacity: 0 }}
                        animate={{
                            cx: [90, 76 + (i * 6) % 28, 90 + (i % 2 === 0 ? 8 : -8)],
                            cy: [114, 86 - (i % 4) * 12, 54],
                            opacity: [0, 0.95, 0],
                        }}
                        transition={{
                            duration: 2.5 + (i % 3) * 0.2,
                            repeat: Infinity,
                            delay: i * 0.14,
                        }}
                    />
                ))}
            </motion.g>
        </svg>
    );
}

function HallCard({
    houseKey,
    points,
    rank,
    maxPoints,
}: {
    houseKey: HouseKey;
    points: number;
    rank: number;
    maxPoints: number;
}) {
    const config = HOUSE_CONFIG[houseKey];
    const fillRatio = clamp(points / maxPoints);
    const isLeading = points === maxPoints && maxPoints > 0;
    const status = getHouseStatus(rank, config.status);

    return (
        <motion.article
            className="relative rounded-[2.1rem] overflow-visible"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: rank * 0.08 }}
            aria-label={`${config.title}: ${points.toLocaleString()} נקודות${isLeading ? ", מוביל" : ""}`}
        >
            <div className="absolute inset-0 rounded-[2.1rem] bg-[linear-gradient(180deg,rgba(34,40,62,0.95),rgba(9,11,20,0.98))]" />
            <div className="absolute inset-0 rounded-[2.1rem] border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.45)]" />
            <div className="absolute inset-[8px] rounded-[1.7rem] border border-white/5" />

            <div className="absolute inset-0 opacity-80 pointer-events-none">
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/[0.05] to-transparent" />
                <div className="absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-white/[0.03] to-transparent" />
                <div className="absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-white/[0.03] to-transparent" />
            </div>

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[78%] h-32 rounded-b-[2rem] bg-white/[0.03] blur-2xl pointer-events-none" />

            {isLeading && <LeaderHalo rgb={config.rgb} />}

            <div className="relative z-10 px-5 pb-5 md:px-6 md:pb-6">
                {isLeading && (
                    <motion.div
                        className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full border px-2.5 py-[3px] text-[9px] font-black tracking-[0.25em] uppercase backdrop-blur-md whitespace-nowrap z-20"
                        style={{
                            color: config.color,
                            borderColor: `rgba(${config.rgb},0.35)`,
                            background: `rgba(${config.rgb},0.10)`,
                            boxShadow: `0 0 22px rgba(${config.rgb},0.16)`,
                        }}
                        animate={{ opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 2.2, repeat: Infinity }}
                    >
                        ✦ Hall Favours This House
                    </motion.div>
                )}

                <div className="relative h-[168px] md:h-[176px]">
                    <div className="mx-auto mb-5 h-2 w-24 rounded-full bg-gradient-to-r from-transparent via-amber-300/35 to-transparent" />

                    <HouseBanner house={houseKey} isLeading={isLeading} />
                </div>

                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div
                            className="grid place-items-center w-12 h-12 rounded-2xl border border-white/10 bg-white/5 text-2xl"
                            style={{ boxShadow: `0 0 20px rgba(${config.rgb},0.14)` }}
                        >
                            <span role="img" aria-label={config.title}>
                                {config.icon}
                            </span>
                        </div>

                        <div>
                            <div
                                className="font-cinzel text-[12px] md:text-[13px] font-black tracking-[0.22em] uppercase"
                                style={{ color: config.color }}
                            >
                                {config.title}
                            </div>
                            <div className="mt-1 text-[11px] text-white/50 leading-5">
                                {isLeading ? config.leaderLine : status}
                            </div>
                        </div>
                    </div>

                    <div className="text-left">
                        <div className="text-[10px] tracking-[0.25em] uppercase text-white/28 font-black">Rank</div>
                        <div className="text-white/85 text-lg font-black font-cinzel">#{rank + 1}</div>
                    </div>
                </div>

                <div className="relative mt-6">
                    <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_65%)] pointer-events-none" />
                    <div className="mx-auto w-full max-w-[240px] h-[280px] relative">
                        <RelicShape house={houseKey} fillRatio={fillRatio} isLeading={isLeading} />
                    </div>
                </div>


                <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-black/20 backdrop-blur-xl px-4 py-4">
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <div className="text-[10px] tracking-[0.25em] uppercase text-white/30 font-black">
                                House Points
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={points}
                                    initial={{ y: 14, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -14, opacity: 0 }}
                                    transition={{ duration: 0.28 }}
                                    className="mt-1 text-3xl md:text-4xl font-black text-white font-cinzel tabular-nums"
                                >
                                    {points.toLocaleString()}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="text-left min-w-[72px]">
                            <div className="text-[10px] tracking-[0.25em] uppercase text-white/30 font-black">
                                Relic Charge
                            </div>
                            <div className="mt-1 text-lg font-black font-cinzel" style={{ color: config.color }}>
                                {Math.round(fillRatio * 100)}%
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 h-2 rounded-full bg-white/6 overflow-hidden">
                        <motion.div
                            className="h-full rounded-full"
                            style={{
                                background: `linear-gradient(90deg, rgba(${config.rgb},0.42), rgba(${config.rgb},0.98))`,
                                boxShadow: `0 0 18px rgba(${config.rgb},0.26)`,
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(fillRatio * 100, points > 0 ? 8 : 0)}%` }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                        />
                    </div>
                </div>
            </div>
        </motion.article>
    );
}

export default function HouseRelicsBoardGreatHall() {
    const supabase = createClient();
    const [points, setPoints] = useState<Record<HouseKey, number>>(BASE_POINTS);

    const fetchPoints = useCallback(async () => {
        const { data, error } = await supabase
            .from("profiles")
            .select("house, points_contributed");

        if (error) return;

        const calculated = (data ?? []).reduce(
            (acc, curr: { house: HouseKey | null; points_contributed: number | null }) => {
                if (curr.house && acc[curr.house] !== undefined) {
                    acc[curr.house] += curr.points_contributed || 0;
                }
                return acc;
            },
            { ...BASE_POINTS }
        );

        setPoints(calculated);
    }, [supabase]);

    useEffect(() => {
        fetchPoints();

        const channel = supabase
            .channel("house_relics_board_great_hall")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "profiles" },
                fetchPoints
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchPoints, supabase]);

    const orderedKeys = useMemo(() => rankHouses(points), [points]);
    const maxPoints = Math.max(...Object.values(points), 1);

    return (
        <section
            dir="rtl"
            aria-label="גביע הבתים - האולם הגדול"
            className="relative w-full max-w-7xl mx-auto px-4 py-12 md:py-16"
        >
            <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(84,97,176,0.16),transparent_28%),linear-gradient(180deg,rgba(5,8,18,0.45),rgba(3,5,12,0.88))]" />

                <div className="absolute inset-y-0 left-[8%] w-[1px] bg-white/5" />
                <div className="absolute inset-y-0 left-[32%] w-[1px] bg-white/5" />
                <div className="absolute inset-y-0 right-[32%] w-[1px] bg-white/5" />
                <div className="absolute inset-y-0 right-[8%] w-[1px] bg-white/5" />

                <div className="absolute top-0 left-[4%] right-[4%] h-24 rounded-b-[2rem] border-b border-white/6 bg-white/[0.02]" />
                <TorchGlow side="left" />
                <TorchGlow side="right" />
                <MagicalDust />
            </div>

            <div className="relative z-10">
                <div className="text-center mb-10 md:mb-14">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md">
                        <span className="text-[10px] tracking-[0.32em] text-white/55 font-black uppercase">
                            The Great Hall
                        </span>
                    </div>

                    <h2 className="mt-4 text-3xl md:text-5xl font-black text-white font-cinzel tracking-wide">
                        גביע הבתים
                    </h2>

                    <p className="mt-3 text-sm md:text-base text-white/55 max-w-2xl mx-auto leading-7">
                        הרליקים של ארבעת הבתים ניצבים באולם הגדול, וכל נקודה ממלאת אותם בעוצמה,
                        אור וגאווה.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">
                    {orderedKeys.map((houseKey, index) => (
                        <HallCard
                            key={houseKey}
                            houseKey={houseKey}
                            points={points[houseKey]}
                            rank={index}
                            maxPoints={maxPoints}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}