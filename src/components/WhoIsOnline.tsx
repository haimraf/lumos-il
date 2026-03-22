"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { Users } from "lucide-react";

const HOUSE_THEMES: Record<string, { color: string; icon: string; nameHe: string }> = {
    Gryffindor: { color: "#f87171", icon: "🦁", nameHe: "גריפינדור" },
    Slytherin:  { color: "#34d399", icon: "🐍", nameHe: "סלית'רין" },
    Ravenclaw:  { color: "#60a5fa", icon: "🦅", nameHe: "רייבנקלו" },
    Hufflepuff: { color: "#fbbf24", icon: "🦡", nameHe: "הפלפאף" },
    Unknown:    { color: "rgba(255,255,255,0.35)", icon: "🧙", nameHe: "טרם סווג" },
};

export default function WhoIsOnline() {
    const [supabase] = useState(() => createClient());
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [totalOnline, setTotalOnline] = useState(0);

    useEffect(() => {
        const fetchOnline = async () => {
            const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const { data } = await supabase
                .from("online_users")
                .select("id, user_name, house")
                .gte("last_seen", cutoff)
                .order("last_seen", { ascending: false })
                .limit(20);

            if (!data) return;
            setTotalOnline(data.length);

            const members = data.filter((u: any) => !String(u.id).startsWith("guest_"));

            const userIds = members.map((u: any) => u.id).filter(Boolean);
            let groupMap: Record<string, string | null> = {};
            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, user_groups(name, color)")
                    .in("id", userIds);
                if (profiles) {
                    profiles.forEach((p: any) => {
                        const g = p.user_groups as { color: string } | null;
                        groupMap[p.id] = g?.color || null;
                    });
                }
            }

            setOnlineUsers(members.slice(0, 15).map((u: any) => ({
                ...u,
                group_color: groupMap[u.id] || null,
            })));
        };

        fetchOnline();
        const interval = setInterval(fetchOnline, 60_000);
        return () => clearInterval(interval);
    }, [supabase]);

    if (onlineUsers.length === 0 && totalOnline === 0) return null;

    return (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
            <div className="rounded-2xl p-5 border" style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Users size={14} style={{ color: "#34d399" }} />
                        <span className="font-cinzel text-xs font-black uppercase tracking-widest text-emerald-400/70">מחוברים עכשיו</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.18)" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-cinzel text-xs font-black text-emerald-400">{totalOnline}</span>
                    </div>
                </div>

                {onlineUsers.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5" dir="rtl">
                        {onlineUsers.map((u: any) => {
                            const houseKey = u.house || "Unknown";
                            const houseConf = HOUSE_THEMES[houseKey] || HOUSE_THEMES["Unknown"];
                            const nameColor = u.group_color || houseConf.color;
                            return (
                                <Link
                                    key={u.id}
                                    href={`/wizard/${u.id}`}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all hover:opacity-75"
                                    style={{
                                        background: `${nameColor}12`,
                                        border: `1px solid ${nameColor}28`,
                                        color: nameColor,
                                    }}
                                    title={houseConf.nameHe}
                                >
                                    <span className="text-sm leading-none">{houseConf.icon}</span>
                                    {u.user_name}
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-xs text-white/20 italic text-center py-2">רק אורחים מחוברים כעת</p>
                )}
            </div>
        </div>
    );
}
