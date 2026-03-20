"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    ScrollText, Sparkles, ShieldAlert, BookOpen, Wand2,
    Image as ImageIcon, ChevronRight, AlertTriangle,
    ShieldCheck, Zap, Users
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => <div className="h-64 w-full bg-white/5 animate-pulse rounded-2xl" />
});
import 'react-quill-new/dist/quill.snow.css';

export default function CreateStoryPage() {
    const router = useRouter();
    const supabase = createClient();
    const { sendOwl } = useOwlMail();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        house_theme: "Neutral",
        rating: "PG-13",
        cover_url: ""
    });

    const houseStyles: Record<string, { border: string, glow: string, bg: string, icon: string }> = {
        Gryffindor: { border: "border-red-600/50", glow: "rgba(185,28,28,0.4)", bg: "bg-red-950/20", icon: "🦁" },
        Slytherin: { border: "border-emerald-600/50", glow: "rgba(5,150,105,0.4)", bg: "bg-emerald-950/20", icon: "🐍" },
        Ravenclaw: { border: "border-blue-600/50", glow: "rgba(37,99,235,0.4)", bg: "bg-blue-950/20", icon: "🦅" },
        Hufflepuff: { border: "border-amber-400/50", glow: "rgba(251,191,36,0.4)", bg: "bg-amber-950/20", icon: "🦡" },
        Neutral: { border: "border-white/10", glow: "rgba(245,158,11,0.1)", bg: "bg-white/[0.02]", icon: "🏰" }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            sendOwl("לחש חסר", "לכל סיפור חייב להיות שם כדי להירשם בדברי הימים.", "error");
            return;
        }

        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            sendOwl("גישה נחסמה", "רק קוסמים רשומים יכולים לפרסם בספרייה.", "error");
            router.push('/login');
            return;
        }

        const { data, error } = await supabase
            .from('stories')
            .insert([{
                author_id: user.id,
                title: formData.title,
                description: formData.description,
                house_theme: formData.house_theme,
                rating: formData.rating,
                cover_url: formData.cover_url.trim(),
                is_published: true,
                views_count: 0
            }])
            .select().single();

        if (error) {
            sendOwl("הדיו נשפך", error.message, "error");
        } else {
            sendOwl("נרשם בהצלחה!", "הסיפור שלך קיבל מקום של כבוד בספרייה.", "success");
            router.push(`/library/${data.id}`);
        }
        setIsSubmitting(false);
    };

    const currentStyle = houseStyles[formData.house_theme];

    return (
        <div className="relative min-h-screen py-24 px-6 bg-[#060608] overflow-hidden selection:bg-amber-500/30" dir="rtl">

            {/* הילת הבית */}
            <motion.div
                key={formData.house_theme}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.3, scale: 1 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-[140px] pointer-events-none z-0"
                style={{ backgroundColor: currentStyle.glow }}
            />

            {/* ✅ תיקון רוחב */}
            <div className="relative z-10 text-right" style={{ maxWidth: '56rem', marginLeft: 'auto', marginRight: 'auto' }}>

                {/* Header */}
                <header className="mb-16">
                    <Link
                        href="/library"
                        className="inline-flex items-center gap-2 text-amber-500/60 hover:text-amber-400 transition-all text-[11px] font-black uppercase tracking-[0.4em] mb-8 group"
                    >
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        חזרה לספרייה
                    </Link>
                    <h1 className="font-cinzel text-5xl md:text-7xl font-black text-amber-500 tracking-tighter uppercase drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                        רישום סיפור בטירה
                    </h1>
                    <div className="mt-4 h-px bg-gradient-to-l from-amber-500/40 via-amber-500/10 to-transparent" />
                </header>

                <motion.form
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    onSubmit={handleSubmit}
                    className={`glass-panel p-8 md:p-12 rounded-[3rem] border-2 transition-all duration-1000 space-y-10 bg-black/40 backdrop-blur-3xl shadow-2xl ${currentStyle.border}`}
                >
                    {/* בחירת בית */}
                    <div className="space-y-4">
                        <label className="text-[11px] text-amber-400/80 uppercase tracking-[0.4em] font-black flex items-center gap-2">
                            <Sparkles size={13} className="text-amber-500/70" />
                            בחר את רוח הסיפור (בית)
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {Object.entries(houseStyles).map(([key, style]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, house_theme: key })}
                                    className={`relative p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 overflow-hidden ${formData.house_theme === key
                                            ? `${style.border} ${style.bg} scale-105 shadow-lg`
                                            : 'border-white/8 bg-white/[0.02] hover:bg-white/5 opacity-50 hover:opacity-90'
                                        }`}
                                >
                                    {formData.house_theme === key && (
                                        <motion.div layoutId="houseGlow" className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
                                    )}
                                    <span className="text-2xl">{style.icon}</span>
                                    <span className="font-cinzel text-[10px] font-bold tracking-widest text-white/80">{key}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* כותרת + כריכה */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[11px] text-amber-400/80 uppercase tracking-[0.4em] font-black flex items-center gap-2">
                                <ScrollText size={13} className="text-amber-500/70" />
                                כותרת היצירה
                            </label>
                            <input
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="למשל: סודות המרתפים האפלים..."
                                className="w-full bg-white/5 border border-white/15 hover:border-white/25 focus:border-amber-500/50 rounded-2xl p-5 text-white outline-none transition-all font-cinzel text-xl text-right placeholder:text-white/25"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] text-amber-400/80 uppercase tracking-[0.4em] font-black flex items-center gap-2">
                                <ImageIcon size={13} className="text-amber-500/70" />
                                כריכה (קישור לתמונה)
                            </label>
                            <input
                                value={formData.cover_url}
                                onChange={e => setFormData({ ...formData, cover_url: e.target.value })}
                                placeholder="https://image-link.com/cover.jpg"
                                className="w-full bg-white/5 border border-white/15 hover:border-white/25 focus:border-amber-500/50 rounded-2xl p-5 text-white/80 outline-none transition-all font-mono text-xs text-left placeholder:text-white/25"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    {/* סיווג בטיחות */}
                    <div className="space-y-4">
                        <label className="text-[11px] text-amber-400/80 uppercase tracking-[0.4em] font-black flex items-center gap-2">
                            <ShieldAlert size={13} className="text-amber-500/70" />
                            סיווג בטיחות
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { label: 'הספרייה האסורה (18+)', val: 'R', icon: <AlertTriangle size={16} />, color: 'red' },
                                { label: 'לב צעיר (נוער)', val: 'PG-13', icon: <Zap size={16} />, color: 'amber' },
                                { label: 'כולם מוזמנים (G)', val: 'G', icon: <Users size={16} />, color: 'emerald' }
                            ].map((r) => (
                                <button
                                    key={r.val}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, rating: r.val })}
                                    className={`p-5 rounded-2xl border-2 flex items-center gap-4 transition-all ${formData.rating === r.val
                                            ? `border-${r.color}-500/50 bg-${r.color}-500/10 text-white shadow-xl scale-[1.02]`
                                            : 'border-white/8 bg-white/[0.02] text-white/50 hover:bg-white/5 hover:text-white/80'
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg shrink-0 ${formData.rating === r.val ? `bg-${r.color}-500 text-black` : 'bg-white/8'}`}>
                                        {r.icon}
                                    </div>
                                    <span className="font-bold text-sm text-right leading-tight">{r.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* אזהרת 18+ */}
                    <AnimatePresence>
                        {formData.rating === 'R' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="bg-red-500/10 border border-red-500/25 p-6 rounded-2xl flex items-start gap-4"
                            >
                                <ShieldAlert size={22} className="text-red-400 shrink-0 mt-0.5" />
                                <div className="text-right">
                                    <p className="text-red-400 font-black text-[11px] uppercase tracking-widest mb-1">משרד הקסמים מזהיר:</p>
                                    <p className="text-white/65 text-sm leading-relaxed font-crimson">
                                        סיפור זה יוגדר כתוכן בוגר. הוא לא יופיע בדף הבית הציבורי, והכניסה אליו תדרוש אישור גיל מפורש.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* תקציר */}
                    <div className="space-y-4">
                        <label className="text-[11px] text-amber-400/80 uppercase tracking-[0.4em] font-black flex items-center gap-2">
                            <BookOpen size={13} className="text-amber-500/70" />
                            תקציר העלילה (הקלף שיוצג בספרייה)
                        </label>
                        <div className="quill-wrapper border border-white/12 hover:border-white/20 focus-within:border-amber-500/40 rounded-[2rem] overflow-hidden transition-all shadow-2xl" dir="ltr">
                            <ReactQuill
                                theme="snow"
                                value={formData.description}
                                onChange={(content) => setFormData({ ...formData, description: content })}
                                placeholder="ספר לעולם על הקסם שכתבת..."
                                modules={{
                                    toolbar: [
                                        ['bold', 'italic', 'underline'],
                                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                        ['clean']
                                    ],
                                }}
                            />
                        </div>
                    </div>

                    {/* כפתור שליחה */}
                    <button
                        disabled={isSubmitting}
                        className="group w-full py-8 bg-amber-600 hover:bg-amber-500 text-amber-950 font-cinzel font-black rounded-[2rem] transition-all shadow-[0_20px_50px_rgba(217,119,6,0.2)] hover:shadow-[0_20px_60px_rgba(217,119,6,0.35)] flex flex-col items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <div className="w-9 h-9 border-4 border-amber-950/30 border-t-amber-950 rounded-full animate-spin" />
                        ) : (
                            <>
                                <div className="flex items-center gap-4">
                                    <Wand2 size={28} className="group-hover:rotate-12 group-hover:scale-110 transition-all duration-500" />
                                    <span className="text-xl tracking-[0.3em] uppercase">רשום בספרייה ⚡</span>
                                </div>
                                <span className="text-[10px] opacity-50 font-black tracking-widest uppercase">הסיפור יפורסם באופן מיידי</span>
                            </>
                        )}
                    </button>
                </motion.form>
            </div>

            <style jsx global>{`
                .ql-container { font-family: 'Crimson Text', serif; font-size: 1.5rem; color: rgba(255,255,255,0.85); border: none !important; min-height: 250px; background: rgba(255,255,255,0.01); }
                .ql-toolbar { border: none !important; border-bottom: 1px solid rgba(255,255,255,0.08) !important; background: rgba(255,255,255,0.03); padding: 16px 20px !important; }
                .ql-editor { text-align: right; direction: rtl; line-height: 1.8; padding: 32px 40px !important; }
                .ql-snow .ql-stroke { stroke: rgba(255,255,255,0.55) !important; }
                .ql-snow .ql-fill { fill: rgba(255,255,255,0.55) !important; }
                .ql-snow .ql-picker { color: rgba(255,255,255,0.55) !important; }
                .ql-editor.ql-blank::before { color: rgba(255,255,255,0.18) !important; font-style: italic; right: 40px !important; left: auto !important; }
            `}</style>
        </div>
    );
}