"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, Search, Sparkles, Wand2, X, Zap } from "lucide-react";

export type QuickDailyQuestMode = "allowance" | "trivia" | "niffler" | "snitch";

export type QuickDailyTriviaQuestion = {
  q: string;
  a: string;
  options: string[];
};

type QuickDailyQuestModalProps = {
  mode: QuickDailyQuestMode;
  trivia?: QuickDailyTriviaQuestion | null;
  onClose: () => void;
  onComplete: (payload?: string) => Promise<void> | void;
};

type Treasure = {
  id: string;
  top: string;
  right: string;
  icon: string;
  label: string;
  zone: string;
  auraClass: string;
};

const NIFFLER_TREASURES: Treasure[] = [
  { id: "t1", top: "15%", right: "14%", icon: "🪙", label: "מטבע מהמהדורה הראשונה", zone: "מדף הספרים", auraClass: "from-amber-300/55 via-yellow-200/15 to-transparent" },
  { id: "t2", top: "26%", right: "57%", icon: "🎬", label: "טבעת אביזרים אבודה", zone: "עמדת הסרטים", auraClass: "from-rose-300/50 via-pink-200/15 to-transparent" },
  { id: "t3", top: "40%", right: "27%", icon: "🪄", label: "שרביט מבחן לצילומים", zone: "חדר החזרות", auraClass: "from-sky-300/55 via-blue-200/15 to-transparent" },
  { id: "t4", top: "48%", right: "76%", icon: "✨", label: "אבק כוכבים מהטיזר", zone: "לוח הסדרה שבדרך", auraClass: "from-violet-300/55 via-fuchsia-200/15 to-transparent" },
  { id: "t5", top: "68%", right: "19%", icon: "🔔", label: "פעמון קריאה לכוכבים", zone: "עמדת התלבושות", auraClass: "from-emerald-300/55 via-teal-200/15 to-transparent" },
  { id: "t6", top: "73%", right: "59%", icon: "💍", label: "קמע אספנים נדיר", zone: "ארון הפרומואים", auraClass: "from-cyan-300/55 via-white/10 to-transparent" },
];

const ALLOWANCE_NOTES = [
  { icon: Coins, title: "הינשוף נחת", body: "לא עוד כפתור יבש של איסוף בונוס. זו מסירה של ממש, עם מעטפה, חותם ורגע קטן שמרגיש כמו דואר קוסמים אמיתי." },
  { icon: Sparkles, title: "שבירת החותם", body: "פתיחה קצרה, ברורה ומספקת, שמרגישה כמו מענק יומי קטן ולא כמו אישור אוטומטי." },
  { icon: Coins, title: "העברה לארנק", body: "הסיום חד וברור, אבל כל הדרך אליו מספרת סיפור קטן שכיף לחזור אליו בכל יום." },
];

const TRIVIA_SOURCES = ["ספרים", "סרטים", "הסדרה שבדרך"];
const NIFFLER_ZONES = ["מדף הספרים", "עמדת הסרטים", "לוח הסדרה שבדרך"];
const SNITCH_CHIPS = ["Pitch 04", "רוח נגדית", "חלון תגובה קצר"];

function formatRemaining(count: number) {
  return `${count} ${count === 1 ? "פריט" : "פריטים"}`;
}

export default function QuickDailyQuestModal({
  mode,
  trivia,
  onClose,
  onComplete,
}: QuickDailyQuestModalProps) {
  const [allowanceOpened, setAllowanceOpened] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [foundTreasureIds, setFoundTreasureIds] = useState<string[]>([]);
  const [lastFoundTreasureId, setLastFoundTreasureId] = useState<string | null>(null);
  const [nifflerPosition, setNifflerPosition] = useState({ top: "18%", right: "16%" });
  const [snitchHits, setSnitchHits] = useState(0);
  const [snitchPosition, setSnitchPosition] = useState({ top: "48%", right: "42%" });
  const [submitting, setSubmitting] = useState(false);

  const nifflerGoal = 3;
  const snitchGoal = 2;
  const nifflerProgress = foundTreasureIds.length;
  const nifflerRemaining = Math.max(0, nifflerGoal - nifflerProgress);
  const snitchRemaining = Math.max(0, snitchGoal - snitchHits);

  const lastFoundTreasure = useMemo(
    () => NIFFLER_TREASURES.find((treasure) => treasure.id === lastFoundTreasureId) ?? null,
    [lastFoundTreasureId],
  );

  const remainingNifflerTreasures = useMemo(
    () => NIFFLER_TREASURES.filter((treasure) => !foundTreasureIds.includes(treasure.id)),
    [foundTreasureIds],
  );

  const nextNifflerTreasure = remainingNifflerTreasures[0] ?? null;

  const nifflerStatusCopy = useMemo(() => {
    if (nifflerProgress === 0) return "הניפלר קופץ בין עמדות העיבודים השונות בחדר. תפסו פריט מנצנץ אחד כדי לשבור לו את הקצב.";
    if (nifflerProgress >= nifflerGoal) return "הצלחתם לאסוף הכול בזמן. הניפלר חזר לכיס שלו קצת מאוכזב, אבל הארנק שלכם מלא יותר.";
    if (lastFoundTreasure) return `פריט אחד נשמר בבטחה: ${lastFoundTreasure.label}. נשארו עוד ${formatRemaining(nifflerRemaining)} לפני שהמרדף נסגר.`;
    return `הניפלר עוד בסביבה. נשארו עוד ${formatRemaining(nifflerRemaining)} לפני שהוא יעלים את השלל.`;
  }, [lastFoundTreasure, nifflerGoal, nifflerProgress, nifflerRemaining]);

  const snitchStatusCopy = useMemo(() => {
    if (snitchHits <= 0) return "הוא טס נמוך ואז חותך הצידה. הכינו את העיניים ואת התזמון שלכם.";
    if (snitchHits >= snitchGoal) return "תפיסה מושלמת. האימון הושלם והרווחתם את הנקודות שלכם להיום. מגרש 04 פנוי עכשיו.";
    return "תפיסה ראשונה מעולה. הוא מנסה להתחמק שוב, הישארו מרוכזים.";
  }, [snitchGoal, snitchHits]);

  const modalMeta = useMemo(() => {
    if (mode === "allowance") return { title: "מענק יומי ממשרד הקסמים", subtitle: "הינשוף נחת והמעטפה ממתינה. פתחו אותה כדי לאסוף את דמי הכיס היומיים לארנק שלכם.", accent: "amber" } as const;
    if (mode === "trivia") return { title: "מבחן הלחשים היומי", subtitle: "שאלה אחת, תשובה נכונה אחת, דחיפה יומית אחת להשלמת היעד.", accent: "blue" } as const;
    if (mode === "niffler") return { title: "מרדף הניפלר", subtitle: "מצאו שלושה פריטים נוצצים לפני שהניפלר יאסוף הכול ויברח.", accent: "emerald" } as const;
    return { title: "אימון מחפשים: מרדף הסניץ'", subtitle: "תפסו את הסניץ' המוזהב פעמיים כדי לסגור את האימון הקצר של היום.", accent: "violet" } as const;
  }, [mode]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, submitting]);

  useEffect(() => {
    if (mode !== "snitch" || submitting) return undefined;
    const moveSnitch = () => {
      setSnitchPosition({
        top: `${18 + Math.random() * 56}%`,
        right: `${12 + Math.random() * 68}%`,
      });
    };

    moveSnitch();
    const intervalId = window.setInterval(moveSnitch, 680);
    return () => window.clearInterval(intervalId);
  }, [mode, submitting]);

  const accentStyles = {
    amber: {
      shell: "border-amber-400/20 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.14),transparent_58%),linear-gradient(180deg,#0d1320_0%,#070b14_100%)]",
      badge: "border-amber-400/25 bg-amber-500/10 text-amber-100",
      button: "from-amber-500 to-amber-600 text-amber-950 hover:from-amber-400 hover:to-amber-500",
      accentText: "text-amber-300",
    },
    blue: {
      shell: "border-blue-400/20 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_58%),linear-gradient(180deg,#0d1320_0%,#070b14_100%)]",
      badge: "border-blue-400/25 bg-blue-500/10 text-blue-100",
      button: "from-blue-500 to-blue-600 text-white hover:from-blue-400 hover:to-blue-500",
      accentText: "text-blue-300",
    },
    emerald: {
      shell: "border-emerald-400/20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_58%),linear-gradient(180deg,#0d1320_0%,#070b14_100%)]",
      badge: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
      button: "from-emerald-500 to-emerald-600 text-emerald-950 hover:from-emerald-400 hover:to-emerald-500",
      accentText: "text-emerald-300",
    },
    violet: {
      shell: "border-violet-400/20 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.18),transparent_58%),linear-gradient(180deg,#0d1320_0%,#070b14_100%)]",
      badge: "border-violet-400/25 bg-violet-500/10 text-violet-100",
      button: "from-violet-500 to-violet-700 text-white hover:from-violet-400 hover:to-violet-600",
      accentText: "text-violet-300",
    },
  }[modalMeta.accent];

  const moveNiffler = useCallback(() => {
    setNifflerPosition({
      top: `${14 + Math.random() * 58}%`,
      right: `${8 + Math.random() * 72}%`,
    });
  }, []);

  useEffect(() => {
    if (mode !== "niffler" || submitting) return undefined;
    moveNiffler();
    const intervalId = window.setInterval(moveNiffler, 1800);
    return () => window.clearInterval(intervalId);
  }, [mode, moveNiffler, submitting]);

  const runCompletion = async (payload?: string) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      await onComplete(payload);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriviaPick = async (option: string) => {
    if (selectedAnswer || submitting) return;
    setSelectedAnswer(option);
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    await runCompletion(option);
  };

  const handleTreasurePick = async (treasureId: string) => {
    if (submitting || foundTreasureIds.includes(treasureId)) return;

    const nextFound = [...foundTreasureIds, treasureId];
    setFoundTreasureIds(nextFound);
    setLastFoundTreasureId(treasureId);
    moveNiffler();

    if (nextFound.length >= nifflerGoal) {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      await runCompletion();
    }
  };

  const handleSnitchCatch = async () => {
    if (submitting) return;
    const nextHits = snitchHits + 1;
    setSnitchHits(nextHits);

    if (nextHits >= snitchGoal) {
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      await runCompletion();
    }
  };

  const triviaFeedback = selectedAnswer
    ? selectedAnswer === trivia?.a
      ? "תשובה מושלמת. הלוח נדלק והיעד היומי הושלם."
      : "קרוב, אבל הלחש התפספס הפעם. מחר תהיה הזדמנות נוספת לאבק את השרביט ולהוכיח ידע."
    : "התחושה כאן היא של מבחן פתע קצר מתוך ארכיון הידע של הטירה, לא של טריוויה גנרית ומלחיצה.";

  const nifflerBriefing = lastFoundTreasure
    ? `פריט אחד נשמר בבטחה. נשארו עוד ${formatRemaining(nifflerRemaining)}.`
    : "חפשו ניצוצות, אביזרים או חפצי אספנים. כל קליק מוצלח אמור להרגיש כמו גילוי קטן, לא כמו טופס.";

  return (
    <div
      className="fixed inset-0 z-[120000] flex items-start justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-xl sm:items-center sm:p-4"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={modalMeta.title}
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div className={`relative my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-[2.8rem] border p-5 shadow-[0_0_80px_rgba(15,23,42,0.45)] sm:max-h-[calc(100dvh-2rem)] md:p-8 ${accentStyles.shell}`}>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute left-4 top-4 rounded-full bg-white/5 p-2.5 text-white/45 transition-all hover:bg-white/10 hover:text-white disabled:opacity-30 sm:left-5 sm:top-5"
          aria-label="סגור את החוויה"
        >
          <X size={18} />
        </button>

        <div className="mb-6 space-y-3 text-right">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-cinzel font-black uppercase tracking-[0.24em] ${accentStyles.badge}`}>
            <Sparkles size={12} />
            חוויה יומית
          </span>
          <h2 className="font-cinzel text-3xl font-black text-white md:text-4xl">{modalMeta.title}</h2>
          <p className="max-w-2xl text-sm leading-7 text-white/65">{modalMeta.subtitle}</p>
        </div>

        {mode === "allowance" && (
          <div className="space-y-6">
            <div className="rounded-[2.2rem] border border-white/10 bg-black/20 p-6 text-center md:p-8">
              {!allowanceOpened ? (
                <>
                  <div className="text-7xl md:text-8xl">🦉</div>
                  <p className="mt-5 font-crimson text-2xl italic text-white/80">מעטפה חתומה מונחת על שולחן המועדון.</p>
                  <button type="button" onClick={() => setAllowanceOpened(true)} className={`mt-5 touch-manipulation rounded-full bg-gradient-to-r px-8 py-4 font-cinzel text-sm font-black uppercase tracking-[0.2em] transition-all active:scale-95 ${accentStyles.button}`}>
                    שבירת החותם
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-4 text-4xl md:text-5xl">
                    <span>📜</span>
                    <span>🪙</span>
                    <span>🪙</span>
                    <span>🪙</span>
                  </div>
                  <p className="mt-5 font-crimson text-2xl italic text-white/80">החותם נשבר. המטבעות מחכים בפנים.</p>
                  <button type="button" disabled={submitting} onClick={() => void runCompletion()} className={`mt-5 touch-manipulation rounded-full bg-gradient-to-r px-8 py-4 font-cinzel text-sm font-black uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50 ${accentStyles.button}`}>
                    {submitting ? "מעבירים לארנק..." : "העברה לארנק"}
                  </button>
                </>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {ALLOWANCE_NOTES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 text-right">
                  <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                    <Icon size={12} />
                    {title}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/65">{body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "trivia" && (
          <div className="space-y-5">
            <div className="rounded-[2.2rem] border border-white/10 bg-black/20 p-6 text-center md:p-8">
              <p className="mb-4 font-cinzel text-[11px] uppercase tracking-[0.26em] text-white/35">שאלה אחת, תשובה נכונה אחת, דחיפה יומית אחת להשלמת היעד.</p>
              <p className="font-crimson text-2xl leading-relaxed text-white/90">"{trivia?.q || "השאלה היומית כבר בדרך אל הלוח."}"</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {TRIVIA_SOURCES.map((source) => (
                <span key={source} className="rounded-full border border-blue-300/18 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-100/80">
                  {source}
                </span>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {(trivia?.options || []).map((option) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === trivia?.a;

                return (
                  <button
                    key={option}
                    type="button"
                    disabled={Boolean(selectedAnswer) || submitting}
                    onClick={() => void handleTriviaPick(option)}
                    className={`touch-manipulation rounded-[1.5rem] border px-5 py-4 text-right text-sm font-bold transition-all ${
                      isSelected
                        ? isCorrect
                          ? "border-emerald-300/35 bg-emerald-500/15 text-emerald-100"
                          : "border-rose-300/35 bg-rose-500/15 text-rose-100"
                        : "border-white/10 bg-white/[0.04] text-white/75 hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-white"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white/60">
              <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/38">
                <Wand2 size={14} />
                ארכיון הידע
              </p>
              <p className="mt-2">{triviaFeedback}</p>
            </div>
          </div>
        )}

        {mode === "niffler" && (
          <div className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[1.8rem] border border-emerald-400/18 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3 text-sm text-white/70">
                  <span className={accentStyles.accentText}>הניפלר קופץ בין עמדות העיבודים השונות בחדר. תפסו פריט מנצנץ אחד כדי לשבור לו את הקצב.</span>
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-black text-emerald-100">
                    {nifflerProgress}/{nifflerGoal} פריטים נאספו
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-white/62">{nifflerStatusCopy}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {NIFFLER_ZONES.map((zone) => (
                    <span key={zone} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
                      {zone}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-white/10 bg-black/20 p-4">
                <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/45">
                  <Search size={13} />
                  השלל שנאסף
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {Array.from({ length: nifflerGoal }).map((_, index) => {
                    const treasureId = foundTreasureIds[index];
                    const treasure = NIFFLER_TREASURES.find((entry) => entry.id === treasureId) ?? null;

                    return (
                      <div key={`loot-slot-${index}`} className={`rounded-[1.2rem] border px-3 py-4 text-center transition-all ${treasure ? "border-emerald-300/25 bg-emerald-500/12 text-white shadow-[0_0_24px_rgba(16,185,129,0.18)]" : "border-white/8 bg-white/[0.03] text-white/28"}`}>
                        <div className="text-2xl">{treasure?.icon || "•"}</div>
                        <p className="mt-2 text-[10px] font-bold leading-5">{treasure?.zone || "ממתין לפריט"}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/60">
                  {nextNifflerTreasure ? (
                    <>
                      <span className="font-black text-white/80">היעד הנוכחי:</span>{" "}
                      {nextNifflerTreasure.label} מתוך {nextNifflerTreasure.zone}
                    </>
                  ) : (
                    <span className="font-black text-emerald-200">הצלחתם לאסוף הכול בזמן. הניפלר חזר לכיס שלו קצת מאוכזב.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[1.6rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/65">
              <span className={accentStyles.accentText}>מצאו שלושה פריטים נוצצים לפני שהניפלר יאסוף הכול ויברח.</span>
              <span>{nifflerProgress}/{nifflerGoal} פריטים</span>
            </div>

            <div className="relative h-[280px] overflow-hidden rounded-[2.4rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_45%),linear-gradient(180deg,#08111a_0%,#05070e_100%)] sm:h-[360px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(255,255,255,0.05),transparent_18%),radial-gradient(circle_at_56%_78%,rgba(255,255,255,0.06),transparent_24%)]" />
              <div className="absolute inset-y-0 left-[15%] w-px bg-gradient-to-b from-transparent via-white/18 to-transparent" />
              <div className="absolute inset-y-0 left-[61%] w-px bg-gradient-to-b from-transparent via-white/12 to-transparent" />
              <div className="absolute right-[9%] top-[8%] rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">חדר העיבודים</div>
              <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(2,6,23,0.65))]" />
              <div className="absolute bottom-5 left-[9%] right-[9%] flex items-end justify-between text-[10px] font-black uppercase tracking-[0.2em] text-white/32">
                <span>ספרים</span>
                <span>סרטים</span>
                <span>סדרה</span>
              </div>
              <div className="absolute right-[11%] top-[17%] h-[44%] w-[20%] rounded-[2rem] border border-amber-200/10 bg-[linear-gradient(180deg,rgba(120,53,15,0.28),rgba(69,26,3,0.2))] p-4 shadow-[inset_0_0_30px_rgba(251,191,36,0.08)]">
                <div className="grid h-full grid-cols-3 gap-2">
                  {["#7c3aed", "#d97706", "#0ea5e9", "#f59e0b", "#16a34a", "#ef4444"].map((color, index) => (
                    <span key={`book-${index}`} className="rounded-full opacity-80" style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              <div className="absolute right-[39%] top-[14%] h-[28%] w-[22%] rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.4))] p-4 shadow-[0_0_35px_rgba(59,130,246,0.08)]">
                <div className="h-full rounded-[1.4rem] border border-sky-300/15 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_55%),rgba(2,6,23,0.72)] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-200/60">עמדת הסרטים</p>
                  <div className="mt-3 flex gap-2 text-2xl opacity-80">
                    <span>🎬</span>
                    <span>🎞️</span>
                    <span>🍿</span>
                  </div>
                </div>
              </div>
              <div className="absolute left-[8%] top-[11%] h-[34%] w-[24%] rounded-[2rem] border border-violet-300/12 bg-[linear-gradient(180deg,rgba(76,29,149,0.24),rgba(17,24,39,0.3))] p-4 shadow-[0_0_40px_rgba(139,92,246,0.08)]">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-200/60">לוח הסדרה שבדרך</p>
                <div className="mt-4 space-y-2 text-sm text-white/55">
                  <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1">קאסט</div>
                  <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1">לוקיישנים</div>
                  <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1">טיזרים</div>
                </div>
              </div>
              <div className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-700" style={{ top: nifflerPosition.top, right: nifflerPosition.right }}>
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-2xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-emerald-300/18 bg-emerald-500/8 text-6xl shadow-[0_0_38px_rgba(16,185,129,0.18)]">🦦</div>
                  <div className="absolute -top-6 right-1/2 translate-x-1/2 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[10px] font-black tracking-[0.16em] text-emerald-100/80">
                    {nifflerProgress >= 2 ? "הוא נלחץ" : "הוא בורח"}
                  </div>
                </div>
              </div>
              {NIFFLER_TREASURES.map((treasure) => {
                const found = foundTreasureIds.includes(treasure.id);

                return (
                  <button
                    key={treasure.id}
                    type="button"
                    disabled={found || submitting}
                    onClick={() => void handleTreasurePick(treasure.id)}
                    className={`group touch-manipulation absolute flex h-16 w-16 items-center justify-center rounded-full border text-2xl transition-all sm:h-[4.5rem] sm:w-[4.5rem] ${found ? "scale-75 border-emerald-300/30 bg-emerald-500/20 opacity-45" : "border-white/14 bg-white/[0.05] shadow-[0_0_28px_rgba(255,255,255,0.08)] hover:scale-110 hover:border-emerald-300/35"}`}
                    style={{ top: treasure.top, right: treasure.right }}
                    aria-label={`${treasure.label} מתוך ${treasure.zone}`}
                  >
                    {!found && <span className={`absolute inset-0 rounded-full bg-gradient-to-br ${treasure.auraClass} blur-xl transition-opacity group-hover:opacity-100`} />}
                    <span className="relative z-10">{found ? "✓" : treasure.icon}</span>
                    <span className="pointer-events-none absolute -bottom-14 right-1/2 hidden w-40 translate-x-1/2 rounded-2xl border border-white/10 bg-black/70 px-3 py-2 text-center text-[10px] font-bold leading-5 text-white/75 shadow-2xl group-hover:block">
                      {treasure.label}
                      <span className="mt-1 block text-white/40">{treasure.zone}</span>
                    </span>
                  </button>
                );
              })}
              <div className="absolute bottom-5 left-5 max-w-xs rounded-[1.5rem] border border-white/10 bg-black/35 px-4 py-3 text-sm leading-6 text-white/62 backdrop-blur-sm">
                <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{lastFoundTreasure ? "התקדמות" : "רמז התחלתי"}</span>
                <span className="mt-2 block">{nifflerBriefing}</span>
              </div>
            </div>
          </div>
        )}

        {mode === "snitch" && (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.8rem] border border-violet-300/15 bg-black/20 p-4">
                <p className="text-sm leading-7 text-white/65">{snitchStatusCopy}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {SNITCH_CHIPS.map((chip) => (
                    <span key={chip} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.8rem] border border-white/10 bg-black/20 p-4">
                <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/45">
                  <Zap size={13} />
                  לוח אימון
                </p>
                <div className="mt-3 flex items-center justify-between rounded-[1.2rem] border border-violet-300/15 bg-violet-500/10 px-4 py-3 text-white/72">
                  <span>תפיסות</span>
                  <span className="font-cinzel text-2xl font-black text-violet-100">{snitchHits}/{snitchGoal}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-[1.6rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/65">
              <span className={accentStyles.accentText}>הסניץ' לא נשאר במקום. עקבו אחרי הניצוץ ✨.</span>
              <span>{snitchHits}/{snitchGoal} תפיסות</span>
            </div>
            <div className="relative h-[280px] overflow-hidden rounded-[2.4rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.16),transparent_45%),linear-gradient(180deg,#070912_0%,#05070e_100%)] sm:h-[360px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.08),transparent_20%),radial-gradient(circle_at_78%_30%,rgba(255,255,255,0.06),transparent_22%),radial-gradient(circle_at_52%_72%,rgba(255,255,255,0.05),transparent_24%)]" />
              <div className="absolute inset-x-10 top-1/2 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
              <div className="absolute left-[18%] top-[24%] h-20 w-20 rounded-full border border-white/10" />
              <div className="absolute bottom-[18%] right-[18%] h-24 w-24 rounded-full border border-white/10" />
              <div className="absolute right-[10%] top-[14%] text-sm font-cinzel uppercase tracking-[0.18em] text-white/35">Pitch 04</div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSnitchCatch()}
                className="touch-manipulation absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-amber-300/35 bg-amber-400/15 text-3xl shadow-[0_0_28px_rgba(251,191,36,0.36)] transition-all duration-500 hover:scale-110 sm:h-16 sm:w-16"
                style={{ top: snitchPosition.top, right: snitchPosition.right }}
                aria-label="לתפוס את הסניץ'"
              >
                ✨
              </button>
              <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] font-bold text-white/65">
                <Zap size={14} className="text-amber-300" />
                חלון תגובה קצר
              </div>
              <div className="absolute right-5 top-5 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] font-bold text-white/65">
                נשארו עוד {snitchRemaining}
              </div>
            </div>
          </div>
        )}

        {submitting && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="rounded-full border border-white/10 bg-black/40 px-5 py-3 text-sm font-cinzel font-black uppercase tracking-[0.24em] text-white/75">
              שומרים תוצאה...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
