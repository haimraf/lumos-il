"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Radio, Search, Shield, Sparkles, Users, Wand2 } from "lucide-react";
import MagicAvatar from "@/components/MagicAvatar";
import { useAuth } from "@/context/AuthContext";
import { formatHebrewRelativeTime, parseAppTimestamp } from "@/lib/dateTime";
import { getProfileDisplayName } from "@/lib/profileNames";
import {
  fetchOnlinePresenceRows,
  getPresenceFreshnessTimestamp,
  getPresenceLocationInfo,
} from "@/lib/presenceStatus";
import { getRoleColor } from "@/lib/roleColor";
import {
  type HouseId,
  HOUSE_IDS,
  getHouseDisplayLabel,
  getHouseVisualTheme,
  isUnsortedHouse,
  resolveHouseId,
  withAlpha,
} from "@/lib/houses";
import { createClient } from "@/utils/supabase/client";

type UserGroupMeta = {
  name?: string | null;
  color?: string | null;
};

type DirectoryProfileRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  house?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  status?: string | null;
  is_ghost?: boolean | null;
  created_at?: string | null;
  user_groups?: UserGroupMeta | UserGroupMeta[] | null;
};

type PresenceSnapshot = {
  status: "online" | "afk";
  freshness: number;
  locationLabel: string;
  locationHref: string;
};

type FilterValue = "all" | "online" | HouseId | "unsorted";

const STRINGS = {
  eyebrow: "ספר הרישום החי של הטירה",
  title: "ספר הקוסמים של הטירה",
  subtitle:
    "העמוד שמרכז את כל מי שהופך את הטירה הזו למה שהיא. כאן תוכלו לראות לאיזה בית כל אחד שייך, מי מסתובב במסדרונות ממש עכשיו, ופשוט להכיר את האנשים שמאחורי הגלימות.",
  searchPlaceholder: "חפשו לפי שם, בית, דרגה או שם משתמש...",
  liveNow: "מי מסתובב בטירה עכשיו",
  allMembers: "ספר הקוסמים המלא",
  allMembersHint: "בחרו כל דמות כדי לפתוח את התיק האישי שלה ולגלות עליה קצת יותר.",
  noResults: "לא מצאתי קוסמים או מכשפות שמתאימים לחיפוש הזה.",
  noResultsHint: "אפשר לנסות שם אחר, לעבור לבית אחר, או לחזור לתצוגה של כולם.",
  noLivePresence: "כרגע המסדרונות שקטים. ברגע שמישהו יופיע, מפת הקונדסאים תסמן אותו כאן.",
  onlineLabel: "על המפה עכשיו",
  afkLabel: "השאיר עקבות",
  offlineLabel: "מחוץ לטירה כרגע",
  fallbackRole: "חלק מקהילת הטירה",
  onlineFilter: "פעילים עכשיו",
  allFilter: "כולם",
  unsortedFilter: "ממתינים למיון",
  liveHint: "הרשימה מתעדכנת בזמן אמת בהתאם לנוכחות החיה שלכם, קצת כמו מפת הקונדסאים.",
  footerTitle: "משהו כאן חסר או לא מדויק.",
  footerCopy: "אם השם, סמל הבית או הדרגה שלכם צריכים ליטוש קטן, הדף האישי שלכם מחכה לכם כדי שתעשו בו קסמים.",
  footerCta: "מעבר לדף האישי שלי",
};

function normalizeUserGroup(value: DirectoryProfileRow["user_groups"]) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function normalizeSearchValue(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase("he-IL") || "";
}

function formatHebrewDate(value: string | null | undefined) {
  const timestamp = parseAppTimestamp(value);
  if (timestamp === null) return null;
  return new Date(timestamp).toLocaleDateString("he-IL");
}

function humanizeRoleLabel(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (trimmed === "תלמיד/ה") return "תלמידי הטירה";
  if (trimmed === "חבר/ת קהילה") return "חלק מקהילת הטירה";

  return trimmed.replace(/\/[הת]/g, "").replace(/\s{2,}/g, " ").trim();
}

function getPresenceRank(snapshot?: PresenceSnapshot) {
  if (!snapshot) return 0;
  return snapshot.status === "online" ? 2 : 1;
}

function buildFilterCount(
  filter: FilterValue,
  profiles: DirectoryProfileRow[],
  presenceMap: Record<string, PresenceSnapshot>,
) {
  if (filter === "all") return profiles.length;
  if (filter === "online") {
    return profiles.filter((profile) => Boolean(presenceMap[profile.id])).length;
  }
  if (filter === "unsorted") {
    return profiles.filter((profile) => isUnsortedHouse(profile.house)).length;
  }
  return profiles.filter((profile) => resolveHouseId(profile.house) === filter).length;
}

export default function WizardsPage() {
  const { profile: authProfile } = useAuth();
  const [supabase] = useState(() => createClient());
  const [profiles, setProfiles] = useState<DirectoryProfileRow[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceSnapshot>>({});
  const [lastActivityMap, setLastActivityMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, house, role, avatar_url, status, is_ghost, created_at, user_groups(name, color)")
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        setLoadError(error.message);
        return;
      }

      const visibleProfiles = ((data as DirectoryProfileRow[] | null) || []).filter((profile) => {
        if (!profile.id) return false;
        if (profile.is_ghost) return false;
        return profile.status !== "banned";
      });

      setProfiles(visibleProfiles);
      setLoadError(null);
    };

    const loadPresence = async () => {
      const cutoffTimestamp = Date.now() - 5 * 60 * 1000;
      const { rows } = await fetchOnlinePresenceRows(supabase, {
        memberOnly: true,
      });

      if (!isMounted) return;

      const nextPresenceMap: Record<string, PresenceSnapshot> = {};
      const nextLastActivityMap: Record<string, string> = {};
      rows.forEach((row) => {
        const activityTimestamp = row.last_active_at || row.last_seen;
        if (activityTimestamp) {
          nextLastActivityMap[row.id] = activityTimestamp;
        }

        const freshness = getPresenceFreshnessTimestamp(row);
        if (freshness < cutoffTimestamp) return;

        const locationInfo = getPresenceLocationInfo(row);
        nextPresenceMap[row.id] = {
          status: row.presence_status,
          freshness,
          locationLabel: locationInfo.label,
          locationHref: locationInfo.href,
        };
      });

      setPresenceMap(nextPresenceMap);
      setLastActivityMap(nextLastActivityMap);
    };

    const initialLoad = async () => {
      setIsLoading(true);
      await Promise.all([loadProfiles(), loadPresence()]);
      if (isMounted) {
        setIsLoading(false);
      }
    };

    void initialLoad();

    const interval = window.setInterval(() => {
      void loadPresence();
    }, 20_000);

    const channel = supabase
      .channel("wizards-directory-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "online_users" }, () => {
        void loadPresence();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void loadProfiles();
      })
      .subscribe();

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  const normalizedSearch = normalizeSearchValue(searchQuery);

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((left, right) => {
      const leftRank = getPresenceRank(presenceMap[left.id]);
      const rightRank = getPresenceRank(presenceMap[right.id]);
      if (leftRank !== rightRank) return rightRank - leftRank;

      const leftFreshness = presenceMap[left.id]?.freshness || 0;
      const rightFreshness = presenceMap[right.id]?.freshness || 0;
      if (leftFreshness !== rightFreshness) return rightFreshness - leftFreshness;

      const leftName = getProfileDisplayName(left, "");
      const rightName = getProfileDisplayName(right, "");
      return leftName.localeCompare(rightName, "he");
    });
  }, [presenceMap, profiles]);

  const filteredProfiles = useMemo(() => {
    return sortedProfiles.filter((profile) => {
      if (activeFilter === "online" && !presenceMap[profile.id]) return false;
      if (activeFilter === "unsorted" && !isUnsortedHouse(profile.house)) return false;
      if (activeFilter !== "all" && activeFilter !== "online" && activeFilter !== "unsorted") {
        if (resolveHouseId(profile.house) !== activeFilter) return false;
      }

      if (!normalizedSearch) return true;

      const group = normalizeUserGroup(profile.user_groups);
      const haystack = [
        getProfileDisplayName(profile),
        getHouseDisplayLabel(profile.house, STRINGS.unsortedFilter),
        group?.name || null,
        profile.role || null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("he-IL");

      return haystack.includes(normalizedSearch);
    });
  }, [activeFilter, normalizedSearch, presenceMap, sortedProfiles]);

  const spotlightProfiles = useMemo(() => {
    return sortedProfiles.filter((profile) => Boolean(presenceMap[profile.id])).slice(0, 8);
  }, [presenceMap, sortedProfiles]);

  const filterChips = useMemo(() => {
    return [
      { value: "all" as const, label: STRINGS.allFilter },
      { value: "online" as const, label: STRINGS.onlineFilter },
      ...HOUSE_IDS.map((houseId) => ({
        value: houseId,
        label: getHouseDisplayLabel(houseId),
      })),
      { value: "unsorted" as const, label: STRINGS.unsortedFilter },
    ].map((chip) => ({
      ...chip,
      count: buildFilterCount(chip.value, profiles, presenceMap),
    }));
  }, [presenceMap, profiles]);

  const presentNowCount = Object.keys(presenceMap).length;
  const sortedCount = profiles.filter((profile) => !isUnsortedHouse(profile.house)).length;
  const footerHref = authProfile?.id ? `/wizard/${authProfile.id}` : "/sorting";
  const footerLabel = authProfile?.id ? STRINGS.footerCta : "לטקס המיון";

  return (
    <main
      className="min-h-screen px-4 pb-24 pt-32 md:px-6"
      style={{
        background:
          "radial-gradient(circle at top, rgba(211,166,37,0.14), transparent 20%), radial-gradient(circle at 15% 20%, rgba(30,64,175,0.12), transparent 24%), radial-gradient(circle at 85% 18%, rgba(5,150,105,0.1), transparent 22%), #050608",
      }}
      dir="rtl"
    >
      <div className="mx-auto max-w-6xl">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="overflow-hidden rounded-[2.3rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_42%,rgba(5,8,12,0.9)_100%)] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] md:p-8"
        >
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/8 px-4 py-2">
                <Wand2 size={14} className="text-amber-300" />
                <span className="font-cinzel text-[10px] font-black uppercase tracking-[0.24em] text-amber-200/80">
                  {STRINGS.eyebrow}
                </span>
              </div>

              <h1 className="mt-5 max-w-xl font-cinzel text-4xl font-black leading-tight text-white md:text-6xl">
                {STRINGS.title}
              </h1>

              <p className="mt-4 max-w-xl text-base leading-8 text-white/70 md:text-lg">
                {STRINGS.subtitle}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  { label: "קוסמים ומכשפות ברשימה", value: profiles.length, icon: Users },
                  { label: "נוכחות חיה עכשיו", value: presentNowCount, icon: Radio },
                  { label: "כבר חבשו את המצנפת", value: sortedCount, icon: Shield },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="min-w-[150px] rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-4 py-4 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-cinzel text-2xl font-black text-white">{stat.value}</span>
                      <stat.icon size={16} className="text-amber-300/70" />
                    </div>
                    <div className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-white/45">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/25 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-cinzel text-xs font-black uppercase tracking-[0.22em] text-emerald-300/75">
                    {STRINGS.liveNow}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/60">{STRINGS.liveHint}</p>
                </div>
                <div className="text-left">
                  <div className="font-cinzel text-3xl font-black text-emerald-300">{presentNowCount}</div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">LIVE</div>
                </div>
              </div>

              {spotlightProfiles.length === 0 ? (
                <div className="mt-5 rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/50">
                  {STRINGS.noLivePresence}
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {spotlightProfiles.map((profile) => {
                    const presence = presenceMap[profile.id];
                    const houseTheme = getHouseVisualTheme(profile.house);
                    const group = normalizeUserGroup(profile.user_groups);
                    const accentColor = group?.color || getRoleColor(profile.role, profile.house);
                    const roleLabel = group?.name || humanizeRoleLabel(profile.role) || STRINGS.fallbackRole;
                    const liveLabel = presence?.status === "online"
                      ? `על המפה עכשיו: ${presence.locationLabel}`
                      : `עקבות אחרונים: ${presence?.locationLabel}`;

                    return (
                      <Link
                        key={profile.id}
                        href={`/wizard/${profile.id}`}
                        className="flex items-center gap-3 rounded-[1.4rem] border px-3 py-3 transition-all hover:border-white/25 hover:bg-white/[0.06]"
                        style={{
                          borderColor: houseTheme?.mutedBorder || "rgba(255,255,255,0.08)",
                          background: houseTheme?.surface || "rgba(255,255,255,0.03)",
                        }}
                      >
                        <div className="relative h-12 w-12 shrink-0">
                          <MagicAvatar
                            avatarUrl={profile.avatar_url}
                            name={getProfileDisplayName(profile)}
                            house={profile.house}
                            className="h-12 w-12 border border-white/10"
                            roundedClassName="rounded-2xl"
                            fallbackClassName="text-lg"
                          />
                          <span
                            className="absolute -bottom-1 -left-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-black/40 px-1 text-[9px] font-black text-black"
                            style={{
                              background: presence?.status === "online" ? "#34d399" : "#fbbf24",
                            }}
                          >
                            {presence?.status === "online" ? "ON" : "AFK"}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-assistant text-sm font-bold text-white">
                            {getProfileDisplayName(profile)}
                          </p>
                          <p className="mt-1 truncate text-xs" style={{ color: accentColor }}>
                            {liveLabel}
                          </p>
                        </div>

                        <div
                          className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
                          style={{
                            color: accentColor,
                            background: withAlpha(accentColor, 0.12),
                            border: `1px solid ${withAlpha(accentColor, 0.22)}`,
                          }}
                        >
                          {roleLabel}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-8 rounded-[2rem] border border-white/10 bg-black/25 p-5 backdrop-blur-sm md:p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-cinzel text-xs font-black uppercase tracking-[0.22em] text-white/45">
                {STRINGS.allMembers}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/60">{STRINGS.allMembersHint}</p>
            </div>

            <label className="relative block w-full max-w-md">
              <Search size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={STRINGS.searchPlaceholder}
                className="w-full rounded-[1.4rem] border border-white/10 bg-white/[0.04] py-3 pr-11 pl-4 text-sm text-white outline-none transition-all placeholder:text-white/25 focus:border-amber-400/35"
                dir="rtl"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {filterChips.map((chip) => {
              const isActive = chip.value === activeFilter;
              const houseTheme =
                chip.value !== "all" && chip.value !== "online" && chip.value !== "unsorted"
                  ? getHouseVisualTheme(chip.value)
                  : null;

              return (
                <button
                  key={chip.value}
                  onClick={() => setActiveFilter(chip.value)}
                  className="rounded-full border px-3.5 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all"
                  style={{
                    color: isActive ? (houseTheme?.text || "#0b1120") : (houseTheme?.text || "rgba(255,255,255,0.7)"),
                    background: isActive
                      ? (houseTheme?.surfaceStrong || "linear-gradient(135deg, rgba(251,191,36,0.9), rgba(245,158,11,0.78))")
                      : (houseTheme?.surface || "rgba(255,255,255,0.03)"),
                    borderColor: isActive
                      ? (houseTheme?.border || "rgba(251,191,36,0.45)")
                      : (houseTheme?.mutedBorder || "rgba(255,255,255,0.08)"),
                    boxShadow: isActive ? (houseTheme?.shadow || "0 0 24px rgba(245,158,11,0.18)") : "none",
                  }}
                >
                  {chip.label} <span className="opacity-70">({chip.count})</span>
                </button>
              );
            })}
          </div>
        </motion.section>

        <section className="mt-6">
          {loadError ? (
            <div className="rounded-[1.8rem] border border-rose-500/20 bg-rose-500/10 px-5 py-6 text-sm text-rose-100">
              משהו לא הסתדר בדרך לטעינת רשימת הקוסמים. אפשר לרענן ולנסות שוב.
              <div className="mt-2 text-xs text-rose-100/70">{loadError}</div>
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[118px] animate-pulse rounded-[1.8rem] border border-white/8 bg-white/[0.04]"
                />
              ))}
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.03] px-5 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                <Sparkles size={18} className="text-amber-300/75" />
              </div>
              <h2 className="mt-4 font-cinzel text-2xl font-black text-white">{STRINGS.noResults}</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-white/55">{STRINGS.noResultsHint}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProfiles.map((profile, index) => {
                const group = normalizeUserGroup(profile.user_groups);
                const name = getProfileDisplayName(profile);
                const houseTheme = getHouseVisualTheme(profile.house);
                const presence = presenceMap[profile.id];
                const accentColor = group?.color || getRoleColor(profile.role, profile.house);
                const roleLabel = group?.name || humanizeRoleLabel(profile.role) || STRINGS.fallbackRole;
                const houseLabel = getHouseDisplayLabel(profile.house, STRINGS.unsortedFilter);
                const joinedDateLabel = formatHebrewDate(profile.created_at);
                const lastActivityLabel = lastActivityMap[profile.id]
                  ? formatHebrewRelativeTime(lastActivityMap[profile.id], {
                      maxRelativeDays: 90,
                      invalidLabel: "לא ידוע",
                    })
                  : null;
                const presenceSummary = presence
                  ? presence.status === "online"
                    ? `על המפה עכשיו: ${presence.locationLabel}`
                    : `עקבות אחרונים: ${presence.locationLabel}`
                  : null;

                return (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.34, delay: Math.min(index * 0.025, 0.2) }}
                  >
                    <Link
                      href={`/wizard/${profile.id}`}
                      className="group block rounded-[1.9rem] border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 md:p-5"
                      style={{
                        borderColor: houseTheme?.mutedBorder || "rgba(255,255,255,0.08)",
                        background:
                          houseTheme?.surface ||
                          "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))",
                        boxShadow: houseTheme?.shadow || "0 10px 30px rgba(0,0,0,0.18)",
                      }}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="relative h-16 w-16 shrink-0">
                            <MagicAvatar
                              avatarUrl={profile.avatar_url}
                              name={name}
                              house={profile.house}
                              className="h-16 w-16 border border-white/10"
                              roundedClassName="rounded-[1.35rem]"
                              fallbackClassName="text-2xl"
                            />
                            {presence ? (
                              <span
                                className="absolute -bottom-1 -left-1 inline-flex items-center gap-1 rounded-full border border-black/40 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-black"
                                style={{
                                  background: presence.status === "online" ? "#34d399" : "#fbbf24",
                                }}
                              >
                                {presence.status === "online" ? "ON" : "AFK"}
                              </span>
                            ) : null}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="truncate font-cinzel text-xl font-black text-white">{name}</h2>
                              <span
                                className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                                style={{
                                  color: accentColor,
                                  background: withAlpha(accentColor, 0.12),
                                  border: `1px solid ${withAlpha(accentColor, 0.22)}`,
                                }}
                              >
                                {roleLabel}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                              <span
                                className="rounded-full px-2.5 py-1 font-semibold"
                                style={{
                                  color: houseTheme?.text || accentColor,
                                  background: houseTheme?.badgeBackground || withAlpha(accentColor, 0.1),
                                  border: `1px solid ${houseTheme?.badgeBorder || withAlpha(accentColor, 0.18)}`,
                                }}
                              >
                                {houseLabel}
                              </span>
                            </div>
                            {joinedDateLabel ? (
                              <p className="mt-2 text-sm text-white/45">הצטרף/ה לטירה ב: {joinedDateLabel}</p>
                            ) : null}
                            {lastActivityLabel ? (
                              <p className="mt-1 text-sm text-white/45">ביקור אחרון {lastActivityLabel}</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-col items-start gap-2 md:items-end">
                          <div
                            className="rounded-full px-3 py-1.5 text-[11px] font-black tracking-[0.18em]"
                            style={{
                              color: presence ? accentColor : "rgba(255,255,255,0.72)",
                              background: presence ? withAlpha(accentColor, 0.12) : "rgba(255,255,255,0.05)",
                              border: `1px solid ${presence ? withAlpha(accentColor, 0.2) : "rgba(255,255,255,0.08)"}`,
                            }}
                          >
                            {presence
                              ? presence.status === "online"
                                ? STRINGS.onlineLabel
                                : STRINGS.afkLabel
                              : STRINGS.offlineLabel}
                          </div>
                          {presenceSummary ? (
                            <p className="text-sm text-white/55">{presenceSummary}</p>
                          ) : null}
                          <p className="text-xs font-semibold tracking-[0.14em] text-amber-100/65 transition-colors group-hover:text-amber-100">
                            לצפייה בפרופיל המלא
                          </p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-6 md:flex md:items-center md:justify-between"
        >
          <div>
            <p className="font-cinzel text-xl font-black text-white">{STRINGS.footerTitle}</p>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/60">{STRINGS.footerCopy}</p>
          </div>
          <Link
            href={footerHref}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-3 font-cinzel text-sm font-black uppercase tracking-[0.18em] text-black transition-all hover:bg-amber-300 md:mt-0"
          >
            {footerLabel}
          </Link>
        </motion.section>
      </div>
    </main>
  );
}
