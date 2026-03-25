import type { SupabaseClient } from "@supabase/supabase-js";
import { getHouseReadableColor } from "@/lib/houses";

type GroupColorRow = {
    name: string | null;
    color: string | null;
};

const ROLE_FALLBACK_COLORS: Record<string, string> = {
    founder: "#f59e0b",
    "מייסד": "#f59e0b",
    owner: "#f59e0b",
    "בעלים": "#f59e0b",
};

export async function getRoleColorFromDB(supabase: Pick<SupabaseClient, "from">): Promise<Record<string, string>> {
    const { data } = await supabase.from('user_groups').select('name, color');
    const rows = data as GroupColorRow[] | null;
    const map: Record<string, string> = {};
    rows?.forEach((group) => {
        if (!group.name || !group.color) return;
        map[group.name] = group.color;
    });
    return map;
}

export function getNamedRoleColor(
    role: string | null | undefined,
    roleColors?: Record<string, string>
): string | null {
    if (!role) return null;
    if (roleColors?.[role]) return roleColors[role];

    const normalizedRole = role.trim().toLowerCase();
    if (
        normalizedRole.includes("found") ||
        normalizedRole.includes("owner") ||
        normalizedRole.includes("מייס") ||
        normalizedRole.includes("בעל")
    ) {
        return "#f59e0b";
    }

    return ROLE_FALLBACK_COLORS[normalizedRole] ?? null;
}

export function getRoleColor(
    role: string | null | undefined,
    house: string | null | undefined,
    roleColors?: Record<string, string>
): string {
    const namedRoleColor = getNamedRoleColor(role, roleColors);
    if (namedRoleColor) return namedRoleColor;

    return getHouseReadableColor(house);
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
