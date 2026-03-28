"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Clock3, Eye, Footprints, MapPin, RefreshCw, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  comparePresenceRows,
  fetchOnlinePresenceRows,
  getPresenceFreshnessTimestamp,
  getPresenceLocationInfo,
  type OnlinePresenceRow,
} from "@/lib/presenceStatus";
import { formatHebrewRelativeTime, parseAppTimestamp } from "@/lib/dateTime";
import {
  getHouseDisplayIcon,
  getHouseDisplayLabel,
  getHouseReadableColor,
  withAlpha,
} from "@/lib/houses";

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

type PresenceFilter = "all" | "member" | "guest";
type PanelMode = "full" | "compact";

type AdminPresencePanelProps = {
  mode?: PanelMode;
  onOpenFull?: () => void;
};

type DecoratedPresenceRow = OnlinePresenceRow & {
  displayName: string;
  houseIcon: string;
  houseLabel: string;
  toneColor: string;
  isLive: boolean;
  locationLabel: string;
  locationHref: string;
  rawPath: string;
  lastSeenAgo: string;
  lastActiveAgo: string;
};

function getGuestDisplayName(row: OnlinePresenceRow) {
  const suffix = row.id ? row.id.slice(-6) : "guest";
  if (row.user_name && row.user_name.trim() && row.user_name.trim() !== "אורח") {
    return `${row.user_name.trim()} · ${suffix}`;
  }

  return `אורח · ${suffix}`;
}

function decorateRow(row: OnlinePresenceRow, now: number): DecoratedPresenceRow {
  const houseLabel = row.presence_type === "guest"
    ? "אורח"
    : getHouseDisplayLabel(row.house, "טרם מוינ/ת");
  const toneColor = row.presence_type === "guest"
    ? "#cbd5e1"
    : (getHouseReadableColor(row.house) || "#cbd5e1");
  const locationInfo = getPresenceLocationInfo(row);
  const displayName = row.presence_type === "guest"
    ? getGuestDisplayName(row)
    : (row.user_name || "קוסם ללא שם");
  const freshnessAt = getPresenceFreshnessTimestamp(row);
  const activitySource = parseAppTimestamp(row.last_active_at) !== null
    ? row.last_active_at
    : row.last_seen;

  const freshnessIso = freshnessAt > 0 ? new Date(freshnessAt).toISOString() : (row.last_seen || row.last_active_at || null);

  return {
    ...row,
    displayName,
    houseIcon: row.presence_type === "guest" ? "👤" : getHouseDisplayIcon(row.house, "✨"),
    houseLabel,
    toneColor,
    isLive: now - freshnessAt <= ACTIVE_WINDOW_MS,
    locationLabel: locationInfo.label,
    locationHref: locationInfo.href,
    rawPath: locationInfo.rawPath,
    lastSeenAgo: formatHebrewRelativeTime(freshnessIso, { now, invalidLabel: "לא ידוע" }),
    lastActiveAgo: formatHebrewRelativeTime(activitySource, { now, invalidLabel: "אין עדיין פעילות מדווחת" }),
  };
}

function getStatusBadge(row: DecoratedPresenceRow) {
  if (!row.isLive) {
    return {
      label: "נצפה לאחרונה",
      textColor: "#cbd5f5",
      borderColor: "rgba(148,163,184,0.24)",
      background: "rgba(148,163,184,0.12)",
    };
  }

  if (row.presence_status === "afk") {
    return {
      label: "AFK",
      textColor: "#fbbf24",
      borderColor: "rgba(251,191,36,0.28)",
      background: "rgba(251,191,36,0.12)",
    };
  }

  return {
    label: "פעיל עכשיו",
    textColor: "#34d399",
    borderColor: "rgba(52,211,153,0.24)",
    background: "rgba(52,211,153,0.10)",
  };
}

function PresenceRowCard({ row }: { row: DecoratedPresenceRow }) {
  const badge = getStatusBadge(row);
  const profileHref = row.presence_type === "member" ? `/wizard/${row.id}` : null;

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background: withAlpha(row.toneColor, 0.08),
        borderColor: withAlpha(row.toneColor, 0.16),
        opacity: row.isLive ? 1 : 0.82,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base leading-none">{row.houseIcon}</span>
            {profileHref ? (
              <Link href={profileHref} className="font-cinzel text-sm font-black hover:underline" style={{ color: row.toneColor }}>
                {row.displayName}
              </Link>
            ) : (
              <span className="font-cinzel text-sm font-black" style={{ color: row.toneColor }}>{row.displayName}</span>
            )}
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-cinzel font-black uppercase tracking-[0.16em]"
              style={{
                color: row.presence_type === "guest" ? "#cbd5e1" : row.toneColor,
                border: `1px solid ${withAlpha(row.toneColor, 0.18)}`,
                background: withAlpha(row.toneColor, 0.08),
              }}
            >
              {row.presence_type === "guest" ? "אורח" : row.houseLabel}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-cinzel font-black uppercase tracking-[0.16em]"
              style={{
                color: badge.textColor,
                border: `1px solid ${badge.borderColor}`,
                background: badge.background,
              }}
            >
              {badge.label}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
            <Link
              href={row.locationHref}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 hover:bg-white/[0.04]"
              style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.78)" }}
              title={row.rawPath}
            >
              <MapPin size={12} />
              <span>{row.locationLabel}</span>
            </Link>
            <code className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/50">
              {row.rawPath}
            </code>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-white/35">
            <span className="inline-flex items-center gap-1.5">
              <Eye size={12} />
              עדכון אחרון {row.lastSeenAgo}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={12} />
              פעילות אחרונה {row.lastActiveAgo}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPresencePanel({ mode = "full", onOpenFull }: AdminPresencePanelProps) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<OnlinePresenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<PresenceFilter>("all");
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const loadPresence = useCallback(async (showRefreshing = true) => {
    if (showRefreshing) setRefreshing(true);

    const cutoff = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();
    const { rows: fetchedRows } = await fetchOnlinePresenceRows(supabase, {
      cutoffIso: cutoff,
      limit: 250,
    });

    setRows(fetchedRows || []);
    const now = Date.now();
    setLastSync(now);
    setNowTs(now);
    setLoading(false);
    setRefreshing(false);
  }, [supabase]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadPresence(false);
    }, 0);
    const interval = window.setInterval(() => {
      void loadPresence(false);
    }, 15000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadPresence]);

  const decorated = useMemo(() => {
    return [...rows]
      .map((row) => decorateRow(row, nowTs))
      .sort((left, right) => {
        if (left.isLive !== right.isLive) return left.isLive ? -1 : 1;
        if (left.isLive && right.isLive) return comparePresenceRows(left, right);
        return getPresenceFreshnessTimestamp(right) - getPresenceFreshnessTimestamp(left);
      });
  }, [nowTs, rows]);

  const filteredRows = useMemo(() => {
    if (filter === "member") return decorated.filter((row) => row.presence_type === "member");
    if (filter === "guest") return decorated.filter((row) => row.presence_type === "guest");
    return decorated;
  }, [decorated, filter]);

  const liveRows = filteredRows.filter((row) => row.isLive);
  const recentRows = filteredRows.filter((row) => !row.isLive);

  const summary = {
    liveTotal: decorated.filter((row) => row.isLive).length,
    liveMembers: decorated.filter((row) => row.isLive && row.presence_type === "member").length,
    liveGuests: decorated.filter((row) => row.isLive && row.presence_type === "guest").length,
    liveAfk: decorated.filter((row) => row.isLive && row.presence_status === "afk").length,
    recent: decorated.filter((row) => !row.isLive).length,
  };

  const compactRows = liveRows.slice(0, 6);

  return (
    <section className="admin-card rounded-2xl p-5 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-cinzel text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
            <Footprints size={13} />
            מרכז נוכחות חי
          </h3>
          <p className="mt-1 text-[11px] text-white/35">
            מסך שליטה חי על מי נמצא עכשיו באתר, איפה בדיוק הוא נמצא, ומי נצפה ביממה האחרונה.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastSync && (
            <span className="text-[10px] font-cinzel uppercase tracking-[0.18em] text-white/30">
              עודכן {formatHebrewRelativeTime(new Date(lastSync).toISOString(), { now: nowTs, invalidLabel: "לא ידוע" })}
            </span>
          )}
          <button
            onClick={() => void loadPresence(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-cinzel font-black text-white/70 transition-all hover:bg-white/[0.06]"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            רענון
          </button>
          {mode === "compact" && onOpenFull && (
            <button
              onClick={onOpenFull}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[11px] font-cinzel font-black text-cyan-300 transition-all hover:bg-cyan-500/20"
            >
              <Users size={12} />
              למסך המלא
            </button>
          )}
        </div>
      </div>

      <div className={`grid gap-3 ${mode === "compact" ? "grid-cols-2 xl:grid-cols-5" : "grid-cols-2 xl:grid-cols-5"}`}>
        {[
          { label: "פעילים עכשיו", value: summary.liveTotal, color: "text-emerald-300" },
          { label: "חברי קהילה", value: summary.liveMembers, color: "text-sky-300" },
          { label: "אורחים", value: summary.liveGuests, color: "text-violet-300" },
          { label: "AFK", value: summary.liveAfk, color: "text-amber-300" },
          { label: "נצפו ביממה", value: summary.recent, color: "text-slate-300" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="text-[10px] font-cinzel uppercase tracking-[0.16em] text-white/35">{item.label}</div>
            <div className={`mt-2 text-2xl font-cinzel font-black ${item.color}`}>{item.value}</div>
          </div>
        ))}
      </div>

      {mode === "full" && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-white/45">
            פעיל עכשיו = נראה בחלון של חמש הדקות האחרונות. נצפה לאחרונה = היה בטירה ב־24 השעות האחרונות אבל כבר לא נחשב לייב.
          </div>
          <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "הכול" },
            { id: "member", label: "חברי קהילה" },
            { id: "guest", label: "אורחים" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as PresenceFilter)}
              className="rounded-full px-3 py-1.5 text-[10px] font-cinzel font-black uppercase tracking-[0.18em] transition-all"
              style={{
                color: filter === item.id ? "#67e8f9" : "rgba(255,255,255,0.55)",
                border: `1px solid ${filter === item.id ? "rgba(103,232,249,0.28)" : "rgba(255,255,255,0.08)"}`,
                background: filter === item.id ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.03)",
              }}
            >
              {item.label}
            </button>
          ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-center text-sm text-white/40">
          טוען את תמונת המצב החיה...
        </div>
      ) : mode === "compact" ? (
        compactRows.length > 0 ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {compactRows.map((row) => (
              <PresenceRowCard key={row.id} row={row} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-center text-sm text-white/35">
            אין כרגע נוכחות חיה להצגה.
          </div>
        )
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-cinzel font-black uppercase tracking-[0.18em] text-emerald-300">
              <Activity size={12} />
              פעילים עכשיו ({liveRows.length})
            </div>
            {liveRows.length > 0 ? (
              liveRows.map((row) => <PresenceRowCard key={row.id} row={row} />)
            ) : (
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-center text-sm text-white/35">
                אין כרגע משתמשים פעילים בחלון הזמן של חמש הדקות האחרונות.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-cinzel font-black uppercase tracking-[0.18em] text-slate-300">
              <Clock3 size={12} />
              נצפו לאחרונה ({recentRows.length})
            </div>
            {recentRows.length > 0 ? (
              recentRows.map((row) => <PresenceRowCard key={row.id} row={row} />)
            ) : (
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-center text-sm text-white/35">
                אין כרגע רשומות ישנות בטווח היממה האחרונה.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
