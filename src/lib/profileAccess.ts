import type { SupabaseClient } from "@supabase/supabase-js";

const SORTING_BYPASS_ROLES = [
  "מייסד",
  "מייסדת",
  "ראש הוגוורטס",
  "שומר הטירה",
  "פרופסור",
  "צוות Lumos",
  "מנהל",
  "מנהלת",
  "מנחה",
  "הנהלה",
] as const;

type ProfileIdentity = {
  id: string;
  email?: string | null;
};

type ResolvedProfileResult<T> = {
  data: T | null;
  source: "id" | "email" | "none";
  error: unknown;
};

export function canBypassSortingRole(role: string | null | undefined) {
  if (typeof role !== "string") return false;
  const normalizedRole = role.trim();
  if (!normalizedRole) return false;
  return SORTING_BYPASS_ROLES.includes(normalizedRole as (typeof SORTING_BYPASS_ROLES)[number]);
}

export async function fetchProfileWithFallback<T>(
  supabase: SupabaseClient,
  identity: ProfileIdentity,
  columns = "*",
): Promise<ResolvedProfileResult<T>> {
  const byId = await supabase
    .from("profiles")
    .select(columns)
    .eq("id", identity.id)
    .maybeSingle<T>();

  if (byId.data) {
    return { data: byId.data, source: "id", error: null };
  }

  const normalizedEmail = identity.email?.trim();
  if (!normalizedEmail) {
    return { data: null, source: "none", error: byId.error };
  }

  const byEmail = await supabase
    .from("profiles")
    .select(columns)
    .ilike("email", normalizedEmail)
    .limit(1)
    .maybeSingle<T>();

  if (byEmail.data) {
    return { data: byEmail.data, source: "email", error: null };
  }

  return {
    data: null,
    source: "none",
    error: byId.error ?? byEmail.error ?? null,
  };
}
