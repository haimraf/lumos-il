export interface UserBoosts {
    galleons_multiplier: number;
    notification_bonus: number;
    dueling_power: number;
    energy_boost: number;
    prestige_points: number;
}

export function getUserBoosts(inventory: any): UserBoosts {
    const defaults: UserBoosts = {
        galleons_multiplier: 1,
        notification_bonus: 1,
        dueling_power: 0,
        energy_boost: 0,
        prestige_points: 0,
    };
    if (!inventory?.items) return defaults;
    inventory.items.forEach((item: any) => {
        if (item.boosts?.galleons_multiplier)
            defaults.galleons_multiplier += item.boosts.galleons_multiplier;
        if (item.boosts?.notification_bonus)
            defaults.notification_bonus = item.boosts.notification_bonus;
        if (item.boosts?.dueling_power)
            defaults.dueling_power += item.boosts.dueling_power;
        if (item.boosts?.energy_boost)
            defaults.energy_boost += item.boosts.energy_boost;
        if (item.boosts?.prestige_points)
            defaults.prestige_points += item.boosts.prestige_points;
    });
    return defaults;
}

export function formatBoost(key: string, value: number): string | null {
    if (!value) return null;
    switch (key) {
        case "galleons_multiplier": return `🪙 +${Math.round((value - 1) * 100)}% גליאונים`;
        case "notification_bonus":  return `📬 ×${value} הודעות`;
        case "dueling_power":       return `⚔️ +${value} דו-קרב`;
        case "energy_boost":        return `⚡ +${value} אנרגיה`;
        case "prestige_points":     return `⭐ +${value} יוקרה`;
        default: return null;
    }
}

export function getItemBoostBadges(item: any): string[] {
    if (!item?.boosts) return [];
    return Object.entries(item.boosts)
        .map(([k, v]) => formatBoost(k, v as number))
        .filter(Boolean) as string[];
}
