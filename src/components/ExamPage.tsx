"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { getYearFromProfile, getYearTitle, getYearLabel, getNextYearRequirements } from "@/lib/yearSystem";
import { Clock, CheckCircle2, XCircle, Sparkles, Trophy, RotateCcw } from "lucide-react";

/**
 * LUMOS IL — מערכת בחינות O.W.L / N.E.W.T
 * 
 * שימוש:
 * <ExamPage examType="owl" /> — בדף /exams/owl/page.tsx
 * <ExamPage examType="newt" /> — בדף /exams/newt/page.tsx
 */

const EXAM_CONFIG = {
    owl: {
        name: "O.W.L",
        nameHe: "בחינות O.W.L",
        subtitle: "Ordinary Wizarding Levels",
        questions: 10,
        passingScore: 70,
        timeMinutes: 20,
        badge: "🦉",
        color: "#2563eb",
        border: "border-blue-500/30",
        bg: "bg-blue-500/10",
        description: "בחינות הסטנדרט הקסום הרגיל — תנאי מעבר לשנה ה׳",
        failMessage: "לא עברת את הבחינה. תוכל לנסות שוב בעוד 7 ימים.",
        passMessage: "עברת את בחינות ה-O.W.L! הדרך לשנה ה׳ פתוחה בפניך.",
    },
    newt: {
        name: "N.E.W.T",
        nameHe: "בחינות N.E.W.T",
        subtitle: "Nastily Exhausting Wizarding Tests",
        questions: 15,
        passingScore: 80,
        timeMinutes: 30,
        badge: "⚡",
        color: "#dc2626",
        border: "border-red-500/30",
        bg: "bg-red-500/10",
        description: "הבחינות המתקדמות והמאתגרות ביותר — תנאי מעבר לשנה ו׳",
        failMessage: "לא עברת את הבחינה. תוכל לנסות שוב בעוד 7 ימים.",
        passMessage: "עברת את בחינות ה-N.E.W.T! אתה בין הקוסמים המובחרים ביותר.",
    }
};

type ExamType = "owl" | "newt";
type Phase = "intro" | "exam" | "result";

interface Question {
    id: string;
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
}

export default function ExamPage({ examType }: { examType: ExamType }) {
    const supabase = createClient();
    const router = useRouter();
    const config = EXAM_CONFIG[examType];

    const [phase, setPhase] = useState<Phase>("intro");
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [selected, setSelected] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(config.timeMinutes * 60);
    const [score, setScore] = useState(0);
    const [passed, setPassed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [lastAttempt, setLastAttempt] = useState<any>(null);
    const [canRetry, setCanRetry] = useState(true);
    const [alreadyPassed, setAlreadyPassed] = useState(false);
    const [notEligible, setNotEligible] = useState<{
        currentYear: number;
        yearTitle: string;
        yearLabel: string;
        requiredYear: number;
        monthsLeft?: number;
        postsLeft?: number;
    } | null>(null);

    // Check eligibility
    useEffect(() => {
        const check = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/auth'); return; }

            const { data: profile } = await supabase
                .from('profiles')
                .select('*, post_count:forum_posts(count)')
                .eq('id', user.id)
                .single();

            const currentYear = getYearFromProfile(profile);
            const requiredYear = examType === 'owl' ? 5 : 6;

            if (currentYear < requiredYear) {
                const req = getNextYearRequirements(profile);
                setNotEligible({
                    currentYear,
                    yearTitle: getYearTitle(currentYear),
                    yearLabel: getYearLabel(currentYear),
                    requiredYear,
                    monthsLeft: req?.months,
                    postsLeft: req?.posts,
                });
                return;
            }

            if (examType === 'owl' && profile?.owl_passed) { setAlreadyPassed(true); return; }
            if (examType === 'newt' && profile?.newt_passed) { setAlreadyPassed(true); return; }

            // Check last attempt
            const { data: lastResult } = await supabase
                .from('exam_results')
                .select('*')
                .eq('user_id', user.id)
                .eq('exam_type', examType)
                .order('attempted_at', { ascending: false })
                .limit(1)
                .single();

            if (lastResult && !lastResult.passed) {
                setLastAttempt(lastResult);
                const nextAttempt = new Date(lastResult.next_attempt_at);
                if (nextAttempt > new Date()) setCanRetry(false);
            }
        };
        check();
    }, [examType, supabase, router]);

    // Load questions
    const loadQuestions = useCallback(async () => {
        setIsLoading(true);
        const { data } = await supabase
            .from('exam_questions')
            .select('*')
            .eq('exam_type', examType)
            .order('random()' as any)
            .limit(config.questions);
        if (data) setQuestions(data);
        setIsLoading(false);
    }, [examType, config.questions, supabase]);

    // Timer
    useEffect(() => {
        if (phase !== 'exam') return;
        if (timeLeft <= 0) { submitExam(); return; }
        const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
        return () => clearInterval(t);
    }, [phase, timeLeft]);

    const startExam = async () => {
        await loadQuestions();
        setPhase("exam");
        setTimeLeft(config.timeMinutes * 60);
        setCurrentQ(0);
        setAnswers({});
        setSelected(null);
    };

    const handleAnswer = (option: string) => {
        setSelected(option);
        setTimeout(() => {
            setAnswers(prev => ({ ...prev, [currentQ]: option }));
            setSelected(null);
            if (currentQ < questions.length - 1) {
                setCurrentQ(prev => prev + 1);
            } else {
                submitExam({ ...answers, [currentQ]: option });
            }
        }, 600);
    };

    const submitExam = async (finalAnswers?: Record<number, string>) => {
        const ans = finalAnswers || answers;
        let correct = 0;
        questions.forEach((q, i) => {
            if (ans[i] === q.correct_answer) correct++;
        });

        const scorePercent = Math.round((correct / questions.length) * 100);
        const didPass = scorePercent >= config.passingScore;

        setScore(scorePercent);
        setPassed(didPass);
        setPhase("result");

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const nextAttempt = new Date();
        nextAttempt.setDate(nextAttempt.getDate() + 7);

        await supabase.from('exam_results').insert({
            user_id: user.id,
            exam_type: examType,
            score: scorePercent,
            total: questions.length,
            passed: didPass,
            next_attempt_at: didPass ? null : nextAttempt.toISOString(),
        });

        if (didPass) {
            const updateData: any = {};
            updateData[`${examType}_passed`] = true;
            updateData[`${examType}_passed_at`] = new Date().toISOString();
            await supabase.from('profiles').update(updateData).eq('id', user.id);
        }
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const q = questions[currentQ];
    const options = q ? [
        { key: 'a', text: q.option_a },
        { key: 'b', text: q.option_b },
        { key: 'c', text: q.option_c },
        { key: 'd', text: q.option_d },
    ] : [];

    return (
        <div className="min-h-screen bg-[#060910] text-white flex items-center justify-center p-4" dir="rtl">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=IM+Fell+English:ital@0;1&display=swap');

                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .fade-in { animation: fade-in 0.4s cubic-bezier(0.22,1,0.36,1) forwards; }

                @keyframes correct-flash {
                    0%, 100% { background: transparent; }
                    50% { background: rgba(34,197,94,0.2); }
                }
                .correct { animation: correct-flash 0.6s ease; }

                @keyframes wrong-flash {
                    0%, 100% { background: transparent; }
                    50% { background: rgba(239,68,68,0.2); }
                }
                .wrong { animation: wrong-flash 0.6s ease; }

                .parchment {
                    background: radial-gradient(ellipse at 20% 10%, #f7edd5 0%, #e8d5a3 45%, #cdb273 100%);
                    box-shadow: 0 0 0 1px #7a5c14, 0 0 0 4px #f0e0b0, 0 0 0 5px #7a5c14, 12px 16px 50px rgba(0,0,0,0.6);
                }
            `}</style>

            {/* ── NOT ELIGIBLE ── */}
            {notEligible && (
                <div className="parchment rounded-sm p-8 md:p-12 fade-in text-center space-y-6"
                    style={{ maxWidth: '520px', width: '100%', margin: '0 auto' }}>
                    <div style={{ fontSize: "3.5rem" }}>🔒</div>
                    <div>
                        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: "1.6rem", fontWeight: 900, color: "#2c1304" }}>
                            הגישה לבחינה חסומה
                        </h1>
                        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: "#5e3a10", fontSize: "0.9rem", marginTop: "0.4rem" }}>
                            {config.nameHe} דורשות להיות בשנה {notEligible.requiredYear === 5 ? "ה׳" : "ו׳"}
                        </p>
                    </div>

                    <div className="p-5 rounded-lg border border-amber-900/25 bg-amber-900/5 space-y-1">
                        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: "#7a5a18", fontSize: "0.75rem" }}>
                            השנה הנוכחית שלך
                        </p>
                        <div style={{
                            fontFamily: "'UnifrakturMaguntia', cursive, serif",
                            fontSize: "2.4rem",
                            color: "#2c1304",
                            lineHeight: 1.2,
                        }}>
                            {notEligible.yearTitle}
                        </div>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: "0.8rem", color: "#7a5a18" }}>
                            שנה {notEligible.yearLabel}
                        </div>
                    </div>

                    {(notEligible.monthsLeft || notEligible.postsLeft) ? (
                        <div className="space-y-2">
                            <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: "#5e3a10", fontSize: "0.85rem" }}>
                                כדי להתקדם לשנה הבאה, נדרש עוד:
                            </p>
                            <div className="flex justify-center gap-6">
                                {(notEligible.monthsLeft ?? 0) > 0 && (
                                    <div className="text-center">
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: "1.6rem", fontWeight: 900, color: "#2c1304" }}>
                                            {notEligible.monthsLeft}
                                        </div>
                                        <div style={{ fontFamily: "'IM Fell English', serif", fontSize: "0.7rem", color: "#7a5a18" }}>
                                            חודשים
                                        </div>
                                    </div>
                                )}
                                {(notEligible.postsLeft ?? 0) > 0 && (
                                    <div className="text-center">
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: "1.6rem", fontWeight: 900, color: "#2c1304" }}>
                                            {notEligible.postsLeft}
                                        </div>
                                        <div style={{ fontFamily: "'IM Fell English', serif", fontSize: "0.7rem", color: "#7a5a18" }}>
                                            פוסטים
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}

                    <button
                        onClick={() => router.push('/dashboard')}
                        className="w-full py-4 rounded-lg font-bold text-amber-950 transition-all active:scale-95"
                        style={{
                            background: "#d97706",
                            fontFamily: "'Cinzel', serif",
                            fontSize: "0.9rem",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                        }}
                    >
                        חזרה לדשבורד
                    </button>
                </div>
            )}

            {/* ── INTRO ── */}
            {!notEligible && phase === "intro" && (
                <div className="parchment rounded-sm p-8 md:p-12 fade-in text-center space-y-6"
                    style={{ maxWidth: '520px', width: '100%', margin: '0 auto' }}>
                    <div className="text-6xl">{config.badge}</div>
                    <div>
                        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: "2rem", fontWeight: 900, color: "#2c1304" }}>
                            {config.nameHe}
                        </h1>
                        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: "#5e3a10", fontSize: "0.85rem" }}>
                            {config.subtitle}
                        </p>
                    </div>

                    <p style={{ fontFamily: "'IM Fell English', serif", color: "#54340f", fontSize: "0.95rem", lineHeight: 1.7 }}>
                        {config.description}
                    </p>

                    <div className="grid grid-cols-3 gap-4 py-4 border-y border-amber-900/20">
                        {[
                            { label: "שאלות", value: config.questions },
                            { label: "זמן", value: `${config.timeMinutes} דק׳` },
                            { label: "ציון מעבר", value: `${config.passingScore}%` },
                        ].map(stat => (
                            <div key={stat.label} className="text-center">
                                <div style={{ fontFamily: "'Cinzel', serif", fontSize: "1.5rem", fontWeight: 900, color: "#2c1304" }}>
                                    {stat.value}
                                </div>
                                <div style={{ fontFamily: "'IM Fell English', serif", fontSize: "0.7rem", color: "#7a5a18" }}>
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {alreadyPassed && (
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-700 text-sm">
                            ✅ כבר עברת בחינה זו בהצלחה!
                        </div>
                    )}

                    {!canRetry && lastAttempt && (
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 text-sm">
                            ⏳ תוכל לנסות שוב בתאריך:{" "}
                            {new Date(lastAttempt.next_attempt_at).toLocaleDateString("he-IL")}
                        </div>
                    )}

                    {!alreadyPassed && canRetry && (
                        <button
                            onClick={startExam}
                            disabled={isLoading}
                            className="w-full py-4 rounded-lg font-bold text-white transition-all active:scale-95"
                            style={{
                                background: config.color,
                                fontFamily: "'Cinzel', serif",
                                fontSize: "1rem",
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                            }}
                        >
                            {isLoading ? "טוען שאלות..." : `התחל את הבחינה ${config.badge}`}
                        </button>
                    )}

                    <button onClick={() => router.push('/dashboard')} className="text-sm text-amber-900/50 hover:text-amber-900 transition-colors" style={{ fontFamily: "'Cinzel', serif" }}>
                        חזרה לדשבורד
                    </button>
                </div>
            )}

            {/* ── EXAM ── */}
            {!notEligible && phase === "exam" && q && (
                <div className="parchment rounded-sm p-6 md:p-10 fade-in space-y-6"
                    style={{ maxWidth: '520px', width: '100%', margin: '0 auto' }}>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-amber-900/20 pb-4">
                        <div className="flex items-center gap-2" style={{ fontFamily: "'Cinzel', serif", color: "#2c1304" }}>
                            <Clock size={16} />
                            <span className={`font-bold text-lg ${timeLeft < 60 ? 'text-red-700' : ''}`}>
                                {formatTime(timeLeft)}
                            </span>
                        </div>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: "0.75rem", color: "#7a5a18" }}>
                            שאלה {currentQ + 1} מתוך {questions.length}
                        </div>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: "1rem", color: "#2c1304" }}>
                            {config.badge} {config.name}
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="h-1.5 bg-amber-900/20 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${((currentQ + 1) / questions.length) * 100}%`, background: config.color }}
                        />
                    </div>

                    {/* Question */}
                    <h2 style={{ fontFamily: "'IM Fell English', serif", fontSize: "1.2rem", color: "#1e0e04", lineHeight: 1.6 }}>
                        {q.question}
                    </h2>

                    {/* Options */}
                    <div className="space-y-3">
                        {options.map(opt => {
                            const isSelected = selected === opt.key;
                            return (
                                <button
                                    key={opt.key}
                                    onClick={() => !selected && handleAnswer(opt.key)}
                                    disabled={!!selected}
                                    className={`w-full text-right p-4 rounded-lg border transition-all duration-200 ${isSelected
                                            ? 'border-amber-600 bg-amber-500/20'
                                            : 'border-amber-900/20 bg-amber-900/5 hover:bg-amber-900/10 hover:border-amber-600/40'
                                        }`}
                                    style={{ fontFamily: "'IM Fell English', serif", color: "#1e0e04", fontSize: "1rem" }}
                                >
                                    <span className="font-bold ml-3 text-amber-800">
                                        {opt.key.toUpperCase()}.
                                    </span>
                                    {opt.text}
                                </button>
                            );
                        })}
                    </div>

                    <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: "#9a7020", fontSize: "0.75rem", textAlign: "center" }}>
                        בחר תשובה כדי להמשיך — אין חזרה אחורה
                    </p>
                </div>
            )}

            {/* ── RESULT ── */}
            {!notEligible && phase === "result" && (
                <div className="parchment rounded-sm p-8 md:p-12 fade-in text-center space-y-6"
                    style={{ maxWidth: '520px', width: '100%', margin: '0 auto' }}>
                    <div className="text-6xl">{passed ? "🎓" : "📜"}</div>

                    <div>
                        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: "1.8rem", fontWeight: 900, color: passed ? "#1a5c1a" : "#7a1a0a" }}>
                            {passed ? "עברת בהצלחה!" : "לא עברת הפעם"}
                        </h2>
                        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: "#5e3a10", marginTop: "0.5rem" }}>
                            {passed ? config.passMessage : config.failMessage}
                        </p>
                    </div>

                    {/* Score */}
                    <div className="p-6 rounded-lg border border-amber-900/20 bg-amber-900/5 space-y-3">
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: "3rem", fontWeight: 900, color: passed ? "#1a5c1a" : "#7a1a0a" }}>
                            {score}%
                        </div>
                        <div className="h-3 bg-amber-900/20 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{
                                    width: `${score}%`,
                                    background: passed ? "#16a34a" : "#dc2626",
                                }}
                            />
                        </div>
                        <p style={{ fontFamily: "'IM Fell English', serif", color: "#54340f", fontSize: "0.85rem" }}>
                            {passed
                                ? `${config.badge} קיבלת badge "${config.name}" בפרופיל שלך!`
                                : `נדרש ${config.passingScore}% לעבור`}
                        </p>
                    </div>

                    {passed && (
                        <div className="p-4 rounded-lg border border-green-600/30 bg-green-500/10">
                            <p style={{ fontFamily: "'Cinzel', serif", color: "#1a5c1a", fontSize: "0.9rem", fontWeight: "bold" }}>
                                {config.badge} {config.name} — הושג!
                            </p>
                            <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: "#2d6a2d", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                                Badge זה מוצג בפרופיל ובפורומים שלך
                            </p>
                        </div>
                    )}

                    <button
                        onClick={() => router.push('/dashboard')}
                        className="w-full py-4 rounded-lg font-bold text-amber-950 transition-all active:scale-95"
                        style={{
                            background: "#d97706",
                            fontFamily: "'Cinzel', serif",
                            fontSize: "0.9rem",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                        }}
                    >
                        חזרה לדשבורד
                    </button>
                </div>
            )}
        </div>
    );
}