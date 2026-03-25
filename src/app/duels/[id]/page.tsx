"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Swords, Shield } from "lucide-react";

/* ── Constants ── */
const MAX_HP = 100;

const HOUSE_EMOJI: Record<string, string> = {
    Gryffindor: "🦁", Slytherin: "🐍", Ravenclaw: "🦅", Hufflepuff: "🦡",
};
const HOUSE_COLOR: Record<string, string> = {
    Gryffindor: "#dc2626", Slytherin: "#16a34a", Ravenclaw: "#2563eb", Hufflepuff: "#d97706",
};

const SPELL_CATALOG: Record<string, {
    name: string; nameEn: string; emoji: string;
    baseDamage: number; usesDuelingPower: boolean;
    isBlock?: boolean; isSkip?: boolean;
}> = {
    expelliarmus: { name: "אקספליארמוס", nameEn: "Expelliarmus", emoji: "⚡", baseDamage: 20, usesDuelingPower: true },
    expecto:      { name: "אקספקטו פטרונום", nameEn: "Expecto Patronum", emoji: "🦌", baseDamage: 35, usesDuelingPower: true },
    wingardium:   { name: "וינגארדיום לביוסה", nameEn: "Wingardium Leviosa", emoji: "🪄", baseDamage: 15, usesDuelingPower: false, isSkip: true },
    protego:      { name: "פרוטגו", nameEn: "Protego", emoji: "🛡️", baseDamage: 0, usesDuelingPower: false, isBlock: true },
    stupefy:      { name: "סטופיפיי", nameEn: "Stupefy", emoji: "🔴", baseDamage: 25, usesDuelingPower: false },
    alohomora:    { name: "אלוהומורה", nameEn: "Alohomora", emoji: "🔓", baseDamage: 10, usesDuelingPower: false },
    lumos:        { name: "לומוס", nameEn: "Lumos", emoji: "✨", baseDamage: 5, usesDuelingPower: false },
    nox:          { name: "נוקס", nameEn: "Nox", emoji: "🌑", baseDamage: 8, usesDuelingPower: false },
};

const SPELL_FALLBACK: Record<string, string> = {
    "אקספליארמוס": "expelliarmus",
    "אקספקטו":     "expecto",
    "וינגארדיום":  "wingardium",
    "פרוטגו":      "protego",
};

/* ── Helpers ── */
function getHouseColor(house: string) { return HOUSE_COLOR[house] || "#f59e0b"; }
function getHouseEmoji(house: string) { return HOUSE_EMOJI[house] || "🧙"; }

function computeHP(moves: any[], userId: string): number {
    let hp = MAX_HP;
    let blocked = false;
    for (const move of moves) {
        if (move.player_id === userId) continue; // attacker is opponent
        if (move.spell_used === "protego") { blocked = true; continue; }
        const dmg = move.damage_dealt || 0;
        if (blocked) { hp -= Math.max(0, dmg - 30); blocked = false; }
        else hp -= dmg;
    }
    return Math.max(0, hp);
}

const SPELL_DRAMA: Record<string, string[]> = {
    stupefy:      ["השליך סטופיפיי בכוח עז!", "הקסם עף כברק לעבר היריב!", "ניצוצות אדומים מילאו את האוויר!"],
    expelliarmus: ["ניסה לפרק את נשק היריב!", "השרביט רעד מעוצמת הלחש!", "הזרם הכחול פגע בדיוק!"],
    protego:      ["הטיל מגן זוהר לפני עצמו!", "מחסום כחול עצר את המתקפה!", "המגן בזק ועצר הכל!"],
    expecto:      ["קרא לפטרונוס בכל כוחו!", "אור לבן עז מילא את הזירה!", "הפטרונוס תקף בעוצמה עצומה!"],
    wingardium:   ["הרים את היריב באוויר!", "הלחש גרם ליריב לרחף!", "היריב נשא באוויר ופספס תור!"],
    alohomora:    ["פתח את הדרך בכוח הקסם!", "המנעול נפתח בברק של אור!", "הדלת נפרצה!"],
    lumos:        ["האיר את הזירה!", "אור עז סינוור את היריב!", "הלחש הבהיר רגעית!"],
    nox:          ["כיבה את האור!", "חשכה ירדה על הזירה!", "היריב התבלבל בחשיכה!"],
};

const DAMAGE_DRAMA = (damage: number) => {
    if (damage >= 30) return "מכה קשה! הקרב מתהדק... 🔥";
    if (damage >= 20) return "פגיעה טובה! ⚡";
    if (damage >= 10) return "פגיעה קלה. המשחק פתוח! ⚔️";
    return "מכה חלשה... 😅";
};

function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function moveMessage(move: any, actorName: string, targetName: string): string {
    const spell = SPELL_CATALOG[move.spell_used];
    if (!spell) return `🪄 ${actorName} השתמש בלחש`;
    const drama = SPELL_DRAMA[move.spell_used];
    const desc = drama ? pickRandom(drama) : `השתמש ב-${spell.name}`;
    if (spell.isBlock) return `🛡️ ${actorName} ${desc}`;
    if (spell.isSkip)  return `🪄 ${actorName} ${desc} — ${targetName} מדלג תור!`;
    return `⚔️ ${actorName} ${desc} — ${move.damage_dealt} נזק! ${DAMAGE_DRAMA(move.damage_dealt)}`;
}

/* ── HP Bar ── */
function HPBar({ hp, name, avatar, house, isLeft }: { hp: number; name: string; avatar: string | null; house: string; isLeft?: boolean }) {
    const color = getHouseColor(house);
    const pct = (hp / MAX_HP) * 100;
    const hpColor = pct > 50 ? color : pct > 25 ? "#f59e0b" : "#dc2626";

    return (
        <div className={`flex flex-col ${isLeft ? "items-start" : "items-end"} gap-2 flex-1`}>
            <div className="flex items-center gap-3" style={{ flexDirection: isLeft ? "row" : "row-reverse" }}>
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center text-2xl border-2 shrink-0"
                    style={{ borderColor: `${color}50`, background: `${color}15` }}>
                    {avatar
                        ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
                        : getHouseEmoji(house)
                    }
                </div>
                <div className={isLeft ? "text-left" : "text-right"}>
                    <p className="font-cinzel text-xs font-black text-white/80 truncate max-w-[100px]">{name}</p>
                    <p className="font-cinzel text-[10px] text-white/30">{getHouseEmoji(house)} {hp} HP</p>
                </div>
            </div>
            <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                    style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${hpColor}80, ${hpColor})`,
                        boxShadow: `0 0 8px ${hpColor}60`,
                        ...(isLeft ? {} : { marginLeft: "auto", float: "right" }),
                    }} />
            </div>
        </div>
    );
}

/* ── Main Page ── */
export default function DuelPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { profile: authProfile } = useAuth();
    const [supabase] = useState(() => createClient());

    const [duel, setDuel] = useState<any>(null);
    const [challenger, setChallenger] = useState<any>(null);
    const [opponent, setOpponent] = useState<any>(null);
    const [moves, setMoves] = useState<any[]>([]);
    const [allSpells, setAllSpells] = useState<any[]>([]);
    const [casting, setCasting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [pendingSecsLeft, setPendingSecsLeft] = useState<number>(300);
    const [turnSecsLeft, setTurnSecsLeft] = useState<number>(180);
    const logRef = useRef<HTMLDivElement>(null);
    const handledExpiryRef = useRef(false);
    const handledTurnTimeoutRef = useRef(false);
    const finalizedDuelRef = useRef(false);

    const TURN_TIMEOUT = 60; // 60 seconds per turn

    const myId = authProfile?.id;

    // Debug
    console.log("[Duel] duel:", duel);
    console.log("[Duel] currentUser:", myId);
    console.log("[Duel] challenger:", duel?.challenger_id);
    console.log("[Duel] opponent:", duel?.opponent_id);

    /* ── Load duel ── */
    useEffect(() => {
        if (!id) return;
        const load = async () => {
            let { data: d } = await supabase.from("duels").select("*").eq("id", id).single();
            if (!d) { setLoading(false); return; }

            if (d.status === "active" && !d.current_turn) {
                await supabase.rpc("ensure_duel_turn_secure", { p_duel_id: id });
                const { data: refreshed } = await supabase.from("duels").select("*").eq("id", id).single();
                if (refreshed) d = refreshed;
            }

            if (d.status === "active" && d.turn_deadline && new Date(d.turn_deadline) < new Date()) {
                await supabase.rpc("skip_duel_turn_secure", { p_duel_id: id });
                const { data: refreshed } = await supabase.from("duels").select("*").eq("id", id).single();
                if (refreshed) d = refreshed;
            }

            setDuel(d);

            const [{ data: ch }, { data: op }] = await Promise.all([
                supabase.from("profiles").select("id, full_name, house, avatar_url, inventory, learned_spells").eq("id", d.challenger_id).single(),
                supabase.from("profiles").select("id, full_name, house, avatar_url, inventory, learned_spells").eq("id", d.opponent_id).single(),
            ]);
            setChallenger(ch);
            setOpponent(op);

            const { data: mv } = await supabase.from("duel_moves").select("*").eq("duel_id", id).order("created_at", { ascending: true });
            setMoves(mv || []);

            // Load spells from DB for current user
            const me = ch?.id === myId ? ch : op;
            if (me?.learned_spells?.length) {
                const { data: sp } = await supabase.from("spells").select("id, name, terminal_command").in("id", me.learned_spells);
                setAllSpells(sp || []);
            }

            setLoading(false);
        };
        load();
    }, [id, myId]);

    /* ── Per-turn countdown + auto-forfeit ── */
    useEffect(() => {
        if (!duel || duel.status !== "active") return;

        // Use turn_deadline from DB if set, otherwise derive from last move or now
        let deadlineMs: number;
        if (duel.turn_deadline) {
            deadlineMs = new Date(duel.turn_deadline).getTime();
        } else {
            const lastMoveTime = moves.length > 0
                ? new Date(moves[moves.length - 1].created_at).getTime()
                : Date.now();
            deadlineMs = lastMoveTime + TURN_TIMEOUT * 1000;
        }
        const deadline = deadlineMs;

        const tick = async () => {
            const secs = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
            setTurnSecsLeft(secs);

            if (secs === 0 && duel.current_turn === myId && !handledTurnTimeoutRef.current) {
                // My turn expired → skip my turn
                handledTurnTimeoutRef.current = true;
                void skipTurn();
            } else if (secs > 0) {
                handledTurnTimeoutRef.current = false;
            }
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [duel?.turn_deadline, duel?.current_turn, duel?.status, moves.length]);

    /* ── Pending expiry timer ── */
    useEffect(() => {
        if (!duel || duel.status !== "pending") return;
        const expires = duel.expires_at ? new Date(duel.expires_at).getTime() : Date.now() + 300_000;

        const expireDuel = async () => {
            await supabase.rpc("respond_to_duel_challenge_secure", {
                p_duel_id: id,
                p_action: "expire",
            });
            const { data: expiredDuel } = await supabase.from("duels").select("*").eq("id", id).single();
            if (!expiredDuel) return;
            setDuel(expiredDuel);
        };
        const tick = () => {
            const secs = Math.max(0, Math.floor((expires - Date.now()) / 1000));
            setPendingSecsLeft(secs);
            if (secs === 0 && myId === duel.challenger_id && !handledExpiryRef.current) {
                handledExpiryRef.current = true;
                void expireDuel();
            } else if (secs > 0) {
                handledExpiryRef.current = false;
            }
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [duel?.status, duel?.expires_at]);

    /* ── Realtime: duel room ── */
    useEffect(() => {
        if (!id) return;
        const channel = supabase
            .channel(`duel-room-${id}`)
            .on("postgres_changes", {
                event: "UPDATE", schema: "public", table: "duels", filter: `id=eq.${id}`,
            }, async (payload) => {
                console.log("[Duel] duel updated:", payload.new);
                const updated = payload.new as any;
                if (updated.status === "active" && !updated.current_turn) {
                    await supabase.rpc("ensure_duel_turn_secure", { p_duel_id: id });
                    const { data: refreshed } = await supabase.from("duels").select("*").eq("id", id).single();
                    setDuel(refreshed || updated);
                } else {
                    setDuel(updated);
                }
            })
            .on("postgres_changes", {
                event: "INSERT", schema: "public", table: "duel_moves", filter: `duel_id=eq.${id}`,
            }, (payload) => {
                console.log("[Duel] new move:", payload.new);
                setMoves(prev => [...prev, payload.new as any]);
            })
            .subscribe((status) => {
                console.log("[Duel] realtime status:", status);
            });
        return () => { supabase.removeChannel(channel); };
    }, [id]);

    /* ── Auto scroll log ── */
    useEffect(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
    }, [moves]);

    /* ── Finish detection ── */

    const getSpellKey = (spell: any): string | null => {
        const cmd = spell.terminal_command?.toLowerCase();
        if (cmd && SPELL_CATALOG[cmd]) return cmd;
        for (const [heName, key] of Object.entries(SPELL_FALLBACK)) {
            if (spell.name?.includes(heName)) return key;
        }
        return null;
    };

    const getDuelingPower = (p: any): number => {
        if (!p?.inventory) return 0;
        try {
            const inv = typeof p.inventory === "string" ? JSON.parse(p.inventory) : p.inventory;
            return (inv?.items || []).reduce((acc: number, item: any) => acc + (item.boosts?.dueling_power || 0), 0);
        } catch { return 0; }
    };

    const skipTurn = async () => {
        if (!myId || !duel) return;
        const { error } = await supabase.rpc("skip_duel_turn_secure", { p_duel_id: id });
        if (error) {
            console.error("[Duel] skip error:", error.message, error.code);
        }
    };

    const castSpell = async (spellKey: string) => {
        if (!myId || !duel || casting) return;

        if (duel.current_turn !== myId) {
            console.warn("[Duel] not your turn", duel.current_turn, "!=", myId);
            return;
        }

        setCasting(true);

        const { data, error } = await supabase.rpc("cast_duel_spell_secure", {
            p_duel_id: id,
            p_spell_key: spellKey,
        });

        if (error) {
            console.error("[Duel] cast error:", error.message, error.code);
            setCasting(false);
            return;
        }

        if (data) {
            setDuel((prev: any) => prev ? {
                ...prev,
                status: data.status ?? prev.status,
                winner_id: data.winner_id ?? prev.winner_id,
                challenger_hp: data.challenger_hp ?? prev.challenger_hp,
                opponent_hp: data.opponent_hp ?? prev.opponent_hp,
                current_turn: data.current_turn ?? prev.current_turn,
                turn_deadline: data.turn_deadline ?? prev.turn_deadline,
            } : prev);
        }

        setCasting(false);
    };

    const availableSpells = (): string[] => {
        const defaults = ["stupefy"];
        if (!allSpells.length) return defaults;
        const learned = allSpells
            .map(s => getSpellKey(s))
            .filter((k): k is string => k !== null && k in SPELL_CATALOG && k !== "lumos" && k !== "nox" && k !== "accio");
        return [...new Set([...defaults, ...learned])];
    };

    /* ── Render ── */
    if (loading) return (
        <div className="min-h-screen bg-[#060910] flex items-center justify-center">
            <Loader2 className="text-red-400 animate-spin" size={32} />
        </div>
    );

    if (!duel) return (
        <div className="min-h-screen bg-[#060910] flex items-center justify-center">
            <p className="font-cinzel text-white/40">הדו-קרב לא נמצא</p>
        </div>
    );

    const isChallenger  = duel.challenger_id === myId;
    const isOpponent    = duel.opponent_id   === myId;
    const isParticipant = isChallenger || isOpponent;

    if (myId && !isParticipant) {
        router.push("/dashboard");
        return null;
    }

    const chHP = duel.challenger_hp ?? (challenger ? computeHP(moves, challenger.id) : MAX_HP);
    const opHP = duel.opponent_hp ?? (opponent ? computeHP(moves, opponent.id) : MAX_HP);
    const isMyTurn = duel.current_turn === myId;
    const spells = availableSpells();

    /* ── Tie screen ── */
    if (duel.status === "finished" && !duel.winner_id) return (
        <div className="min-h-screen bg-[#060910] flex items-center justify-center" dir="rtl">
            <div className="text-center space-y-8 p-12">
                <div className="text-[8rem] animate-bounce">🤝</div>
                <h1 className="font-cinzel text-5xl font-black text-white/80">תיקו!</h1>
                <p className="font-crimson text-white/40 text-xl italic">שניכם לחמתם בגבורה</p>
                <div className="rounded-2xl p-6 space-y-2"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="font-cinzel text-white/50 text-sm uppercase tracking-widest">פרסים</p>
                    <p className="font-cinzel text-2xl font-black text-amber-400">+25 גליאונים 🪙 לכל אחד</p>
                </div>
                <button onClick={() => router.push("/arena")}
                    className="px-8 py-3 rounded-xl font-cinzel font-black text-amber-950 transition-all"
                    style={{ background: "linear-gradient(135deg, #d97706, #fbbf24)" }}>
                    לזירה ←
                </button>
            </div>
        </div>
    );

    /* ── Finished screen ── */
    if (duel.status === "finished") {
        const isWinner = duel.winner_id === myId;
        const opponentId = myId === duel.challenger_id ? duel.opponent_id : duel.challenger_id;

        return (
            <div className="min-h-screen bg-[#060910] flex items-center justify-center" dir="rtl">
                <div className="text-center space-y-8 p-12">
                    <div className="text-[8rem] animate-bounce">
                        {isWinner ? "🏆" : "💀"}
                    </div>
                    <h1 className="font-cinzel text-5xl font-black"
                        style={{ color: isWinner ? "#fbbf24" : "#ef4444" }}>
                        {isWinner ? "ניצחת!" : "הפסדת!"}
                    </h1>
                    <div className="rounded-2xl p-6 space-y-3"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <p className="font-cinzel text-white/60 text-sm uppercase tracking-widest">פרסים</p>
                        <p className="font-cinzel text-2xl font-black text-amber-400">
                            +{isWinner ? "50" : "10"} גליאונים 🪙
                        </p>
                    </div>
                    <div className="flex gap-4 justify-center">
                        <button onClick={() => router.push("/dashboard")}
                            className="px-8 py-3 rounded-xl font-cinzel font-black text-amber-950 transition-all"
                            style={{ background: "linear-gradient(135deg, #d97706, #fbbf24)" }}>
                            חזרה לטירה
                        </button>
                        <button onClick={() => router.push(`/wizard/${opponentId}`)}
                            className="px-8 py-3 rounded-xl font-cinzel font-black text-white transition-all hover:bg-white/20"
                            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
                            פרופיל היריב
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Non-active screens ── */
    if (duel.status !== "active" && duel.status !== "finished") {
        const isExpired  = duel.status === "expired"  || duel.status === "declined";
        const mins = Math.floor(pendingSecsLeft / 60);
        const secs = pendingSecsLeft % 60;
        const progress = (pendingSecsLeft / 300) * 100;
        const opponentName = myId === duel.challenger_id ? opponent?.full_name : challenger?.full_name;

        if (isExpired) return (
            <div className="min-h-screen bg-[#060910] flex items-center justify-center p-4" dir="rtl">
                <div className="text-center max-w-sm w-full space-y-6">
                    <div className="text-7xl">💨</div>
                    <h2 className="font-cinzel text-2xl font-black text-white/70">
                        {duel.status === "declined" ? "האתגר נדחה" : "האתגר פג תוקף"}
                    </h2>
                    <p className="font-crimson text-white/35 text-lg italic">
                        {duel.status === "declined"
                            ? `${opponentName} סירב לדו-קרב.`
                            : `${opponentName} לא הגיב בזמן.`}
                    </p>
                    <button onClick={() => router.push("/great-hall")}
                        className="px-8 py-3 rounded-xl font-cinzel font-black text-amber-950 transition-all"
                        style={{ background: "linear-gradient(135deg, #d97706, #fbbf24)" }}>
                        חזרה לטירה
                    </button>
                </div>
            </div>
        );

        return (
            <div className="min-h-screen bg-[#060910] flex items-center justify-center p-4" dir="rtl">
                <div className="text-center max-w-sm w-full space-y-6">
                    <div className="text-6xl animate-pulse">⚔️</div>
                    <div>
                        <h2 className="font-cinzel text-xl font-black text-white/70 mb-1">
                            ממתין לאישור האתגר
                        </h2>
                        <p className="font-crimson text-white/35 text-base italic">
                            {opponentName} טרם הגיב
                        </p>
                    </div>

                    {/* Countdown */}
                    <div className="rounded-2xl p-5 space-y-3"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="flex items-center justify-between">
                            <span className="font-cinzel text-[10px] text-white/30 uppercase tracking-widest">זמן שנותר</span>
                            <span className={`font-cinzel text-lg font-black ${pendingSecsLeft < 60 ? "text-red-400" : "text-white/60"}`}>
                                {mins}:{String(secs).padStart(2, "0")}
                            </span>
                        </div>
                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000"
                                style={{
                                    width: `${progress}%`,
                                    background: progress > 40 ? "linear-gradient(90deg,#dc2626,#ef4444)" : "linear-gradient(90deg,#7f1d1d,#dc2626)",
                                }} />
                        </div>
                        <p className="font-cinzel text-[10px] text-white/20 text-center">
                            האתגר יפוג אוטומטית אם לא יאושר
                        </p>
                    </div>

                    <button onClick={() => router.push("/great-hall")}
                        className="px-6 py-2.5 rounded-xl font-cinzel text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        ביטול וחזרה
                    </button>
                </div>
            </div>
        );
    }

    /* ── Active duel ── */
    return (
        <div className="min-h-screen bg-[#060910] flex flex-col" dir="rtl">
            {/* Ambient */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[400px] rounded-full blur-[140px]"
                    style={{ background: `${getHouseColor(challenger?.house || "")}15` }} />
                <div className="absolute bottom-0 left-0 w-[500px] h-[400px] rounded-full blur-[140px]"
                    style={{ background: `${getHouseColor(opponent?.house || "")}15` }} />
            </div>

            <div className="relative z-10 flex flex-col flex-1 max-w-2xl mx-auto w-full p-4 gap-4">

                {/* ── HP Bars ── */}
                <div className="flex items-center gap-4 mt-2">
                    {challenger && (
                        <HPBar hp={chHP} name={challenger.full_name} avatar={challenger.avatar_url}
                            house={challenger.house} isLeft={true} />
                    )}
                    <div className="shrink-0 text-center">
                        <Swords size={20} className="text-red-400/60 mx-auto" />
                        <p className="font-cinzel text-[8px] text-white/20 uppercase mt-0.5">VS</p>
                    </div>
                    {opponent && (
                        <HPBar hp={opHP} name={opponent.full_name} avatar={opponent.avatar_url}
                            house={opponent.house} isLeft={false} />
                    )}
                </div>

                {/* ── Turn indicator + timer ── */}
                <div className="flex flex-col items-center gap-2">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-cinzel text-[10px] font-black uppercase tracking-widest border ${
                        isMyTurn
                            ? "bg-red-500/10 border-red-500/30 text-red-400"
                            : "bg-white/[0.03] border-white/10 text-white/30"
                    }`}>
                        {isMyTurn ? "⚔️ התור שלך — בחר לחש" : "⌛ ממתין ליריב..."}
                    </span>
                    <div className="flex items-center gap-2 w-48">
                        <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000"
                                style={{
                                    width: `${(turnSecsLeft / TURN_TIMEOUT) * 100}%`,
                                    background: turnSecsLeft > 60 ? "#16a34a" : turnSecsLeft > 20 ? "#f59e0b" : "#dc2626",
                                }} />
                        </div>
                        <span className={`font-cinzel text-[10px] font-black w-8 text-right ${turnSecsLeft <= 20 ? "text-red-400" : "text-white/30"}`}>
                            {Math.floor(turnSecsLeft / 60)}:{String(turnSecsLeft % 60).padStart(2, "0")}
                        </span>
                    </div>
                </div>

                {/* ── Move log ── */}
                <div ref={logRef}
                    className="flex-1 min-h-[200px] max-h-[300px] overflow-y-auto rounded-2xl p-4 space-y-2"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="font-cinzel text-xs text-white/30 text-center pb-2 border-b border-white/[0.05]">
                        ⚔️ הקרב החל!
                    </div>
                    {moves.map((move, i) => {
                        const actor = move.player_id === challenger?.id ? challenger : opponent;
                        const target = move.player_id === challenger?.id ? opponent : challenger;
                        const isMe = move.player_id === myId;
                        return (
                            <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs font-crimson ${
                                    isMe
                                        ? "bg-red-500/10 border border-red-500/20 text-red-200"
                                        : "bg-white/[0.04] border border-white/[0.06] text-white/60"
                                }`}>
                                    {moveMessage(move, actor?.full_name || "?", target?.full_name || "?")}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Spell selection ── */}
                {isMyTurn && (
                    <div>
                        <p className="font-cinzel text-[10px] text-white/30 uppercase tracking-widest mb-3 text-center">
                            בחר לחש
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {spells.map(key => {
                                const spell = SPELL_CATALOG[key];
                                if (!spell) return null;
                                const me = myId === challenger?.id ? challenger : opponent;
                                const dp = getDuelingPower(me);
                                const dmg = spell.baseDamage + (spell.usesDuelingPower ? dp : 0);

                                return (
                                    <button key={key}
                                        onClick={() => castSpell(key)}
                                        disabled={duel.current_turn !== myId || casting}
                                        className="relative p-3 rounded-xl border text-right transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                                        style={{
                                            background: "rgba(220,38,38,0.06)",
                                            borderColor: "rgba(220,38,38,0.2)",
                                        }}>
                                        <div className="text-xl mb-1">{spell.emoji}</div>
                                        <p className="font-cinzel text-[10px] font-black text-white/80 truncate">{spell.name}</p>
                                        <p className="font-cinzel text-[9px] text-white/30 mt-0.5">
                                            {spell.isBlock ? "חוסם 30 נזק" : spell.isSkip ? "מדלג תור" : `${dmg} נזק`}
                                        </p>
                                        {casting && <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40"><Loader2 size={14} className="text-red-400 animate-spin" /></div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
