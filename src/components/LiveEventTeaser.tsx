"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, Clock3 } from "lucide-react";
import {
  getLiveEventEnd,
  getLiveEventHref,
  getLiveEventLabel,
  getLiveEventPhase,
  getLiveEventStart,
  type LiveEventSettings,
} from "@/lib/liveEvent";

function useCountdown(target: string) {
  const targetMs = useMemo(() => new Date(target).getTime(), [target]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const diff = Math.max(0, targetMs - now);
  const totalSeconds = Math.floor(diff / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function formatCountdownPart(value: number) {
  return String(value).padStart(2, "0");
}

export default function LiveEventTeaser({ eventConfig }: { eventConfig: LiveEventSettings | null }) {
  const eventLabel = getLiveEventLabel(eventConfig);
  const phase = getLiveEventPhase(eventConfig);
  const targetDate = phase === "upcoming"
    ? getLiveEventStart(eventConfig)
    : getLiveEventEnd(eventConfig);
  const countdown = useCountdown(targetDate || new Date().toISOString());

  if (!eventConfig || (phase !== "upcoming" && phase !== "live")) return null;

  const defaultHeadline = phase === "upcoming" ? "מתחיל בקרוב" : "איוונט חי, חכם ומתעדכן";
  const headline = `${eventLabel} • ${eventConfig.tagline || defaultHeadline}`;
  const description = eventConfig.description || (
    phase === "upcoming"
      ? "דף איוונט ייעודי, טיימר דינמי, משימות ופרסים מההגדרות החיות. צבירת הנקודות תתחיל אוטומטית בשעת הפתיחה."
      : "דף איוונט ייעודי, טיימר דינמי, משימות ופרסים מההגדרות החיות, וניקוד אישי שמסונכרן עם הפעילות שלכם ברחבי הטירה."
  );
  const timerLabel = phase === "upcoming" ? "פתיחה בעוד" : "סגירה בעוד";

  return (
    <Link
      href={getLiveEventHref(eventConfig)}
      className="group relative mb-10 block overflow-hidden rounded-[2.5rem] border border-amber-400/15 bg-[linear-gradient(135deg,rgba(120,53,15,0.38),rgba(15,23,42,0.3))] p-6 md:p-8 transition-all duration-500 hover:-translate-y-1 hover:border-amber-300/30 hover:shadow-[0_25px_80px_rgba(245,158,11,0.12)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_35%)] opacity-70" />
      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-amber-100/80">
            <Bell size={12} /> {eventLabel}
          </div>
          <h2 className="mt-4 font-cinzel text-2xl font-black text-amber-50 md:text-3xl">
            {headline}
          </h2>
          <p className="mt-3 max-w-2xl font-crimson text-lg leading-relaxed text-white/68">
            {description}
          </p>
        </div>

        <div className="flex flex-col items-start gap-4">
          <div className="rounded-[1.6rem] border border-white/10 bg-black/20 px-5 py-4 text-white shadow-[0_10px_35px_rgba(0,0,0,0.2)]">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-200/80">
              <Clock3 size={12} />
              {timerLabel}
            </div>
            <div className="flex items-center gap-2 text-center">
              {[
                { label: "ימים", value: countdown.days },
                { label: "שעות", value: countdown.hours },
                { label: "דקות", value: countdown.minutes },
                { label: "שניות", value: countdown.seconds },
              ].map((part) => (
                <div key={part.label} className="min-w-[58px] rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="font-cinzel text-xl font-black text-amber-200">{formatCountdownPart(part.value)}</div>
                  <div className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/40">{part.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="inline-flex items-center gap-3 self-start rounded-full border border-white/10 bg-white/6 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-white/85 transition-all group-hover:bg-white/10">
            לפרטי האיוונט
            <ArrowRight size={14} className="transition-transform group-hover:-translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}
