export async function checkDuelAchievements(supabase: any, userId: string) {
    const { count } = await supabase
        .from("duels")
        .select("*", { count: "exact", head: true })
        .eq("winner_id", userId)
        .eq("status", "finished");

    if ((count ?? 0) >= 10) {
        const { data: profile } = await supabase
            .from("profiles").select("duel_badge").eq("id", userId).single();
        if (!profile?.duel_badge) {
            await supabase.from("profiles").update({ duel_badge: "אלוף הזירה ⚔️" }).eq("id", userId);
            await supabase.from("notifications").insert({
                user_id: userId,
                type: "achievement",
                content: '🏆 השגת את תואר "אלוף הזירה"!',
                is_read: false,
            });
        }
    }
}

export async function getDuelStats(supabase: any, userId: string) {
    const { data: duels } = await supabase
        .from("duels")
        .select("winner_id, challenger_id, opponent_id, status")
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .eq("status", "finished");

    if (!duels) return { wins: 0, losses: 0, ties: 0, total: 0, winRate: 0 };

    let wins = 0, losses = 0, ties = 0;
    for (const d of duels) {
        if (!d.winner_id) { ties++; continue; }
        if (d.winner_id === userId) wins++;
        else losses++;
    }
    const total = wins + losses + ties;
    return { wins, losses, ties, total, winRate: total > 0 ? Math.round((wins / total) * 100) : 0 };
}
