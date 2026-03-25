"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Sparkles, CheckCircle2, Coins, Star, Swords, Zap, Shield, BookOpen } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useOwlMail } from "@/components/OwlMail";

export default function QuizModal({ onClose }: { onClose: () => void }) {
    const supabase = createClient();
    const { profile } = useAuth();
    const { sendOwl } = useOwlMail();
    const [mounted, setMounted] = useState(false);

    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [earnedPoints, setEarnedPoints] = useState(0);
    const [earnedGalleons, setEarnedGalleons] = useState(0);
    const [answersHistory, setAnswersHistory] = useState<{ question_id: string; selected_answer: string }[]>([]);
    const [isFinished, setIsFinished] = useState(false);

    // ✅ נדרש ל-createPortal
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = "unset";
            document.removeEventListener("keydown", onKey);
        };
    }, [onClose]);

    const startQuiz = async (selectedDifficulty: 'easy' | 'medium' | 'hard') => {
        setDifficulty(selectedDifficulty);
        setLoading(true);
        try {
            const { data: qData, error } = await supabase
                .from("trivia_questions")
                .select("*")
                .eq("is_active", true)
                .eq("difficulty", selectedDifficulty);

            if (!error && qData && qData.length > 0) {
                const shuffled = qData.sort(() => 0.5 - Math.random()).slice(0, 5);
                setQuestions(shuffled);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (option: string) => {
        if (selectedAnswer !== null) return;
        setSelectedAnswer(option);

        const currentQuestion = questions[currentStep];
        const isCorrect = option === currentQuestion.correct_answer;

        setAnswersHistory(prev => [...prev, { question_id: currentQuestion.id, selected_answer: option }]);

        if (isCorrect) {
            setScore(prev => prev + 1);
            setEarnedPoints(prev => prev + (currentQuestion.points_reward || 0));
            setEarnedGalleons(prev => prev + (currentQuestion.galleons_reward || 0));
        }

        setTimeout(() => {
            if (currentStep < questions.length - 1) {
                setCurrentStep(prev => prev + 1);
                setSelectedAnswer(null);
            } else {
                setIsFinished(true);
                sendOwl("החידון הושלם!", "סיימת את אתגר הטריוויה בהצלחה!", "magic");
            }
        }, 1200);
    };

    useEffect(() => {
        if (!isFinished || !profile?.id || answersHistory.length === 0) return;

        const saveResultsToDB = async () => {
            try {
                const { data, error } = await supabase.rpc("submit_arcade_quiz_secure", {
                    p_answers: answersHistory,
                });

                if (error) throw error;

                if (data?.success === false && data?.reason === "already_claimed") {
                    setEarnedPoints(0);
                    setEarnedGalleons(0);
                    sendOwl("כבר סיימת חידון היום", "פרסי החידון היומיים כבר נאספו היום.", "info");
                    return;
                }

                setEarnedPoints(data?.points ?? 0);
                setEarnedGalleons(data?.galleons ?? 0);
            } catch (error) {
                console.error("Failed to save wizarding results:", error);
                sendOwl("שגיאת חידון", "לא הצלחנו לשמור את תוצאות החידון הפעם.", "error");
            }
        };

        saveResultsToDB();
    }, [isFinished]); // eslint-disable-line react-hooks/exhaustive-deps

    const difficultyColor = {
        easy: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-300", ring: "focus:ring-emerald-500" },
        medium: { border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-300", ring: "focus:ring-amber-500" },
        hard: { border: "border-red-500/30", bg: "bg-red-500/10", text: "text-red-300", ring: "focus:ring-red-500" },
    };

    // ✅ המודאל עצמו
    const modal = (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quiz-modal-title"
            className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto"
            dir="rtl"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={difficulty === null ? "selection" : isFinished ? "end" : "quiz"}
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="relative w-full overflow-hidden rounded-[2.5rem] border border-amber-500/20 bg-[#080d1a] p-6 shadow-[0_0_80px_rgba(245,158,11,0.2)] md:p-8 my-auto"
                    style={{ maxWidth: "480px" }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* אור רקע */}
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.04] to-transparent" />
                        <div className="absolute left-1/2 top-0 h-48 w-[80%] -translate-x-1/2 rounded-b-[3rem] bg-amber-400/[0.03] blur-3xl" />
                    </div>

                    <div className="relative z-10">
                        {/* כפתור סגירה */}
                        <div className="absolute top-0 left-0">
                            <button
                                onClick={onClose}
                                aria-label="סגור חידון"
                                className="rounded-full bg-white/5 p-2 text-white/40 transition-all hover:bg-white/10 hover:text-amber-400 hover:rotate-90"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* מסך 1: בחירת רמה */}
                        {!difficulty ? (
                            <div className="pt-8 pb-4 text-center">
                                <Sparkles size={30} className="mx-auto mb-4 text-amber-500/60" />
                                <h2 id="quiz-modal-title" className="font-cinzel text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-100 to-amber-500">
                                    אתגר הטריוויה
                                </h2>
                                <p className="mt-2 font-crimson text-lg text-white/55 italic">
                                    בחר את נתיב הקסם שלך. ככל שהרמה גבוהה יותר, כך הפרסים גדלים.
                                </p>

                                <div className="mt-8 flex flex-col gap-3">
                                    {([
                                        { key: 'easy', label: 'תלמידי שנה ראשונה', sub: 'רמה קלה • 10 נק׳ לשאלה', Icon: BookOpen },
                                        { key: 'medium', label: 'קוסמים מוסמכים', sub: 'רמה בינונית • 20 נק׳ לשאלה', Icon: Zap },
                                        { key: 'hard', label: 'מבחני הילאים', sub: 'רמה קשה • 30 נק׳ לשאלה', Icon: Shield },
                                    ] as const).map(({ key, label, sub, Icon }) => {
                                        const c = difficultyColor[key];
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => startQuiz(key)}
                                                className={`group flex items-center gap-5 rounded-2xl border p-5 text-right transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 ${c.border} ${c.bg} ${c.ring}`}
                                            >
                                                <div className={`shrink-0 rounded-full p-3 bg-white/5 ${c.text}`}>
                                                    <Icon size={22} />
                                                </div>
                                                <div>
                                                    <h3 className="font-cinzel text-lg font-bold text-white/90">{label}</h3>
                                                    <p className="font-assistant text-sm text-white/45 mt-0.5">{sub}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : loading ? (
                            <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
                                <div className="h-12 w-12 animate-spin rounded-full border-t-4 border-amber-500" />
                                <p className="font-cinzel text-sm uppercase tracking-widest text-amber-500/50 animate-pulse">מזמן שאלות...</p>
                            </div>
                        ) : !isFinished && questions.length > 0 ? (
                            <div className="pt-6">
                                {/* ✅ פס התקדמות */}
                                <div className="mb-6 mt-4 space-y-3">
                                    <div className="flex items-center justify-between text-[10px] font-cinzel font-black uppercase tracking-widest text-white/30">
                                        <span>שאלה {currentStep + 1} מתוך {questions.length}</span>
                                        <span className={difficultyColor[difficulty!]?.text}>
                                            {difficulty === "easy" ? "קלה" : difficulty === "medium" ? "בינונית" : "קשה"}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full bg-amber-500"
                                            initial={{ width: `${(currentStep / questions.length) * 100}%` }}
                                            animate={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                        />
                                    </div>

                                    {/* פרסים לשאלה */}
                                    <div className="flex items-center gap-3 justify-end">
                                        <span className="flex items-center gap-1 font-assistant text-[11px] font-bold text-emerald-300">
                                            <Star size={11} /> {questions[currentStep]?.points_reward} נק׳
                                        </span>
                                        <span className="h-3 w-px bg-white/15" />
                                        <span className="flex items-center gap-1 font-assistant text-[11px] font-bold text-amber-300">
                                            <Coins size={11} /> {questions[currentStep]?.galleons_reward} גליאון
                                        </span>
                                    </div>
                                </div>

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentStep}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.25 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center py-2 border-b border-white/6 pb-6">
                                            <h3 className="font-crimson text-2xl md:text-3xl italic leading-relaxed text-white/90">
                                                "{questions[currentStep]?.question}"
                                            </h3>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2.5">
                                            {questions[currentStep]?.options.map((option: string, i: number) => {
                                                const isCorrect = option === questions[currentStep].correct_answer;
                                                const isSelected = selectedAnswer === option;

                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleAnswer(option)}
                                                        disabled={selectedAnswer !== null}
                                                        className={`relative overflow-hidden rounded-xl border p-4 text-right transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500
                                                            ${selectedAnswer === null
                                                                ? "border-white/8 bg-white/4 hover:-translate-y-0.5 hover:border-amber-500/40 hover:bg-amber-500/8"
                                                                : isCorrect
                                                                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.12)]"
                                                                    : isSelected
                                                                        ? "border-red-500/50 bg-red-500/10 text-red-400"
                                                                        : "border-white/5 opacity-30"
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between font-assistant font-bold text-base">
                                                            <span>{option}</span>
                                                            {selectedAnswer !== null && isCorrect && (
                                                                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        ) : questions.length === 0 ? (
                            <div className="text-center py-12 space-y-4">
                                <Sparkles size={36} className="text-white/20 mx-auto" />
                                <h3 className="text-xl font-cinzel text-white/55">טרם נוספו שאלות לרמה זו</h3>
                                <button onClick={() => setDifficulty(null)} className="mt-4 font-assistant text-amber-500 underline hover:text-amber-400 text-sm">
                                    חזור לבחירת מסלול
                                </button>
                            </div>
                        ) : (
                            /* מסך סיום */
                            <motion.div
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center space-y-8 py-8"
                            >
                                <div className="relative">
                                    <div className="absolute inset-0 scale-150 rounded-full bg-amber-400/15 blur-3xl" />
                                    <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 shadow-[0_0_50px_rgba(245,158,11,0.25)]">
                                        <Trophy size={48} className="text-amber-400" />
                                    </div>
                                </div>

                                <div className="text-center w-full">
                                    <h2 className="font-cinzel text-4xl font-black uppercase tracking-[0.1em] text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-700">
                                        הקסם הושלם
                                    </h2>
                                    <p className="mt-4 font-assistant text-lg text-white/70">
                                        צברת <span className="text-2xl font-black text-amber-400 mx-1">{score}</span>
                                        <span className="text-white/50"> / {questions.length} תשובות נכונות</span>
                                    </p>

                                    <div className="flex items-center justify-center gap-4 mt-6 pt-5 border-t border-white/8">
                                        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-500/20">
                                            <Star size={18} />
                                            <span className="font-bold text-xl">+{earnedPoints} נק׳</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 px-4 py-2.5 rounded-xl border border-amber-500/20">
                                            <Coins size={18} />
                                            <span className="font-bold text-xl">+{earnedGalleons}</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={onClose}
                                    className="group w-full flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-amber-400/40 hover:bg-amber-500 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]"
                                >
                                    <span className="font-cinzel text-lg font-black tracking-wide text-white/90 transition-colors group-hover:text-amber-950">
                                        חזרה להיכל הגביע
                                    </span>
                                </button>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );

    // ✅ createPortal — מרנדר מחוץ לעץ ה-DOM, מנצח כל z-index
    if (!mounted) return null;
    return createPortal(modal, document.body);
}
