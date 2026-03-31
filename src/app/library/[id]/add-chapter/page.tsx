"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";
import MemberOnlyNotice from "@/components/auth/MemberOnlyNotice";
import { BookOpen, Wand2, ChevronRight, PenTool, Hash, AlertCircle } from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import { logActivityEvent } from "@/lib/activityEvents";
import Link from "next/link";
import { motion } from "framer-motion";
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => <div className="h-96 w-full bg-white/5 animate-pulse rounded-2xl" />
});
import 'react-quill-new/dist/quill.snow.css';

export default function AddChapterPage() {
    const { id } = useParams();
    const router = useRouter();
    const supabase = createClient();
    const { sendOwl } = useOwlMail();
    const { session, isLoading: authLoading } = useAuth();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [story, setStory] = useState<any>(null);
    const [nextOrderIndex, setNextOrderIndex] = useState(1);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [formData, setFormData] = useState({ title: "", content: "" });

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    useEffect(() => {
        const fetchStoryData = async () => {
            const { data: storyData } = await supabase
                .from('stories')
                .select('title, house_theme, author_id')
                .eq('id', id)
                .single();

            if (storyData) {
                setStory(storyData);
                const { count } = await supabase
                    .from('chapters')
                    .select('*', { count: 'exact', head: true })
                    .eq('story_id', id);
                setNextOrderIndex((count || 0) + 1);
            }
        };
        fetchStoryData();
    }, [id, supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.content) {
            sendOwl("מחסור ברכיבים", "פרק חייב לכלול כותרת ותוכן כדי להיחתם.", "error");
            return;
        }
        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || user.id !== story?.author_id) {
            sendOwl("שרביט לא תואם", "רק מחבר הסיפור המקורי יכול להוסיף דפים ליומן זה.", "error");
            setIsSubmitting(false);
            return;
        }

        const { data: chapterData, error } = await supabase.rpc('create_story_chapter_secure', {
            p_story_id: id,
            p_title: formData.title,
            p_content: formData.content,
            p_order_index: nextOrderIndex,
        });

        if (error) {
            sendOwl("תקלה בלחש החתימה", error.message, "error");
        } else {
            setHasUnsavedChanges(false);
            sendOwl("הפרק נחתם!", `דבריך נרשמו בהצלחה כפרק ${nextOrderIndex}.`, "success");
            await logActivityEvent(supabase, {
                actorId: user.id,
                eventType: "chapter_published",
                icon: "🪶",
                title: "הוסיף/ה פרק חדש לסיפור",
                subtitle: formData.title,
                description: story?.title || null,
                targetType: "chapter",
                targetId: chapterData?.id || null,
                targetUrl: `/library/${id}/${nextOrderIndex}`,
            });
            router.push(`/library/${id}`);
        }
        setIsSubmitting(false);
    };

    const houseGlows: Record<string, string> = {
        Gryffindor: "rgba(185,28,28,0.3)",
        Slytherin: "rgba(5,150,105,0.3)",
        Ravenclaw: "rgba(37,99,235,0.3)",
        Hufflepuff: "rgba(251,191,36,0.3)",
        Neutral: "rgba(245,158,11,0.1)"
    };

    if (authLoading) return (
        <div className="min-h-screen bg-[#060608] flex items-center justify-center" dir="rtl">
            <div className="text-center space-y-4">
                <Wand2 className="mx-auto text-amber-500 animate-pulse" size={48} />
                <p className="font-crimson text-white/40 text-sm">טוען...</p>
            </div>
        </div>
    );

    if (!session) return (
        <MemberOnlyNotice
            title="הספרייה פתוחה רק לקוסמים מחוברים"
            description="כדי להוסיף פרק לסיפור, צריך קודם להתחבר לחשבון שלך בטירה."
            icon={BookOpen}
        />
    );

    return (
        <div className="relative min-h-screen py-24 px-6 bg-[#060608] overflow-hidden selection:bg-amber-500/30" dir="rtl">

            {/* הילת הבית */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[1200px] pointer-events-none z-0">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full blur-[150px] opacity-20"
                    style={{ backgroundColor: houseGlows[story?.house_theme || 'Neutral'] }} />
            </div>

            {/* ✅ תיקון רוחב - inline style */}
            <div className="relative z-10 text-right" style={{ maxWidth: '56rem', marginLeft: 'auto', marginRight: 'auto' }}>

                {/* Header */}
                <header className="mb-16">
                    <Link
                        href={`/library/${id}`}
                        className="group inline-flex items-center gap-2 text-amber-500/60 hover:text-amber-400 transition-all text-[11px] font-black uppercase tracking-[0.3em] mb-8"
                    >
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        חזרה לסיפור:&nbsp;<span className="text-amber-300/80">{story?.title}</span>
                    </Link>

                    <div className="flex items-end justify-between gap-6">
                        <h1 className="font-cinzel text-4xl md:text-6xl font-black text-amber-500 uppercase leading-none drop-shadow-2xl">
                            חקיקת פרק {nextOrderIndex}
                        </h1>
                        <div className="flex flex-col items-end text-amber-500/25 font-cinzel">
                            <span className="text-5xl font-black leading-none">{nextOrderIndex.toString().padStart(2, '0')}</span>
                            <span className="text-[9px] uppercase tracking-widest mt-1">Chapter</span>
                        </div>
                    </div>

                    <div className="mt-6 h-px bg-gradient-to-l from-amber-500/40 via-amber-500/10 to-transparent" />
                </header>

                <motion.form
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    onSubmit={handleSubmit}
                    className="bg-[#0c0c0f] p-8 md:p-12 rounded-[3rem] border border-white/8 space-y-10 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.6)]"
                >
                    {/* כותרת הפרק */}
                    <div className="space-y-3">
                        <label className="text-[11px] text-amber-400/80 uppercase tracking-[0.3em] font-black flex items-center gap-2">
                            <PenTool size={13} className="text-amber-500/60" />
                            כותרת הפרק
                        </label>
                        <input
                            required
                            value={formData.title}
                            onChange={e => { setFormData({ ...formData, title: e.target.value }); setHasUnsavedChanges(true); }}
                            placeholder="למשל: הנבואה שהגשימה את עצמה..."
                            className="w-full bg-white/5 border border-white/15 hover:border-white/25 focus:border-amber-500/50 rounded-2xl p-5 text-white outline-none transition-all font-cinzel text-xl text-right placeholder:text-white/25"
                        />
                    </div>

                    {/* מספר סדר */}
                    <div className="space-y-3">
                        <label className="text-[11px] text-amber-400/80 uppercase tracking-[0.3em] font-black flex items-center gap-2">
                            <Hash size={13} className="text-amber-500/60" />
                            מספר פרק בסדר
                        </label>
                        <div className="inline-flex items-center gap-4 bg-amber-500/8 border border-amber-500/25 rounded-2xl px-6 py-4">
                            <span className="font-cinzel text-3xl font-black text-amber-500/70">
                                {nextOrderIndex.toString().padStart(2, '0')}
                            </span>
                            <span className="text-[10px] text-amber-500/40 font-black uppercase tracking-widest border-r border-amber-500/20 pr-4">
                                נקבע אוטומטית
                            </span>
                        </div>
                    </div>

                    {/* גוף הפרק */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] text-amber-400/80 uppercase tracking-[0.3em] font-black flex items-center gap-2">
                                <BookOpen size={13} className="text-amber-500/60" />
                                גוף הפרק
                            </label>
                            {hasUnsavedChanges && (
                                <span className="flex items-center gap-1.5 text-[10px] text-amber-400/80 font-black">
                                    <AlertCircle size={11} className="animate-pulse" />
                                    שינויים לא שמורים
                                </span>
                            )}
                        </div>

                        <div className="quill-wrapper border border-white/12 hover:border-white/20 focus-within:border-amber-500/35 rounded-[2rem] overflow-hidden transition-all shadow-2xl" dir="ltr">
                            <ReactQuill
                                theme="snow"
                                value={formData.content}
                                onChange={(content) => { setFormData({ ...formData, content }); setHasUnsavedChanges(true); }}
                                placeholder="השתמש בדיו של עוף החול..."
                                modules={{
                                    toolbar: [
                                        ['bold', 'italic', 'underline', 'strike'],
                                        [{ 'header': [2, 3, false] }],
                                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                        ['clean']
                                    ],
                                }}
                            />
                        </div>
                    </div>

                    {/* כפתור שליחה */}
                    <div className="pt-4">
                        <button
                            disabled={isSubmitting}
                            className="group w-full py-8 bg-amber-600 hover:bg-amber-500 text-amber-950 font-cinzel font-black rounded-[2rem] transition-all shadow-[0_20px_40px_rgba(217,119,6,0.25)] hover:shadow-[0_20px_50px_rgba(217,119,6,0.4)] flex flex-col items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <div className="w-8 h-8 border-4 border-amber-950/20 border-t-amber-950 rounded-full animate-spin" />
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <Wand2 size={24} className="group-hover:rotate-12 group-hover:scale-110 transition-all duration-500" />
                                        <span className="text-xl tracking-[0.25em] uppercase">חתום פרק ביומן ⚡</span>
                                    </div>
                                    <span className="text-[10px] text-amber-950/50 font-black tracking-widest uppercase">
                                        הדיו יתייבש מיד עם החתימה
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.form>
            </div>

            <style jsx global>{`
                .ql-container { 
                    font-family: 'Crimson Text', serif; 
                    font-size: 1.5rem; 
                    color: rgba(255,255,255,0.85); 
                    border: none !important; 
                    min-height: 480px;
                    background: rgba(255,255,255,0.02);
                }
                .ql-toolbar { 
                    border: none !important; 
                    border-bottom: 1px solid rgba(255,255,255,0.08) !important; 
                    background: rgba(255,255,255,0.03); 
                    padding: 16px 20px !important;
                }
                .ql-editor { 
                    text-align: right; 
                    direction: rtl; 
                    line-height: 2; 
                    padding: 32px 40px !important;
                }
                .ql-snow .ql-stroke { stroke: rgba(255,255,255,0.55) !important; }
                .ql-snow .ql-fill { fill: rgba(255,255,255,0.55) !important; }
                .ql-snow .ql-picker { color: rgba(255,255,255,0.55) !important; }
                .ql-editor.ql-blank::before { 
                    color: rgba(255,255,255,0.15) !important; 
                    font-style: italic; 
                    right: 40px !important; 
                    left: auto !important; 
                }
                .ql-editor::-webkit-scrollbar { width: 6px; }
                .ql-editor::-webkit-scrollbar-track { background: transparent; }
                .ql-editor::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.15); border-radius: 10px; }
            `}</style>
        </div>
    );
}
