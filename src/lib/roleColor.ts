export async function getRoleColorFromDB(supabase: any): Promise<Record<string, string>> {
    const { data } = await supabase.from('user_groups').select('name, color');
    const map: Record<string, string> = {};
    data?.forEach((g: any) => { map[g.name] = g.color; });
    return map;
}

export function getRoleColor(
    role: string | null | undefined,
    house: string | null | undefined,
    roleColors?: Record<string, string>
): string {
    if (role && roleColors?.[role]) return roleColors[role];

    const houseColors: Record<string, string> = {
        Gryffindor: "#ef4444",
        Slytherin:  "#10b981",
        Ravenclaw:  "#60a5fa",
        Hufflepuff: "#f59e0b",
    };
    return houseColors[house || ""] || "rgba(255,255,255,0.7)";
}

export function getRoleDisplay(
    role: string | null | undefined,
    roleColors?: Record<string, string>
): { name: string; color: string } {
    return {
        name: role || "חבר",
        color: getRoleColor(role, null, roleColors),
    };
}
