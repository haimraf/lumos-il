"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { formatHebrewRelativeTime } from "@/lib/dateTime";
import { getSafeInternalHref } from "@/lib/hrefs";
import { getHouseSecondaryColor } from "@/lib/houses";
import { normalizeLegacyDisplayText } from "@/lib/legacyText";
import { getProfileDisplayName } from "@/lib/profileNames";
import { getHouseSortedTitle } from "@/lib/activityEventCopy";

type PulseEvent = {
  id: string;
  event_type: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_house: string | null;
  actor_group_color: string | null;
  icon: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  target_url: string | null;
  created_at: string;
};

type PulseProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function safeTimeAgo(dateString: string) {
  return formatHebrewRelativeTime(dateString, {
    invalidLabel: "...",
    maxRelativeDays: 14,
  });
}

function normalizePulseEvent(event: PulseEvent): PulseEvent {
  return {
    ...event,
    actor_name: normalizeLegacyDisplayText(event.actor_name),
    icon: normalizeLegacyDisplayText(event.icon),
    title: normalizeLegacyDisplayText(event.title),
    subtitle: event.subtitle ? normalizeLegacyDisplayText(event.subtitle) : null,
    description: event.description ? normalizeLegacyDisplayText(event.description) : null,
  };
}

export default function CastlePulseTeaser() {
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      const { data, error } = await supabase
        .from("activity_events")
        .select("id, event_type, actor_id, actor_name, actor_house, actor_group_color, icon, title, subtitle, description, target_url, created_at")
        .eq("visibility", "public")
        .neq("event_type", "admin_test_event")
        .order("created_at", { ascending: false })
        .limit(5);

      if (cancelled) return;

      if (error) {
        console.warn("[castle-pulse] failed to fetch activity events", error);
        setEvents([]);
        setIsLoading(false);
        return;
      }

      const rawEvents = (data as PulseEvent[]) || [];
      const actorIds = [...new Set(rawEvents.map((event) => event.actor_id).filter(Boolean))] as string[];
      const profileMap = new Map<string, PulseProfileRow>();

      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", actorIds);

        ((profiles as PulseProfileRow[] | null) || []).forEach((profile) => {
          profileMap.set(profile.id, profile);
        });
      }

      setEvents(
        rawEvents.map((event) => {
          const actorProfile = event.actor_id ? profileMap.get(event.actor_id) : null;
          const normalizedTitle = event.event_type === "house_sorted"
            ? getHouseSortedTitle(event.actor_house, event.title)
            : event.title;

          return normalizePulseEvent({
            ...event,
            actor_name: getProfileDisplayName(actorProfile, event.actor_name || "קוסמ׳"),
            title: normalizedTitle,
          });
        }),
      );
      setIsLoading(false);
    }

    void fetchEvents();
    const refreshTimer = window.setInterval(() => {
      void fetchEvents();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [supabase]);

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/5 border border-cyan-500/20">
            <Activity className="text-cyan-400 relative z-10" size={22} />
            <div className="absolute inset-0 bg-cyan-400/15 blur-xl rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="font-cinzel text-2xl md:text-3xl font-black text-white tracking-wide">
              מה קורה עכשיו בטירה
            </h3>
            <p className="text-[10px] md:text-xs text-white/30 uppercase tracking-[0.2em] font-cinzel mt-1">
              פעילות חיה מכל המערכות
            </p>
          </div>
        </div>
        <Link
          href="/map"
          className="hidden md:flex items-center gap-2 text-[10px] text-cyan-400/70 hover:text-cyan-300 transition-all font-black uppercase tracking-widest border border-cyan-400/10 hover:border-cyan-400/30 bg-white/5 px-5 py-2.5 rounded-xl"
        >
          מפת הקונדסאים <ArrowLeft size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="rounded-3xl border border-white/[0.05] bg-white/[0.03] p-5 animate-pulse min-h-[160px]"
            />
          ))
        ) : events.length === 0 ? (
          <div className="lg:col-span-5 rounded-3xl border border-white/[0.05] bg-white/[0.03] px-6 py-10 text-center">
            <Sparkles className="mx-auto text-cyan-400/50 mb-3" size={22} />
            <p className="font-crimson text-white/55 text-lg italic">
              הטירה שקטה לרגע. ברגע שהקסם יזוז, הוא יופיע כאן.
            </p>
          </div>
        ) : (
          events.map((event) => {
            const actorColor = event.actor_group_color || (event.actor_house ? getHouseSecondaryColor(event.actor_house) : "rgba(255,255,255,0.8)");
            const href = getSafeInternalHref(event.target_url, "/map");

            return (
              <Link
                key={event.id}
                href={href}
                className="group rounded-3xl border border-white/[0.05] bg-gradient-to-b from-white/[0.045] to-white/[0.02] p-5 transition-all duration-300 hover:border-cyan-400/25 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(6,182,212,0.08)]"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-400/15 flex items-center justify-center text-xl">
                    {event.icon || "✨"}
                  </div>
                  <div className="text-[10px] font-cinzel uppercase tracking-[0.2em] text-white/25">
                    {safeTimeAgo(event.created_at)}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm leading-relaxed text-white/80 font-crimson">
                    <span className="font-black" style={{ color: actorColor }}>
                      {event.actor_name}
                    </span>
                    {" • "}
                    <span>{event.title}</span>
                  </div>

                  {event.subtitle && (
                    <div className="text-xs text-cyan-100/70 leading-relaxed line-clamp-2 font-crimson italic">
                      {event.subtitle}
                    </div>
                  )}

                  {event.description && (
                    <div className="text-[11px] text-white/40 leading-relaxed line-clamp-3">
                      {event.description}
                    </div>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
