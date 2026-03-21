"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const HOUSE_EMOJI: Record<string, string> = {
    Gryffindor: "🦁", Slytherin: "🐍", Ravenclaw: "🦅", Hufflepuff: "🦡",
};
const DUEL_TIMEOUT = 5 * 60; // 5 minutes in seconds

interface PendingDuel {
    notifId: string;
    duelId: string;
    challengerName: string;
    challengerHouse: string;
    challengerAvatar: string | null;
    expiresAt: number; // unix ms
}

export default function DuelChallenge() {
    const { profile } = useAuth();
    const router = useRouter();
    const supabase = createClient();
    const [pending, setPending] = useState<PendingDuel | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(DUEL_TIMEOUT);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Subscribe to real-time duel_challenge notifications
    useEffect(() => {
        if (!profile?.id) return;

        const channel = supabase
            .channel(`duel-challenge-${profile.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${profile.id}`,
                },
                async (payload) => {
                    const notif = payload.new as any;
                    if (notif.type !== "duel_challenge") return;

                    // Extract duel id from target_url: /duels/[id]
                    const duelId = notif.target_url?.split("/duels/")?.[1];
                    if (!duelId) return;

                    // Load duel + challenger profile
                    const { data: duel } = await supabase
                        .from("duels")
                        .select("id, expires_at, challenger_id")
                        .eq("id", duelId)
                        .single();
                    if (!duel) return;

                    const { data: challenger } = await supabase
                        .from("profiles")
                        .select("full_name, house, avatar_url")
                        .eq("id", duel.challenger_id)
                        .single();

                    const expiresAt = new Date(duel.expires_at).getTime();
                    const secs = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

                    setPending({
                        notifId: notif.id,
                        duelId: duel.id,
                        challengerName: challenger?.full_name || "קוסם",
                        challengerHouse: challenger?.house || "",
                        challengerAvatar: challenger?.avatar_url || null,
                        expiresAt,
                    });
                    setSecondsLeft(secs);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [profile?.id]);

    // Countdown timer
    useEffect(() => {
        if (!pending) return;
        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            const secs = Math.max(0, Math.floor((pending.expiresAt - Date.now()) / 1000));
            setSecondsLeft(secs);
            if (secs === 0) {
                handleExpire();
            }
        }, 1000);

        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [pending]);

    const handleExpire = async () => {
        if (!pending) return;
        await supabase.from("duels").update({ status: "expired" }).eq("id", pending.duelId);
        await supabase.from("notifications").update({ is_read: true }).eq("id", pending.notifId);
        setPending(null);
    };

    const handleAccept = async () => {
        if (!pending) return;
        await supabase.from("duels").update({ status: "active" }).eq("id", pending.duelId);
        await supabase.from("notifications").update({ is_read: true }).eq("id", pending.notifId);
        setPending(null);
        router.push(`/duels/${pending.duelId}`);
    };

    const handleDecline = async () => {
        if (!pending) return;
        await supabase.from("duels").update({ status: "declined" }).eq("id", pending.duelId);
        await supabase.from("notifications").update({ is_read: true }).eq("id", pending.notifId);
        setPending(null);
    };

    if (!pending) return null;

    const progress = (secondsLeft / DUEL_TIMEOUT) * 100;
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const houseEmoji = HOUSE_EMOJI[pending.challengerHouse] || "🧙";

    return (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
                style={{
                    background: "linear-gradient(135deg, #0a0c14 0%, #0f1420 100%)",
                    border: "1px solid rgba(220,38,38,0.3)",
                    boxShadow: "0 0 60px rgba(220,38,38,0.15), 0 20px 60px rgba(0,0,0,0.8)",
                    animation: "duelPopIn 0.4s cubic-bezier(0.22,1,0.36,1) forwards",
                }}>

                {/* Header */}
                <div className="p-6 text-center border-b border-white/[0.06]">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
                        <span className="text-red-400 text-sm">⚔️</span>
                        <span className="font-cinzel text-[10px] font-black uppercase tracking-[0.3em] text-red-400/70">אתגר לדו-קרב</span>
                    </div>

                    {/* Challenger avatar */}
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-3 overflow-hidden flex items-center justify-center text-3xl border-2 border-red-500/20"
                        style={{ background: "rgba(220,38,38,0.08)" }}>
                        {pending.challengerAvatar
                            ? <img src={pending.challengerAvatar} alt="avatar" className="w-full h-full object-cover" />
                            : houseEmoji
                        }
                    </div>

                    <h2 className="font-cinzel text-lg font-black text-white mb-1">
                        {pending.challengerName}
                    </h2>
                    <p className="font-crimson text-white/40 text-sm italic">
                        מאתגר אותך לדו-קרב!
                    </p>
                </div>

                {/* Timer */}
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-cinzel text-[10px] text-white/30 uppercase tracking-widest">זמן לתגובה</span>
                        <span className={`font-cinzel text-sm font-black ${secondsLeft < 30 ? "text-red-400" : "text-white/60"}`}>
                            {mins}:{String(secs).padStart(2, "0")}
                        </span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                                width: `${progress}%`,
                                background: progress > 50
                                    ? "linear-gradient(90deg, #dc2626, #ef4444)"
                                    : progress > 20
                                        ? "linear-gradient(90deg, #f59e0b, #dc2626)"
                                        : "linear-gradient(90deg, #7f1d1d, #dc2626)",
                            }}
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={handleDecline}
                        className="flex-1 py-3 rounded-xl border border-white/10 font-cinzel text-xs font-black uppercase tracking-widest text-white/40 hover:text-white/70 hover:border-white/20 transition-all"
                    >
                        ❌ סרב
                    </button>
                    <button
                        onClick={handleAccept}
                        className="flex-1 py-3 rounded-xl font-cinzel text-xs font-black uppercase tracking-widest text-white transition-all"
                        style={{
                            background: "linear-gradient(135deg, #991b1b, #dc2626)",
                            boxShadow: "0 0 20px rgba(220,38,38,0.3)",
                        }}
                    >
                        ✅ קבל
                    </button>
                </div>
            </div>

            <style jsx global>{`
                @keyframes duelPopIn {
                    from { opacity: 0; transform: scale(0.9) translateY(20px); }
                    to   { opacity: 1; transform: scale(1)   translateY(0);    }
                }
            `}</style>
        </div>
    );
}
