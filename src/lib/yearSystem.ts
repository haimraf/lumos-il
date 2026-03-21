export const YEAR_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200];

/** Legacy: kept for backward compat if needed elsewhere */
export function getYearFromPoints(points: number): number {
    for (let i = YEAR_THRESHOLDS.length - 1; i >= 0; i--) {
        if (points >= YEAR_THRESHOLDS[i]) return i + 1;
    }
    return 1;
}

// Thresholds per year index (index = year-1, value = requirement for THAT year)
const YEAR_MONTH_THRESHOLDS = [0, 3, 6, 12, 18, 24, 36];
const YEAR_POST_THRESHOLDS  = [0, 5, 15, 30, 60, 100, 150];

export function getYearFromProfile(profile: any): number {
    if (!profile?.created_at) return 1;

    const monthsOld = Math.floor(
        (Date.now() - new Date(profile.created_at).getTime())
        / (1000 * 60 * 60 * 24 * 30)
    );
    const postCount = profile.post_count || 0;

    if (monthsOld >= 36 && postCount >= 150) return 7;
    if (monthsOld >= 24 && postCount >= 100) return 6;
    if (monthsOld >= 18 && postCount >= 60)  return 5;
    if (monthsOld >= 12 && postCount >= 30)  return 4;
    if (monthsOld >= 6  && postCount >= 15)  return 3;
    if (monthsOld >= 3  && postCount >= 5)   return 2;
    return 1;
}

export function getYearTitle(year: number): string {
    const titles: Record<number, string> = {
        1: "שרביט חדש", 2: "יורש", 3: "מגן הפטרונוס",
        4: "אלוף הטורניר", 5: "בכיר O.W.L", 6: "בכיר N.E.W.T", 7: "בוגר הוגוורטס",
    };
    return titles[year] || "שרביט חדש";
}

export function getYearLabel(year: number): string {
    const labels: Record<number, string> = {
        1: "א׳", 2: "ב׳", 3: "ג׳",
        4: "ד׳", 5: "ה׳", 6: "ו׳", 7: "ז׳",
    };
    return labels[year] || "א׳";
}

/** Returns how far along (0-100) toward the next year */
export function getProgressPercentFromProfile(profile: any): number {
    if (!profile?.created_at) return 0;
    const year = getYearFromProfile(profile);
    if (year >= 7) return 100;

    const monthsOld = Math.floor(
        (Date.now() - new Date(profile.created_at).getTime())
        / (1000 * 60 * 60 * 24 * 30)
    );
    const postCount = profile.post_count || 0;

    const prevMonths = YEAR_MONTH_THRESHOLDS[year - 1];
    const nextMonths = YEAR_MONTH_THRESHOLDS[year];
    const prevPosts  = YEAR_POST_THRESHOLDS[year - 1];
    const nextPosts  = YEAR_POST_THRESHOLDS[year];

    const monthsProgress = nextMonths === prevMonths
        ? 100
        : Math.min(100, ((monthsOld - prevMonths) / (nextMonths - prevMonths)) * 100);
    const postsProgress = nextPosts === prevPosts
        ? 100
        : Math.min(100, ((postCount - prevPosts) / (nextPosts - prevPosts)) * 100);

    return Math.min(monthsProgress, postsProgress);
}

/** Returns remaining months + posts needed for the next year (null if max year) */
export function getNextYearRequirements(profile: any): { months: number; posts: number } | null {
    if (!profile?.created_at) return null;
    const year = getYearFromProfile(profile);
    if (year >= 7) return null;

    const monthsOld = Math.floor(
        (Date.now() - new Date(profile.created_at).getTime())
        / (1000 * 60 * 60 * 24 * 30)
    );
    const postCount = profile.post_count || 0;

    return {
        months: Math.max(0, YEAR_MONTH_THRESHOLDS[year] - monthsOld),
        posts:  Math.max(0, YEAR_POST_THRESHOLDS[year] - postCount),
    };
}

// Legacy helpers kept for compatibility
export function getPointsForNextYear(points: number): number {
    const year = getYearFromPoints(points);
    if (year >= 7) return 0;
    return YEAR_THRESHOLDS[year] - points;
}

export function getProgressPercent(points: number): number {
    const year = getYearFromPoints(points);
    if (year >= 7) return 100;
    const start = YEAR_THRESHOLDS[year - 1];
    const end = YEAR_THRESHOLDS[year];
    return Math.min(100, ((points - start) / (end - start)) * 100);
}
