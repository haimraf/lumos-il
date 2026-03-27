"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  getHouseDisplayIcon,
  getHouseDisplayLabel,
  getHouseReadableColor,
  withAlpha,
} from "@/lib/houses";

type OnlineUserRow = {
  id: string;
  user_name: string | null;
  house: string | null;
};

type ProfileGroupRow = {
  id: string;
  user_groups:
    | { name?: string | null; color?: string | null }
    | { name?: string | null; color?: string | null }[]
    | null;
};

type OnlineUser = OnlineUserRow & {
  group_color: string | null;
  group_name: string | null;
};

function normalizeGroupMeta(value: ProfileGroupRow["user_groups"]) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

export default function WhoIsOnline() {
  const [supabase] = useState(() => createClient());
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [totalOnline, setTotalOnline] = useState(0);

  useEffect(() => {
    const fetchOnline = async () => {
      const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from("online_users")
          .select("id, user_name, house")
          .gte("last_seen", cutoff)
          .order("last_seen", { ascending: false })
          .limit(20),
        supabase
          .from("online_users")
          .select("id", { count: "exact", head: true })
          .gte("last_seen", cutoff),
      ]);

      if (!data) return;
      setTotalOnline(count ?? data.length);

      const members = (data as OnlineUserRow[]).filter((user) => !String(user.id).startsWith("guest_"));
      const userIds = members.map((user) => user.id).filter(Boolean);
      const groupMap: Record<string, { color: string | null; name: string | null }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, user_groups(name, color)")
          .in("id", userIds);

        (profiles as ProfileGroupRow[] | null)?.forEach((profile) => {
          const group = normalizeGroupMeta(profile.user_groups);
          groupMap[profile.id] = {
            color: group?.color || null,
            name: group?.name || null,
          };
        });
      }

      setOnlineUsers(
        members.slice(0, 15).map((user) => ({
          ...user,
          group_color: groupMap[user.id]?.color || null,
          group_name: groupMap[user.id]?.name || null,
        })),
      );
    };

    void fetchOnline();
    const interval = window.setInterval(() => {
      void fetchOnline();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [supabase]);

  if (onlineUsers.length === 0 && totalOnline === 0) return null;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
      <div
        className="rounded-2xl border p-5"
        style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={14} style={{ color: "#34d399" }} />
            <span className="font-cinzel text-xs font-black uppercase tracking-widest text-emerald-400/70">
              {"\u05de\u05d7\u05d5\u05d1\u05e8\u05d9\u05dd \u05e2\u05db\u05e9\u05d9\u05d5"}
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.18)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-cinzel text-xs font-black text-emerald-400">{totalOnline}</span>
          </div>
        </div>

        {onlineUsers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5" dir="rtl">
            {onlineUsers.map((user) => {
              const houseColor = getHouseReadableColor(user.house);
              const nameColor = user.group_color || houseColor;
              const houseLabel =
                user.group_name || getHouseDisplayLabel(user.house, "\u05d8\u05e8\u05dd \u05de\u05d5\u05d9\u05e0/\u05ea");
              const houseIcon = getHouseDisplayIcon(user.house, "\u2728");

              return (
                <Link
                  key={user.id}
                  href={`/wizard/${user.id}`}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition-all hover:opacity-80"
                  style={{
                    background: withAlpha(nameColor, 0.1),
                    border: `1px solid ${withAlpha(nameColor, 0.24)}`,
                    color: nameColor,
                  }}
                  title={houseLabel}
                >
                  <span className="text-sm leading-none">{houseIcon}</span>
                  {user.user_name || "\u05d0\u05d5\u05e8\u05d7 \u05de\u05e1\u05ea\u05d5\u05e8\u05d9"}
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="py-2 text-center text-xs italic text-white/20">
            {"\u05e8\u05e7 \u05d0\u05d5\u05e8\u05d7\u05d9\u05dd \u05de\u05d7\u05d5\u05d1\u05e8\u05d9\u05dd \u05db\u05e2\u05ea"}
          </p>
        )}
      </div>
    </div>
  );
}
