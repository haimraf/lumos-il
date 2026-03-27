"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Compass, Footprints } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fetchOnlinePresenceRows, getPresenceLocationInfo } from "@/lib/presenceStatus";
import {
  getHouseDisplayIcon,
  getHouseDisplayLabel,
  getHousePalette,
  getHouseReadableColor,
  withAlpha,
} from "@/lib/houses";
import { useAuth } from "@/context/AuthContext";

type RadarUser = {
  id: string;
  name: string;
  house: string | null;
  locationLabel: string;
  groupColor: string | null;
  groupName: string | null;
  isAfk: boolean;
};

type ProfileGroupRow = {
  id: string;
  user_groups:
    | { name?: string | null; color?: string | null }
    | { name?: string | null; color?: string | null }[]
    | null;
};

const STRINGS = {
  title: "\u05e8\u05d0\u05d3\u05d0\u05e8 \u05d4\u05d8\u05d9\u05e8\u05d4",
  subtitle: "Solemnly swear that I am up to no good",
  onlineNow: "\u05de\u05d7\u05d5\u05d1\u05e8\u05d9\u05dd \u05db\u05e2\u05ea",
  ownHouse: "\u05d4\u05d1\u05d9\u05ea \u05e9\u05dc\u05d9",
  guests: "\u05d0\u05d5\u05e8\u05d7\u05d9\u05dd",
  mapLink: "\u05dc\u05de\u05e4\u05d4 \u05d4\u05de\u05dc\u05d0\u05d4",
  afk: "AFK",
};

export default function MaraudersRadar() {
  const [supabase] = useState(() => createClient());
  const { profile } = useAuth();
  const [onlineCount, setOnlineCount] = useState(0);
  const [guestCount, setGuestCount] = useState(0);
  const [recentUsers, setRecentUsers] = useState<RadarUser[]>([]);

  const loadPresence = useCallback(async () => {
    const cutoffIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { rows } = await fetchOnlinePresenceRows(supabase, {
      cutoffIso,
      limit: 30,
    });

    const members = rows.filter((row) => row.presence_type === "member");
    const guests = rows.filter((row) => row.presence_type === "guest");
    const userIds = members.map((row) => row.id).filter(Boolean);
    const groupMap: Record<string, { color: string | null; name: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_groups(name, color)")
        .in("id", userIds);

      ((profiles as ProfileGroupRow[] | null) || []).forEach((entry) => {
        const group = Array.isArray(entry.user_groups) ? entry.user_groups[0] : entry.user_groups;
        groupMap[entry.id] = {
          color: group?.color || null,
          name: group?.name || null,
        };
      });
    }

    setOnlineCount(rows.length);
    setGuestCount(guests.length);
    setRecentUsers(
      members.slice(0, 5).map((row) => {
        const location = getPresenceLocationInfo(row);
        return {
          id: row.id,
          name: row.user_name || "\u05e7\u05d5\u05e1\u05de\u05f3",
          house: row.house,
          locationLabel: location.label,
          groupColor: groupMap[row.id]?.color || null,
          groupName: groupMap[row.id]?.name || null,
          isAfk: row.presence_status === "afk",
        };
      }),
    );
  }, [supabase]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadPresence();
    }, 0);
    const interval = window.setInterval(() => {
      void loadPresence();
    }, 15_000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadPresence]);

  const ownHousePalette = getHousePalette(profile?.house);
  const ownHouseColor = ownHousePalette?.readable || "#8b6914";
  const ownHouseLabel = getHouseDisplayLabel(profile?.house, "\u05d8\u05e8\u05dd \u05de\u05d5\u05d9\u05df/\u05ea");

  const stats = useMemo(
    () => [
      { label: STRINGS.onlineNow, value: onlineCount },
      { label: STRINGS.ownHouse, value: ownHouseLabel },
      { label: STRINGS.guests, value: guestCount },
    ],
    [guestCount, onlineCount, ownHouseLabel],
  );

  return (
    <div
      className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[1.75rem] border p-6"
      style={{
        background:
          "radial-gradient(circle at top, rgba(255,247,220,0.96), rgba(231,214,165,0.96) 44%, rgba(196,168,104,0.94) 100%)",
        borderColor: "rgba(122,92,20,0.58)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
      }}
      dir="rtl"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-['UnifrakturMaguntia'] text-3xl leading-none text-amber-950">{STRINGS.title}</div>
          <div className="mt-1 text-xs italic text-amber-950/70">{STRINGS.subtitle}</div>
        </div>
        <div className="text-center">
          <Compass size={22} className="mx-auto animate-[spin_10s_linear_infinite] text-amber-950/80" />
          <div className="mt-1 font-['UnifrakturMaguntia'] text-4xl leading-none text-amber-950">{onlineCount}</div>
        </div>
      </div>

      <div className="my-4 text-center text-[10px] uppercase tracking-[0.4em] text-amber-950/35">
        <span>✦ ✦ ✦</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-amber-950/10 bg-white/30 p-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-950/45">{stat.label}</div>
            <div
              className="mt-1 truncate font-cinzel text-lg font-black"
              style={{ color: stat.label === STRINGS.ownHouse ? ownHouseColor : "#2c1304" }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {recentUsers.map((user) => {
          const toneColor = user.groupColor || getHouseReadableColor(user.house);
          const badgeLabel = user.groupName || getHouseDisplayLabel(user.house, "\u05d8\u05e8\u05dd \u05de\u05d5\u05d9\u05df/\u05ea");

          return (
            <Link
              key={user.id}
              href={`/wizard/${user.id}`}
              className="flex items-center justify-between rounded-2xl border px-3 py-2 transition-all hover:bg-white/40"
              style={{
                borderColor: withAlpha(toneColor, 0.18),
                background: withAlpha(toneColor, 0.08),
              }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span>{getHouseDisplayIcon(user.house, "\u2728")}</span>
                  <span className="truncate font-cinzel text-sm font-black" style={{ color: toneColor }}>
                    {user.name}
                    {user.isAfk ? ` (${STRINGS.afk})` : ""}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-amber-950/65">
                  {badgeLabel} {"\u2022"} {user.locationLabel}
                </div>
              </div>
              <Footprints size={14} className="shrink-0 text-amber-950/45" />
            </Link>
          );
        })}
      </div>

      <Link
        href="/map"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-950/10 bg-amber-950 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-amber-100 transition-all hover:bg-amber-900"
      >
        {STRINGS.mapLink}
        <ChevronLeft size={14} />
      </Link>
    </div>
  );
}
