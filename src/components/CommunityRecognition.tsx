"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Award,
  CheckCircle2,
  Copy,
  Flame,
  Map as MapIcon,
  ScrollText,
  Sparkles,
  UserPlus,
  Users,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  HOUSE_IDS,
  fetchCommunityRecognition,
  getCommunityShareCopy,
  type CommunityRecognitionSnapshot,
  type WeeklyHonoree,
  type WeeklyMapTrail,
} from "@/lib/communityRecognition";
import { getHouseDisplayIcon, getHouseVisualTheme, withAlpha } from "@/lib/houses";

type RecognitionPlacement = "dashboard" | "great-hall" | "forums" | "quests";

type CommunityRecognitionProps = {
  placement?: RecognitionPlacement;
  compact?: boolean;
};

const PLACEMENT_COPY: Record<RecognitionPlacement, { eyebrow: string; title: string; description: string }> = {
  dashboard: {
    eyebrow: "Weekly Hall of Honor",
    title: "היכל הכבוד השבועי",
    description: "מקום קטן להאיר תלמידים שהשאירו השבוע סימן טוב בטירה. לא לוח תחרות, אלא תודה גלויה על פעילות שמחזקת את הקהילה.",
  },
  "great-hall": {
    eyebrow: "Great Hall Honor",
    title: "קולות שהאירו השבוע",
    description: "האולם הגדול זוכר מי הדליק שיחה, ענה, עודד והחזיק את הלהבה הקהילתית בחיים.",
  },
  forums: {
    eyebrow: "Forum Recognition",
    title: "הפורומים מצדיעים לפעילות טובה",
    description: "תגובות, אשכולות וקריאה משותפת מקבלים כאן רגע של אור בלי להפוך את השיח למרדף אחרי מקום ראשון.",
  },
  quests: {
    eyebrow: "Quest Companions",
    title: "תארים ומשימות קהילה",
    description: "המשימות השבועיות מקבלות שכבת הוקרה קלה: רצף, תרומה לאולם, השלמת יעדים ופעילות ידע בטירה.",
  },
};

function topHouseLabel(snapshot: CommunityRecognitionSnapshot | null) {
  if (!snapshot) return "הבתים עדיין מתעוררים";
  const top = HOUSE_IDS
    .map((houseId) => ({ houseId, value: snapshot.pulse.housePoints[houseId] || 0 }))
    .sort((left, right) => right.value - left.value)[0];

  if (!top || top.value <= 0) return "הבתים עדיין מתעוררים";
  const theme = getHouseVisualTheme(top.houseId);
  return `${theme?.palette.label || top.houseId} עם ${top.value} נקודות פעילות`;
}

function toneClasses(tone: WeeklyMapTrail["tone"]) {
  switch (tone) {
    case "emerald":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
    case "sky":
      return "border-sky-400/20 bg-sky-500/10 text-sky-100";
    case "violet":
      return "border-violet-400/20 bg-violet-500/10 text-violet-100";
    case "rose":
      return "border-rose-400/20 bg-rose-500/10 text-rose-100";
    default:
      return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  }
}

function copyLabel(title: string) {
  return getCommunityShareCopy(title);
}

function HonorRow({
  honoree,
  compact,
  onCopy,
  copied,
}: {
  honoree: WeeklyHonoree;
  compact: boolean;
  onCopy: (honoree: WeeklyHonoree) => void;
  copied: boolean;
}) {
  const theme = getHouseVisualTheme(honoree.house);
  const color = theme?.palette.readable || "#f8fafc";

  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4 text-right transition-all hover:border-white/20 hover:bg-white/[0.055]">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/wizard/${honoree.userId}`}
          className="flex min-w-0 items-center gap-3"
        >
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-lg"
            style={{
              borderColor: theme?.mutedBorder || "rgba(255,255,255,0.12)",
              background: theme?.surface || "rgba(255,255,255,0.04)",
            }}
          >
            {getHouseDisplayIcon(honoree.house, "✨")}
          </div>
          <div className="min-w-0">
            <div className="truncate font-cinzel text-sm font-black text-white">{honoree.username}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
              <span className="rounded-full border px-2 py-0.5" style={{ color, borderColor: withAlpha(color, 0.26), background: withAlpha(color, 0.08) }}>
                {honoree.houseLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-white/45">
                {honoree.streakDays} ימי רצף
              </span>
            </div>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => onCopy(honoree)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-white/55 transition-all hover:border-amber-300/35 hover:bg-amber-500/10 hover:text-amber-100"
          aria-label={`העתקת טקסט שיתוף עבור ${honoree.earnedTitle}`}
          title="העתקת טקסט שיתוף"
        >
          {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-400/15 bg-amber-500/[0.055] p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="font-cinzel text-[11px] font-black uppercase tracking-[0.18em] text-amber-100">
            {honoree.earnedTitle}
          </span>
          <span className="font-cinzel text-sm font-black text-white">{honoree.weeklyPoints}</span>
        </div>
        {!compact && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {honoree.badges.slice(0, 3).map((badge) => (
              <span key={badge} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-white/50">
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WeeklyMaraudersMap({
  trails,
  compact,
}: {
  trails: WeeklyMapTrail[];
  compact: boolean;
}) {
  const activeTrails = trails.filter((trail) => trail.value > 0);
  const visibleTrails = compact ? trails.slice(0, 3) : trails;

  return (
    <div
      className="overflow-hidden rounded-[1.6rem] border border-amber-950/15 p-4 text-amber-950 shadow-[0_20px_70px_rgba(0,0,0,0.18)]"
      style={{
        background:
          "radial-gradient(circle at 12% 20%, rgba(120,74,20,0.16), transparent 24%), radial-gradient(circle at 82% 18%, rgba(120,74,20,0.12), transparent 22%), linear-gradient(135deg, rgba(255,247,220,0.96), rgba(210,183,115,0.92))",
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="font-['UnifrakturMaguntia'] text-2xl leading-none">מפת הקונדסאים השבועית</div>
          <div className="mt-1 text-xs italic text-amber-950/65">I solemnly swear the castle stayed active</div>
        </div>
        <MapIcon size={22} className="shrink-0 text-amber-950/70" />
      </div>

      <div className="relative grid gap-2 sm:grid-cols-2">
        <div className="pointer-events-none absolute inset-x-8 top-1/2 hidden h-px -translate-y-1/2 bg-amber-950/15 sm:block" />
        {visibleTrails.map((trail, index) => (
          <Link
            key={trail.key}
            href={trail.href}
            className="relative flex items-center justify-between rounded-2xl border border-amber-950/10 bg-white/25 px-3 py-2 transition-all hover:bg-white/40"
          >
            <span className="flex items-center gap-2">
              <span className="text-amber-950/55">{index % 2 === 0 ? "⋯" : "· ·"}</span>
              <span className="text-sm font-black">{trail.label}</span>
            </span>
            <span className="rounded-full bg-amber-950 px-2 py-0.5 font-cinzel text-[10px] font-black text-amber-100">
              {trail.value}
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-amber-950/70">
        {activeTrails.length > 0
          ? "צעדים עדינים נראו השבוע בין האולם, הספרייה והפורומים. המפה מציגה תנועה קהילתית, לא מעקב אישי."
          : "השבוע עוד שקט על הקלף. הפעילות הציבורית הבאה תוסיף עקבות למפה."}
      </p>
    </div>
  );
}

function InviteQuestCard({ compact }: { compact: boolean }) {
  return (
    <div className="rounded-[1.6rem] border border-cyan-400/18 bg-cyan-500/[0.07] p-4 text-right">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
          <UserPlus size={20} />
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 font-cinzel text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
          Placeholder
        </span>
      </div>
      <h3 className="font-cinzel text-lg font-black text-white">הביאו תלמיד חדש לטירה</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/58">
        {compact
          ? "משימת הזמנה מוכנה לתצוגה. tracking מלא יתחבר בהמשך בלי לשנות את ה-UI."
          : "המשימה מוצגת כבר עכשיו בצורה נקייה: קישור הזמנה ושער התקדמות עדין. כשהמעקב המלא יופעל, אותו כרטיס יוכל לקבל סטטוס אמיתי בלי לבנות מחדש את החוויה."}
      </p>
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-white/55">
          <span>תלמידים שהצטרפו דרך ההזמנה</span>
          <span>0/1</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-0 rounded-full bg-gradient-to-l from-cyan-300 to-amber-300" />
        </div>
      </div>
    </div>
  );
}

export default function CommunityRecognition({
  placement = "dashboard",
  compact = false,
}: CommunityRecognitionProps) {
  const [supabase] = useState(() => createClient());
  const [snapshot, setSnapshot] = useState<CommunityRecognitionSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copy = PLACEMENT_COPY[placement];
  const maxHonorees = compact ? 3 : 6;

  const loadRecognition = useCallback(async () => {
    setIsLoading(true);
    try {
      setSnapshot(await fetchCommunityRecognition(supabase));
    } catch (error) {
      console.warn("[community-recognition] failed to fetch weekly recognition", error);
      setSnapshot(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadRecognition();

    const channel = supabase
      .channel(`community-recognition-${placement}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_events" }, () => {
        void loadRecognition();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        void loadRecognition();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadRecognition, placement, supabase]);

  const honorees = useMemo(() => snapshot?.honorees.slice(0, maxHonorees) || [], [maxHonorees, snapshot]);
  const totalHousePoints = useMemo(
    () => HOUSE_IDS.reduce((sum, houseId) => sum + (snapshot?.pulse.housePoints[houseId] || 0), 0),
    [snapshot],
  );

  const handleCopy = useCallback(async (honoree: WeeklyHonoree) => {
    const text = copyLabel(honoree.earnedTitle);

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(honoree.userId);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(honoree.userId);
      window.setTimeout(() => setCopiedId(null), 1800);
    }
  }, []);

  return (
    <section className={`rounded-[2rem] border border-white/10 bg-white/[0.035] p-4 text-white shadow-[0_24px_90px_rgba(0,0,0,0.22)] md:p-6 ${compact ? "space-y-4" : "space-y-6"}`} dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="text-right">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 font-cinzel text-[10px] font-black uppercase tracking-[0.24em] text-amber-100">
            <Award size={12} />
            {copy.eyebrow}
          </div>
          <h2 className="mt-3 font-cinzel text-2xl font-black text-white md:text-3xl">{copy.title}</h2>
          {!compact && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/58">{copy.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-cinzel font-black uppercase tracking-[0.2em] text-emerald-100">
            <Flame size={12} />
            {topHouseLabel(snapshot)}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[10px] font-cinzel font-black uppercase tracking-[0.2em] text-white/50">
            <Users size={12} />
            {totalHousePoints} נקודות פעילות
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: compact ? 3 : 6 }).map((_, index) => (
            <div key={index} className="min-h-[138px] animate-pulse rounded-[1.35rem] border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      ) : (
        <div className={`grid gap-4 ${compact ? "" : "xl:grid-cols-[1.05fr_0.95fr]"}`}>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {honorees.length > 0 ? honorees.map((honoree) => (
                <HonorRow
                  key={honoree.userId}
                  honoree={honoree}
                  compact={compact}
                  copied={copiedId === honoree.userId}
                  onCopy={handleCopy}
                />
              )) : (
                <div className="md:col-span-2 rounded-[1.35rem] border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                  <Sparkles className="mx-auto mb-3 text-amber-200/55" size={22} />
                  <p className="text-sm leading-relaxed text-white/55">
                    עדיין אין מספיק פעילות ציבורית השבוע. תגובה אחת, משימה אחת או ביקור באולם יכולים לפתוח את היכל הכבוד.
                  </p>
                </div>
              )}
            </div>

            {!compact && (
              <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-right">
                    <p className="font-cinzel text-[10px] uppercase tracking-[0.24em] text-white/35">מה קרה בטירה השבוע</p>
                    <h3 className="mt-1 font-cinzel text-lg font-black text-white">Castle pulse</h3>
                  </div>
                  <Activity size={18} className="text-cyan-200" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <PulseMetric icon={ScrollText} label="משימות שהושלמו" value={snapshot?.pulse.completedQuests || 0} />
                  <PulseMetric icon={Flame} label="נקודות פעילות לבית" value={totalHousePoints} />
                  <PulseMetric icon={WandSparkles} label="האולם הגדול" value={snapshot?.pulse.greatHallMessages || 0} />
                  <PulseMetric icon={Sparkles} label="פורומים / חדשות / ספרייה" value={(snapshot?.pulse.forumActivity || 0) + (snapshot?.pulse.newsActivity || 0) + (snapshot?.pulse.libraryActivity || 0)} />
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <WeeklyMaraudersMap trails={snapshot?.mapTrails || []} compact={compact} />
            <InviteQuestCard compact={compact} />
            {!compact && (
              <div className="grid gap-2 sm:grid-cols-5">
                {(snapshot?.mapTrails || []).map((trail) => (
                  <Link key={trail.key} href={trail.href} className={`rounded-2xl border px-3 py-2 text-center transition-all hover:-translate-y-0.5 ${toneClasses(trail.tone)}`}>
                    <div className="font-cinzel text-lg font-black">{trail.value}</div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/55">{trail.label}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function PulseMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-right">
      <div className="mb-2 flex items-center justify-between gap-3">
        <Icon size={15} className="text-amber-200/80" />
        <span className="text-[11px] font-bold text-white/45">{label}</span>
      </div>
      <div className="font-cinzel text-2xl font-black text-white">{value}</div>
    </div>
  );
}
