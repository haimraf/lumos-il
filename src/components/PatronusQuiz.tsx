"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import { X, Sparkles, Wand2 } from "lucide-react";

/**
 * LUMOS IL — שאלון הפטרונוס V1
 * 
 * שימוש בדשבורד, בתוך טאב 'spells':
 * import PatronusQuiz from "@/components/PatronusQuiz";
 * <PatronusQuiz profileId={profile.id} currentYear={profile.year} onComplete={(animal) => refreshProfile()} />
 */

// ── חיות + קשרי HP ──
const ANIMALS: Record<string, {
    emoji: string; nameHe: string; nameEn: string;
    desc: string; hpCharacter?: string; hpMessage?: string;
    color: string; rarityLabel?: string;
}> = {
    stag: {
        emoji: "🦌", nameHe: "צבי", nameEn: "Stag",
        desc: "נשמת מגן. אתה עומד בפני הסכנה כדי להגן על מי שאוהב/ת.",
        hpCharacter: "האריי פוטר וג'יימס פוטר",
        hpMessage: "הפטרונוס שלך הוא הצבי — אותו פטרונוס כמו האריי פוטר עצמו. נשמתך נושאת את אותו אור שניצח את האפלה.",
        color: "#d97706", rarityLabel: "נדיר ביותר"
    },
    otter: {
        emoji: "🦦", nameHe: "otter", nameEn: "Otter",
        desc: "שמחה, חכמה ונאמנות. אתה מוצא שמחה גם בימים הקשים ביותר.",
        hpCharacter: "הרמיוני גריינג'ר",
        hpMessage: "הפטרונוס שלך הוא ה-Otter — כמו הרמיוני גריינג'ר, המכשפה הגדולה ביותר שהוגוורטס ידעה. חכמתך היא כוחך.",
        color: "#92400e", rarityLabel: "נדיר ביותר"
    },
    wolf: {
        emoji: "🐺", nameHe: "זאב", nameEn: "Wolf",
        desc: "נאמנות שבטית ואומץ. אתה חזק יותר כשאתה עם האנשים שלך.",
        hpCharacter: "רמוס לופין",
        hpMessage: "הפטרונוס שלך הוא הזאב — כמו פרופסור לופין. תחת הכאב מסתתר לב של אריה, ונאמנות שאין כמוה.",
        color: "#6b7280", rarityLabel: "נדיר"
    },
    doe: {
        emoji: "🦌", nameHe: "צביה", nameEn: "Doe",
        desc: "אהבה נצחית. נשמתך מחוברת לאדם שהיה ועודנו הכל עבורך.",
        hpCharacter: "סבירוס סנייפ",
        hpMessage: "הפטרונוס שלך הוא הצביה — כמו סבירוס סנייפ. 'Always.' — אהבה שלא מתה לעולם, גם כשהעולם כבר לא רואה אותה.",
        color: "#f0abfc", rarityLabel: "נדיר ביותר"
    },
    hare: {
        emoji: "🐇", nameHe: "ארנב בר", nameEn: "Hare",
        desc: "חופש, יצירתיות וראיית עולם ייחודית לגמרי. אתה רואה מה שאחרים מפספסים.",
        hpCharacter: "לונה לאבגוד",
        hpMessage: "הפטרונוס שלך הוא ארנב הבר — כמו לונה לאבגוד. ייחודיותך היא המתנה הגדולה שלך.",
        color: "#c4b5fd", rarityLabel: "נדיר"
    },
    boar: {
        emoji: "🐗", nameHe: "חזיר בר", nameEn: "Boar",
        desc: "כוח טהור, נחישות ורוח עממית. אתה לא מוותר — לעולם לא.",
        hpCharacter: "ארתור ווזלי",
        hpMessage: "הפטרונוס שלך הוא חזיר הבר — כמו ארתור ווזלי. הלב הכי חם בטירה, עם כוח שאין כמותו.",
        color: "#b45309"
    },
    cat: {
        emoji: "🐱", nameHe: "חתול", nameEn: "Cat",
        desc: "עצמאות, חריפות ואינטואיציה מדויקת. אתה רואה הכל ולא מגלה כלום.",
        color: "#f97316"
    },
    eagle: {
        emoji: "🦅", nameHe: "נשר", nameEn: "Eagle",
        desc: "ראייה מן הגבוה. אתה מבין תמונה גדולה בזמן שאחרים תקועים בפרטים.",
        color: "#2563eb"
    },
    lion: {
        emoji: "🦁", nameHe: "אריה", nameEn: "Lion",
        desc: "גאווה, הגנה ואומץ לב אמיתי. אתה מוביל גם כשקשה.",
        color: "#d97706"
    },
    dolphin: {
        emoji: "🐬", nameHe: "דולפין", nameEn: "Dolphin",
        desc: "חכמה רגשית ושמחת חיים. אתה מחבר אנשים בלי מאמץ.",
        color: "#0ea5e9"
    },
    fox: {
        emoji: "🦊", nameHe: "שועל", nameEn: "Fox",
        desc: "פיקחות, יצירתיות ויכולת להסתגל לכל מצב.",
        color: "#ea580c"
    },
    owl: {
        emoji: "🦉", nameHe: "ינשוף", nameEn: "Owl",
        desc: "חכמה עתיקה ותבונה שמגיעה מבפנים. אתה יודע לשמור סודות.",
        color: "#78716c"
    },
    horse: {
        emoji: "🐴", nameHe: "סוס", nameEn: "Horse",
        desc: "חירות, כוח ורוח בלתי שבורה. אתה לא נולדת לעמוד במקום.",
        color: "#a16207"
    },
    tiger: {
        emoji: "🐯", nameHe: "נמר", nameEn: "Tiger",
        desc: "עוצמה, ריכוז ויכולת לפעול בדיוק ברגע הנכון.",
        color: "#f97316"
    },
    swan: {
        emoji: "🦢", nameHe: "ברבור", nameEn: "Swan",
        desc: "חן, עומק ויופי שמסתיר כוח אדיר מתחת לפני השטח.",
        color: "#e2e8f0"
    },
    bear: {
        emoji: "🐻", nameHe: "דוב", nameEn: "Bear",
        desc: "הגנה, חום ויציבות. כשצריך — אין כוח שיעצור אותך.",
        color: "#78350f"
    },
    dragon: {
        emoji: "🐉", nameHe: "דרקון", nameEn: "Dragon",
        desc: "נדיר ביותר. נשמה עתיקה עם כוח שאין לו גבולות. רק מעטים זוכים.",
        color: "#dc2626", rarityLabel: "אגדי"
    },
    butterfly: {
        emoji: "🦋", nameHe: "פרפר", nameEn: "Butterfly",
        desc: "שינוי, יופי ועדינות שמחזיקה בכוח שינוי אמיתי.",
        color: "#a855f7"
    },
    phoenix: {
        emoji: "🔥", nameHe: "פיניקס", nameEn: "Phoenix",
        desc: "נדיר ביותר — אגדי. אתה קם מהאפר בכל פעם. לא ניתן לשבור אותך.",
        hpCharacter: "אלבוס דמבלדור",
        hpMessage: "הפטרונוס שלך הוא הפיניקס — כמו פוקס של דמבלדור. נשמה אגדית שקמה מחדש בכל פעם. נדיר ביותר.",
        color: "#ef4444", rarityLabel: "אגדי"
    },
    serpent: {
        emoji: "🐍", nameHe: "נחש", nameEn: "Serpent",
        desc: "חכמה עמוקה, סבלנות ויכולת לראות מה שאחרים מפחדים להסתכל עליו.",
        color: "#059669"
    },
};

// ── 5 שאלות בסגנון HP אמיתי ──
const QUESTIONS = [
    {
        id: 1,
        text: "חיים הם כמו קרב - איזה סגנון קסם יוביל את הזירה?",
        icon: "⚔️",
        options: [
            { text: "זינוק קדימה גם בלי תוכנית מלאה", animals: ["stag", "lion", "dragon"] },
            { text: "הגנה על החלשים מתוך קו אחורי יציב", animals: ["doe", "bear", "boar"] },
            { text: "בחירת הדרך החכמה במקום הישירה", animals: ["fox", "serpent", "owl"] },
            { text: "איחוד הכוחות ויצירת אחדות סביב המטרה", animals: ["dolphin", "otter", "hare"] },
        ]
    },
    {
        id: 2,
        text: "איזה מקום בהוגוורטס מקסים אותך ביותר?",
        icon: "🏰",
        options: [
            { text: "מגדל האסטרונומיה — לראות הכל מלמעלה", animals: ["eagle", "phoenix", "horse"] },
            { text: "הספרייה האסורה — יש שם ידע שאסור לדעת", animals: ["owl", "serpent", "cat"] },
            { text: "החורשה האסורה — הטבע, הסכנה, הצלילים", animals: ["wolf", "tiger", "bear"] },
            { text: "המטבח — שם יש חום, אוכל, ומישהו תמיד שמח לראות אותי", animals: ["boar", "otter", "butterfly"] },
        ]
    },
    {
        id: 3,
        text: "בואבורד יוצא לפניך — מה הדבר שהכי מפחיד אותך?",
        icon: "👻",
        options: [
            { text: "לאבד את מי שאני אוהב/ת", animals: ["doe", "wolf", "swan"] },
            { text: "להיות שקוף/ה — שאיש לא יראה אותי", animals: ["hare", "butterfly", "phoenix"] },
            { text: "לכשול ברגע הכי חשוב", animals: ["stag", "lion", "tiger"] },
            { text: "שהעולם יאבד את הקסם שלו", animals: ["dragon", "fox", "dolphin"] },
        ]
    },
    {
        id: 4,
        text: "קיבלת שרביט חדש מאוליבנדר. הוא אומר שהליבה עשויה מ...",
        icon: "🪄",
        options: [
            { text: "נוצת פיניקס — חום, נדיר, ועצמאי לגמרי", animals: ["phoenix", "eagle", "stag"] },
            { text: "שיער חד-קרן — טהור ועמוק, עם כוח עצום", animals: ["swan", "doe", "horse"] },
            { text: "מיתר לב תנין — רב עוצמה, קצת מסוכן", animals: ["dragon", "tiger", "serpent"] },
            { text: "ווריד ספינקס — חכם מכל, אבל דורש כבוד", animals: ["owl", "cat", "fox"] },
        ]
    },
    {
        id: 5,
        text: "המצנפת שואלת שאלה אחת אחרונה: מה ישאר ממך אחרי מאה שנה?",
        icon: "⏳",
        options: [
            { text: "מעשה גבורה שיספרו עליו לדורות", animals: ["stag", "lion", "boar"] },
            { text: "ידע שעבר מדור לדור", animals: ["owl", "eagle", "otter"] },
            { text: "אהבה שלא ניתן לכבות", animals: ["doe", "wolf", "butterfly"] },
            { text: "שינוי שעשיתי בעולם — בשקט, ללא תרועות", animals: ["fox", "bear", "dolphin"] },
        ]
    },
];

function pickAnimal(scores: Record<string, number>): string {
    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    // Add slight randomness among top scorers
    const topScore = sorted[0][1];
    const topTied = sorted.filter(([, s]) => s >= topScore - 1);
    return topTied[Math.floor(Math.random() * topTied.length)][0];
}

interface PatronusQuizProps {
    profileId: string;
    currentYear: number;
    onComplete?: (animal: string) => void;
}

export default function PatronusQuiz({ profileId, currentYear, onComplete }: PatronusQuizProps) {
    const [supabase] = useState(() => createClient());
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const dialogRef = useRef<HTMLDivElement>(null);

    const closeModal = useCallback(() => { setIsOpen(false); reset(); }, []);

    // נועל גלילת הרקע + Escape key
    useEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
        document.addEventListener("keydown", onKey);
        // מוקד אוטומטי על הדיאלוג
        dialogRef.current?.focus();
        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("keydown", onKey);
        };
    }, [isOpen, closeModal]);
    const [phase, setPhase] = useState<"intro" | "quiz" | "reveal" | "done">("intro");
    const [qIndex, setQIndex] = useState(0);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [result, setResult] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [animateQ, setAnimateQ] = useState(false);

    const castAudioRef = useRef<HTMLAudioElement | null>(null);
    const revealAudioRef = useRef<HTMLAudioElement | null>(null);

    const playSound = (ref: React.MutableRefObject<HTMLAudioElement | null>, src: string) => {
        try {
            if (!ref.current) {
                ref.current = new Audio(src);
                ref.current.volume = 0.5;
            }
            ref.current.currentTime = 0;
            ref.current.play().catch(() => { }); // ignore autoplay blocks
        } catch { }
    };

    const handleAnswer = (animals: string[]) => {
        playSound(castAudioRef, "/sounds/spell_cast.mp3");

        const newScores = { ...scores };
        animals.forEach(a => { newScores[a] = (newScores[a] || 0) + 1; });
        setScores(newScores);

        setAnimateQ(true);
        setTimeout(() => {
            setAnimateQ(false);
            if (qIndex < QUESTIONS.length - 1) {
                setQIndex(qIndex + 1);
            } else {
                // Done — pick animal
                const animal = pickAnimal(newScores);
                setResult(animal);
                setPhase("reveal");
                setTimeout(() => {
                    playSound(revealAudioRef, "/sounds/patronus_reveal.mp3");
                }, 400);
            }
        }, 320);
    };

    const handleSave = async () => {
        if (!result) return;
        setIsSaving(true);
        await supabase.from("profiles").update({ patronus: result }).eq("id", profileId);
        setIsSaving(false);
        setPhase("done");
        onComplete?.(result);
    };

    const reset = () => {
        setPhase("intro");
        setQIndex(0);
        setScores({});
        setResult(null);
    };

    const animal = result ? ANIMALS[result] : null;
    const q = QUESTIONS[qIndex];

    if (!isOpen) {
        if (currentYear < 3) return (
            <div className="mt-6 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-center">
                <p className="font-crimson text-white/30 italic text-sm">
                    🔒 שאלון הפטרונוס פתוח לשנה 3 ומעלה
                </p>
            </div>
        );

        return (
            <div className="flex justify-center mt-6">
                <button
                    onClick={() => setIsOpen(true)}
                    className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] hover:bg-amber-500/[0.08] px-8 py-4 text-center transition-all duration-300 hover:border-amber-500/40"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/[0.06] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                    <div className="relative z-10 flex flex-col items-center gap-1.5">
                        <span className="text-2xl">🔮</span>
                        <p className="font-cinzel font-black text-amber-400 text-xs uppercase tracking-widest">גלה את הפטרונוס שלך</p>
                        <p className="font-crimson italic text-white/35 text-[11px]">Expecto Patronum — חמש שאלות</p>
                    </div>
                </button>
            </div>
        );
    }

    const modal = (
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 overflow-hidden"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="patronus-title"
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
            <style>{`
                @keyframes patronus-appear {
                    0%   { opacity: 0; transform: scale(0.3) rotate(-10deg); filter: blur(20px); }
                    60%  { opacity: 1; transform: scale(1.15) rotate(2deg); filter: blur(0); }
                    100% { transform: scale(1) rotate(0deg); }
                }
                @keyframes glow-pulse {
                    0%, 100% { box-shadow: 0 0 20px var(--ac), 0 0 60px var(--ac); }
                    50%       { box-shadow: 0 0 40px var(--ac), 0 0 100px var(--ac); }
                }
                @keyframes stars-float {
                    0%   { opacity: 0; transform: translateY(0) scale(0); }
                    50%  { opacity: 1; }
                    100% { opacity: 0; transform: translateY(-60px) scale(1.5); }
                }
                .patronus-appear { animation: patronus-appear 1.2s cubic-bezier(0.22,1,0.36,1) forwards; }
                .glow-pulse { animation: glow-pulse 2s ease-in-out infinite; }
                .q-exit { animation: q-exit 0.3s ease-in forwards; }
                @keyframes q-exit { to { opacity: 0; transform: translateY(-12px); } }
                .q-enter { animation: q-enter 0.35s 0.3s cubic-bezier(0.22,1,0.36,1) both; }
                @keyframes q-enter { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
                .star {
                    position: absolute; pointer-events: none;
                    animation: stars-float var(--dur) var(--delay) ease-out forwards infinite;
                }
            `}</style>

            <div
                ref={dialogRef}
                tabIndex={-1}
                className="relative w-full max-w-md bg-[#07090f] rounded-[2.5rem] border border-white/[0.08] overflow-y-auto max-h-[90dvh] shadow-2xl outline-none"
                onWheel={(e) => e.stopPropagation()}
            >
                {/* כפתור סגירה */}
                <button
                    onClick={closeModal}
                    aria-label="סגור שאלון"
                    className="absolute top-4 left-4 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                >
                    <X size={16} />
                </button>

                {/* ── INTRO ── */}
                {phase === "intro" && (
                    <div className="p-8 text-center space-y-6">
                        <div className="text-6xl animate-bounce">🔮</div>
                        <div>
                            <h2 id="patronus-title" className="font-cinzel text-2xl font-black text-white mb-2">שאלון הפטרונוס</h2>
                            <p className="font-crimson italic text-white/40 text-base leading-relaxed">
                                "Expecto Patronum — הטל את הלחש, וגלה איזו חיה מגנה על נשמתך"
                            </p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 text-2xl">
                            {Object.values(ANIMALS).slice(0, 10).map((a, i) => (
                                <span key={i} className="opacity-60 hover:opacity-100 transition-opacity">{a.emoji}</span>
                            ))}
                        </div>
                        <p className="text-[11px] text-white/20 font-cinzel uppercase tracking-widest">
                            {QUESTIONS.length} שאלות · 20 חיות אפשריות
                        </p>
                        <button onClick={() => setPhase("quiz")}
                            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-amber-950 font-cinzel font-black text-sm uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg">
                            הטל את הלחש ✨
                        </button>
                    </div>
                )}

                {/* ── QUIZ ── */}
                {phase === "quiz" && (
                    <div className="p-6 md:p-8">
                        {/* Progress */}
                        <div className="mb-6">
                            <div className="flex justify-between text-[10px] font-cinzel uppercase tracking-widest text-white/20 mb-2">
                                <span>שאלה {qIndex + 1} מתוך {QUESTIONS.length}</span>
                                <span>{q.icon}</span>
                            </div>
                            <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500/60 rounded-full transition-all duration-500"
                                    style={{ width: `${((qIndex + 1) / QUESTIONS.length) * 100}%` }} />
                            </div>
                        </div>

                        {/* Question */}
                        <div className={animateQ ? "q-exit" : "q-enter"}>
                            <h3 className="font-cinzel text-lg md:text-xl font-black text-white text-center mb-6 leading-snug">
                                {q.text}
                            </h3>
                            <div className="space-y-3">
                                {q.options.map((opt, i) => (
                                    <button key={i} onClick={() => handleAnswer(opt.animals)}
                                        className="w-full text-center p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-amber-500/[0.06] hover:border-amber-500/25 transition-all duration-200 font-crimson text-base text-white/70 hover:text-white active:scale-[0.99]">
                                        {opt.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── REVEAL ── */}
                {phase === "reveal" && animal && (
                    <div className="p-8 text-center space-y-6 relative overflow-hidden">
                        {/* Floating stars */}
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="star text-amber-400 text-lg"
                                style={{
                                    left: `${10 + i * 11}%`,
                                    bottom: "20%",
                                    "--dur": `${1.5 + i * 0.3}s`,
                                    "--delay": `${i * 0.15}s`,
                                } as React.CSSProperties}>✦</div>
                        ))}

                        <p className="font-cinzel text-[10px] uppercase tracking-[0.4em] text-white/30">
                            הפטרונוס שלך הוא
                        </p>

                        {/* Animal */}
                        <div className="patronus-appear relative inline-block">
                            <div className="w-32 h-32 mx-auto rounded-full flex items-center justify-center text-7xl glow-pulse"
                                style={{
                                    background: `radial-gradient(circle, ${animal.color}20 0%, transparent 70%)`,
                                    "--ac": animal.color + "80",
                                } as React.CSSProperties}>
                                {animal.emoji}
                            </div>
                            {animal.rarityLabel && (
                                <span className="absolute -top-2 -right-2 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
                                    style={{ background: animal.color, color: "#000" }}>
                                    {animal.rarityLabel}
                                </span>
                            )}
                        </div>

                        {/* Name */}
                        <div>
                            <h2 className="font-cinzel text-3xl font-black" style={{ color: animal.color }}>
                                {animal.nameHe}
                            </h2>
                            <p className="font-crimson italic text-white/30 text-sm">{animal.nameEn}</p>
                        </div>

                        {/* HP special message */}
                        {animal.hpCharacter && animal.hpMessage && (
                            <div className="rounded-2xl p-4 border text-center"
                                style={{ borderColor: animal.color + "40", background: animal.color + "08" }}>
                                <p className="text-[10px] font-cinzel uppercase tracking-widest mb-2"
                                    style={{ color: animal.color }}>
                                    ✦ כמו {animal.hpCharacter} ✦
                                </p>
                                <p className="font-crimson italic text-white/70 text-sm leading-relaxed">
                                    "{animal.hpMessage}"
                                </p>
                            </div>
                        )}

                        {/* Description */}
                        <p className="font-crimson text-white/50 text-base leading-relaxed">
                            {animal.desc}
                        </p>

                        {/* Save */}
                        <button onClick={handleSave} disabled={isSaving}
                            className="px-10 py-3 font-cinzel font-black text-sm uppercase tracking-widest rounded-2xl transition-all active:scale-95 disabled:opacity-40 mx-auto block"
                            style={{ background: animal.color, color: "#000" }}>
                            {isSaving ? "שומר..." : "שמור את הפטרונוס שלי ✨"}
                        </button>
                    </div>
                )}

                {/* ── DONE ── */}
                {phase === "done" && animal && (
                    <div className="p-8 text-center space-y-4">
                        <div className="text-5xl">{animal.emoji}</div>
                        <h2 className="font-cinzel text-xl font-black text-white">
                            הפטרונוס נשמר!
                        </h2>
                        <p className="font-crimson italic text-white/40 text-sm">
                            {animal.nameHe} יגן עליך מעתה
                        </p>
                        <button onClick={() => setIsOpen(false)}
                            className="px-10 py-3 bg-white/[0.06] hover:bg-white/10 rounded-xl text-sm font-cinzel text-white/60 transition-all mx-auto block">
                            סגור
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    if (!mounted) return null;
    return createPortal(modal, document.body);

}
