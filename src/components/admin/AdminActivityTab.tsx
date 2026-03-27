"use client";

import { useMemo, useState } from "react";
import { Activity, RotateCcw, Search, Sparkles } from "lucide-react";

type ActivityEvent = {
  id: string;
  created_at: string;
  icon?: string | null;
  actor_name?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
};

type Props = {
  events: ActivityEvent[];
  isTestingActivity: boolean;
  onTestActivity: () => void;
  onRefresh: () => void;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default function AdminActivityTab({
  events,
  isTestingActivity,
  onTestActivity,
  onRefresh,
}: Props) {
  const [search, setSearch] = useState("");

  const recent24hCount = useMemo(() => {
    const cutoff = Date.now() - ONE_DAY_MS;
    return events.filter((event) => new Date(event.created_at).getTime() >= cutoff).length;
  }, [events]);

  const uniqueActorsCount = useMemo(() => new Set(events.map((event) => event.actor_name).filter(Boolean)).size, [events]);

  const topActivityLabel = useMemo(() => {
    const counts = new Map<string, number>();
    events.forEach((event) => {
      const key = event.title?.trim();
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    let bestLabel = "אין עדיין דפוס בולט";
    let bestCount = 0;

    counts.forEach((count, label) => {
      if (count > bestCount) {
        bestCount = count;
        bestLabel = label;
      }
    });

    return bestLabel;
  }, [events]);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return events;

    return events.filter((event) =>
      [event.actor_name, event.title, event.subtitle, event.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [events, search]);

  return (
    <section className="space-y-4">
      <section className="admin-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-cinzel text-xs font-black text-cyan-400 flex items-center gap-2 uppercase tracking-widest">
              <Activity size={13} /> יומן פעילות האתר
            </h3>
            <p className="text-white/35 text-xs mt-1">
              תמונת מצב של מה שבאמת קורה עכשיו בטירה, לא רק מה שמרגיש שקורה.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onTestActivity}
              disabled={isTestingActivity}
              className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-[10px] font-black font-cinzel hover:bg-cyan-500 hover:text-black transition-all"
            >
              {isTestingActivity ? "שולח..." : "שלח לוג בדיקה"}
            </button>
            <button onClick={onRefresh} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all">
              <RotateCcw size={12} className="text-white/30" />
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4">
            <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">נטען כרגע</p>
            <p className="mt-2 text-2xl font-black text-white">{events.length}</p>
            <p className="mt-1 text-xs text-white/50">אירועים אחרונים זמינים לעיון</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4">
            <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">24 השעות האחרונות</p>
            <p className="mt-2 text-2xl font-black text-white">{recent24hCount}</p>
            <p className="mt-1 text-xs text-white/50">דופק אמיתי של האתר ביממה האחרונה</p>
          </div>
          <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-4">
            <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">דפוס מוביל</p>
            <p className="mt-2 text-sm font-black text-white line-clamp-2">{topActivityLabel}</p>
            <p className="mt-1 text-xs text-white/50">{uniqueActorsCount} שחקנים שונים ביומן הנוכחי</p>
          </div>
        </div>

        <div className="relative">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="חיפוש לפי קוסם/ת, פעולה או תיאור..."
            className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-cyan-500/30 rounded-xl p-3 pr-10 text-sm outline-none transition-all"
            dir="rtl"
          />
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
        </div>
      </section>

      <section className="admin-card rounded-2xl p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-white/5 text-white/20 font-cinzel">
                <th className="pb-2 font-black pr-2">זמן</th>
                <th className="pb-2 font-black">קוסם/ת</th>
                <th className="pb-2 font-black">פעולה</th>
                <th className="pb-2 font-black">פרטים</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 text-white/40 pr-2">
                    {new Date(event.created_at).toLocaleString("he-IL", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{event.icon || "✨"}</span>
                      <span className="font-bold text-white/70">{event.actor_name || "קוסם/ת בטירה"}</span>
                    </div>
                  </td>
                  <td className="py-3 text-cyan-400 font-medium">{event.title || "פעילות מערכת"}</td>
                  <td className="py-3 text-white/30 text-[10px] italic">{event.subtitle || event.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-10">
            <Sparkles size={22} className="mx-auto text-white/10 mb-3" />
            <p className="text-white/25 font-cinzel">
              {search.trim() ? "לא נמצאו אירועים שתואמים לחיפוש." : "אין פעילות מתועדת כרגע."}
            </p>
          </div>
        )}
      </section>
    </section>
  );
}
