"use client";

import type { ChangeEvent } from "react";
import { Crown, Search, Trophy, X } from "lucide-react";
import AdminPresencePanel from "@/components/admin/AdminPresencePanel";
import AdminSystemHealthPanel from "@/components/admin/AdminSystemHealthPanel";
import { isUnsortedHouse } from "@/lib/houses";

type HouseConfigEntry = {
  color: string;
  accent: string;
  icon: string;
  barColor: string;
  barGlow: string;
};

type RewardUser = {
  id: string;
  full_name: string;
  house?: string | null;
  avatar_url?: string | null;
  email?: string | null;
};

type ActivityEvent = {
  created_at?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  actor_name?: string | null;
};

type Props = {
  housePoints: Record<string, number>;
  houseConfig: Record<string, HouseConfigEntry>;
  reportsCount: number;
  adminLogsCount: number;
  activityEvents: ActivityEvent[];
  allProfiles: Array<{ house?: string | null; email?: string | null }>;
  siteSettings: Record<string, unknown>;
  newsItems: Array<{ title?: string | null; subtitle?: string | null; content?: string | null }>;
  forumItems: Array<{ name?: string | null; description?: string | null }>;
  onOpenTab: (tab: "house-cup" | "health" | "presence" | "activity" | "logs" | "quests" | "users" | "moderation" | "events" | "settings") => void;
  isAdmin: boolean;
  searchQuery: string;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSearchSubmit: () => void;
  isSearching: boolean;
  users: RewardUser[];
  selectedUser: RewardUser | null;
  onSelectUser: (user: RewardUser) => void;
  onClearSelectedUser: () => void;
  pointsToAdd: number;
  onPointsChange: (value: number) => void;
  galleonsToAdd: number;
  onGalleonsChange: (value: number) => void;
  onSubmitReward: () => void;
  isUpdating: boolean;
};

const HOUSE_ORDER = ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"] as const;

export default function AdminOverviewTab({
  housePoints,
  houseConfig,
  reportsCount,
  adminLogsCount,
  activityEvents,
  allProfiles,
  siteSettings,
  newsItems,
  forumItems,
  onOpenTab,
  isAdmin,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  isSearching,
  users,
  selectedUser,
  onSelectUser,
  onClearSelectedUser,
  pointsToAdd,
  onPointsChange,
  galleonsToAdd,
  onGalleonsChange,
  onSubmitReward,
  isUpdating,
}: Props) {
  const maxPoints = Math.max(...Object.values(housePoints).map(Number), 1);
  const unsortedUsersCount = allProfiles.filter((entry) => isUnsortedHouse(entry.house)).length;
  const profilesWithEmailCount = allProfiles.filter(
    (entry) => typeof entry.email === "string" && entry.email.trim().length > 0,
  ).length;

  return (
    <>
      <section className="admin-card rounded-2xl p-6 space-y-4">
        <h3 className="font-cinzel text-xs font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
          <Trophy size={14} className="text-amber-500" /> גביע הבית — נקודות
        </h3>
        <div className="space-y-3">
          {HOUSE_ORDER.map((house) => {
            const cfg = houseConfig[house];
            const pts = housePoints[house] || 0;
            const pct = Math.round((pts / maxPoints) * 100);

            return (
              <div key={house} className="flex items-center gap-4">
                <span className="text-lg shrink-0">{cfg.icon}</span>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-cinzel uppercase tracking-[0.18em] text-white/30">
                    <span>{house}</span>
                    <span>{pct}% מהמוביל</span>
                  </div>
                  <div className="flex-1 h-2.5 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.04]">
                    <div
                      className="house-bar h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        minWidth: pts > 0 ? "0.75rem" : 0,
                        background: `linear-gradient(90deg, ${cfg.barColor}, rgba(255,255,255,0.92))`,
                        boxShadow: cfg.barGlow,
                        opacity: 0.95,
                      }}
                    />
                  </div>
                </div>
                <span className={`font-cinzel font-black text-sm w-14 text-left ${cfg.color}`}>{pts.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </section>

      <AdminSystemHealthPanel
        mode="compact"
        reportsCount={reportsCount}
        adminLogsCount={adminLogsCount}
        activityEvents={activityEvents}
        unsortedUsersCount={unsortedUsersCount}
        totalProfiles={allProfiles.length}
        profilesWithEmailCount={profilesWithEmailCount}
        siteSettings={siteSettings}
        newsItems={newsItems}
        forumItems={forumItems}
        onOpenTab={onOpenTab}
      />

      <AdminPresencePanel mode="compact" onOpenFull={() => onOpenTab("presence")} />

      {isAdmin && (
        <section className="admin-card rounded-2xl p-5 space-y-4">
          <h3 className="font-cinzel text-xs font-black text-amber-500 flex items-center gap-2 uppercase tracking-widest">
            <Crown size={13} /> מענקי דמויות
          </h3>

          <div className="relative">
            <input
              value={searchQuery}
              onChange={onSearchChange}
              onKeyDown={(event) => event.key === "Enter" && onSearchSubmit()}
              placeholder="הקלד שם דמות..."
              className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-amber-500/30 rounded-xl p-3 text-sm outline-none transition-all pr-10"
              dir="rtl"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              {isSearching ? (
                <div className="w-3.5 h-3.5 border border-amber-500/40 border-t-amber-500 rounded-full animate-spin" />
              ) : (
                <Search size={13} className="text-white/20" />
              )}
            </div>
          </div>

          {users.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {users.map((user) => {
                const cfg = user.house ? houseConfig[user.house] : null;
                return (
                  <button
                    key={user.id}
                    onClick={() => onSelectUser(user)}
                    className={`search-result-item w-full flex items-center justify-between p-3 rounded-xl border text-right transition-all ${
                      selectedUser?.id === user.id ? "selected border-amber-500/30" : "border-transparent hover:border-white/[0.06]"
                    }`}
                  >
                    <span className="text-sm font-bold text-white/80">{user.full_name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-cinzel uppercase ${cfg?.color || "text-white/20"}`}>{user.house}</span>
                      <div
                        className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-sm shrink-0"
                        style={{ background: cfg ? cfg.accent : "rgba(255,255,255,0.05)" }}
                      >
                        {user.avatar_url ? <img src={user.avatar_url} alt={user.full_name || "אווטאר"} className="w-full h-full object-cover" /> : cfg?.icon || "🧙"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedUser && (
            <div className="space-y-4 pt-3 border-t border-white/[0.05] animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/40">מענק עבור:</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-amber-400 font-cinzel">{selectedUser.full_name}</span>
                  <button onClick={onClearSelectedUser} className="text-white/20 hover:text-white/60 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] text-white/25 block text-center font-black uppercase tracking-wide">נקודות</label>
                  <input
                    type="number"
                    value={pointsToAdd}
                    onChange={(event) => onPointsChange(parseInt(event.target.value, 10) || 0)}
                    className="w-full bg-black/40 border border-amber-500/15 focus:border-amber-500/40 rounded-xl p-3 text-center font-cinzel font-black text-amber-400 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-white/25 block text-center font-black uppercase tracking-wide">גליאונים</label>
                  <input
                    type="number"
                    value={galleonsToAdd}
                    onChange={(event) => onGalleonsChange(parseInt(event.target.value, 10) || 0)}
                    className="w-full bg-black/40 border border-amber-500/15 focus:border-amber-500/40 rounded-xl p-3 text-center font-cinzel font-black text-amber-400 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                onClick={onSubmitReward}
                disabled={isUpdating}
                className="w-full bg-amber-600 hover:bg-amber-500 py-3.5 rounded-xl text-black font-black text-xs uppercase tracking-widest font-cinzel transition-all active:scale-[0.99] disabled:opacity-40"
              >
                {isUpdating ? "מעביר..." : "שליחת מענק ✨"}
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}
