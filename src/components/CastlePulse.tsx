"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { formatHebrewRelativeTime, parseAppTimestamp } from "@/lib/dateTime";

/**
 * What has actually happened in the castle lately, with the dates attached.
 *
 * The brief asked for an "alive this week" layer. Measured against the live
 * database before writing any of it:
 *
 *   news            0 rows in the last 7 days   newest 2026-07-07
 *   threads         0 rows in the last 7 days   newest 2026-08-02
 *   forum_posts     0 rows in the last 7 days   newest 2026-08-03
 *   activity_events 0 rows in the last 7 days   newest 2026-08-03
 *
 * A module that hardcodes the words "this week" would therefore have shipped
 * either permanently empty or, worse, presenting eleven-day-old threads as this
 * week's conversation. Inventing community activity is the one thing the brief
 * explicitly forbids, and a fixed heading is how that invention would have got
 * in — quietly, and without anyone writing a false sentence.
 *
 * So the heading is derived from the data instead of asserted over it. When the
 * newest item really is inside seven days it says so; otherwise it says the
 * activity is the most recent, which is true on any day. The module becomes an
 * "alive this week" module by itself, on the day the castle is.
 *
 * The staleness floor is the other half of that. Past thirty days the module
 * removes itself rather than announcing how quiet things have been — a landing
 * page that leads with month-old activity is worse for a community trying to
 * grow than one that says nothing, and neither honesty nor the brief requires
 * advertising it.
 *
 * What already existed, so that this is not mistaken for a rebuild:
 * HotTopicsTeaser above it surfaces live forum threads and already shows each
 * one's relative age via the same formatter. The gap this fills is `news` —
 * eighteen rows that have never had any surface on the landing page at all —
 * and a single answer to "when was any of this", across sources rather than
 * per card.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const STALENESS_FLOOR_MS = 30 * 24 * 60 * 60 * 1000;

type PulseItem = {
  id: string;
  kind: "news" | "thread";
  title: string;
  href: string;
  createdAt: string;
};

/*
 * The heading and the staleness floor both depend on "now", and `Date.now()` is
 * impure, so neither may be computed during render — the React Compiler rule
 * that flags it is right, and the value would otherwise drift between renders.
 * Both are resolved once inside the effect, at the moment the rows are read,
 * which is also the only moment at which the comparison is meaningful.
 */
type Pulse = { items: PulseItem[]; withinWeek: boolean };

export default function CastlePulse() {
  const [pulse, setPulse] = useState<Pulse | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const [newsResult, threadsResult] = await Promise.all([
        supabase.from("news").select("id, title, created_at").order("created_at", { ascending: false }).limit(2),
        supabase.from("threads").select("id, title, created_at").order("created_at", { ascending: false }).limit(3),
      ]);

      if (cancelled) return;

      /*
       * A failed query is not an empty castle. Falling through to [] here would
       * render the same "nothing to show" state that genuinely empty tables
       * produce, and the two mean different things — the same reason this
       * project shows a dash rather than a zero for a number it does not have.
       * On error the module removes itself rather than making a claim.
       */
      if (newsResult.error && threadsResult.error) {
        setPulse({ items: [], withinWeek: false });
        return;
      }

      const collected: PulseItem[] = [
        ...(newsResult.data ?? []).map((row) => ({
          id: `news-${row.id}`,
          kind: "news" as const,
          title: row.title,
          href: `/news/${row.id}`,
          createdAt: row.created_at,
        })),
        ...(threadsResult.data ?? []).map((row) => ({
          id: `thread-${row.id}`,
          kind: "thread" as const,
          title: row.title,
          href: `/forums/thread/${row.id}`,
          createdAt: row.created_at,
        })),
      ];

      const now = Date.now();

      /*
       * The floor is applied per item, not to the batch. Checked against the
       * real table on the day this was written: the newest thread was 12 days
       * old and the newest news row 38. A batch-level floor would have opened
       * the module on the strength of the thread and then carried the
       * month-old news row in beside it — every row honestly dated, and the
       * module as a whole still overstating.
       */
      const ordered = collected
        .filter((item) => {
          const timestamp = parseAppTimestamp(item.createdAt);
          return Boolean(item.title) && timestamp !== null && now - timestamp <= STALENESS_FLOOR_MS;
        })
        .sort((a, b) => (parseAppTimestamp(b.createdAt) ?? 0) - (parseAppTimestamp(a.createdAt) ?? 0))
        .slice(0, 4);

      const newestAge = now - (parseAppTimestamp(ordered[0]?.createdAt) ?? 0);

      setPulse({ items: ordered, withinWeek: ordered.length > 0 && newestAge <= WEEK_MS });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Nothing is rendered while loading, and nothing is rendered when there is
   * genuinely nothing. A skeleton here would only promise content that may not
   * arrive. */
  if (!pulse || pulse.items.length === 0) return null;

  const { items, withinWeek } = pulse;

  return (
    <section
      className="relative z-10 px-4 max-w-3xl mx-auto my-8"
      aria-labelledby="castle-pulse-title"
    >
      <div className="rounded-xl border border-amber-200/20 bg-black/30 backdrop-blur-sm p-5 sm:p-6">
        <h2
          id="castle-pulse-title"
          className="font-cinzel text-lg sm:text-xl font-bold text-amber-100 mb-4"
        >
          {withinWeek ? "השבוע בטירה" : "מה קרה לאחרונה בטירה"}
        </h2>

        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-3">
              <Link
                href={item.href}
                className="text-sm sm:text-base text-slate-100 hover:text-amber-200 transition-colors truncate"
              >
                <span className="text-amber-300/70 text-xs ms-2">
                  {item.kind === "news" ? "חדשות" : "דיון"}
                </span>
                {item.title}
              </Link>
              {/* The date is the honesty. Without it this is a list that implies
                  freshness it has not earned. */}
              <time
                dateTime={item.createdAt}
                className="flex-none text-xs text-slate-400 tabular-nums"
              >
                {formatHebrewRelativeTime(item.createdAt, { maxRelativeDays: 60 })}
              </time>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
