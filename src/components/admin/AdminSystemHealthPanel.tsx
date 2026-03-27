"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  HeartPulse,
  Radio,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Users,
  WandSparkles,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  fetchOnlinePresenceRows,
  getPresenceFreshnessTimestamp,
  type OnlinePresenceRow,
} from "@/lib/presenceStatus";
import { normalizeQuestCatalog, QUEST_CATALOG_KEY } from "@/lib/gameplay/questCatalog";

type AdminHealthTarget =
  | "health"
  | "house-cup"
  | "presence"
  | "activity"
  | "logs"
  | "quests"
  | "users"
  | "moderation";

type HealthMode = "full" | "compact";

type AdminSystemHealthPanelProps = {
  mode?: HealthMode;
  reportsCount: number;
  adminLogsCount: number;
  activityEvents: Array<{
    created_at?: string | null;
    title?: string | null;
    subtitle?: string | null;
    description?: string | null;
    actor_name?: string | null;
  }>;
  unsortedUsersCount: number;
  totalProfiles: number;
  profilesWithEmailCount: number;
  siteSettings: Record<string, unknown>;
  newsItems?: Array<{ title?: string | null; subtitle?: string | null; content?: string | null }>;
  forumItems?: Array<{ name?: string | null; description?: string | null }>;
  onOpenTab?: (tab: AdminHealthTarget) => void;
};

type HealthCard = {
  id: string;
  label: string;
  value: string;
  hint: string;
  severity: "good" | "warn" | "critical";
  tab: AdminHealthTarget;
};

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SUSPICIOUS_TEXT_PATTERNS = [/\uFFFD/u, /(?:׳.){4,}/u, /(?:נ|ג|ן)[\u0080-\u00FF]{1,3}/u];

function severityClasses(severity: HealthCard["severity"]) {
  if (severity === "critical") {
    return {
      border: "border-rose-400/25",
      bg: "bg-rose-500/10",
      text: "text-rose-100",
    };
  }

  if (severity === "warn") {
    return {
      border: "border-amber-400/25",
      bg: "bg-amber-500/10",
      text: "text-amber-100",
    };
  }

  return {
    border: "border-emerald-400/25",
    bg: "bg-emerald-500/10",
    text: "text-emerald-100",
  };
}

function getQuestHealth(siteSettings: Record<string, unknown>) {
  const questCatalog = normalizeQuestCatalog(siteSettings[QUEST_CATALOG_KEY]);
  const enabledEntries = questCatalog.filter((entry) => entry.enabled);
  const missingAction = enabledEntries.filter(
    (entry) => !entry.actionHref?.trim() || !entry.actionLabel?.trim(),
  );
  const missingEventTypes = enabledEntries.filter(
    (entry) =>
      (entry.metric.source === "activity_types" || entry.metric.source === "activity_unique_types") &&
      (!entry.metric.eventTypes || entry.metric.eventTypes.length === 0),
  );
  const liveQuestCount = enabledEntries.filter(
    (entry) => (entry.type === "daily" || entry.metric.window === "daily") && entry.metric.source !== "profile_flag",
  ).length;
  const quickDailyCount = enabledEntries.filter(
    (entry) => entry.type === "daily" && entry.metric.source === "profile_flag",
  ).length;

  return {
    enabledCount: enabledEntries.length,
    missingActionCount: missingAction.length,
    missingEventTypesCount: missingEventTypes.length,
    liveQuestCount,
    quickDailyCount,
  };
}

function getSuspiciousTextSummary({
  activityEvents,
  forumItems,
  newsItems,
}: Pick<AdminSystemHealthPanelProps, "activityEvents" | "forumItems" | "newsItems">) {
  const samples: string[] = [];

  const scan = (value?: string | null) => {
    const normalized = value?.trim();
    if (!normalized) return false;

    const suspicious = SUSPICIOUS_TEXT_PATTERNS.some((pattern) => pattern.test(normalized));
    if (suspicious && samples.length < 3) {
      samples.push(normalized.slice(0, 80));
    }

    return suspicious;
  };

  let flaggedCount = 0;

  activityEvents.forEach((event) => {
    if (scan(event.title)) flaggedCount += 1;
    if (scan(event.subtitle)) flaggedCount += 1;
    if (scan(event.description)) flaggedCount += 1;
    if (scan(event.actor_name)) flaggedCount += 1;
  });

  (newsItems || []).forEach((item) => {
    if (scan(item.title)) flaggedCount += 1;
    if (scan(item.subtitle)) flaggedCount += 1;
    if (scan(item.content)) flaggedCount += 1;
  });

  (forumItems || []).forEach((item) => {
    if (scan(item.name)) flaggedCount += 1;
    if (scan(item.description)) flaggedCount += 1;
  });

  return {
    flaggedCount,
    samples,
  };
}

function getStatusLabel(severity: HealthCard["severity"]) {
  if (severity === "good") return "תקין";
  if (severity === "warn") return "דורש מבט";
  return "קריטי";
}

export default function AdminSystemHealthPanel({
  mode = "full",
  reportsCount,
  adminLogsCount,
  activityEvents,
  unsortedUsersCount,
  totalProfiles,
  profilesWithEmailCount,
  siteSettings,
  newsItems = [],
  forumItems = [],
  onOpenTab,
}: AdminSystemHealthPanelProps) {
  const [supabase] = useState(() => createClient());
  const [presenceRows, setPresenceRows] = useState<OnlinePresenceRow[]>([]);
  const [loadingPresence, setLoadingPresence] = useState(true);

  const loadPresence = useCallback(async () => {
    const cutoffIso = new Date(Date.now() - ONE_DAY_MS).toISOString();
    const { rows } = await fetchOnlinePresenceRows(supabase, {
      cutoffIso,
      limit: 250,
    });

    setPresenceRows(rows || []);
    setLoadingPresence(false);
  }, [supabase]);

  useEffect(() => {
    void loadPresence();
    const interval = window.setInterval(() => {
      void loadPresence();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadPresence]);

  const presenceSummary = useMemo(() => {
    const now = Date.now();
    const liveRows = presenceRows.filter((row) => now - getPresenceFreshnessTimestamp(row) <= ACTIVE_WINDOW_MS);
    const liveMembers = liveRows.filter((row) => row.presence_type === "member").length;
    const liveGuests = liveRows.filter((row) => row.presence_type === "guest").length;
    const afkCount = liveRows.filter((row) => row.presence_status === "afk").length;

    return {
      liveMembers,
      liveGuests,
      afkCount,
    };
  }, [presenceRows]);

  const recentActivityCount = useMemo(() => {
    const cutoff = Date.now() - ONE_DAY_MS;
    return activityEvents.filter((event) => {
      if (!event.created_at) return false;
      return new Date(event.created_at).getTime() >= cutoff;
    }).length;
  }, [activityEvents]);

  const questHealth = useMemo(() => getQuestHealth(siteSettings), [siteSettings]);
  const contentHealth = useMemo(
    () => getSuspiciousTextSummary({ activityEvents, forumItems, newsItems }),
    [activityEvents, forumItems, newsItems],
  );

  const cards = useMemo<HealthCard[]>(
    () => [
      {
        id: "content",
        label: "קידוד ותוכן",
        value: contentHealth.flaggedCount > 0 ? `${contentHealth.flaggedCount} שורות חשודות` : "לא זוהה ג'יבריש",
        hint:
          contentHealth.flaggedCount > 0
            ? `נמצאו טקסטים חשודים בתוכן שכבר נטען לאדמין${contentHealth.samples[0] ? `, למשל: ${contentHealth.samples[0]}` : "."}`
            : "התוכן הציבורי שנסרק כרגע נראה נקי יחסית מבחינת קידוד.",
        severity: contentHealth.flaggedCount > 5 ? "critical" : contentHealth.flaggedCount > 0 ? "warn" : "good",
        tab: "health",
      },
      {
        id: "quests",
        label: "בריאות קווסטים",
        value: `${questHealth.enabledCount} פעילים · ${questHealth.liveQuestCount} חיים`,
        hint:
          questHealth.missingActionCount + questHealth.missingEventTypesCount > 0
            ? `${questHealth.missingActionCount} חסרי מסלול · ${questHealth.missingEventTypesCount} חסרי אירועים`
            : `${questHealth.quickDailyCount} מענקים מהירים מוגדרים היטב`,
        severity:
          questHealth.missingActionCount + questHealth.missingEventTypesCount > 0 ? "warn" : "good",
        tab: "quests",
      },
      {
        id: "presence",
        label: "נוכחות חיה",
        value: `${presenceSummary.liveMembers} חברי קהילה · ${presenceSummary.liveGuests} אורחים`,
        hint: loadingPresence
          ? "טוען מצב נוכחות..."
          : presenceSummary.liveMembers + presenceSummary.liveGuests > 0
            ? `AFK כרגע: ${presenceSummary.afkCount}`
            : "אין כרגע תנועה חיה בחלון הזמן של חמש הדקות האחרונות.",
        severity: presenceSummary.liveMembers + presenceSummary.liveGuests > 0 ? "good" : "warn",
        tab: "presence",
      },
      {
        id: "activity",
        label: "דופק פעילות",
        value: `${recentActivityCount} פעולות ב-24 השעות האחרונות`,
        hint:
          recentActivityCount >= 8
            ? "הטירה מייצרת תנועה נראית לעין."
            : "אם האתר מרגיש שקט, כאן בודקים אם חסרות פעולות אמת או רק חיבורים חכמים ביניהן.",
        severity: recentActivityCount >= 8 ? "good" : recentActivityCount >= 3 ? "warn" : "critical",
        tab: "activity",
      },
      {
        id: "users",
        label: "מיון והצטרפות",
        value: `${unsortedUsersCount} ממתינים למיון`,
        hint:
          unsortedUsersCount > 0
            ? "יש משתמשים שעדיין לא קיבלו בית, וכדאי לדחוף אותם למסדרון הנכון."
            : "כל המשתמשים שמוינו מסונכרנים כרגע.",
        severity: unsortedUsersCount > 0 ? "warn" : "good",
        tab: "users",
      },
      {
        id: "moderation",
        label: "מודרציה פתוחה",
        value: `${reportsCount} דיווחים פתוחים`,
        hint: reportsCount > 0 ? "יש תור שמחכה לטיפול." : "אין כרגע דיווחים פתוחים במערכת.",
        severity: reportsCount > 0 ? "warn" : "good",
        tab: "moderation",
      },
      {
        id: "logs",
        label: "עקבות ניהול",
        value: `${adminLogsCount} לוגים זמינים`,
        hint:
          adminLogsCount > 0
            ? "יש audit trail שמסביר מה קרה ומי נגע."
            : "כדאי לבדוק למה עדיין אין היסטוריית ניהול מתועדת.",
        severity: adminLogsCount > 0 ? "good" : "critical",
        tab: "logs",
      },
      {
        id: "broadcast",
        label: "מוכנות לדיוור",
        value: `${profilesWithEmailCount}/${totalProfiles} פרופילים עם מייל`,
        hint:
          totalProfiles > 0 && profilesWithEmailCount >= totalProfiles * 0.8
            ? "קהל הדיוור מכוסה יפה בצד הפרופילים."
            : "יש עדיין פער בין הרשומים לבין המיילים שמסונכרנים לפרופילים.",
        severity:
          totalProfiles > 0 && profilesWithEmailCount >= totalProfiles * 0.8
            ? "good"
            : profilesWithEmailCount > 0
              ? "warn"
              : "critical",
        tab: "house-cup",
      },
    ],
    [
      adminLogsCount,
      contentHealth.flaggedCount,
      contentHealth.samples,
      loadingPresence,
      presenceSummary.afkCount,
      presenceSummary.liveGuests,
      presenceSummary.liveMembers,
      profilesWithEmailCount,
      questHealth.enabledCount,
      questHealth.liveQuestCount,
      questHealth.missingActionCount,
      questHealth.missingEventTypesCount,
      questHealth.quickDailyCount,
      recentActivityCount,
      reportsCount,
      totalProfiles,
      unsortedUsersCount,
    ],
  );

  const urgentCards = cards.filter((card) => card.severity !== "good");

  if (mode === "compact") {
    return (
      <section className="admin-card rounded-2xl border border-cyan-400/10 p-5 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-cinzel text-xs font-black uppercase tracking-widest text-cyan-300">
              <HeartPulse size={14} />
              בריאות מערכת
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/45">
              תמונת מצב מהירה על קידוד, קווסטים, נוכחות ודיוור, בלי לחפש בין טאבים.
            </p>
          </div>

          {onOpenTab && (
            <button
              onClick={() => onOpenTab("health")}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-[10px] font-cinzel font-black uppercase tracking-[0.16em] text-cyan-100 transition-all hover:bg-cyan-500/20"
            >
              פתח לוח בריאות
              <ArrowLeft size={12} />
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cards.slice(0, 4).map((card) => {
            const tone = severityClasses(card.severity);
            return (
              <button
                key={card.id}
                onClick={() => onOpenTab?.(card.tab)}
                className={`rounded-2xl border p-4 text-right transition-all hover:-translate-y-0.5 ${tone.border} ${tone.bg}`}
              >
                <div className={`font-cinzel text-[10px] font-black uppercase tracking-[0.16em] ${tone.text}`}>
                  {card.label}
                </div>
                <div className="mt-2 text-sm font-bold text-white">{card.value}</div>
                <div className="mt-2 text-xs leading-relaxed text-white/60">{card.hint}</div>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="admin-card rounded-2xl border border-cyan-400/10 bg-gradient-to-br from-cyan-500/[0.08] to-transparent p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-cinzel text-sm font-black uppercase tracking-widest text-cyan-200">
              <HeartPulse size={16} />
              לוח בריאות מערכת
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/55">
              כאן רואים אם הטירה באמת חיה, מה תקין, מה דורש טיפול, ואיזה טאב צריך לפתוח כדי לסגור את זה מהר.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {urgentCards.length > 0 ? (
              <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-cinzel uppercase tracking-[0.18em] text-amber-100">
                {urgentCards.length} נושאים דורשים תשומת לב
              </span>
            ) : (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-cinzel uppercase tracking-[0.18em] text-emerald-100">
                המערכת נראית יציבה כרגע
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const tone = severityClasses(card.severity);
          return (
            <button
              key={card.id}
              onClick={() => onOpenTab?.(card.tab)}
              className={`rounded-2xl border p-5 text-right transition-all hover:-translate-y-0.5 ${tone.border} ${tone.bg}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={`font-cinzel text-[10px] font-black uppercase tracking-[0.18em] ${tone.text}`}>
                    {card.label}
                  </div>
                  <div className="mt-3 text-lg font-black leading-snug text-white">{card.value}</div>
                </div>
                <div className={`rounded-full border px-2.5 py-1 text-[10px] font-cinzel font-black uppercase tracking-[0.14em] ${tone.border} ${tone.text}`}>
                  {getStatusLabel(card.severity)}
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/60">{card.hint}</p>
            </button>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <div className="admin-card rounded-2xl p-5 space-y-4">
          <div>
            <p className="font-cinzel text-[10px] uppercase tracking-[0.18em] text-white/30">מה כדאי לבדוק ראשון</p>
            <h4 className="mt-1 font-cinzel text-lg font-black text-white">מסלולי טיפול מהירים</h4>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => onOpenTab?.("quests")}
              className="w-full rounded-2xl border border-yellow-400/15 bg-yellow-500/10 px-4 py-3 text-right transition-all hover:bg-yellow-500/15"
            >
              <div className="flex items-center gap-2 font-black text-yellow-100">
                <WandSparkles size={14} />
                קווסטים ודינמיקה
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                כאן בודקים אם המשימות מחוברות באמת למסלול, לאירועים ולכפתור הצעד הבא.
              </p>
            </button>

            <button
              onClick={() => onOpenTab?.("presence")}
              className="w-full rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 py-3 text-right transition-all hover:bg-cyan-500/15"
            >
              <div className="flex items-center gap-2 font-black text-cyan-100">
                <Radio size={14} />
                נוכחות בזמן אמת
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                רואים מי באמת בטירה עכשיו, מי AFK, ואיפה התנועה מתרחשת.
              </p>
            </button>

            <button
              onClick={() => onOpenTab?.("users")}
              className="w-full rounded-2xl border border-violet-400/15 bg-violet-500/10 px-4 py-3 text-right transition-all hover:bg-violet-500/15"
            >
              <div className="flex items-center gap-2 font-black text-violet-100">
                <Users size={14} />
                הצטרפות ומיון
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                סוגרים משתמשים שעדיין לא קיבלו בית, לפני שהם נתקעים מחוץ לזרימה של האתר.
              </p>
            </button>

            <button
              onClick={() => onOpenTab?.("house-cup")}
              className="w-full rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-right transition-all hover:bg-emerald-500/15"
            >
              <div className="flex items-center gap-2 font-black text-emerald-100">
                <ScrollText size={14} />
                דיוור וקאמבקים
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                כרטיס הדיוור יושב בעמוד הראשי של האדמין, ומשם אפשר לבדוק קהל ולירות ינשוף חזרה.
              </p>
            </button>
          </div>
        </div>

        <div className="admin-card rounded-2xl p-5 space-y-4">
          <div>
            <p className="font-cinzel text-[10px] uppercase tracking-[0.18em] text-white/30">תזכורות מערכת</p>
            <h4 className="mt-1 font-cinzel text-lg font-black text-white">מה המערכת מנסה לרמוז</h4>
          </div>

          <div className="space-y-3 text-sm text-white/60">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-2 font-black text-white">
                <ShieldCheck size={14} />
                עקבות ניהול
              </div>
              <p className="mt-2">
                בלי audit trail קשה להבין למה משהו נשבר. כרגע יש {adminLogsCount} לוגים זמינים.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-2 font-black text-white">
                <Sparkles size={14} />
                דופק קהילתי
              </div>
              <p className="mt-2">
                {recentActivityCount >= 8
                  ? "הטירה מייצרת תנועה נראית לעין, וזה זמן טוב לחזק את המסלולים שממירים תנועה להתמדה."
                  : "האתר מרגיש שקט, ולכן כדאי לחזק את הגשרים בין נוכחות, תוכן, משימות ודיוור חזרה."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-2 font-black text-white">
                <Users size={14} />
                הצטרפות ומיון
              </div>
              <p className="mt-2">
                {unsortedUsersCount > 0
                  ? `יש כרגע ${unsortedUsersCount} משתמשים שמחכים למיון. זה המקום הכי זול לייצר חוויה טובה יותר למצטרפים.`
                  : "אין כרגע משתמשים תקועים לפני מיון, וזה סימן טוב לזרימת ההצטרפות."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-2 font-black text-white">
                <Activity size={14} />
                פעילות אמיתית מול בונוסים מהירים
              </div>
              <p className="mt-2">
                אם הבונוסים המהירים נסגרים אבל הדופק חלש, הסיפור הוא לא תגמול אלא מחסור במעשים חיים: פורומים, נביא, צ'אט וזירה.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
