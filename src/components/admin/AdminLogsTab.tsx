"use client";

import { useMemo, useState } from "react";
import { Activity, RotateCcw, Search } from "lucide-react";

type AdminLog = {
  id: string;
  actor_name: string;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type Props = {
  logs: AdminLog[];
  onRefresh?: () => void;
};

function timeAgo(dateString: string) {
  if (!dateString) return "ממש עכשיו";
  const seconds = Math.round((Date.now() - new Date(dateString).getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return "ממש עכשיו";
  if (minutes < 60) return `לפני ${minutes} דק'`;
  if (hours < 24) return `לפני ${hours} שעות`;
  return `לפני ${days} ימים`;
}

function prettifyAction(action: string) {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function summarizeDetails(details: Record<string, unknown> | null | undefined) {
  if (!details) return null;

  const entries = Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 3);

  if (entries.length === 0) return null;

  return entries
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" • ");
}

export default function AdminLogsTab({ logs, onRefresh }: Props) {
  const [search, setSearch] = useState("");

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return logs;

    return logs.filter((log) => {
      const haystack = [
        log.actor_name,
        log.actor_role,
        log.action,
        log.target_type,
        log.target_label,
        log.target_id,
        summarizeDetails(log.details),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [logs, search]);

  return (
    <section className="space-y-4">
      <section className="admin-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-cinzel text-xs font-black text-rose-400 flex items-center gap-2 uppercase tracking-widest">
              <Activity size={13} /> יומן הנהלה
            </h3>
            <p className="text-white/35 text-xs mt-1">
              כל פעולות הניהול הרגישות במקום אחד, עם חיפוש מהיר ורענון מיידי.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="חיפוש לוגים..."
                className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-rose-500/30 rounded-xl p-3 pr-10 text-sm outline-none transition-all"
                dir="rtl"
              />
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
            </div>
            {onRefresh && (
              <button onClick={onRefresh} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all shrink-0">
                <RotateCcw size={12} className="text-white/30" />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="admin-card rounded-2xl p-5">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Activity size={24} className="mx-auto text-white/10 mb-3" />
            <p className="font-crimson italic text-white/30">
              {search.trim() ? "לא נמצאו לוגים שתואמים לחיפוש." : "עוד אין פעולות מתועדות ביומן."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
            {filteredLogs.map((log) => {
              const detailsSummary = summarizeDetails(log.details);

              return (
                <div
                  key={log.id}
                  className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-white/85 leading-relaxed">
                        <span className="font-black text-rose-300">{log.actor_name}</span>
                        {log.actor_role ? <span className="text-white/30"> • {log.actor_role}</span> : null}
                        <span className="text-white/25"> • </span>
                        <span>{prettifyAction(log.action)}</span>
                      </div>

                      {(log.target_label || log.target_type || log.target_id) && (
                        <div className="text-xs text-white/40 mt-1 break-words">
                          יעד: {log.target_label || log.target_type || "ללא תווית"}
                          {log.target_id ? ` (${log.target_id})` : ""}
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/25 whitespace-nowrap">
                      {timeAgo(log.created_at)}
                    </div>
                  </div>

                  {detailsSummary && (
                    <div className="text-xs text-white/45 leading-relaxed break-words">
                      {detailsSummary}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
