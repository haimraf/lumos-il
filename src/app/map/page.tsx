"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Compass, Flame, Footprints, MapPin, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { formatHebrewRelativeTime } from "@/lib/dateTime";
import {
  getPresenceLocationInfo,
  fetchOnlinePresenceRows,
  type OnlinePresenceRow,
} from "@/lib/presenceStatus";
import {
  getHouseDisplayIcon,
  getHouseDisplayLabel,
  getHouseReadableColor,
  isUnsortedHouse,
  withAlpha,
} from "@/lib/houses";

type PresenceChip = OnlinePresenceRow & {
  group_color: string | null;
  group_name: string | null;
  locationLabel: string;
  locationHref: string;
};

type GroupMeta = {
  color?: string | null;
  name?: string | null;
};

type ProfileGroupRow = {
  id: string;
  user_groups: GroupMeta | GroupMeta[] | null;
};

type ForumProfileRow = {
  id?: string | null;
  full_name?: string | null;
  house?: string | null;
};

type ThreadMetaRow = {
  id?: string | null;
  title?: string | null;
};

type ForumPostRow = {
  id: string;
  created_at: string;
  thread_id: string | null;
  threads: ThreadMetaRow | ThreadMetaRow[] | null;
  profiles: ForumProfileRow | ForumProfileRow[] | null;
};

type ThreadRow = {
  id: string;
  title: string | null;
  created_at: string;
  forums: { slug?: string | null } | { slug?: string | null }[] | null;
  profiles: ForumProfileRow | ForumProfileRow[] | null;
};

type HouseSortedEventRow = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_house: string | null;
  title: string | null;
  subtitle: string | null;
  icon: string | null;
  created_at: string;
  target_url: string | null;
};

type ActivityProfileRow = {
  id: string;
  full_name: string | null;
  house: string | null;
  user_groups: { color?: string | null } | { color?: string | null }[] | null;
};

type ActivityItem = {
  id: string;
  type: "post" | "join" | "thread";
  icon: string;
  actorName: string;
  description: string;
  profileId: string | null;
  house: string | null;
  time: string;
  sub: string | null;
  targetHref: string | null;
  groupColor: string | null;
};

type ZoneSummary = {
  key: string;
  label: string;
  path: string;
  icon: string;
  count: number;
};

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;
const STRINGS = {
  title: "\u05de\u05e4\u05ea \u05d4\u05e7\u05d5\u05e0\u05d3\u05e1\u05d0\u05d9\u05dd",
  subtitle: "Messrs. Moony, Wormtail, Padfoot and Prongs are proud to present...",
  totalWizards: "\u05e7\u05d5\u05e1\u05de\u05d9\u05dd",
  topZone: "\u05d4\u05d0\u05d6\u05d5\u05e8 \u05d4\u05e4\u05e2\u05d9\u05dc \u05d1\u05d9\u05d5\u05ea\u05e8",
  topHouse: "\u05d4\u05d1\u05d9\u05ea \u05d4\u05e4\u05e2\u05d9\u05dc",
  castleZones: "\u05d0\u05d6\u05d5\u05e8\u05d9 \u05d4\u05d8\u05d9\u05e8\u05d4",
  onlineNow: "\u05de\u05d7\u05d5\u05d1\u05e8\u05d9\u05dd \u05e2\u05db\u05e9\u05d9\u05d5",
  recentActivity: "\u05e4\u05e2\u05d9\u05dc\u05d5\u05ea \u05d0\u05d7\u05e8\u05d5\u05e0\u05d4 \u05d1\u05d8\u05d9\u05e8\u05d4",
  silentCastle: "\u05d4\u05d8\u05d9\u05e8\u05d4 \u05e9\u05e7\u05d8\u05d4 \u05dc\u05e2\u05ea \u05e2\u05ea\u05d4",
  total: '\u05e1\u05d4"\u05db',
  guests: "\u05d0\u05d5\u05e8\u05d7\u05d9\u05dd \u05d1\u05d8\u05d9\u05e8\u05d4",
  refreshes: "\u05d4\u05e4\u05e7\u05d5\u05d3 \u05de\u05ea\u05e2\u05d3\u05db\u05df \u05db\u05dc 15 \u05e9\u05e0\u05d9\u05d5\u05ea",
  mysteriousGuest: "\u05d0\u05d5\u05e8\u05d7 \u05de\u05e1\u05ea\u05d5\u05e8\u05d9",
  afk: "AFK",
  activeNow: "\u05e4\u05e2\u05d9\u05dc/\u05d4 \u05e2\u05db\u05e9\u05d9\u05d5",
  noSortingYet: "\u05dc\u05dc\u05d0 \u05de\u05d9\u05d5\u05df",
  newForumReply: "\u05d4\u05d5\u05d3\u05e2\u05d4 \u05d7\u05d3\u05e9\u05d4 \u05d1\u05e4\u05d5\u05e8\u05d5\u05dd",
  newForumThread: "\u05e9\u05e8\u05e9\u05d5\u05e8 \u05d7\u05d3\u05e9 \u05d1\u05e4\u05d5\u05e8\u05d5\u05dd",
  houseSorting: "\u05de\u05d9\u05d5\u05df \u05dc\u05d1\u05d9\u05ea",
};

const ZONES: ZoneSummary[] = [
  { key: "/home", label: "\u05e8\u05d7\u05d1\u05ea \u05d4\u05db\u05e0\u05d9\u05e1\u05d4", path: "/home", icon: "\ud83c\udff0", count: 0 },
  { key: "/shop", label: "\u05e1\u05de\u05d8\u05ea \u05d3\u05d9\u05d0\u05d2\u05d5\u05df", path: "/shop", icon: "\ud83d\uded2", count: 0 },
  { key: "/news", label: "\u05d4\u05e0\u05d1\u05d9\u05d0 \u05d4\u05d9\u05d5\u05de\u05d9", path: "/news", icon: "\ud83d\udcf0", count: 0 },
  { key: "/dashboard", label: "\u05d7\u05d3\u05e8 \u05d4\u05de\u05d5\u05e2\u05d3\u05d5\u05df", path: "/dashboard", icon: "\u2697\ufe0f", count: 0 },
  { key: "/forums", label: "\u05d4\u05de\u05e1\u05d3\u05e8\u05d5\u05e0\u05d5\u05ea", path: "/forums", icon: "\ud83d\udd6f\ufe0f", count: 0 },
  { key: "/map", label: "\u05de\u05e4\u05ea \u05d4\u05e7\u05d5\u05e0\u05d3\u05e1\u05d0\u05d9\u05dd", path: "/map", icon: "\ud83d\uddfa\ufe0f", count: 0 },
];

function getZoneKey(path: string) {
  if (path === "/" || path.startsWith("/home") || path.startsWith("/great-hall")) return "/home";
  if (path.startsWith("/shop") || path.startsWith("/ollivanders")) return "/shop";
  if (path.startsWith("/news")) return "/news";
  if (path.startsWith("/dashboard") || path.startsWith("/profile")) return "/dashboard";
  if (path.startsWith("/map")) return "/map";
  return "/forums";
}

function timeAgo(dateString: string) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 1000));
  if (diff < 60) return "\u05de\u05de\u05e9 \u05e2\u05db\u05e9\u05d9\u05d5";
  if (diff < 3600) return `\u05dc\u05e4\u05e0\u05d9 ${Math.floor(diff / 60)} \u05d3\u05e7'`;
  if (diff < 86400) return `\u05dc\u05e4\u05e0\u05d9 ${Math.floor(diff / 3600)} \u05e9\u05e2\u05d5\u05ea`;
  return `\u05dc\u05e4\u05e0\u05d9 ${Math.floor(diff / 86400)} \u05d9\u05de\u05d9\u05dd`;
}

function safeTimeAgo(dateString: string) {
  return formatHebrewRelativeTime(dateString, {
    invalidLabel: "לא ידוע",
    yesterdayLabel: "אתמול",
  });
}

export default function MaraudersMasterMap() {
  const [supabase] = useState(() => createClient());
  const [zones, setZones] = useState<ZoneSummary[]>(ZONES);
  const [members, setMembers] = useState<PresenceChip[]>([]);
  const [guestCount, setGuestCount] = useState(0);
  const [totalOnline, setTotalOnline] = useState(0);
  const [topHouse, setTopHouse] = useState<string>("Guest");
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const fetchPresence = useCallback(async () => {
    const cutoffIso = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
    const { rows } = await fetchOnlinePresenceRows(supabase, {
      cutoffIso,
      limit: 250,
    });

    const activeRows = rows.filter((row) => row.last_seen);
    const guests = activeRows.filter((row) => row.presence_type === "guest");
    const memberRows = activeRows.filter((row) => row.presence_type === "member");
    const userIds = memberRows.map((row) => row.id).filter(Boolean);
    const groupMap: Record<string, { color: string | null; name: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_groups(name, color)")
        .in("id", userIds);

      (profiles as ProfileGroupRow[] | null || []).forEach((profile) => {
        const group = Array.isArray(profile.user_groups) ? profile.user_groups[0] : profile.user_groups;
        groupMap[profile.id] = {
          color: group?.color || null,
          name: group?.name || null,
        };
      });
    }

    const zoneCounts = new Map<string, number>();
    const houseCounts = new Map<string, number>();

    memberRows.forEach((row) => {
      const locationInfo = getPresenceLocationInfo(row);
      const zoneKey = getZoneKey(locationInfo.href);
      zoneCounts.set(zoneKey, (zoneCounts.get(zoneKey) || 0) + 1);

      if (row.house && !isUnsortedHouse(row.house) && row.house !== "Guest") {
        houseCounts.set(row.house, (houseCounts.get(row.house) || 0) + 1);
      }
    });

    setZones(
      ZONES.map((zone) => ({
        ...zone,
        count: zoneCounts.get(zone.path) || 0,
      })),
    );

    setTotalOnline(activeRows.length);
    setGuestCount(guests.length);

    const topHouseEntry = [...houseCounts.entries()].sort((left, right) => right[1] - left[1])[0];
    setTopHouse(topHouseEntry?.[0] || "Guest");

    setMembers(
      memberRows.slice(0, 14).map((row) => {
        const locationInfo = getPresenceLocationInfo(row);
        return {
          ...row,
          group_color: groupMap[row.id]?.color || null,
          group_name: groupMap[row.id]?.name || null,
          locationLabel: locationInfo.label,
          locationHref: locationInfo.href,
        };
      }),
    );
  }, [supabase]);

  const fetchActivity = useCallback(async () => {
    const results: ActivityItem[] = [];

    const [postsResponse, threadsResponse, sortedResponse] = await Promise.all([
      supabase
        .from("forum_posts")
        .select("id, created_at, user_id, thread_id, threads(id, title), profiles(id, full_name, house)")
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("threads")
        .select("id, title, created_at, forums(slug), profiles(id, full_name, house)")
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("activity_events")
        .select("id, actor_id, actor_name, actor_house, title, subtitle, icon, created_at, target_url")
        .eq("event_type", "house_sorted")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    ((postsResponse.data as ForumPostRow[] | null) || []).forEach((post) => {
      const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
      const thread = Array.isArray(post.threads) ? post.threads[0] : post.threads;
      results.push({
        id: `post_${post.id}`,
        type: "post",
        icon: "\ud83d\udcdc",
        actorName: profile?.full_name || "\u05e7\u05d5\u05e1\u05de\u05f3",
        description: STRINGS.newForumReply,
        profileId: profile?.id || null,
        house: profile?.house || null,
        time: post.created_at,
        sub: thread?.title || null,
        targetHref: thread?.id ? `/forums/thread/${thread.id}` : null,
        groupColor: null,
      });
    });

    ((threadsResponse.data as ThreadRow[] | null) || []).forEach((threadRow) => {
      const profile = Array.isArray(threadRow.profiles) ? threadRow.profiles[0] : threadRow.profiles;
      const forum = Array.isArray(threadRow.forums) ? threadRow.forums[0] : threadRow.forums;
      const targetHref = forum?.slug ? `/forums/${forum.slug}/${threadRow.id}` : `/forums/thread/${threadRow.id}`;
      results.push({
        id: `thread_${threadRow.id}`,
        type: "thread",
        icon: "\ud83d\udd2e",
        actorName: profile?.full_name || "\u05e7\u05d5\u05e1\u05de\u05f3",
        description: STRINGS.newForumThread,
        profileId: profile?.id || null,
        house: profile?.house || null,
        time: threadRow.created_at,
        sub: threadRow.title || null,
        targetHref,
        groupColor: null,
      });
    });

    ((sortedResponse.data as HouseSortedEventRow[] | null) || []).forEach((event) => {
      results.push({
        id: `sorted_${event.id}`,
        type: "join",
        icon: event.icon || "\u2728",
        actorName: event.actor_name || "\u05e7\u05d5\u05e1\u05de\u05f3",
        description: event.title || STRINGS.houseSorting,
        profileId: event.actor_id || null,
        house: event.actor_house || null,
        time: event.created_at,
        sub: event.subtitle || null,
        targetHref: event.target_url || null,
        groupColor: null,
      });
    });

    const profileIds = [...new Set(results.map((item) => item.profileId).filter(Boolean))] as string[];
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, house, user_groups(color)")
        .in("id", profileIds);

      const profileMap = new Map<string, { fullName: string | null; house: string | null; groupColor: string | null }>();
      ((profiles as ActivityProfileRow[] | null) || []).forEach((profile) => {
        const group = Array.isArray(profile.user_groups) ? profile.user_groups[0] : profile.user_groups;
        profileMap.set(profile.id, {
          fullName: profile.full_name || null,
          house: profile.house || null,
          groupColor: group?.color || null,
        });
      });

      results.forEach((item) => {
        if (!item.profileId) return;
        const currentProfile = profileMap.get(item.profileId);
        if (!currentProfile) return;

        item.groupColor = currentProfile.groupColor;
        item.actorName = currentProfile.fullName || item.actorName;
        item.house = currentProfile.house || item.house;
      });
    }

    results.sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime());
    setActivity(results.slice(0, 8));
  }, [supabase]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void fetchPresence();
      void fetchActivity();
    }, 0);

    const interval = window.setInterval(() => {
      void fetchPresence();
    }, 15_000);

    const channel = supabase
      .channel("marauders-master-map-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "online_users" }, () => {
        void fetchPresence();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_events" }, () => {
        void fetchActivity();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_posts" }, () => {
        void fetchActivity();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "threads" }, () => {
        void fetchActivity();
      })
      .subscribe();

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [fetchActivity, fetchPresence, supabase]);

  const topZone = useMemo(
    () => [...zones].sort((left, right) => right.count - left.count)[0] || null,
    [zones],
  );

  const topHouseLabel = getHouseDisplayLabel(topHouse, STRINGS.noSortingYet);
  const topHouseColor = getHouseReadableColor(topHouse);

  return (
    <div
      className="min-h-screen px-4 py-8 text-slate-900"
      style={{
        background:
          "radial-gradient(circle at top right, rgba(217,119,6,0.18), transparent 24%), radial-gradient(circle at bottom left, rgba(59,130,246,0.12), transparent 22%), #100900",
      }}
      dir="rtl"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <section
          className="rounded-[2rem] border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          style={{
            background:
              "radial-gradient(circle at top, rgba(255,247,220,0.96), rgba(231,214,165,0.96) 44%, rgba(196,168,104,0.94) 100%)",
            borderColor: "rgba(122,92,20,0.58)",
          }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-['UnifrakturMaguntia'] text-4xl leading-none">{STRINGS.title}</p>
              <p className="mt-2 text-sm italic text-amber-950/75">{STRINGS.subtitle}</p>
            </div>
            <div className="text-center">
              <Compass size={28} className="mx-auto animate-[spin_12s_linear_infinite] text-amber-950/80" />
              <div className="mt-1 font-['UnifrakturMaguntia'] text-5xl leading-none">{totalOnline}</div>
              <div className="text-xs uppercase tracking-[0.24em] text-amber-950/70">{STRINGS.totalWizards}</div>
            </div>
          </div>

          {totalOnline > 0 && (
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-amber-950/80">
              {topZone && topZone.count > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-950/15 bg-white/30 px-3 py-1">
                  <MapPin size={14} />
                  <strong>{STRINGS.topZone}:</strong>
                  <span>{topZone.label}</span>
                  <span>({topZone.count})</span>
                </span>
              )}
              {topHouse !== "Guest" && (
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1"
                  style={{
                    color: topHouseColor,
                    background: withAlpha(topHouseColor, 0.08),
                    borderColor: withAlpha(topHouseColor, 0.24),
                  }}
                >
                  <strong>{STRINGS.topHouse}:</strong>
                  <span>{topHouseLabel}</span>
                </span>
              )}
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section
            className="rounded-[2rem] border p-6"
            style={{
              background:
                "radial-gradient(circle at top, rgba(255,247,220,0.96), rgba(231,214,165,0.96) 44%, rgba(196,168,104,0.94) 100%)",
              borderColor: "rgba(122,92,20,0.58)",
            }}
          >
            <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-amber-950/75">
              <Footprints size={14} />
              {STRINGS.castleZones}
            </div>

            <div className="space-y-2">
              {zones.map((zone) => (
                <Link
                  key={zone.path}
                  href={zone.path}
                  className="flex items-center justify-between rounded-2xl border border-amber-950/10 bg-white/25 px-4 py-3 transition-all hover:bg-white/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{zone.icon}</span>
                    <span className="font-cinzel text-sm font-black text-amber-950">{zone.label}</span>
                  </div>
                  <span className="font-cinzel text-lg font-black text-amber-950/80">{zone.count || "—"}</span>
                </Link>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between text-xs font-black uppercase tracking-[0.22em] text-amber-950/75">
              <span className="inline-flex items-center gap-2">
                <Users size={14} />
                {STRINGS.onlineNow}
              </span>
              <span>{totalOnline} {STRINGS.total}</span>
            </div>

            {members.length === 0 && guestCount === 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-950/10 bg-white/20 px-4 py-6 text-center italic text-amber-950/60">
                {STRINGS.silentCastle}
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {members.map((member) => {
                  const toneColor = member.group_color || getHouseReadableColor(member.house);
                  const badgeLabel = member.group_name || getHouseDisplayLabel(member.house, STRINGS.noSortingYet);
                  const isAfk = member.presence_status === "afk";
                  const name = member.user_name || STRINGS.mysteriousGuest;

                  return (
                    <Link
                      key={member.id}
                      href={`/wizard/${member.id}`}
                      className="rounded-2xl border px-3 py-2 text-sm font-black transition-all hover:translate-y-[-1px]"
                      style={{
                        color: toneColor,
                        background: withAlpha(toneColor, 0.1),
                        borderColor: withAlpha(toneColor, 0.24),
                      }}
                      title={`${badgeLabel} · ${member.locationLabel}`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{getHouseDisplayIcon(member.house, "\u2728")}</span>
                        <span>{name}{isAfk ? ` (${STRINGS.afk})` : ""}</span>
                      </div>
                      <div className="mt-1 text-[11px] font-normal opacity-75">
                        {member.locationLabel}
                      </div>
                    </Link>
                  );
                })}

                {guestCount > 0 && (
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/80">
                    <div className="flex items-center gap-2">
                      <span>\ud83d\udc64</span>
                      <span>{STRINGS.guests}: {guestCount}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section
            className="rounded-[2rem] border p-6"
            style={{
              background:
                "radial-gradient(circle at top, rgba(255,247,220,0.96), rgba(231,214,165,0.96) 44%, rgba(196,168,104,0.94) 100%)",
              borderColor: "rgba(122,92,20,0.58)",
            }}
          >
            <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-amber-950/75">
              <Flame size={14} />
              {STRINGS.recentActivity}
            </div>

            {activity.length === 0 ? (
              <div className="rounded-2xl border border-amber-950/10 bg-white/20 px-4 py-6 text-center italic text-amber-950/60">
                {STRINGS.silentCastle}
              </div>
            ) : (
              <div className="space-y-3">
                {activity.map((item) => {
                  const toneColor = item.groupColor || getHouseReadableColor(item.house);
                  const body = (
                    <div className="flex-1">
                      <div className="text-sm leading-relaxed text-amber-950">
                        {item.profileId ? (
                          <Link href={`/wizard/${item.profileId}`} className="font-black hover:underline" style={{ color: toneColor }}>
                            {item.actorName}
                          </Link>
                        ) : (
                          <span className="font-black" style={{ color: toneColor }}>{item.actorName}</span>
                        )}
                        {" \u2022 "}
                        {item.description}
                      </div>
                      {item.sub && (
                        item.targetHref ? (
                          <Link href={item.targetHref} className="mt-1 block truncate text-sm italic text-amber-900/80 hover:underline">
                            {"\u2190"} &quot;{item.sub}&quot;
                          </Link>
                        ) : (
                          <div className="mt-1 truncate text-sm italic text-amber-900/80">&quot;{item.sub}&quot;</div>
                        )
                      )}
                      <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-amber-950/45">{safeTimeAgo(item.time)}</div>
                    </div>
                  );

                  return (
                    <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-amber-950/10 bg-white/20 px-4 py-3">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-amber-950/10 bg-white/35 text-base">
                        {item.icon}
                      </div>
                      {body}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section
          className="rounded-[1.75rem] border px-5 py-4 text-center text-sm text-amber-100/80"
          style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div>{STRINGS.refreshes}</div>
          <div className="mt-1 text-xs italic text-amber-100/55">&quot;I solemnly swear that I am up to no good.&quot;</div>
        </section>
      </div>
    </div>
  );
}
