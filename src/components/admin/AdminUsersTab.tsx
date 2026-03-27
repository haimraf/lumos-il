"use client";

import Link from "next/link";
import { Crown, Save, Search, Shield, UserCog, X } from "lucide-react";
import { getRoleColor } from "@/lib/roleColor";
import { isUnsortedHouse } from "@/lib/houses";

type HouseConfigEntry = {
  color: string;
  accent: string;
  icon: string;
  barColor: string;
  barGlow: string;
};

type UserGroup = {
  id: number;
  name: string;
  color: string;
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
  house?: string | null;
  status?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  group_id?: number | null;
  points_contributed?: number | null;
  user_groups?: { name: string; color: string } | null;
};

type Props = {
  allProfiles: ProfileRow[];
  houseConfig: Record<string, HouseConfigEntry>;
  userSearch: string;
  userFilter: "all" | "מנהל" | "מנחה" | "קוסם/ת" | "unsorted";
  onUserSearchChange: (value: string) => void;
  onUserFilterChange: (value: "all" | "מנהל" | "מנחה" | "קוסם/ת" | "unsorted") => void;
  editingGroup: { id: string; group_id: number | null } | null;
  onEditingGroupChange: (value: { id: string; group_id: number | null } | null) => void;
  isSavingGroup: boolean;
  onSaveGroup: () => void;
  editingRole: { id: string; role: string } | null;
  onEditingRoleChange: (value: { id: string; role: string } | null) => void;
  isSavingRole: boolean;
  onSaveRole: () => void;
  userGroups: UserGroup[];
  onToggleBan: (userId: string, currentStatus: string) => void;
  isAdmin: boolean;
};

export default function AdminUsersTab({
  allProfiles,
  houseConfig,
  userSearch,
  userFilter,
  onUserSearchChange,
  onUserFilterChange,
  editingGroup,
  onEditingGroupChange,
  isSavingGroup,
  onSaveGroup,
  editingRole,
  onEditingRoleChange,
  isSavingRole,
  onSaveRole,
  userGroups,
  onToggleBan,
  isAdmin,
}: Props) {
  const unsortedUsers = allProfiles.filter((profile) => isUnsortedHouse(profile.house));
  const filteredUsers = allProfiles
    .filter((profile) => !userSearch || profile.full_name?.toLowerCase().includes(userSearch.toLowerCase()))
    .filter((profile) => {
      if (userFilter === "all") return true;
      if (userFilter === "קוסם/ת") return !["מנהל", "מנחה"].includes(profile.role || "");
      if (userFilter === "unsorted") return isUnsortedHouse(profile.house);
      return profile.role === userFilter;
    });

  const totalUsers = allProfiles.length;
  const withGroup = allProfiles.filter((profile) => profile.group_id).length;
  const admins = allProfiles.filter((profile) => profile.role === "מנהל").length;

  return (
    <>
      <section className="grid grid-cols-3 gap-3">
        {[
          { label: "קוסמים", count: totalUsers, color: "text-white/60", icon: "🧙" },
          { label: "עם דרגה", count: withGroup, color: "text-indigo-400", icon: "👑" },
          { label: "מנהלים", count: admins, color: "text-amber-400", icon: "🛡️" },
        ].map((row) => (
          <div key={row.label} className="admin-card rounded-2xl p-4 text-center space-y-1">
            <div className="text-2xl">{row.icon}</div>
            <div className={`font-cinzel font-black text-xl ${row.color}`}>{row.count}</div>
            <div className="font-cinzel text-[9px] text-white/25 uppercase tracking-widest">{row.label}</div>
          </div>
        ))}
      </section>

      {unsortedUsers.length > 0 && (
        <section className="admin-card rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-5 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-cinzel text-xs font-black uppercase tracking-widest text-cyan-300">
                משתמשים שעדיין לא מוינו
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                זו רשימת המשתמשים שהבית שלהם עדיין לא נסגר. אפשר לפתוח כל פרופיל, לבדוק אם חסר טקס מיון, ולפנות אליהם גם דרך דיוור הינשופים.
              </p>
            </div>
            <div className="rounded-full border border-cyan-400/15 bg-cyan-500/10 px-3 py-1 text-[10px] font-cinzel uppercase tracking-[0.22em] text-cyan-100">
              {unsortedUsers.length} טרם מוינו
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {unsortedUsers.slice(0, 10).map((wizard) => (
              <Link
                key={wizard.id}
                href={`/wizard/${wizard.id}`}
                className="rounded-full border border-cyan-400/20 bg-white/[0.03] px-3 py-1.5 text-xs text-white/75 transition-all hover:border-cyan-300/40 hover:text-white"
              >
                {wizard.full_name || "קוסם/ת ללא שם"}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="admin-card rounded-2xl p-5 space-y-4">
        <h3 className="font-cinzel text-xs font-black text-teal-400 flex items-center gap-2 uppercase tracking-widest">
          <UserCog size={13} /> ניהול קוסמים ודרגות
        </h3>
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <input
              value={userSearch}
              onChange={(event) => onUserSearchChange(event.target.value)}
              placeholder="חיפוש לפי שם..."
              className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-teal-500/30 rounded-xl p-3 pr-10 text-sm outline-none transition-all"
              dir="rtl"
            />
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          </div>
          <div className="flex gap-1">
            {(["all", "מנהל", "מנחה", "קוסם/ת"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => onUserFilterChange(filter)}
                className={`px-3 py-2 rounded-xl font-cinzel text-[10px] uppercase tracking-wide transition-all border ${
                  userFilter === filter
                    ? "bg-teal-500/20 border-teal-500/30 text-teal-300"
                    : "bg-white/[0.02] border-white/[0.05] text-white/30 hover:text-white/60"
                }`}
              >
                {filter === "all" ? "הכל" : filter}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 max-h-[480px] overflow-y-auto">
          {filteredUsers.length === 0 && (
            <p className="text-center text-white/20 font-cinzel text-xs py-8">לא נמצאו קוסמים</p>
          )}
          {filteredUsers.map((profile) => {
            const cfg = profile.house ? houseConfig[profile.house] : null;
            const isBanned = profile.status === "banned" || profile.status === "cooling";
            const group = profile.user_groups as { name: string; color: string } | null;

            return (
              <div
                key={profile.id}
                className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-all"
              >
                <div
                  className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-base"
                  style={{ background: cfg ? cfg.accent : "rgba(255,255,255,0.05)" }}
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    cfg?.icon || "🧙"
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white/80 truncate">{profile.full_name || "—"}</span>
                    {isBanned && (
                      <span className="px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/20 text-red-400 font-cinzel text-[8px] uppercase">
                        {profile.status === "cooling" ? "קירור" : "חסום"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`font-cinzel text-[9px] uppercase ${cfg?.color || "text-white/20"}`}>{profile.house || "—"}</span>
                    <span className="text-white/10 text-[8px]">·</span>
                    <span className="text-white/20 text-[9px] font-cinzel">{profile.points_contributed || 0} נק׳</span>
                  </div>
                </div>

                <div className="shrink-0">
                  {editingGroup?.id === profile.id ? (
                    <div className="flex items-center gap-1">
                      <select
                        value={editingGroup?.group_id ?? ""}
                        onChange={(event) =>
                          onEditingGroupChange({
                            id: profile.id,
                            group_id: event.target.value ? parseInt(event.target.value, 10) : null,
                          })
                        }
                        style={{
                          backgroundColor: "#0f172a",
                          color: "#e2e8f0",
                          borderRadius: "8px",
                          padding: "4px 8px",
                          fontSize: "11px",
                          border: "1px solid rgba(99,102,241,0.4)",
                          outline: "none",
                          colorScheme: "dark",
                        }}
                      >
                        <option value="" style={{ backgroundColor: "#0f172a" }}>ללא דרגה</option>
                        {userGroups.map((entry) => (
                          <option key={entry.id} value={entry.id} style={{ backgroundColor: "#0f172a", color: entry.color }}>
                            {entry.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={onSaveGroup}
                        disabled={isSavingGroup}
                        className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-40"
                      >
                        <Save size={11} />
                      </button>
                      <button
                        onClick={() => onEditingGroupChange(null)}
                        className="p-1.5 bg-white/5 text-white/30 rounded-lg hover:bg-white/10 transition-all"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ) : editingRole?.id === profile.id ? (
                    <div className="flex items-center gap-1">
                      <select
                        value={editingRole?.role ?? "קוסמ׳"}
                        onChange={(event) => onEditingRoleChange({ id: profile.id, role: event.target.value })}
                        style={{
                          backgroundColor: "#0f172a",
                          color: "#e2e8f0",
                          borderRadius: "8px",
                          padding: "4px 8px",
                          fontSize: "11px",
                          border: "1px solid rgba(20,184,166,0.4)",
                          outline: "none",
                          colorScheme: "dark",
                        }}
                      >
                        <option value="קוסמ׳" style={{ backgroundColor: "#0f172a" }}>קוסם/ת</option>
                        <option value="מנחה" style={{ backgroundColor: "#0f172a" }}>מנחה</option>
                        <option value="מנהל" style={{ backgroundColor: "#0f172a" }}>מנהל</option>
                      </select>
                      <button
                        onClick={onSaveRole}
                        disabled={isSavingRole}
                        className="p-1.5 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500 hover:text-white transition-all disabled:opacity-40"
                      >
                        <Save size={11} />
                      </button>
                      <button
                        onClick={() => onEditingRoleChange(null)}
                        className="p-1.5 bg-white/5 text-white/30 rounded-lg hover:bg-white/10 transition-all"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {group ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] font-cinzel font-black uppercase tracking-wide"
                          style={{ background: `${group.color}18`, color: group.color, border: `1px solid ${group.color}35` }}
                        >
                          {group.name}
                        </span>
                      ) : (() => {
                        const roleColor = getRoleColor(profile.role, profile.house);
                        return (
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 900,
                              fontFamily: "'Cinzel', serif",
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                              padding: "1px 8px",
                              borderRadius: "999px",
                              color: roleColor,
                              background: `${roleColor}18`,
                              border: `1px solid ${roleColor}40`,
                            }}
                          >
                            {profile.role || "ללא דרגה"}
                          </span>
                        );
                      })()}
                      <button
                        onClick={() => onEditingGroupChange({ id: profile.id, group_id: profile.group_id || null })}
                        title="שנה דרגה"
                        className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500 hover:text-white transition-all"
                      >
                        <Crown size={11} />
                      </button>
                      <button
                        onClick={() => onToggleBan(profile.id, profile.status || "active")}
                        title={isBanned ? "בטל חסימה" : "חסום קוסם/ת"}
                        className={`p-1.5 rounded-lg transition-all ${
                          isBanned
                            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                            : "bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white"
                        }`}
                      >
                        <Shield size={11} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => onEditingRoleChange({ id: profile.id, role: profile.role || "קוסמ׳" })}
                          title="שנה תפקיד"
                          className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg hover:bg-teal-500 hover:text-white transition-all"
                        >
                          <UserCog size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
