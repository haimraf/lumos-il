"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  KeyRound,
  MoonStar,
  Shield,
  Sparkles,
  SunMedium,
  Swords,
  Wand2,
  X,
} from "lucide-react";
import CanonBadge from "@/components/CanonBadge";
import { getSpellCanonMeta } from "@/lib/wizardingCanon";
import { triggerAudioPlay } from "@/utils/audioTrigger";

type RitualStatus = "intro" | "active" | "success";
type RitualKind =
  | "alohomora"
  | "lumos"
  | "nox"
  | "wingardium"
  | "protego"
  | "expelliarmus"
  | "patronus"
  | "trace";

type Spell = {
  id?: string | number;
  name?: string | null;
  latin_name?: string | null;
  terminal_command?: string | null;
};

const LOCK_TARGETS = [1, 4, 2];
const WINGARDIUM_POINTS = [
  { x: "18%", y: "74%" },
  { x: "36%", y: "56%" },
  { x: "56%", y: "42%" },
  { x: "76%", y: "22%" },
];
const PROTEGO_POINTS = [
  { x: "50%", y: "16%" },
  { x: "78%", y: "36%" },
  { x: "50%", y: "76%" },
  { x: "22%", y: "36%" },
];
const PROTEGO_SEQUENCE = [3, 0, 1, 2];
const PATRONUS_POINTS = [
  { x: "20%", y: "24%" },
  { x: "76%", y: "30%" },
  { x: "34%", y: "72%" },
];

const THEMES = {
  amber: {
    shell:
      "border-amber-400/20 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_58%),linear-gradient(180deg,#0d1420_0%,#070b14_100%)]",
    badge: "border-amber-400/25 bg-amber-500/10 text-amber-100",
    button:
      "from-amber-500 to-amber-700 text-amber-950 hover:from-amber-400 hover:to-amber-600",
    accent: "text-amber-300",
    meter: "from-amber-300 via-amber-400 to-orange-500",
  },
  sky: {
    shell:
      "border-sky-400/20 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_58%),linear-gradient(180deg,#0b1420_0%,#060b14_100%)]",
    badge: "border-sky-400/25 bg-sky-500/10 text-sky-100",
    button:
      "from-sky-500 to-blue-700 text-white hover:from-sky-400 hover:to-blue-600",
    accent: "text-sky-300",
    meter: "from-sky-300 via-blue-400 to-cyan-400",
  },
  emerald: {
    shell:
      "border-emerald-400/20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_58%),linear-gradient(180deg,#0b1420_0%,#050a12_100%)]",
    badge: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
    button:
      "from-emerald-500 to-emerald-700 text-emerald-950 hover:from-emerald-400 hover:to-emerald-600",
    accent: "text-emerald-300",
    meter: "from-emerald-300 via-teal-400 to-cyan-400",
  },
  violet: {
    shell:
      "border-violet-400/20 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.18),transparent_58%),linear-gradient(180deg,#0c1120_0%,#060913_100%)]",
    badge: "border-violet-400/25 bg-violet-500/10 text-violet-100",
    button:
      "from-violet-500 to-violet-800 text-white hover:from-violet-400 hover:to-violet-700",
    accent: "text-violet-300",
    meter: "from-violet-300 via-fuchsia-400 to-amber-300",
  },
  rose: {
    shell:
      "border-rose-400/20 bg-[radial-gradient(circle_at_top,rgba(251,113,133,0.2),transparent_58%),linear-gradient(180deg,#180d16_0%,#09060c_100%)]",
    badge: "border-rose-400/25 bg-rose-500/10 text-rose-100",
    button:
      "from-rose-500 to-red-700 text-white hover:from-rose-400 hover:to-red-600",
    accent: "text-rose-300",
    meter: "from-rose-300 via-red-400 to-amber-400",
  },
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getKind(spell: Spell | null | undefined): RitualKind {
  const token = `${spell?.terminal_command ?? ""} ${spell?.latin_name ?? ""} ${spell?.name ?? ""}`.toLowerCase();
  if (token.includes("alohomora")) return "alohomora";
  if (token.includes("lumos")) return "lumos";
  if (token.includes("nox")) return "nox";
  if (token.includes("wingardium")) return "wingardium";
  if (token.includes("protego")) return "protego";
  if (token.includes("expelliarmus")) return "expelliarmus";
  if (token.includes("expecto")) return "patronus";
  return "trace";
}

export default function SpellRitual({
  spell,
  onSuccess,
  onCancel,
}: {
  spell: Spell | null | undefined;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const kind = useMemo(() => getKind(spell), [spell]);
  const canonMeta = useMemo(() => getSpellCanonMeta(spell), [spell]);
  const timeoutRef = useRef<number | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const duelDirectionRef = useRef(1);
  const completedRef = useRef(false);

  const [status, setStatus] = useState<RitualStatus>("intro");
  const [trace, setTrace] = useState(0);
  const [rings, setRings] = useState([0, 0, 0]);
  const [holdingLight, setHoldingLight] = useState(false);
  const [lightCharge, setLightCharge] = useState(0);
  const [noxLights, setNoxLights] = useState([true, true, true, true]);
  const [wingardiumStep, setWingardiumStep] = useState(0);
  const [protegoPath, setProtegoPath] = useState<number[]>([]);
  const [duelMeter, setDuelMeter] = useState(10);
  const [duelHits, setDuelHits] = useState(0);
  const [duelFeedback, setDuelFeedback] = useState<"hit" | "miss" | null>(null);
  const [patronusWisps, setPatronusWisps] = useState([false, false, false]);
  const [holdingPatronus, setHoldingPatronus] = useState(false);
  const [patronusCharge, setPatronusCharge] = useState(0);

  const meta = useMemo(() => {
    switch (kind) {
      case "alohomora":
        return {
          theme: THEMES.amber,
          Icon: KeyRound,
          kicker: "רצף פתיחה",
          intro: "מיישרים את שלוש טבעות המנעול עד שכל החריצים נפגשים באותה נקודה.",
          help: "לסובב את הטבעות עד שהמנעול נענה",
        };
      case "lumos":
        return {
          theme: THEMES.sky,
          Icon: SunMedium,
          kicker: "הדלקת אור",
          intro: "האור של לומוס מבקש יד יציבה. מחזיקים את הליבה הזוהרת עד שקצה השרביט מתמלא אור.",
          help: "להחזיק ברצף עד שהזוהר מתייצב",
        };
      case "nox":
        return {
          theme: THEMES.violet,
          Icon: MoonStar,
          kicker: "שקיעת אור",
          intro: "נוקס לא מכבה בבת אחת. דועכים מוקד אחרי מוקד עד שהחדר שב לשקט.",
          help: "לכבות את כל מוקדי האור",
        };
      case "wingardium":
        return {
          theme: THEMES.emerald,
          Icon: Wand2,
          kicker: "מסלול ריחוף",
          intro: "וינגארדיום לביוסה מבקש דיוק של נוצה באוויר. עוברים דרך סימני ההרמה בסדר הנכון.",
          help: "לגעת בסימנים לפי הרצף",
        };
      case "protego":
        return {
          theme: THEMES.sky,
          Icon: Shield,
          kicker: "אריגת מגן",
          intro: "פרוטגו לא נבנה בכוח, אלא באריגה מדויקת. סוגרים את הסיגילים לפי הסדר.",
          help: "לסגור את המסלול הכחול בלי לשבור רצף",
        };
      case "expelliarmus":
        return {
          theme: THEMES.rose,
          Icon: Swords,
          kicker: "חלון דו-קרב",
          intro: "אקספליארמוס נשען על תזמון קר של זירה. משחררים את הקסם בדיוק כשהחלון נפתח.",
          help: "לפגוע פעמיים בתוך החלון הזהוב",
        };
      case "patronus":
        return {
          theme: THEMES.sky,
          Icon: Sparkles,
          kicker: "קריאת פטרונוס",
          intro: "אקספקטו פטרונום מתחיל בזיכרון חי. אוספים שלושה הבזקים זוהרים ואז מחזיקים את הליבה עד שהכישוף מתייצב.",
          help: "לאסוף זיכרונות ואז למלא את הליבה",
        };
      default:
        return {
          theme: THEMES.amber,
          Icon: BookOpen,
          kicker: "מעגל תרגול",
          intro: "עוקבים ברצף אחר מעגל התרגול עד שהכשף נטמע ביד.",
          help: "לשמור על תנועה חלקה ורציפה",
        };
    }
  }, [kind]);

  const ambient = useMemo(() => {
    switch (kind) {
      case "alohomora":
        return { orbOne: "bg-amber-300/12", orbTwo: "bg-orange-400/10", glyphs: ["✦", "⌘", "✧", "✦"], wave: "triangle" as OscillatorType, start: [392, 523], step: [466], success: [392, 523, 659] };
      case "lumos":
        return { orbOne: "bg-sky-300/14", orbTwo: "bg-cyan-300/12", glyphs: ["✦", "☼", "✧", "✦"], wave: "sine" as OscillatorType, start: [523, 659], step: [784], success: [523, 659, 880] };
      case "nox":
        return { orbOne: "bg-violet-300/12", orbTwo: "bg-indigo-400/10", glyphs: ["✦", "☾", "✧", "✦"], wave: "triangle" as OscillatorType, start: [329, 277], step: [247], success: [220, 277, 329] };
      case "wingardium":
        return { orbOne: "bg-emerald-300/12", orbTwo: "bg-teal-300/10", glyphs: ["✦", "🪶", "✧", "✦"], wave: "sine" as OscillatorType, start: [392, 494], step: [587], success: [392, 494, 659] };
      case "protego":
        return { orbOne: "bg-sky-300/12", orbTwo: "bg-blue-300/10", glyphs: ["✦", "◌", "✧", "✦"], wave: "square" as OscillatorType, start: [349, 440], step: [523], success: [349, 440, 587] };
      case "expelliarmus":
        return { orbOne: "bg-rose-300/12", orbTwo: "bg-red-300/10", glyphs: ["✦", "✶", "✧", "✦"], wave: "sawtooth" as OscillatorType, start: [294, 392], step: [523], success: [392, 494, 659] };
      case "patronus":
        return { orbOne: "bg-sky-200/12", orbTwo: "bg-cyan-200/10", glyphs: ["✦", "❈", "✧", "✦"], wave: "sine" as OscillatorType, start: [440, 554], step: [659], success: [440, 554, 740] };
      default:
        return { orbOne: "bg-amber-300/12", orbTwo: "bg-amber-500/10", glyphs: ["✦", "✧", "✦", "✶"], wave: "triangle" as OscillatorType, start: [349, 440], step: [523], success: [349, 440, 587] };
    }
  }, [kind]);

  const patronusReady = patronusWisps.every(Boolean);
  const alignedRings = rings.filter((value, index) => value === LOCK_TARGETS[index]).length;
  const progress =
    kind === "alohomora"
      ? Math.round((alignedRings / 3) * 100)
      : kind === "lumos"
      ? Math.round(lightCharge)
      : kind === "nox"
      ? Math.round((noxLights.filter((light) => !light).length / 4) * 100)
      : kind === "wingardium"
      ? Math.round((wingardiumStep / WINGARDIUM_POINTS.length) * 100)
      : kind === "protego"
      ? Math.round((protegoPath.length / PROTEGO_SEQUENCE.length) * 100)
      : kind === "expelliarmus"
      ? Math.round((duelHits / 2) * 100)
      : kind === "patronus"
      ? patronusReady
        ? Math.round(patronusCharge)
        : Math.round((patronusWisps.filter(Boolean).length / 3) * 100)
      : Math.round(trace);

  useEffect(() => {
    setStatus("intro");
    setTrace(0);
    setRings([0, 0, 0]);
    setHoldingLight(false);
    setLightCharge(0);
    setNoxLights([true, true, true, true]);
    setWingardiumStep(0);
    setProtegoPath([]);
    setDuelMeter(10);
    setDuelHits(0);
    setDuelFeedback(null);
    setPatronusWisps([false, false, false]);
    setHoldingPatronus(false);
    setPatronusCharge(0);
    duelDirectionRef.current = 1;
    completedRef.current = false;
  }, [kind, spell?.id]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const release = () => {
      setHoldingLight(false);
      setHoldingPatronus(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("mouseup", release);
    window.addEventListener("touchend", release);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mouseup", release);
      window.removeEventListener("touchend", release);
    };
  }, [onCancel]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      audioContextRef.current?.close().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (status !== "active" || kind !== "lumos") return;
    const id = window.setInterval(() => {
      setLightCharge((current) => clamp(current + (holdingLight ? 4.5 : -2.4), 0, 100));
    }, 55);
    return () => window.clearInterval(id);
  }, [holdingLight, kind, status]);

  useEffect(() => {
    if (status !== "active" || kind !== "patronus" || !patronusReady) return;
    const id = window.setInterval(() => {
      setPatronusCharge((current) => clamp(current + (holdingPatronus ? 4.6 : -2.2), 0, 100));
    }, 55);
    return () => window.clearInterval(id);
  }, [holdingPatronus, kind, patronusReady, status]);

  useEffect(() => {
    if (status !== "active" || kind !== "expelliarmus") return;
    const id = window.setInterval(() => {
      setDuelMeter((current) => {
        let next = current + duelDirectionRef.current * 3;
        if (next >= 100 || next <= 0) {
          duelDirectionRef.current *= -1;
          next = clamp(next, 0, 100);
        }
        return next;
      });
    }, 25);
    return () => window.clearInterval(id);
  }, [kind, status]);

  useEffect(() => {
    if (status === "active" && kind === "lumos" && lightCharge >= 100) complete();
  }, [kind, lightCharge, status]);

  useEffect(() => {
    if (status === "active" && kind === "patronus" && patronusCharge >= 100) complete();
  }, [kind, patronusCharge, status]);

  function playChime(notes: number[], wave: OscillatorType, gainValue = 0.018) {
    if (typeof window === "undefined" || notes.length === 0) return;

    const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const AudioCtor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioCtor) return;

    const context = audioContextRef.current ?? new AudioCtor();
    audioContextRef.current = context;
    if (context.state === "suspended") {
      void context.resume();
    }

    const now = context.currentTime;
    notes.forEach((note, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = wave;
      oscillator.frequency.value = note;
      gain.gain.setValueAtTime(gainValue, now + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + index * 0.08);
      oscillator.stop(now + index * 0.08 + 0.24);
    });
  }

  function complete() {
    if (completedRef.current) return;
    completedRef.current = true;
    setStatus("success");
    playChime(ambient.success, ambient.wave, 0.024);
    triggerAudioPlay();
    timeoutRef.current = window.setTimeout(() => onSuccess(), 1700);
  }

  function onTraceMove() {
    if (status !== "active" || kind !== "trace") return;
    setTrace((current) => {
      const next = clamp(current + 1.3, 0, 100);
      if (next >= 100) window.setTimeout(() => complete(), 80);
      return next;
    });
  }

  function rotateRing(index: number) {
    if (status !== "active" || kind !== "alohomora") return;
    playChime(ambient.step, ambient.wave, 0.014);
    let solved = false;
    setRings((current) => {
      const next = [...current];
      next[index] = (next[index] + 1) % 8;
      solved = next.every((value, ringIndex) => value === LOCK_TARGETS[ringIndex]);
      return next;
    });
    if (solved) window.setTimeout(() => complete(), 100);
  }

  function extinguish(index: number) {
    if (status !== "active" || kind !== "nox") return;
    playChime(ambient.step, ambient.wave, 0.013);
    let cleared = false;
    setNoxLights((current) => {
      if (!current[index]) return current;
      const next = [...current];
      next[index] = false;
      cleared = next.every((light) => !light);
      return next;
    });
    if (cleared) window.setTimeout(() => complete(), 120);
  }

  function advanceWingardium(index: number) {
    if (status !== "active" || kind !== "wingardium" || index !== wingardiumStep) return;
    playChime(ambient.step, ambient.wave, 0.015);
    const next = wingardiumStep + 1;
    setWingardiumStep(next);
    if (next >= WINGARDIUM_POINTS.length) window.setTimeout(() => complete(), 100);
  }

  function sealProtego(index: number) {
    if (status !== "active" || kind !== "protego") return;
    const expected = PROTEGO_SEQUENCE[protegoPath.length];
    if (index !== expected) {
      playChime([220], ambient.wave, 0.01);
      setProtegoPath([]);
      return;
    }
    playChime(ambient.step, ambient.wave, 0.014);
    const next = [...protegoPath, index];
    setProtegoPath(next);
    if (next.length >= PROTEGO_SEQUENCE.length) window.setTimeout(() => complete(), 100);
  }

  function castExpelliarmus() {
    if (status !== "active" || kind !== "expelliarmus") return;
    const precise = duelMeter >= 46 && duelMeter <= 58;
    playChime(precise ? ambient.step : [220], precise ? ambient.wave : "triangle", precise ? 0.015 : 0.01);
    setDuelFeedback(precise ? "hit" : "miss");
    window.setTimeout(() => setDuelFeedback(null), 600);
    if (!precise) return;
    const next = duelHits + 1;
    setDuelHits(next);
    if (next >= 2) window.setTimeout(() => complete(), 100);
  }

  function collectWisp(index: number) {
    if (status !== "active" || kind !== "patronus") return;
    playChime(ambient.step, ambient.wave, 0.014);
    setPatronusWisps((current) => {
      if (current[index]) return current;
      const next = [...current];
      next[index] = true;
      return next;
    });
  }

  if (!spell) return null;

  const Icon = meta.Icon;

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/92 p-4 backdrop-blur-xl"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={`ריטואל לחש: ${spell.name || ""}`}
      onClick={(event) => {
        if (event.target === event.currentTarget && status !== "success") onCancel();
      }}
    >
      <div className={`relative w-full max-w-4xl overflow-hidden rounded-[3rem] border p-6 md:p-8 ${meta.theme.shell}`}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-80">
          <div className={`absolute -right-20 top-12 h-48 w-48 rounded-full blur-3xl ${ambient.orbOne}`} />
          <div className={`absolute bottom-8 left-10 h-40 w-40 rounded-full blur-3xl ${ambient.orbTwo}`} />
          {ambient.glyphs.map((glyph, index) => (
            <span
              key={`${glyph}-${index}`}
              className={`absolute text-2xl ${meta.theme.accent}`}
              style={{
                top: ["14%", "28%", "64%", "78%"][index],
                right: ["10%", "82%", "18%", "68%"][index],
                opacity: 0.12 + index * 0.04,
                transform: `rotate(${index * 12}deg)`,
              }}
            >
              {glyph}
            </span>
          ))}
        </div>

        <button
          onClick={onCancel}
          disabled={status === "success"}
          className="absolute left-5 top-5 z-20 rounded-full bg-white/5 p-2 text-white/35 transition-all hover:bg-white/10 hover:text-white disabled:opacity-25"
          aria-label="לסגור את מעגל התרגול"
        >
          <X size={18} />
        </button>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col gap-4 text-right md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-cinzel font-black uppercase tracking-[0.24em] ${meta.theme.badge}`}>
                <Icon size={12} />
                {meta.kicker}
              </span>
              <div>
                <h2 className="font-cinzel text-3xl font-black text-white md:text-5xl">{spell.name}</h2>
                {spell.latin_name && (
                  <p className={`mt-2 font-crimson text-lg italic md:text-2xl ${meta.theme.accent}`}>{spell.latin_name}</p>
                )}
              </div>
              <p className="max-w-2xl text-sm leading-7 text-white/65 md:text-base">{meta.intro}</p>
              {canonMeta && (
                <div className="space-y-3 rounded-[1.8rem] border border-white/10 bg-black/20 px-4 py-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    <CanonBadge source={canonMeta.source} />
                  </div>
                  <div className="grid gap-2 text-sm text-white/70 sm:grid-cols-3">
                    <div>
                      <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.18em] text-white/30">תוכנית לימודים</p>
                      <p className="mt-1 leading-6 text-white/82">{canonMeta.curriculum}</p>
                    </div>
                    <div>
                      <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.18em] text-white/30">מזוהה עם</p>
                      <p className="mt-1 leading-6 text-white/82">{canonMeta.knownWith}</p>
                    </div>
                    <div>
                      <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.18em] text-white/30">מופיע ב־</p>
                      <p className="mt-1 leading-6 text-white/82">{canonMeta.appearsIn}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full max-w-xs space-y-3">
              <div className="flex items-center justify-between text-[11px] font-cinzel uppercase tracking-[0.2em] text-white/45">
                <span>מיקוד</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full bg-gradient-to-l transition-all duration-500 ${meta.theme.meter}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className={`text-xs leading-6 ${meta.theme.accent}`}>{meta.help}</p>
            </div>
          </div>

          {status === "intro" && (
            <div className="rounded-[2.4rem] border border-white/10 bg-black/20 px-6 py-12 text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <Icon size={40} className={meta.theme.accent} />
              </div>
              <button
                onClick={() => {
                  playChime(ambient.start, ambient.wave, 0.018);
                  setStatus("active");
                }}
                className={`rounded-full bg-gradient-to-r px-10 py-4 font-cinzel text-sm font-black uppercase tracking-[0.22em] transition-all active:scale-95 ${meta.theme.button}`}
              >
                לפתוח את מעגל התרגול
              </button>
            </div>
          )}

          {status === "active" && kind === "alohomora" && (
            <div className="grid gap-5 md:grid-cols-[1.05fr_0.95fr]">
              <div className="relative flex h-[320px] items-center justify-center overflow-hidden rounded-[2.2rem] border border-white/10 bg-black/25">
                <div className="absolute top-10 h-10 w-1 rounded-full bg-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.55)]" />
                {[150, 220, 290].map((size, index) => (
                  <div
                    key={size}
                    className="absolute rounded-full border border-amber-300/20"
                    style={{ width: size, height: size, transform: `rotate(${rings[index] * 45}deg)`, transition: "transform 220ms ease" }}
                  >
                    <div className="absolute left-1/2 top-[-6px] h-4 w-4 -translate-x-1/2 rounded-full bg-amber-300" />
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {[0, 1, 2].map((index) => (
                  <button
                    key={index}
                    onClick={() => rotateRing(index)}
                    className="flex w-full items-center justify-between rounded-[1.6rem] border border-white/10 bg-white/[0.04] px-4 py-4 transition-all hover:border-amber-400/30 hover:bg-amber-500/10"
                  >
                    <span className="font-cinzel font-black text-white">טבעת {index + 1}</span>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${rings[index] === LOCK_TARGETS[index] ? "border-emerald-300/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/5 text-white/55"}`}>
                      {rings[index] === LOCK_TARGETS[index] ? "מיושר" : "סובב"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {status === "active" && kind === "lumos" && (
            <div className="rounded-[2.2rem] border border-white/10 bg-black/20 px-6 py-10 text-center">
              <div className="relative mx-auto flex h-[300px] max-w-[440px] items-center justify-center overflow-hidden rounded-[2rem] border border-sky-300/15 bg-[radial-gradient(circle,rgba(255,255,255,0.18)_0%,rgba(59,130,246,0.15)_22%,rgba(2,6,23,0.98)_72%)]">
                <div
                  className="absolute rounded-full bg-sky-200/70 blur-3xl transition-all duration-300"
                  style={{ width: 120 + lightCharge * 1.6, height: 120 + lightCharge * 1.6, opacity: 0.18 + lightCharge / 180 }}
                />
                <button
                  onMouseDown={() => setHoldingLight(true)}
                  onMouseUp={() => setHoldingLight(false)}
                  onMouseLeave={() => setHoldingLight(false)}
                  onTouchStart={() => setHoldingLight(true)}
                  onTouchEnd={() => setHoldingLight(false)}
                  onTouchCancel={() => setHoldingLight(false)}
                  className={`relative z-10 flex h-32 w-32 items-center justify-center rounded-full border border-sky-100/30 bg-sky-200/10 transition-all ${holdingLight ? "scale-105 shadow-[0_0_55px_rgba(125,211,252,0.35)]" : ""}`}
                >
                  <SunMedium size={40} className="text-sky-100" />
                </button>
              </div>
            </div>
          )}

          {status === "active" && kind === "nox" && (
            <div className="grid gap-4 md:grid-cols-4">
              {noxLights.map((light, index) => (
                <button
                  key={index}
                  onClick={() => extinguish(index)}
                  disabled={!light}
                  className={`relative flex h-40 items-center justify-center overflow-hidden rounded-[2rem] border transition-all ${
                    light
                      ? "border-violet-300/20 bg-[radial-gradient(circle,rgba(196,181,253,0.24)_0%,rgba(91,33,182,0.12)_40%,rgba(3,7,18,0.96)_78%)] hover:scale-[1.02]"
                      : "border-white/10 bg-[#04070f] opacity-55"
                  }`}
                >
                  <MoonStar size={34} className={light ? "text-violet-100" : "text-white/25"} />
                </button>
              ))}
            </div>
          )}

          {status === "active" && kind === "wingardium" && (
            <div className="relative h-[340px] overflow-hidden rounded-[2.2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_42%),linear-gradient(180deg,#07111a_0%,#04070e_100%)]">
              {WINGARDIUM_POINTS.map((point, index) => (
                <button
                  key={index}
                  onClick={() => advanceWingardium(index)}
                  className={`absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-sm font-black transition-all ${
                    index < wingardiumStep
                      ? "border-emerald-300/30 bg-emerald-500/20 text-emerald-100"
                      : index === wingardiumStep
                      ? "border-emerald-200/50 bg-emerald-500/18 text-white shadow-[0_0_24px_rgba(52,211,153,0.28)]"
                      : "border-white/10 bg-white/[0.03] text-white/45"
                  }`}
                  style={{ top: point.y, left: point.x }}
                >
                  {index + 1}
                </button>
              ))}
              <div
                className="absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-4xl transition-all duration-300"
                style={{ top: WINGARDIUM_POINTS[Math.min(wingardiumStep, WINGARDIUM_POINTS.length - 1)].y, left: WINGARDIUM_POINTS[Math.min(wingardiumStep, WINGARDIUM_POINTS.length - 1)].x }}
              >
                🪶
              </div>
            </div>
          )}

          {status === "active" && kind === "protego" && (
            <div className="relative h-[340px] overflow-hidden rounded-[2.2rem] border border-white/10 bg-[radial-gradient(circle,rgba(56,189,248,0.12)_0%,rgba(2,6,23,0.96)_70%)]">
              {PROTEGO_POINTS.map((point, index) => {
                const sealed = protegoPath.includes(index);
                const expected = PROTEGO_SEQUENCE[protegoPath.length] === index;
                return (
                  <button
                    key={index}
                    onClick={() => sealProtego(index)}
                    className={`absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-sm font-black transition-all ${
                      sealed
                        ? "border-sky-200/40 bg-sky-500/20 text-sky-50"
                        : expected
                        ? "border-sky-200/35 bg-sky-500/12 text-white shadow-[0_0_22px_rgba(56,189,248,0.22)]"
                        : "border-white/10 bg-white/[0.03] text-white/40 hover:border-sky-300/25 hover:text-white/70"
                    }`}
                    style={{ top: point.y, left: point.x }}
                  >
                    {index + 1}
                  </button>
                );
              })}
              <div className="absolute inset-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300/20 bg-sky-400/5" />
            </div>
          )}

          {status === "active" && kind === "expelliarmus" && (
            <div className="space-y-5 rounded-[2.2rem] border border-white/10 bg-black/20 px-6 py-8">
              <div className="relative h-6 overflow-hidden rounded-full bg-white/10">
                <div className="absolute inset-y-0 left-[46%] w-[12%] rounded-full bg-amber-400/25" />
                <div
                  className="absolute top-1/2 h-9 w-3 -translate-y-1/2 rounded-full bg-rose-300 shadow-[0_0_18px_rgba(251,113,133,0.45)]"
                  style={{ left: `calc(${duelMeter}% - 6px)` }}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${duelFeedback === "hit" ? "border-emerald-300/25 bg-emerald-500/10 text-emerald-100" : duelFeedback === "miss" ? "border-rose-300/25 bg-rose-500/10 text-rose-100" : "border-white/10 bg-white/5 text-white/45"}`}>
                  {duelFeedback === "hit" ? "פגיעה" : duelFeedback === "miss" ? "פספוס" : `${duelHits}/2 פגיעות`}
                </span>
                <button
                  onClick={castExpelliarmus}
                  className={`rounded-full bg-gradient-to-r px-8 py-4 font-cinzel text-sm font-black uppercase tracking-[0.2em] transition-all active:scale-95 ${meta.theme.button}`}
                >
                  שחרר פריקה
                </button>
              </div>
            </div>
          )}

          {status === "active" && kind === "patronus" && (
            <div className="relative h-[360px] overflow-hidden rounded-[2.2rem] border border-white/10 bg-[radial-gradient(circle,rgba(125,211,252,0.12)_0%,rgba(2,6,23,0.98)_74%)]">
              {PATRONUS_POINTS.map((point, index) => (
                <button
                  key={index}
                  onClick={() => collectWisp(index)}
                  disabled={patronusWisps[index]}
                  className={`absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-all ${
                    patronusWisps[index]
                      ? "border-sky-200/20 bg-sky-300/10 text-sky-100/45"
                      : "border-sky-200/30 bg-sky-400/15 text-sky-50 shadow-[0_0_26px_rgba(125,211,252,0.25)] hover:scale-110"
                  }`}
                  style={{ top: point.y, left: point.x }}
                >
                  <Sparkles size={20} />
                </button>
              ))}
              <div className="absolute inset-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4">
                <button
                  onMouseDown={() => patronusReady && setHoldingPatronus(true)}
                  onMouseUp={() => setHoldingPatronus(false)}
                  onMouseLeave={() => setHoldingPatronus(false)}
                  onTouchStart={() => patronusReady && setHoldingPatronus(true)}
                  onTouchEnd={() => setHoldingPatronus(false)}
                  onTouchCancel={() => setHoldingPatronus(false)}
                  disabled={!patronusReady}
                  className={`flex h-32 w-32 items-center justify-center rounded-full border transition-all ${
                    patronusReady
                      ? holdingPatronus
                        ? "border-sky-100/40 bg-sky-200/10 shadow-[0_0_60px_rgba(125,211,252,0.38)]"
                        : "border-sky-100/30 bg-sky-100/5 shadow-[0_0_28px_rgba(125,211,252,0.2)]"
                      : "border-white/10 bg-white/[0.03] opacity-60"
                  }`}
                >
                  <Sparkles size={40} className={patronusReady ? "text-sky-100" : "text-white/35"} />
                </button>
                <p className="font-crimson text-lg italic text-white/70">
                  {patronusReady ? "עכשיו מחזיקים את הליבה עד שהפטרונוס מתייצב." : "קודם אוספים את שלושת ההבזקים הזוהרים."}
                </p>
              </div>
            </div>
          )}

          {status === "active" && kind === "trace" && (
            <div
              className="flex h-[340px] items-center justify-center rounded-[2.2rem] border border-white/10 bg-[radial-gradient(circle,rgba(245,158,11,0.1)_0%,rgba(2,6,23,0.98)_72%)]"
              onMouseMove={onTraceMove}
              onTouchMove={onTraceMove}
            >
              <div className="relative flex h-72 w-72 items-center justify-center rounded-full border border-amber-300/15">
                <div className="absolute inset-6 rounded-full border border-dashed border-amber-300/20 animate-[spin_14s_linear_infinite]" />
                <div className="text-center">
                  <Wand2 size={32} className={`mx-auto mb-4 ${meta.theme.accent}`} />
                  <p className="font-cinzel text-5xl font-black text-white">{Math.round(trace)}%</p>
                </div>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="rounded-[2.2rem] border border-white/10 bg-black/20 px-6 py-12 text-center">
              <Sparkles size={54} className={`mx-auto mb-6 ${meta.theme.accent}`} />
              <h3 className="font-cinzel text-4xl font-black text-white">הקסם הוטמע</h3>
              {spell.latin_name && (
                <p className={`mt-4 font-crimson text-2xl italic ${meta.theme.accent}`}>{spell.latin_name}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
