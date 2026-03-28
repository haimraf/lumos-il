"use client";

import { useEffect, useMemo, useState } from "react";
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
};

const NIFFLER_TREASURES: Treasure[] = [
  { id: "t1", top: "12%", right: "12%", icon: "🪙" },
  { id: "t2", top: "22%", right: "54%", icon: "💍" },
  { id: "t3", top: "38%", right: "28%", icon: "🪄" },
  { id: "t4", top: "46%", right: "72%", icon: "✨" },
  { id: "t5", top: "64%", right: "18%", icon: "🔔" },
  { id: "t6", top: "72%", right: "58%", icon: "📿" },
];

export default function QuickDailyQuestModal({
  mode,
  trivia,
  onClose,
  onComplete,
}: QuickDailyQuestModalProps) {
  const [allowanceOpened, setAllowanceOpened] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [foundTreasureIds, setFoundTreasureIds] = useState<string[]>([]);
  const [snitchHits, setSnitchHits] = useState(0);
  const [snitchPosition, setSnitchPosition] = useState({ top: "48%", right: "42%" });
  const [submitting, setSubmitting] = useState(false);

  const nifflerProgress = foundTreasureIds.length;
  const snitchGoal = 2;
  const nifflerGoal = 3;

  const modalMeta = useMemo(() => {
    if (mode === "allowance") {
      return {
        title: "דמי הכיס של משרד הקסמים",
        subtitle: "הינשוף נחת, המעטפה נפתחה, ועכשיו אפשר להעביר את המטבעות לארנק שלך.",
        accent: "amber",
      } as const;
    }

    if (mode === "trivia") {
      return {
        title: "מבחן הלחשים היומי",
        subtitle: "תשובה אחת נכונה תסגור את היעד היומי ותדליק את הלוח.",
        accent: "blue",
      } as const;
    }

    if (mode === "niffler") {
      return {
        title: "מרדף הניפלר",
        subtitle: "מצא שלושה פריטים נוצצים לפני שהניפלר אוסף הכול ובורח.",
        accent: "emerald",
      } as const;
    }

    return {
      title: "מרדף אחרי הסניץ'",
      subtitle: "תפוס את הסניץ' פעמיים כדי לסגור את האימון הקצר של היום.",
      accent: "violet",
    } as const;
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

    return () => {
      window.clearInterval(intervalId);
    };
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

  return (
    <div
      className="fixed inset-0 z-[120000] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={modalMeta.title}
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div className={`relative w-full max-w-3xl overflow-hidden rounded-[2.8rem] border p-6 md:p-8 shadow-[0_0_80px_rgba(15,23,42,0.45)] ${accentStyles.shell}`}>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute left-5 top-5 rounded-full bg-white/5 p-2 text-white/45 transition-all hover:bg-white/10 hover:text-white disabled:opacity-30"
          aria-label="סגור את החוויה"
        >
          <X size={18} />
        </button>

        <div className="mb-6 space-y-3 text-right">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-cinzel font-black uppercase tracking-[0.24em] ${accentStyles.badge}`}>
            <Sparkles size={12} />
            חוויה יומית
          </span>
          <h2 className="font-cinzel text-3xl md:text-4xl font-black text-white">{modalMeta.title}</h2>
          <p className="max-w-2xl text-sm leading-7 text-white/65">{modalMeta.subtitle}</p>
        </div>

        {mode === "allowance" && (
          <div className="space-y-6">
            <div className="relative rounded-[2.2rem] border border-white/10 bg-black/20 p-6 md:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_45%)]" />
              <div className="relative flex flex-col items-center justify-center gap-5 text-center">
                {!allowanceOpened ? (
                  <>
                    <div className="text-7xl md:text-8xl">🦉</div>
                    <p className="font-crimson text-2xl italic text-white/80">המעטפה נחתה על שולחן המועדון.</p>
                    <button
                      type="button"
                      onClick={() => setAllowanceOpened(true)}
                      className={`rounded-full bg-gradient-to-r px-8 py-4 font-cinzel text-sm font-black uppercase tracking-[0.2em] transition-all active:scale-95 ${accentStyles.button}`}
                    >
                      לפתוח את המעטפה
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-4 text-4xl md:text-5xl">
                      <span>✉️</span>
                      <span>🪙</span>
                      <span>🪙</span>
                      <span>🪙</span>
                    </div>
                    <p className="font-crimson text-2xl italic text-white/80">הקצבה מוכנה להעברה לארנק שלך.</p>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void runCompletion()}
                      className={`rounded-full bg-gradient-to-r px-8 py-4 font-cinzel text-sm font-black uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50 ${accentStyles.button}`}
                    >
                      {submitting ? "מעביר את הדמי כיס..." : "להעביר לארנק"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {mode === "trivia" && (
          <div className="space-y-5">
            <div className="rounded-[2.2rem] border border-white/10 bg-black/20 p-6 text-center md:p-8">
              <p className="mb-4 font-cinzel text-[11px] uppercase tracking-[0.26em] text-white/35">שאלה אחת. תשובה אחת. דחיפה יומית אחת.</p>
              <p className="font-crimson text-2xl leading-relaxed text-white/90">"{trivia?.q || "השאלה היומית נטענת..."}"</p>
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
                    className={`rounded-[1.5rem] border px-5 py-4 text-right text-sm font-bold transition-all ${
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
          </div>
        )}

        {mode === "niffler" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-[1.6rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/65">
              <span className={accentStyles.accentText}>הניפלר מזהה כל דבר נוצץ. תגיע אליו קודם.</span>
              <span>{nifflerProgress}/{nifflerGoal} נאספו</span>
            </div>
            <div className="relative h-[360px] overflow-hidden rounded-[2.4rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_45%),linear-gradient(180deg,#08111a_0%,#05070e_100%)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(255,255,255,0.05),transparent_18%),radial-gradient(circle_at_56%_78%,rgba(255,255,255,0.06),transparent_24%)]" />
              <div className="absolute right-[12%] top-[12%] text-6xl md:text-7xl">🦦</div>
              {NIFFLER_TREASURES.map((treasure) => {
                const found = foundTreasureIds.includes(treasure.id);

                return (
                  <button
                    key={treasure.id}
                    type="button"
                    disabled={found || submitting}
                    onClick={() => void handleTreasurePick(treasure.id)}
                    className={`absolute flex h-14 w-14 items-center justify-center rounded-full border text-2xl transition-all ${
                      found
                        ? "scale-75 border-emerald-300/30 bg-emerald-500/20 opacity-40"
                        : "border-emerald-300/25 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.28)] hover:scale-110"
                    }`}
                    style={{ top: treasure.top, right: treasure.right }}
                    aria-label={`פריט נוצץ ${treasure.id}`}
                  >
                    {found ? "✓" : treasure.icon}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === "snitch" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-[1.6rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/65">
              <span className={accentStyles.accentText}>הסניץ' לא נשאר באותו מקום. תתפוס אותו פעמיים.</span>
              <span>{snitchHits}/{snitchGoal} תפיסות</span>
            </div>
            <div className="relative h-[360px] overflow-hidden rounded-[2.4rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.16),transparent_45%),linear-gradient(180deg,#070912_0%,#05070e_100%)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.08),transparent_20%),radial-gradient(circle_at_78%_30%,rgba(255,255,255,0.06),transparent_22%),radial-gradient(circle_at_52%_72%,rgba(255,255,255,0.05),transparent_24%)]" />
              <div className="absolute right-[10%] top-[14%] text-sm font-cinzel uppercase tracking-[0.18em] text-white/35">Pitch 04</div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSnitchCatch()}
                className="absolute flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-amber-300/35 bg-amber-400/15 text-3xl shadow-[0_0_28px_rgba(251,191,36,0.36)] transition-all duration-500 hover:scale-110"
                style={{ top: snitchPosition.top, right: snitchPosition.right }}
                aria-label="לתפוס את הסניץ'"
              >
                ✨
              </button>
              <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] font-bold text-white/65">
                <Zap size={14} className="text-amber-300" />
                חלון תגובה קצר
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
