"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Compass, Footprints, Flame } from "lucide-react";

/**
 * LUMOS IL — מפת הקונדסאים V2
 * ✅ אזורים חיים — ספירת קוסמים לפי מיקום (מ-online_users)
 * ✅ פעילות אחרונה — פוסטים, רכישות, הצטרפויות
 * ✅ עיצוב קלף קסמים — HP atmosphere מלא
 */

const HOUSE_NAMES: Record<string, string> = {
    Gryffindor: 'גריפינדור',
    Slytherin: "סלית'רין",
    Ravenclaw: 'רייבנקלו',
    Hufflepuff: 'הפלפאף',
};

const HOUSE_COLORS: Record<string, string> = {
    Gryffindor: "#dc2626",
    Slytherin: "#059669",
    Ravenclaw: "#2563eb",
    Hufflepuff: "#d97706",
    Guest: "#8b6914",
};

const ZONES = [
    { key: "באולם הגדול", icon: "🏰", label: "האולם הגדול", path: "/home" },
    { key: "בפורומים", icon: "📜", label: "פורום הקסמים", path: "/forums" },
    { key: "בסמטת דיאגון", icon: "🛍️", label: "סמטת דיאגון", path: "/shop" },
    { key: "בנביא היומי", icon: "📰", label: "הנביא היומי", path: "/news" },
    { key: "בחדר המועדון", icon: "⚗️", label: "חדר המועדון", path: "/dashboard" },
    { key: "במפת הקונדסאים", icon: "🗺️", label: "מפת הקונדסאים", path: "/map" },
    { key: "במסדרונות", icon: "🕯️", label: "המסדרונות", path: "/" },
];

function timeAgo(dateString: string) {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return "ממש עכשיו";
    if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק'`;
    if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שעות`;
    return `לפני ${Math.floor(diff / 86400)} ימים`;
}

export default function MaraudersMasterMap() {
    const [supabase] = useState(() => createClient());
    const [zones, setZones] = useState<Record<string, number>>({});
    const [totalOnline, setTotal] = useState(0);
    const [activity, setActivity] = useState<any[]>([]);
    const [steps, setSteps] = useState<any[]>([]);
    const [topHouse, setTopHouse] = useState<string>("Guest");
    const [tick, setTick] = useState(0);
    const [onlineNamedUsers, setOnlineNamedUsers] = useState<any[]>([]);

    /* ── Fetch zone counts ── */
    const fetchZones = useCallback(async () => {
        const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data } = await supabase
            .from("online_users")
            .select("id, user_name, location_label, house")
            .gte("last_seen", cutoff)
            .order("last_seen", { ascending: false });

        if (!data) return;

        const counts: Record<string, number> = {};
        const houseCounts: Record<string, number> = {};

        data.forEach((u: any) => {
            const loc = u.location_label || "במסדרונות";
            counts[loc] = (counts[loc] || 0) + 1;
            if (u.house && u.house !== "Guest") {
                houseCounts[u.house] = (houseCounts[u.house] || 0) + 1;
            }
        });

        setZones(counts);
        setTotal(data.length);

        const top = Object.entries(houseCounts).sort(([, a], [, b]) => b - a)[0];
        if (top) setTopHouse(top[0]);

        // Enrich members with group color
        const members = (data || []).filter((u: any) => !String(u.id).startsWith("guest_")).slice(0, 15);
        const memberIds = members.map((u: any) => u.id).filter(Boolean);
        let grpMap: Record<string, string | null> = {};
        if (memberIds.length > 0) {
            const { data: profs } = await supabase
                .from("profiles")
                .select("id, user_groups(name, color)")
                .in("id", memberIds);
            if (profs) {
                profs.forEach((p: any) => {
                    const g = p.user_groups as { color: string } | null;
                    grpMap[p.id] = g?.color || null;
                });
            }
        }
        setOnlineNamedUsers(members.map((u: any) => ({ ...u, group_color: grpMap[u.id] || null })));
    }, [supabase]);

    /* ── Fetch recent activity ── */
    const fetchActivity = useCallback(async () => {
        const results: any[] = [];

        // פוסטים אחרונים בפורום
        const { data: posts } = await supabase
            .from("forum_posts")
            .select("id, created_at, profiles(full_name, house)")
            .order("created_at", { ascending: false })
            .limit(4);

        posts?.forEach((p: any) => {
            results.push({
                id: "post_" + p.id,
                type: "post",
                icon: "📜",
                text: `${p.profiles?.full_name || "קוסמ׳"} כתב׳ בפורום`,
                house: p.profiles?.house,
                time: p.created_at,
            });
        });

        // הצטרפויות חדשות
        const { data: newMembers } = await supabase
            .from("profiles")
            .select("id, full_name, house, created_at")
            .not("house", "is", null)
            .not("house", "eq", "Unsorted")
            .order("created_at", { ascending: false })
            .limit(3);

        newMembers?.forEach((m: any) => {
            results.push({
                id: "member_" + m.id,
                type: "join",
                icon: "✨",
                text: `${m.full_name || "קוסמ׳"} הצטרפ׳ לבית ${HOUSE_NAMES[m.house] || m.house}`,
                house: m.house,
                time: m.created_at,
            });
        });

        // רכישות
        const { data: threads } = await supabase
            .from("threads")
            .select("id, title, created_at, profiles(full_name, house)")
            .order("created_at", { ascending: false })
            .limit(3);

        threads?.forEach((t: any) => {
            results.push({
                id: "thread_" + t.id,
                threadId: t.id,
                type: "thread",
                icon: "🔮",
                text: `${t.profiles?.full_name || "קוסמ׳"} פתח׳ שרשור חדש`,
                house: t.profiles?.house,
                time: t.created_at,
                sub: t.title,
            });
        });

        results.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setActivity(results.slice(0, 8));
    }, [supabase]);

    useEffect(() => { fetchZones(); fetchActivity(); }, [fetchZones, fetchActivity]);

    // refresh every 15s
    useEffect(() => {
        const interval = setInterval(() => {
            fetchZones();
            setTick(t => t + 1);
        }, 15000);
        return () => clearInterval(interval);
    }, [fetchZones]);

    const activityRef = useRef<any[]>([]);
    useEffect(() => { activityRef.current = activity; }, [activity]);

    // Animated footsteps — משתמשים אמיתיים מהפעילות
    useEffect(() => {
        const interval = setInterval(() => {
            const current = activityRef.current;
            const activeUser = current.length > 0
                ? current[Math.floor(Math.random() * current.length)]
                : null;
            const house = activeUser?.house || Object.keys(HOUSE_COLORS).filter(h => h !== "Guest")[Math.floor(Math.random() * 4)];

            const angle = Math.random() * 360;
            const startX = Math.random() * 75 + 5;
            const startY = Math.random() * 65 + 5;
            const rad = (angle * Math.PI) / 180;
            const stepSize = 2.8;

            const newSteps: any[] = [];
            for (let i = 0; i < 4; i++) {
                const tx = startX + Math.cos(rad) * stepSize * i;
                const ty = startY + Math.sin(rad) * stepSize * i;
                const sideOffset = 0.8;
                const perpX = -Math.sin(rad) * sideOffset;
                const perpY = Math.cos(rad) * sideOffset;

                newSteps.push({
                    id: Math.random() + `_${i}_L`,
                    x: tx - perpX, y: ty - perpY,
                    angle, house, isLeft: true,
                    delay: i * 220,
                    size: 16 + Math.random() * 4,
                    opacity: 1 - i * 0.15,
                });
                newSteps.push({
                    id: Math.random() + `_${i}_R`,
                    x: tx + perpX + Math.cos(rad) * 1.4,
                    y: ty + perpY + Math.sin(rad) * 1.4,
                    angle, house, isLeft: false,
                    delay: i * 220 + 110,
                    size: 16 + Math.random() * 4,
                    opacity: 1 - i * 0.15,
                });
            }

            setSteps(prev => [...prev.slice(-80), ...newSteps]);
        }, 800);
        return () => clearInterval(interval);
    }, []);

    const topZone = Object.entries(zones).sort(([, a], [, b]) => b - a)[0];

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=IM+Fell+English:ital@0;1&family=Cinzel:wght@400;600&display=swap');

                .mm-root {
                    min-height: 100vh;
                    background:
                        radial-gradient(ellipse at 15% 30%, rgba(101,67,20,0.25) 0%, transparent 55%),
                        radial-gradient(ellipse at 85% 70%, rgba(80,50,15,0.2) 0%, transparent 50%),
                        #0e0800;
                    padding: 32px 16px;
                    direction: rtl;
                    position: relative;
                    overflow: hidden;
                }

                .mm-grid {
                    position: absolute; inset: 0; pointer-events: none; z-index: 1;
                    opacity: 0.03;
                    background-image:
                        repeating-linear-gradient(0deg, transparent, transparent 40px, #c8a84b 40px, #c8a84b 41px),
                        repeating-linear-gradient(90deg, transparent, transparent 40px, #c8a84b 40px, #c8a84b 41px);
                }

                .mm-vignette {
                    position: absolute; inset: 0; pointer-events: none; z-index: 2;
                    background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%);
                }

                /* Footsteps */
                @keyframes step-fade {
                    0%   { opacity: 0; transform: scale(0.3) rotate(var(--rot)); }
                    12%  { opacity: var(--max-opacity); transform: scale(1.2) rotate(var(--rot)); filter: drop-shadow(0 0 8px var(--hc)); }
                    40%  { opacity: calc(var(--max-opacity) * 0.9); transform: scale(1) rotate(var(--rot)); filter: drop-shadow(0 0 5px var(--hc)); }
                    75%  { opacity: calc(var(--max-opacity) * 0.4); }
                    100% { opacity: 0; transform: scale(0.8) rotate(var(--rot)); }
                }

                @keyframes glow-ring {
                    0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.5); }
                    20%  { opacity: 0.6; transform: translate(-50%,-50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%,-50%) scale(2.5); }
                }

                .mm-step {
                    position: absolute; pointer-events: none;
                    animation: step-fade 3.5s ease-out forwards;
                }

                .mm-step-glow {
                    position: absolute;
                    width: 32px; height: 32px;
                    border-radius: 50%;
                    top: 50%; left: 50%;
                    border: 1px solid var(--hc);
                    animation: glow-ring 3.5s ease-out forwards;
                    pointer-events: none;
                }

                /* Parchment card */
                .mm-parchment {
                    background:
                        radial-gradient(ellipse at 20% 10%, #f7edd5 0%, #e8d5a3 45%, #cdb273 100%);
                    border-radius: 3px;
                    box-shadow:
                        0 0 0 1px #7a5c14,
                        0 0 0 4px #f0e0b0,
                        0 0 0 5px #7a5c14,
                        12px 16px 50px rgba(0,0,0,0.6),
                        inset 0 0 80px rgba(160,120,20,0.08);
                    position: relative;
                }
                .mm-parchment::before {
                    content: '';
                    position: absolute; inset: 10px;
                    border: 1px solid rgba(122,92,20,0.28);
                    border-radius: 2px; pointer-events: none;
                }

                .mm-title {
                    font-family: 'UnifrakturMaguntia', cursive;
                    font-size: clamp(1.6rem, 3.5vw, 2.2rem);
                    color: #2c1304;
                    text-shadow: 1px 1px 0 rgba(255,240,200,0.5);
                    line-height: 1.1;
                }
                .mm-subtitle {
                    font-family: 'IM Fell English', Georgia, serif;
                    font-style: italic;
                    font-size: 0.7rem;
                    color: #5e3a10;
                    letter-spacing: 0.06em;
                    opacity: 0.85;
                }
                .mm-section-title {
                    font-family: 'Cinzel', serif;
                    font-size: 0.65rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                    color: #6b4010;
                    border-bottom: 1px solid rgba(122,92,20,0.3);
                    padding-bottom: 8px;
                    margin-bottom: 14px;
                }
                .mm-ornament {
                    text-align: center;
                    color: #9a7020;
                    letter-spacing: 8px;
                    opacity: 0.5;
                    font-size: 0.9rem;
                    user-select: none;
                }

                /* Zone card */
                .mm-zone {
                    background: rgba(139,100,20,0.06);
                    border: 1px solid rgba(122,92,20,0.2);
                    border-radius: 4px;
                    padding: 10px 14px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    transition: background 0.2s;
                }
                .mm-zone:hover { background: rgba(139,100,20,0.12); }
                .mm-zone-count {
                    font-family: 'UnifrakturMaguntia', cursive;
                    font-size: 1.5rem;
                    color: #2c1304;
                    line-height: 1;
                    min-width: 28px;
                    text-align: center;
                }
                .mm-zone-count.active { color: #7a1a0a; }

                /* Activity item */
                .mm-activity {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    padding: 9px 0;
                    border-bottom: 1px solid rgba(122,92,20,0.12);
                }
                .mm-activity:last-child { border-bottom: none; }
                .mm-activity-icon {
                    width: 28px; height: 28px;
                    background: rgba(139,100,20,0.1);
                    border: 1px solid rgba(122,92,20,0.2);
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 0.85rem;
                    flex-shrink: 0;
                }

                /* Compass */
                @keyframes compass-turn {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                .mm-compass { animation: compass-turn 12s linear infinite; }

                /* Ink dot pulse */
                @keyframes ink-pulse {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50%       { opacity: 1;   transform: scale(1.3); }
                }
                .mm-dot { animation: ink-pulse 2s ease-in-out infinite; }
            `}</style>

            <div className="mm-root">
                <div className="mm-grid" />
                <div className="mm-vignette" />

                {/* Footsteps */}
                <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}>
                    {steps.map(s => {
                        const color = HOUSE_COLORS[s.house] || HOUSE_COLORS.Guest;
                        const rotDeg = s.angle + (s.isLeft ? -15 : 15);
                        return (
                            <div key={s.id} className="mm-step"
                                style={{
                                    left: `${s.x}%`, top: `${s.y}%`,
                                    color,
                                    animationDelay: `${s.delay}ms`,
                                    "--hc": color,
                                    "--rot": `${rotDeg}deg`,
                                    "--max-opacity": s.opacity ?? 1,
                                } as React.CSSProperties}
                            >
                                <div className="mm-step-glow" style={{ "--hc": color } as React.CSSProperties} />
                                <Footprints
                                    size={s.size || 16}
                                    style={{
                                        transform: `scaleX(${s.isLeft ? 1 : -1}) rotate(${s.angle}deg)`,
                                        filter: `drop-shadow(0 0 4px ${color})`,
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Main content */}
                <div className="relative z-10 max-w-5xl mx-auto space-y-6">

                    {/* Header */}
                    <div className="mm-parchment p-6 md:p-8">
                        <div className="flex items-start justify-between relative z-10">
                            <div>
                                <div className="mm-title">פיקוד הקונדסאים</div>
                                <div className="mm-subtitle mt-1">
                                    Messrs. Moony, Wormtail, Padfoot and Prongs are proud to present…
                                </div>
                            </div>
                            <div className="text-center">
                                <Compass className="mm-compass text-amber-800" size={28} />
                                <div style={{ fontFamily: "'UnifrakturMaguntia', cursive", fontSize: "2rem", color: "#2c1304", lineHeight: 1 }}>
                                    {totalOnline}
                                </div>
                                <div className="mm-subtitle">קוסמים</div>
                            </div>
                        </div>

                        {/* Stats strip */}
                        {totalOnline > 0 && (
                            <div className="relative z-10 mt-4 flex flex-wrap gap-4 text-sm" style={{ fontFamily: "'IM Fell English', serif", color: "#54340f" }}>
                                {topZone && (
                                    <span>🗺️ האזור הפעיל ביותר: <strong>{topZone[0]}</strong> ({topZone[1]} קוסמים)</span>
                                )}
                                {topHouse !== "Guest" && (
                                    <span style={{ color: HOUSE_COLORS[topHouse] }}>
                                        ✦ הבית הפעיל: <strong>{topHouse}</strong>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Two columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* ── Left column: Zones + Who's Online ── */}
                        <div className="flex flex-col gap-6">

                        {/* ── Zones ── */}
                        <div className="mm-parchment p-6">
                            <div className="relative z-10">
                                <div className="mm-section-title flex items-center gap-2">
                                    <Footprints size={12} /> אזורי הטירה
                                </div>
                                <div className="space-y-2.5">
                                    {ZONES.map(zone => {
                                        const count = zones[zone.key] || 0;
                                        const isMapZone = zone.key === "במפת הקונדסאים";
                                        const displayCount = isMapZone ? totalOnline : count;
                                        return (
                                            <Link key={zone.key} href={zone.path}
                                                className="mm-zone block hover:scale-[1.01] transition-transform">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{zone.icon}</span>
                                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: "0.8rem", fontWeight: 600, color: "#2c1304" }}>
                                                            {zone.label}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {displayCount > 0 && (
                                                            <div className="mm-dot w-2 h-2 rounded-full"
                                                                style={{ background: "#7a1a0a" }} />
                                                        )}
                                                        <div className={`mm-zone-count ${displayCount > 0 ? "active" : ""}`}>
                                                            {displayCount > 0 ? displayCount : "—"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* ── Who's Online ── */}
                        <div className="mm-parchment p-6" style={{ flex: 1 }}>
                            <div className="relative z-10">
                                <div className="mm-section-title flex items-center gap-2">
                                    <span>✦</span> מחוברים עכשיו
                                    <span className="mr-auto font-cinzel text-xs" style={{ color: "#7a5a18" }}>{totalOnline} סה"כ</span>
                                </div>
                                {onlineNamedUsers.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "12px 0", fontStyle: "italic", color: "#7a5a18", opacity: 0.6, fontFamily: "'IM Fell English', serif", fontSize: "0.85rem" }}>
                                        הטירה שקטה...
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                                        {onlineNamedUsers.map((u: any) => {
                                            const color = HOUSE_COLORS[u.house] ?? HOUSE_COLORS.Guest;
                                            const nameColor = u.group_color || color;
                                            const houseIcon = ({ Gryffindor: "🦁", Slytherin: "🐍", Ravenclaw: "🦅", Hufflepuff: "🦡" } as Record<string,string>)[u.house] || "🧙";
                                            return (
                                                <Link
                                                    key={u.id}
                                                    href={`/wizard/${u.id}`}
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "4px",
                                                        padding: "3px 8px",
                                                        borderRadius: "8px",
                                                        fontSize: "0.72rem",
                                                        fontFamily: "'Cinzel', serif",
                                                        fontWeight: 700,
                                                        color: nameColor,
                                                        background: `${nameColor}18`,
                                                        border: `1px solid ${nameColor}35`,
                                                        textDecoration: "none",
                                                    }}
                                                >
                                                    <span>{houseIcon}</span>
                                                    {u.user_name}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        </div>{/* end left column */}

                        {/* ── Activity (right column) ── */}
                        <div className="mm-parchment p-6">
                            <div className="relative z-10">
                                <div className="mm-section-title flex items-center gap-2">
                                    <Flame size={12} /> פעילות אחרונה בטירה
                                </div>
                                {activity.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "32px 0", fontStyle: "italic", color: "#7a5a18", opacity: 0.6, fontFamily: "'IM Fell English', serif" }}>
                                        הטירה שקטה... לעת עתה
                                    </div>
                                ) : (
                                    <div>
                                        {activity.map(item => {
                                            const color = item.house ? HOUSE_COLORS[item.house] : HOUSE_COLORS.Guest;
                                            const threadHref = item.type === 'thread' && item.threadId
                                                ? `/forums/thread/${item.threadId}`
                                                : null;
                                            return (
                                                <div key={item.id} className="mm-activity">
                                                    <div className="mm-activity-icon">{item.icon}</div>
                                                    <div className="flex-1 min-w-0">
                                                        {/* שם + פעולה — לא לחיץ */}
                                                        <div style={{ fontFamily: "'IM Fell English', serif", fontSize: "0.88rem", color: "#2c1304", lineHeight: 1.3 }}>
                                                            <span style={{ color, fontWeight: "bold" }}>
                                                                {item.text.split(" ")[0]}{" "}
                                                            </span>
                                                            {item.text.split(" ").slice(1).join(" ")}
                                                        </div>
                                                        {/* כותרת אשכול — לחיצה בלבד */}
                                                        {item.sub && (
                                                            threadHref ? (
                                                                <Link href={threadHref}
                                                                    className="block hover:underline"
                                                                    style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "0.78rem", color: "#7a1a0a", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                    ← "{item.sub}"
                                                                </Link>
                                                            ) : (
                                                                <div style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "0.75rem", color: "#7a4010", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                    "{item.sub}"
                                                                </div>
                                                            )
                                                        )}
                                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: "0.62rem", color: "#9a7020", marginTop: "3px", letterSpacing: "0.05em" }}>
                                                            {timeAgo(item.time)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer ornament */}
                    <div className="mm-parchment p-4 text-center">
                        <div className="mm-ornament relative z-10">✦ &nbsp; הפקוד מתעדכן כל 15 שניות &nbsp; ✦</div>
                        <div className="mm-subtitle relative z-10 text-center mt-1" style={{ color: "#7a5a18" }}>
                            "I solemnly swear that I am up to no good."
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}