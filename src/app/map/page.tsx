"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
    Footprints,
    Compass,
    Eye,
    Map as MapIcon,
    Laptop,
    Smartphone
} from "lucide-react";

/* ================= TYPES ================= */

type PresenceUser = {
    user_id?: string;
    user_name?: string;
    house?: string;
    current_path?: string;
    location_label?: string;
    user_agent?: string;
    online_at?: string;
    is_afk?: boolean;
    presence_ref?: string;
};

/* ================= CONFIG ================= */

const HOUSE_THEMES: Record<string, { color: string }> = {
    Gryffindor: { color: "text-red-900" },
    Slytherin: { color: "text-emerald-900" },
    Ravenclaw: { color: "text-blue-900" },
    Hufflepuff: { color: "text-amber-800" },
    Unknown: { color: "text-[#8b4513]" }
};

const GHOST_TIMEOUT = 1000 * 60 * 3;

/* ================= HELPERS ================= */

const getLocationName = (path?: string) => {
    if (!path || path === "/" || path === "/home") return "באולם הגדול";
    if (path.includes("/map")) return "מביט/ה במפת הקונדסאים";
    if (path.includes("/shop")) return "בסמטת דיאגון";
    if (path.includes("/forums")) return "בפורומים";
    if (path.includes("/news")) return "בנביא היומי";
    return "במסדרונות";
};

const getWandType = (ua?: string) => {
    if (!ua) return "שרביט עתיק";
    if (ua.includes("Chrome")) return "שרביט כרום";
    if (ua.includes("Firefox")) return "נוצת עוף חול";
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "שיער חד-קרן";
    return "שרביט מותאם";
};

/* ================= COMPONENT ================= */

export default function MaraudersMasterMap() {
    const supabase = createClient();

    const [wizards, setWizards] = useState<PresenceUser[]>([]);
    const [stats, setStats] = useState({ hall: 0, library: 0, wandering: 0 });

    useEffect(() => {
        const channel = supabase.channel("lumos_global_presence", {
            config: { presence: {} }
        });

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState() as Record<string, PresenceUser[]>;

                const now = Date.now();

                /* ================= FLATTEN ================= */
                let all: PresenceUser[] = Object.values(state).flat();

                /* ================= REMOVE GHOSTS ================= */
                all = all.filter((w) => {
                    if (!w.online_at) return true;
                    return now - new Date(w.online_at).getTime() < GHOST_TIMEOUT;
                });

                /* ================= MERGE USERS ================= */
                const map = new Map<string, PresenceUser>();

                for (const w of all) {
                    const key =
                        w.user_id ||
                        w.presence_ref ||
                        w.user_name ||
                        Math.random().toString();

                    const existing = map.get(key);

                    if (!existing) {
                        map.set(key, w);
                    } else {
                        const newTime = new Date(w.online_at || 0).getTime();
                        const oldTime = new Date(existing.online_at || 0).getTime();

                        if (newTime > oldTime) {
                            map.set(key, w);
                        }
                    }
                }

                const uniqueWizards = Array.from(map.values());

                /* ================= SORT ================= */
                uniqueWizards.sort((a, b) => {
                    if (a.is_afk && !b.is_afk) return 1;
                    if (!a.is_afk && b.is_afk) return -1;

                    return (
                        new Date(b.online_at || 0).getTime() -
                        new Date(a.online_at || 0).getTime()
                    );
                });

                setWizards(uniqueWizards);

                /* ================= STATS ================= */
                const hall = uniqueWizards.filter(
                    (p) => p.current_path === "/" || p.current_path === "/map"
                ).length;

                const lib = uniqueWizards.filter((p) =>
                    p.current_path?.includes("/news")
                ).length;

                setStats({
                    hall,
                    library: lib,
                    wandering: uniqueWizards.length - (hall + lib)
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    const getDisplayLocation = (w: PresenceUser) =>
        w.location_label || getLocationName(w.current_path);

    return (
        <div className="min-h-screen bg-[#050505] p-4 md:p-8 text-[#3e2723]" dir="rtl">
            <div className="max-w-6xl mx-auto bg-[#f4e4bc] rounded-[2.5rem] border-[10px] border-double border-[#8b4513]/20">
                <div className="p-6 md:p-10">

                    {/* HEADER */}
                    <div className="flex justify-between mb-10">
                        <div>
                            <h1 className="text-3xl font-black">פיקוד הקונדסאים</h1>
                            <p className="text-sm opacity-70">מפה חיה</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <Compass className="animate-spin" />
                            <span className="text-3xl font-black">
                                {wizards.length}
                            </span>
                        </div>
                    </div>

                    {/* STATS */}
                    <div className="grid grid-cols-3 gap-4 mb-10">
                        <StatCard title="האולם הגדול" count={stats.hall} icon={MapIcon} />
                        <StatCard title="הספרייה" count={stats.library} icon={Eye} />
                        <StatCard title="מסדרונות" count={stats.wandering} icon={Footprints} />
                    </div>

                    {/* TABLE */}
                    <table className="w-full text-right">
                        <thead>
                            <tr>
                                <th>קוסם</th>
                                <th>בית</th>
                                <th>מיקום</th>
                                <th>שרביט</th>
                            </tr>
                        </thead>

                        <tbody>
                            {wizards.map((w, i) => {
                                const theme =
                                    HOUSE_THEMES[w.house || "Unknown"] ||
                                    HOUSE_THEMES["Unknown"];

                                return (
                                    <tr key={i}>
                                        <td className={`font-bold ${theme.color}`}>
                                            {w.user_name || "קוסם"}
                                            {w.is_afk && (
                                                <span className="text-xs opacity-50 ml-2">
                                                    (AFK)
                                                </span>
                                            )}
                                        </td>

                                        <td>{w.house || "Unknown"}</td>

                                        <td>{getDisplayLocation(w)}</td>

                                        <td className="flex items-center gap-2">
                                            {w.user_agent?.includes("Mobi") ? (
                                                <Smartphone size={12} />
                                            ) : (
                                                <Laptop size={12} />
                                            )}
                                            {getWandType(w.user_agent)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, count, icon: Icon }: any) {
    return (
        <div className="p-4 rounded-xl bg-white/20 text-center">
            <Icon className="mx-auto mb-2" />
            <div className="text-xs">{title}</div>
            <div className="text-2xl font-bold">{count}</div>
        </div>
    );
}