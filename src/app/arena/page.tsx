"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useOwlMail } from "@/components/OwlMail";
import { Loader2, Search, Swords, Trophy, Shield, Target, Circle } from "lucide-react";
import Link from "next/link";
import { getDuelStats } from "@/lib/duelStats";

const DUEL_RANKS = [
    { min: 0, label: "מתמחה", color: "#9ca3af", glow: "rgba(156,163,175,0.3)" },
    { min: 3, label: "לוחם", color: "#60a5fa", glow: "rgba(96,165,250,0.3)" },
    { min: 7, label: "מכשף", color: "#a78bfa", glow: "rgba(167,139,250,0.3)" },
    { min: 15, label: "גרנד-מאגוס", color: "#f59e0b", glow: "rgba(245,158,11,0.4)" },
    { min: 30, label: "אגדה", color: "#ef4444", glow: "rgba(239,68,68,0.5)" },
];
function getDuelRank(wins: number) {
    return [...DUEL_RANKS].reverse().find(r => wins >= r.min) || DUEL_RANKS[0];
}

const HOUSE_EMOJI: Record<string, string> = {
    Gryffindor: "🦁", Slytherin: "🐍", Ravenclaw: "🦅", Hufflepuff: "🦡",
};
const HOUSE_COLOR: Record<string, string> = {
    Gryffindor: "#dc2626", Slytherin: "#16a34a", Ravenclaw: "#2563eb", Hufflepuff: "#d97706",
};

export default function ArenaPage() {
    const router = useRouter();
    const { profile } = useAuth();
    const { sendOwl } = useOwlMail();
    const [supabase] = useState(() => createClient());

    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [recentDuels, setRecentDuels] = useState<any[]>([]);
    const [myStats, setMyStats] = useState<any>(null);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [challenging, setChallenging] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
    const [randomTarget, setRandomTarget] = useState<{ id: string; user_name: string; house: string } | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const load = async () => {
            const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();

            const [{ data: lb }, { data: recent }, { data: presence }] = await Promise.all([
                supabase.from("duels")
                    .select("winner_id, winner:profiles!duels_winner_id_fkey(id, full_name, house, duel_badge)")
                    .eq("status", "finished")
                    .not("winner_id", "is", null),
                supabase.from("duels")
                    .select(`id, winner_id, created_at, finished_at,
                        challenger:profiles!duels_challenger_id_fkey(id, full_name, house, avatar_url),
                        opponent:profiles!duels_opponent_id_fkey(id, full_name, house, avatar_url),
                        winner:profiles!duels_winner_id_fkey(full_name)`)
                    .eq("status", "finished")
                    .order("finished_at", { ascending: false })
                    .limit(10),
                supabase.from("online_users")
                    .select("id")
                    .gte("last_seen", since)
                    .eq("presence_type", "member"),
            ]);

            // online set
            const ids = new Set<string>((presence || []).map((p: any) => p.id));
            setOnlineIds(ids);

            // Build leaderboard from raw wins
            if (lb) {
                const map: Record<string, any> = {};
                for (const d of lb) {
                    // PostgREST may return the embed as object or array
                    const w = Array.isArray(d.winner) ? d.winner[0] : d.winner;
                    if (!w?.id) continue;
                    if (!map[w.id]) map[w.id] = { ...w, wins: 0 };
                    map[w.id].wins++;
                }
                const sorted = Object.values(map).sort((a: any, b: any) => b.wins - a.wins).slice(0, 10);
                setLeaderboard(sorted);
            }

            setRecentDuels(recent || []);

            if (profile?.id) {
                const stats = await getDuelStats(supabase, profile.id);
                setMyStats(stats);

                // Calculate win streak from recent duels
                const { data: myDuels } = await supabase.from("duels")
                    .select("winner_id, challenger_id, opponent_id")
                    .eq("status", "finished")
                    .or(`challenger_id.eq.${profile.id},opponent_id.eq.${profile.id}`)
                    .order("finished_at", { ascending: false })
                    .limit(20);
                let streak = 0;
                for (const d of myDuels || []) {
                    if (d.winner_id === profile.id) streak++;
                    else break;
                }
                setCurrentStreak(streak);
            }
            setLoading(false);
        };
        load();

        const handleVisibility = () => { if (!document.hidden) load(); };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.id]);

    const runSearch = useCallback(async (q: string) => {
        if (q.length < 1) { setSearchResults([]); setSearching(false); return; }
        setSearching(true);
        const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const [{ data: users }, { data: presence }] = await Promise.all([
            supabase.from("profiles")
                .select("id, full_name, house, avatar_url, duel_badge")
                .ilike("full_name", `%${q}%`)
                .neq("id", profile?.id || "")
                .limit(8),
            supabase.from("online_users")
                .select("id")
                .gte("last_seen", since)
                .eq("presence_type", "member"),
        ]);
        const liveIds = new Set<string>((presence || []).map((p: any) => p.id));
        setOnlineIds(liveIds);
        setSearchResults(users || []);
        setSearching(false);
    }, [supabase, profile?.id]);

    const handleSearch = (q: string) => {
        setSearchQuery(q);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!q.trim()) { setSearchResults([]); return; }
        setSearching(true);
        debounceRef.current = setTimeout(() => runSearch(q), 280);
    };

    const challengeUser = async (opponentId: string, opponentName: string) => {
        if (!profile?.id) { router.push("/"); return; }
        setChallenging(opponentId);
        const { data, error } = await supabase.rpc("create_duel_challenge_secure", {
            p_opponent_id: opponentId,
        });
        const duelId = data?.duel_id;
        if (!error && duelId) {
            router.push(`/duels/${duelId}`);
        } else {
            sendOwl("שגיאה", error?.message || "לא ניתן ליצור אתגר.", "error");
            setChallenging(null);
        }
    };

    const challengeRandom = async () => {
        if (!profile?.id) return;
        const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: online, error: onlineErr } = await supabase.from("online_users")
            .select("id, user_name, house")
            .gte("last_seen", since)
            .eq("presence_type", "member")
            .neq("id", profile.id)
            .limit(20);
        if (onlineErr) console.error("challengeRandom error:", onlineErr);
        const candidates = (online || []).filter((u: any) => u.id !== profile.id);
        if (!candidates.length) {
            sendOwl("הזירה שקטה", "אף קוסם לא מחובר כרגע. נסה שוב מאוחר יותר.", "error");
            return;
        }
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        setRandomTarget({ id: pick.id, user_name: pick.user_name || "קוסם", house: pick.house || "" });
    };

    if (loading) return (
        <div className="min-h-screen bg-[#060910] flex items-center justify-center">
            <Loader2 className="text-red-400 animate-spin" size={32} />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#060910]" dir="rtl">
            {/* Ambient */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[500px] bg-red-600/[0.04] rounded-full blur-[160px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-amber-500/[0.03] rounded-full blur-[140px]" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 space-y-10">

                {/* ── Header ── */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 mb-2">
                        <Swords size={14} className="text-red-400" />
                        <span className="font-cinzel text-[10px] font-black uppercase tracking-[0.3em] text-red-400/70">זירת הקרבות</span>
                    </div>
                    <h1 className="font-cinzel text-4xl font-black text-white">הזירה</h1>
                    <p className="font-crimson text-white/40 text-lg italic">אתגר קוסמים אחרים לדו-קרב לחשים</p>

                    <div className="flex items-center justify-center gap-3 pt-2">
                        <button onClick={challengeRandom}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl font-cinzel text-sm font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02]"
                            style={{ background: "linear-gradient(135deg, #991b1b, #dc2626)", boxShadow: "0 0 20px rgba(220,38,38,0.3)" }}>
                            <Target size={16} /> אתגר אקראי
                        </button>
                    </div>

                    {/* ── Random target confirmation ── */}
                    {randomTarget && (
                        <div className="mx-auto max-w-sm rounded-2xl p-5 text-center space-y-3 animate-in slide-in-from-bottom-4"
                            style={{ background: "rgba(127,29,29,0.25)", border: "1px solid rgba(220,38,38,0.35)" }}>
                            <p className="font-cinzel text-[10px] uppercase tracking-widest text-red-400/70">יריב נמצא ✦</p>
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black"
                                    style={{ background: HOUSE_COLOR[randomTarget.house] ? `${HOUSE_COLOR[randomTarget.house]}30` : "rgba(255,255,255,0.1)", border: `1px solid ${HOUSE_COLOR[randomTarget.house] || "#ffffff33"}` }}>
                                    {HOUSE_EMOJI[randomTarget.house] || "⚡"}
                                </div>
                                <div className="text-right">
                                    <p className="font-cinzel font-black text-white text-base">{randomTarget.user_name}</p>
                                    <p className="text-xs font-bold" style={{ color: HOUSE_COLOR[randomTarget.house] || "#9ca3af" }}>
                                        {randomTarget.house || "קוסם"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-center pt-1">
                                <button
                                    onClick={() => { challengeUser(randomTarget.id, randomTarget.user_name); setRandomTarget(null); }}
                                    disabled={!!challenging}
                                    className="px-5 py-2 rounded-xl font-cinzel text-sm font-black text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                                    style={{ background: "linear-gradient(135deg, #991b1b, #dc2626)" }}>
                                    {challenging ? "שולח אתגר..." : "⚔️ אתגר!"}
                                </button>
                                <button
                                    onClick={() => setRandomTarget(null)}
                                    className="px-5 py-2 rounded-xl font-cinzel text-sm font-black text-white/40 border border-white/10 hover:border-white/30 transition-all">
                                    ביטול
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── My stats ── */}
                {myStats && profile && (
                    <div className="rounded-2xl p-6"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-cinzel text-xs font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                                <Shield size={13} /> הסטטיסטיקות שלי
                            </h2>
                            {(() => {
                                const rank = getDuelRank(myStats.wins);
                                return (
                                    <span className="font-cinzel text-[10px] font-black px-3 py-1 rounded-full"
                                        style={{ color: rank.color, background: `${rank.glow}20`, border: `1px solid ${rank.color}40`, textShadow: `0 0 8px ${rank.glow}` }}>
                                        ✦ {rank.label}
                                    </span>
                                );
                            })()}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                            {[
                                { label: "ניצחונות", value: myStats.wins, color: "#16a34a" },
                                { label: "הפסדים", value: myStats.losses, color: "#dc2626" },
                                { label: "תיקו", value: myStats.ties, color: "#f59e0b" },
                                { label: "% ניצחון", value: `${myStats.winRate}%`, color: "#60a5fa" },
                                { label: "רצף נצחונות", value: currentStreak, color: "#f97316" },
                            ].map(s => (
                                <div key={s.label} className="text-center rounded-xl p-3"
                                    style={{ background: `${s.color}10`, border: `1px solid ${s.color}25` }}>
                                    <div className="font-cinzel text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                                    <div className="font-cinzel text-[9px] text-white/30 uppercase tracking-widest mt-1">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ── Leaderboard ── */}
                    <div className="rounded-2xl p-6"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <h2 className="font-cinzel text-xs font-black text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Trophy size={13} className="text-amber-400" /> לוח המובילים
                        </h2>
                        <div className="space-y-1">
                            {leaderboard.map((p, i) => (
                                <Link key={p.id} href={`/wizard/${p.id}`}
                                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group">
                                    <span className={`font-cinzel text-xs font-black w-6 text-center shrink-0 ${i === 0 ? "text-amber-400" : i === 1 ? "text-white/50" : i === 2 ? "text-orange-700" : "text-white/20"}`}>
                                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                                    </span>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                                        style={{ background: `${HOUSE_COLOR[p.house] || "#f59e0b"}15` }}>
                                        {HOUSE_EMOJI[p.house] || "🧙"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-cinzel text-xs font-black text-white/80 truncate group-hover:text-white transition-colors">{p.full_name}</p>
                                        {p.duel_badge && (
                                            <span style={{
                                                fontSize: "9px", fontWeight: 900, fontFamily: "'Cinzel', serif",
                                                padding: "1px 8px", borderRadius: "999px",
                                                color: "#f97316",
                                                background: "rgba(249,115,22,0.1)",
                                                border: "1px solid rgba(249,115,22,0.35)",
                                                textShadow: "0 0 6px rgba(249,115,22,0.4)",
                                                display: "inline-block",
                                            }}>{p.duel_badge}</span>
                                        )}
                                    </div>
                                    <span className="font-cinzel text-sm font-black shrink-0" style={{ color: "#f59e0b" }}>
                                        {p.wins} ⚔️
                                    </span>
                                </Link>
                            ))}
                            {!leaderboard.length && (
                                <div className="py-10 text-center space-y-2">
                                    <p className="text-3xl">⚔️</p>
                                    <p className="font-crimson text-white/20 italic">עדיין אין מנצחים • היה הראשון!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Recent duels ── */}
                    <div className="rounded-2xl p-6"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <h2 className="font-cinzel text-xs font-black text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Swords size={13} /> קרבות אחרונים
                        </h2>
                        <div className="space-y-1.5">
                            {recentDuels.map((d: any) => {
                                const ch = Array.isArray(d.challenger) ? d.challenger[0] : d.challenger;
                                const op = Array.isArray(d.opponent) ? d.opponent[0] : d.opponent;
                                const tie = !d.winner_id;
                                return (
                                    <Link key={d.id} href={`/duels/${d.id}`}
                                        className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors text-xs group">
                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                            <span className="text-sm">{HOUSE_EMOJI[ch?.house] || "🧙"}</span>
                                            <span className={`font-cinzel truncate max-w-[70px] ${d.winner_id === ch?.id ? "text-green-400 font-black" : "text-white/50"}`}>{ch?.full_name}</span>
                                        </div>
                                        <span className="font-cinzel text-white/20 shrink-0 px-1">
                                            {tie ? "🤝" : "⚔️"}
                                        </span>
                                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                                            <span className={`font-cinzel truncate max-w-[70px] text-right ${d.winner_id === op?.id ? "text-green-400 font-black" : "text-white/50"}`}>{op?.full_name}</span>
                                            <span className="text-sm">{HOUSE_EMOJI[op?.house] || "🧙"}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                            {!recentDuels.length && (
                                <div className="py-10 text-center space-y-2">
                                    <p className="text-3xl">🏰</p>
                                    <p className="font-crimson text-white/20 italic">הזירה שקטה • אין קרבות אחרונים</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Search & challenge ── */}
                <div className="rounded-2xl p-6"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <h2 className="font-cinzel text-xs font-black text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Search size={13} /> אתגר קוסם ספציפי
                    </h2>
                    <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4 transition-all"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <Search size={16} className="text-white/30 shrink-0" />
                        <input
                            value={searchQuery}
                            onChange={e => handleSearch(e.target.value)}
                            placeholder="הקלד שם קוסם..."
                            className="flex-1 bg-transparent text-white outline-none placeholder:text-white/20 text-sm font-cinzel"
                            dir="rtl"
                            autoComplete="off"
                        />
                        {searching && <Loader2 size={14} className="text-white/30 animate-spin shrink-0" />}
                    </div>

                    {searchQuery.length > 0 && !searching && searchResults.length === 0 && (
                        <p className="font-crimson text-white/25 italic text-center py-4">לא נמצאו קוסמים בשם זה</p>
                    )}

                    {searchResults.length > 0 && (
                        <div className="space-y-2">
                            {searchResults.map(u => {
                                const isOnline = onlineIds.has(u.id);
                                return (
                                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl transition-all"
                                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                        {/* Avatar */}
                                        <div className="relative shrink-0">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl overflow-hidden"
                                                style={{ background: `${HOUSE_COLOR[u.house] || "#f59e0b"}15` }}>
                                                {u.avatar_url
                                                    ? <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover rounded-xl" />
                                                    : HOUSE_EMOJI[u.house] || "🧙"
                                                }
                                            </div>
                                            {/* Online indicator */}
                                            <span className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-[#060910] ${isOnline ? "bg-green-400" : "bg-white/15"}`} />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-cinzel text-xs font-black text-white/80 truncate">{u.full_name}</p>
                                                <span className={`text-[9px] font-cinzel font-black shrink-0 ${isOnline ? "text-green-400" : "text-white/20"}`}>
                                                    {isOnline ? "● מחובר" : "○ לא מחובר"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] text-white/30 font-cinzel">{HOUSE_EMOJI[u.house]} {u.house}</span>
                                                {u.duel_badge && (
                                                    <span style={{
                                                        fontSize: "9px", fontWeight: 900, fontFamily: "'Cinzel', serif",
                                                        padding: "1px 6px", borderRadius: "999px",
                                                        color: "#f97316",
                                                        background: "rgba(249,115,22,0.1)",
                                                        border: "1px solid rgba(249,115,22,0.35)",
                                                        textShadow: "0 0 6px rgba(249,115,22,0.4)",
                                                    }}>{u.duel_badge}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Challenge button */}
                                        <button
                                            onClick={() => challengeUser(u.id, u.full_name)}
                                            disabled={!!challenging}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-cinzel text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-50 hover:scale-[1.03] shrink-0"
                                            style={{ background: "linear-gradient(135deg, #991b1b, #dc2626)", boxShadow: isOnline ? "0 0 12px rgba(220,38,38,0.3)" : "none" }}>
                                            {challenging === u.id ? <Loader2 size={11} className="animate-spin" /> : "⚔️"}
                                            {challenging === u.id ? "..." : "אתגר"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


