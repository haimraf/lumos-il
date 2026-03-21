"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Footprints, ChevronLeft, Compass } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getRoleColorFromDB } from "@/lib/roleColor";

const HOUSE_COLORS: Record<string, string> = {
    Gryffindor: "#dc2626",
    Slytherin: "#059669",
    Ravenclaw: "#2563eb",
    Hufflepuff: "#d97706",
    Guest: "#8b6914",
};

export default function MaraudersRadar() {
    const [supabase] = useState(() => createClient());
    const { profile } = useAuth();
    const [onlineCount, setOnlineCount] = useState(0);
    const [recentUsers, setRecentUsers] = useState<{ user_name: string; house: string; group_name: string | null; group_color: string | null }[]>([]);
    const [roleColors, setRoleColors] = useState<Record<string, string>>({});
    useEffect(() => { getRoleColorFromDB(supabase).then(setRoleColors); }, [supabase]);

    useEffect(() => {
        const fetchOnlineData = async () => {
            const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 minutes
            const { data, error } = await supabase
                .from("online_users")
                .select("user_name, house, user_id")
                .gte("last_seen", cutoff)
                .order("last_seen", { ascending: false })
                .limit(5);

            if (!error && data) {
                setOnlineCount(data.length);
                // Enrich with group info via JOIN
                const userIds = data.map((u: any) => u.user_id).filter(Boolean);
                let groupMap: Record<string, { group_name: string | null; group_color: string | null }> = {};
                if (userIds.length) {
                    const { data: profiles } = await supabase
                        .from("profiles")
                        .select("id, user_groups(name, color)")
                        .in("id", userIds);
                    if (profiles) {
                        profiles.forEach((p: any) => {
                            const g = p.user_groups as { name: string; color: string } | null;
                            groupMap[p.id] = { group_name: g?.name || null, group_color: g?.color || null };
                        });
                    }
                }
                setRecentUsers(data.map((u: any) => ({
                    user_name: u.user_name,
                    house: u.house,
                    group_name: groupMap[u.user_id]?.group_name || null,
                    group_color: groupMap[u.user_id]?.group_color || null,
                })));
            }
        };

        fetchOnlineData();
        const interval = setInterval(fetchOnlineData, 10000);
        return () => clearInterval(interval);
    }, [supabase]);

    const houseColor = profile?.house ? (HOUSE_COLORS[profile.house] ?? HOUSE_COLORS.Guest) : HOUSE_COLORS.Guest;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Cinzel:wght@400;600;700&family=IM+Fell+English:ital@0;1&display=swap');

                .radar-root {
                    position: relative;
                    background: radial-gradient(ellipse at 20% 10%, #f7edd5 0%, #e8d5a3 45%, #cdb273 100%);
                    border-radius: 3px;
                    padding: 28px 28px 22px;
                    box-shadow:
                        0 0 0 1px #7a5c14,
                        0 0 0 4px #f0e0b0,
                        0 0 0 5px #7a5c14,
                        0 0 0 7px rgba(100,70,0,0.2),
                        10px 14px 40px rgba(0,0,0,0.35),
                        inset 0 0 60px rgba(160,120,20,0.06);
                    font-family: 'IM Fell English', Georgia, serif;
                    direction: rtl;
                    max-width: 420px;
                    width: 100%;
                    margin: 0 auto;
                    overflow: hidden;
                }

                .radar-root::before {
                    content: '';
                    position: absolute;
                    inset: 8px;
                    border: 1px solid rgba(122,92,20,0.25);
                    border-radius: 2px;
                    pointer-events: none;
                    z-index: 0;
                }

                .radar-root::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 3px;
                    pointer-events: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
                    opacity: 0.5;
                    z-index: 0;
                }

                .radar-content { position: relative; z-index: 1; }

                .radar-title {
                    font-family: 'UnifrakturMaguntia', cursive;
                    font-size: 1.6rem;
                    color: #2c1304;
                    line-height: 1;
                    text-shadow: 1px 1px 0 rgba(255,240,200,0.6), 0 0 20px rgba(160,90,10,0.15);
                }

                .radar-subtitle {
                    font-family: 'IM Fell English', Georgia, serif;
                    font-style: italic;
                    font-size: 0.68rem;
                    color: #5e3a10;
                    letter-spacing: 0.04em;
                    opacity: 0.8;
                    margin-top: 2px;
                }

                .radar-ornament {
                    text-align: center;
                    color: #9a7020;
                    font-size: 0.75rem;
                    letter-spacing: 8px;
                    margin: 12px 0;
                    opacity: 0.5;
                    user-select: none;
                }

                @keyframes radar-compass {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                .radar-compass {
                    animation: radar-compass 10s linear infinite;
                    color: #5e3a10;
                    filter: drop-shadow(0 0 4px rgba(120,80,10,0.35));
                    flex-shrink: 0;
                }

                .radar-count {
                    font-family: 'UnifrakturMaguntia', cursive;
                    font-size: 2rem;
                    color: #2c1304;
                    line-height: 1;
                }

                @keyframes radar-ink {
                    0%, 100% { opacity: 0.5; box-shadow: 0 0 0 0 var(--rc); }
                    50%      { opacity: 1;   box-shadow: 0 0 0 3px transparent; }
                }
                .radar-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    flex-shrink: 0;
                    animation: radar-ink 2s ease-in-out infinite;
                }

                .radar-stat-box {
                    background: rgba(255,255,255,0.3);
                    border: 1px solid rgba(122,92,20,0.2);
                    border-radius: 2px;
                    padding: 12px 14px;
                    text-align: center;
                }

                .radar-stat-label {
                    font-family: 'Cinzel', serif;
                    font-size: 0.6rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #6b4010;
                    margin-bottom: 4px;
                }

                .radar-stat-value {
                    font-family: 'UnifrakturMaguntia', cursive;
                    font-size: 1.5rem;
                    color: #2c1304;
                    line-height: 1;
                }

                .radar-house-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 3px 10px;
                    border-radius: 2px;
                    font-family: 'Cinzel', serif;
                    font-size: 0.72rem;
                    font-weight: 600;
                    border: 1px solid;
                }

                .radar-link {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 12px 16px;
                    background: #2c1304;
                    color: #f0e0b0;
                    border-radius: 2px;
                    font-family: 'Cinzel', serif;
                    font-size: 0.72rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    text-decoration: none;
                    transition: background 0.2s;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                }
                .radar-link:hover { background: #5e3a10; }
                .radar-link:hover .radar-link-arrow { transform: translateX(-3px); }
                .radar-link-arrow { transition: transform 0.2s; }

                .radar-user-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 0;
                    border-bottom: 1px solid rgba(122,92,20,0.12);
                    font-size: 0.88rem;
                    color: #2c1304;
                }
                .radar-user-row:last-child { border-bottom: none; }
            `}</style>

            <div className="radar-root">
                <div className="radar-content">

                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 0 }}>
                        <div>
                            <div className="radar-title">רדאר הטירה</div>
                            <div className="radar-subtitle">Solemnly swear that I am up to no good</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <Compass className="radar-compass" size={22} />
                            <div className="radar-count">{onlineCount}</div>
                            <div className="radar-subtitle" style={{ marginTop: 0 }}>פעילים</div>
                        </div>
                    </div>

                    <div className="radar-ornament">✦ ✦ ✦</div>

                    {/* Stats row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                        <div className="radar-stat-box">
                            <div className="radar-stat-label">גליאונים</div>
                            <div className="radar-stat-value">{profile?.galleons ?? 0}</div>
                        </div>
                        <div className="radar-stat-box">
                            <div className="radar-stat-label">בית</div>
                            {profile?.house ? (
                                <span
                                    className="radar-house-badge"
                                    style={{
                                        color: houseColor,
                                        borderColor: houseColor,
                                        background: `${houseColor}18`,
                                        marginTop: "4px",
                                        display: "inline-flex",
                                    }}
                                >
                                    {profile.house}
                                </span>
                            ) : (
                                <div style={{ fontStyle: "italic", fontSize: "0.8rem", color: "#7a5a18", marginTop: "4px" }}>ללא מיון</div>
                            )}
                        </div>
                    </div>

                    {/* Online users list */}
                    {recentUsers.length > 0 && (
                        <div style={{ marginBottom: "14px" }}>
                            <div className="radar-stat-label" style={{ marginBottom: "6px" }}>נצפו לאחרונה</div>
                            {recentUsers.map((u, i) => {
                                const color = HOUSE_COLORS[u.house] ?? HOUSE_COLORS.Guest;
                                const badgeColor = u.group_color || color;
                                const badgeLabel = u.group_name || u.house || "Guest";
                                return (
                                    <div key={i} className="radar-user-row">
                                        <div
                                            className="radar-dot"
                                            style={{ background: badgeColor, "--rc": badgeColor } as React.CSSProperties}
                                        />
                                        <span style={{ flex: 1 }}>{u.user_name || "אורח מסתורי"}</span>
                                        <span style={{
                                            fontSize: "0.65rem", fontStyle: "italic",
                                            color: badgeColor, fontFamily: "'Cinzel', serif",
                                        }}>{badgeLabel}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* CTA */}
                    <Link href="/map" className="radar-link">
                        <Footprints size={14} />
                        לפתוח את מפת הקונדסאים המלאה
                        <ChevronLeft size={14} className="radar-link-arrow" />
                    </Link>

                </div>
            </div>
        </>
    );
}
