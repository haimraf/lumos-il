"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { logActivityEvent } from "@/lib/activityEvents";
import {
    ChevronRight, ChevronLeft, Sparkles,
    MessageSquare, Send, Feather, User, Clock, ShieldAlert,
    BookOpen, Share2, ArrowUp
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { useOwlMail } from "@/components/OwlMail";
import { getRoleColor, getRoleColorFromDB } from "@/lib/roleColor";

export default function ChapterPage() {
    const { id, orderIndex } = useParams();
    const router = useRouter();
    const { sendOwl } = useOwlMail();
    const [supabase] = useState(() => createClient());
    const [scrollPct, setScrollPct] = useState(0);

    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

    useEffect(() => {
        const handler = () => {
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            if (scrollHeight <= clientHeight) return;
            setScrollPct(scrollTop / (scrollHeight - clientHeight));
        };
        window.addEventListener("scroll", handler, { passive: true });
        return () => window.removeEventListener("scroll", handler);
    }, []);

    const [chapter, setChapter] = useState<any>(null);
    const [prevChapter, setPrevChapter] = useState<any>(null);
    const [nextChapter, setNextChapter] = useState<any>(null);
    const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [comment, setComment] = useState("");
    const [commentsList, setCommentsList] = useState<any[]>([]);
    const [isPosting, setIsPosting] = useState(false);
    const [roleColors, setRoleColors] = useState<Record<string, string>>({});
    useEffect(() => { getRoleColorFromDB(supabase).then(setRoleColors); }, [supabase]);
    const chapterReadLoggedRef = useRef<string | null>(null);

    const currentOrderIndex = parseInt(orderIndex as string);

    const readingTime = useMemo(() => {
        if (!chapter?.content) return 0;
        const wordsPerMinute = 200;
        const text = chapter.content.replace(/<[^>]*>?/gm, '');
        const noOfWords = text.split(/\s+/).length;
        return Math.ceil(noOfWords / wordsPerMinute);
    }, [chapter?.content]);

    const fetchComments = async (chapterId: string) => {
        const { data, error } = await supabase
            .from('chapter_comments')
            .select(`*, profiles:user_id (full_name, avatar_url, role, house)`)
            .eq('chapter_id', chapterId)
            .order('created_at', { ascending: false });

        if (error) {
            const { data: simpleData } = await supabase
                .from('chapter_comments')
                .select('*')
                .eq('chapter_id', chapterId)
                .order('created_at', { ascending: false });

            if (simpleData) {
                setCommentsList(simpleData.map(c => ({
                    ...c,
                    profiles: { full_name: "קוסם בטירה", avatar_url: null }
                })));
            }
        } else {
            setCommentsList(data || []);
        }
    };

    useEffect(() => {
        const fetchChapterData = async () => {
            if (!id || isNaN(currentOrderIndex)) return;

            const { data: chapterData } = await supabase
                .from('chapters')
                .select(`*, stories!inner (title, house_theme, rating, summary)`)
                .eq('story_id', id)
                .eq('order_index', currentOrderIndex)
                .single();

            if (chapterData) {
                setChapter(chapterData);
                fetchComments(chapterData.id);

                const chapterKey = `${id}-${currentOrderIndex}`;
                if (chapterReadLoggedRef.current !== chapterKey) {
                    chapterReadLoggedRef.current = chapterKey;
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        void logActivityEvent(supabase, {
                            eventType: "library_chapter_read",
                            icon: "📖",
                            title: `קרא פרק: ${chapterData.title || `פרק ${currentOrderIndex}`}`,
                            subtitle: chapterData.stories?.title || null,
                            targetType: "chapter",
                            targetId: chapterData.id,
                            targetUrl: `/library/${id}/${currentOrderIndex}`,
                        });
                    }
                }

                const { data: navData } = await supabase
                    .from('chapters')
                    .select('id, order_index, title')
                    .eq('story_id', id)
                    .in('order_index', [currentOrderIndex - 1, currentOrderIndex + 1]);

                if (navData) {
                    setPrevChapter(navData.find(ch => ch.order_index === currentOrderIndex - 1));
                    setNextChapter(navData.find(ch => ch.order_index === currentOrderIndex + 1));
                }
            }

            const confirmed = localStorage.getItem('lumos_adult_confirmed') === 'true';
            setIsAdultConfirmed(confirmed);
            setIsLoading(false);
        };
        fetchChapterData();
    }, [id, currentOrderIndex]);

    const handleSendComment = async () => {
        if (!comment.trim() || !chapter?.id) return;
        setIsPosting(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            sendOwl("דרושה התחברות", "עליך להיות מחובר כדי להגיב.", "error");
            setIsPosting(false);
            return;
        }

        const { error } = await supabase
            .from('chapter_comments')
            .insert([{ chapter_id: chapter.id, user_id: user.id, content: comment.trim() }]);

        if (error) {
            sendOwl("תקלה בדיו", "הנוצה נשברה, נסה שוב.", "error");
        } else {
            setComment("");
            fetchComments(chapter.id);
            sendOwl("נשלח בהצלחה", "הינשוף מסר את תגובתך.", "success");
        }
        setIsPosting(false);
    };

    const houseGlows: Record<string, string> = {
        Gryffindor: "rgba(185,28,28,0.4)",
        Slytherin: "rgba(5,150,105,0.4)",
        Ravenclaw: "rgba(37,99,235,0.4)",
        Hufflepuff: "rgba(251,191,36,0.4)",
        Neutral: "rgba(245,158,11,0.2)"
    };

    if (isLoading) return (
        <div className="min-h-screen bg-[#060608] flex items-center justify-center">
            <Sparkles className="text-amber-500 animate-pulse" size={48} />
        </div>
    );

    if (chapter?.stories?.rating === '18+' && !isAdultConfirmed) {
        return (
            <div className="min-h-screen bg-[#060608] flex items-center justify-center p-6 text-center" dir="rtl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#0f0f12] p-12 rounded-[3rem] border-2 border-red-500/40 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
                    style={{ maxWidth: '32rem' }}
                >
                    <ShieldAlert size={64} className="text-red-500 mx-auto mb-6" />
                    <h2 className="font-cinzel text-3xl text-white mb-4">מחסום גיל קסום</h2>
                    <p className="font-crimson text-xl text-white/70 mb-8">התוכן שלפניך מיועד לקוסמים ומכשפות מעל גיל 18 בלבד.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={() => { localStorage.setItem('lumos_adult_confirmed', 'true'); setIsAdultConfirmed(true); }} className="bg-red-600 hover:bg-red-500 text-white px-10 py-4 rounded-xl font-bold transition-all transform hover:scale-105">אני מאשר/ת</button>
                        <button onClick={() => router.back()} className="bg-white/10 hover:bg-white/20 text-white px-10 py-4 rounded-xl transition-all">חזרה לספריה</button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#060608] relative overflow-x-hidden pb-32 selection:bg-amber-500/30 selection:text-white" dir="rtl">

            {/* פס קריאה עליון */}
            <motion.div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-l from-amber-600 to-amber-400 z-50 origin-[100%]" style={{ scaleX }} />

            {/* הילת בית */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[800px] rounded-full blur-[120px] opacity-20"
                    style={{ backgroundColor: houseGlows[chapter?.stories?.house_theme || 'Neutral'] }} />
            </div>

            {/* ✅ תיקון רוחב */}
            <div className="px-6 pt-20 relative z-10 text-right" style={{ maxWidth: '48rem', marginLeft: 'auto', marginRight: 'auto' }}>

                {/* Header */}
                <header className="mb-24 flex flex-col items-center text-center relative">
                    {/* מספר ענקי ברקע */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute -top-16 font-cinzel text-[16rem] text-white/[0.02] font-black leading-none pointer-events-none select-none z-[-1]"
                    >
                        {chapter?.order_index}
                    </motion.div>

                    {/* קישור חזרה לסיפור */}
                    <Link href={`/library/${id}`} className="group flex items-center gap-3 text-amber-500/70 hover:text-amber-400 transition-all text-[11px] font-black uppercase tracking-[0.4em] mb-8">
                        <span className="w-8 h-px bg-amber-500/30 group-hover:w-14 transition-all duration-300" />
                        {chapter?.stories?.title}
                        <span className="w-8 h-px bg-amber-500/30 group-hover:w-14 transition-all duration-300" />
                    </Link>

                    {/* כותרת הפרק */}
                    <h1 className="font-cinzel text-5xl md:text-7xl font-black text-amber-500 uppercase leading-[1.1] mb-8 drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                        {chapter?.title}
                    </h1>

                    {/* מטא-דאטה */}
                    <div className="flex items-center gap-5 text-white/50 text-[11px] font-black uppercase tracking-widest border-y border-white/8 py-3 px-8">
                        <span className="flex items-center gap-2">
                            <BookOpen size={14} className="text-amber-500/80" />
                            {readingTime} דקות קריאה
                        </span>
                        <span className="w-1 h-1 bg-white/30 rounded-full" />
                        <span className="flex items-center gap-2">
                            <Clock size={14} className="text-amber-500/80" />
                            פרק {chapter?.order_index}
                        </span>
                    </div>
                </header>

                {/* תוכן הפרק */}
                <article className="mb-40">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1 }}
                        className="font-crimson text-2xl md:text-3xl text-amber-50/90 leading-[2] chapter-content-view space-y-12 drop-shadow-sm"
                        dangerouslySetInnerHTML={{ __html: chapter?.content || 'התוכן אבד בערפל... נסו שוב מאוחר יותר.' }}
                    />
                </article>

                {/* ניווט בין פרקים */}
                <nav className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-40" aria-label="ניווט בין פרקים">
                    {prevChapter ? (
                        <Link href={`/library/${id}/${prevChapter.order_index}`} className="group flex items-center gap-5 p-7 bg-[#0f0f12]/60 border border-white/8 rounded-[2rem] hover:border-amber-500/40 hover:bg-amber-500/[0.03] transition-all">
                            <div className="w-11 h-11 rounded-full bg-white/8 flex items-center justify-center group-hover:bg-amber-500/20 transition-all shrink-0">
                                <ChevronRight className="text-amber-500/70 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" size={22} />
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-amber-400/70 font-black uppercase tracking-widest mb-1">הפרק הקודם</p>
                                <h4 className="text-white/80 group-hover:text-white text-base font-cinzel line-clamp-1 transition-colors">{prevChapter.title}</h4>
                            </div>
                        </Link>
                    ) : <div />}

                    {nextChapter ? (
                        <Link href={`/library/${id}/${nextChapter.order_index}`} className="group flex items-center justify-between p-7 bg-[#0f0f12]/60 border border-white/8 rounded-[2rem] hover:border-amber-500/40 hover:bg-amber-500/[0.03] transition-all">
                            <div className="text-left">
                                <p className="text-[10px] text-amber-400/70 font-black uppercase tracking-widest mb-1">הפרק הבא</p>
                                <h4 className="text-white/80 group-hover:text-white text-base font-cinzel line-clamp-1 transition-colors">{nextChapter.title}</h4>
                            </div>
                            <div className="w-11 h-11 rounded-full bg-white/8 flex items-center justify-center group-hover:bg-amber-500/20 transition-all shrink-0">
                                <ChevronLeft className="text-amber-500/70 group-hover:text-amber-400 group-hover:-translate-x-1 transition-all" size={22} />
                            </div>
                        </Link>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-7 bg-amber-500/[0.03] border border-dashed border-amber-500/20 rounded-[2rem]">
                            <Feather size={22} className="text-amber-500/40 mb-2" />
                            <span className="font-cinzel text-[10px] text-amber-500/50 font-bold tracking-[0.2em] uppercase">סוף המסע לעת עתה</span>
                        </div>
                    )}
                </nav>

                {/* תגובות */}
                <section className="bg-[#0a0a0c]/80 backdrop-blur-md p-8 md:p-12 rounded-[3rem] border border-white/8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[60px] pointer-events-none" />

                    <div className="flex items-center justify-between mb-12">
                        <h3 className="font-cinzel text-2xl font-black text-amber-500 flex items-center gap-4">
                            מחשבות מהטירה
                            <MessageSquare size={24} className="text-amber-500/40" />
                        </h3>
                        <div className="flex items-center gap-2 bg-white/8 px-4 py-2 rounded-full border border-white/8">
                            <Clock size={14} className="text-amber-500/70" />
                            <span className="text-white/60 text-[10px] font-black uppercase tracking-widest">{commentsList.length} תגובות</span>
                        </div>
                    </div>

                    {/* שדה כתיבת תגובה */}
                    <div className="relative mb-16">
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="השאר חותם של דיו על דפי הקלף..."
                            className="w-full bg-white/5 border border-white/12 hover:border-white/20 focus:border-amber-500/40 rounded-3xl p-8 pb-20 text-white/90 text-right h-44 outline-none transition-all font-crimson text-xl placeholder:text-white/30 shadow-inner resize-none"
                        />
                        <button
                            onClick={handleSendComment}
                            disabled={isPosting || !comment.trim()}
                            className="absolute bottom-5 left-5 px-8 py-3.5 bg-amber-600 hover:bg-amber-500 text-amber-950 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95 disabled:opacity-30 shadow-lg text-sm"
                        >
                            {isPosting ? "שולח..." : <><Send size={16} /> שגר 🦉</>}
                        </button>
                    </div>

                    {/* רשימת תגובות */}
                    <div className="space-y-6">
                        <AnimatePresence>
                            {commentsList.map((c, i) => (
                                <motion.div
                                    key={c.id || i}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex gap-6 text-right items-start p-6 rounded-[1.5rem] hover:bg-white/[0.02] transition-all border border-transparent hover:border-white/5"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-transparent border border-amber-500/30 shrink-0 flex items-center justify-center overflow-hidden shadow-lg">
                                        {c.profiles?.avatar_url ? (
                          <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt={c.profiles?.full_name} />
                                        ) : (
                                            <User size={22} className="text-amber-500/40" />
                                        )}
                                    </div>
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="font-cinzel font-black tracking-wide text-base" style={{ color: getRoleColor(c.profiles?.role, c.profiles?.house, roleColors) }}>{c.profiles?.full_name || "קוסם אנונימי"}</span>
                                            <span className="w-1 h-1 bg-amber-500/30 rounded-full" />
                                            <span className="text-[10px] text-white/40 uppercase font-black">{new Date(c.created_at).toLocaleDateString('he-IL')}</span>
                                        </div>
                                        <p className="font-crimson text-lg text-white/75 leading-relaxed italic">{c.content}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {commentsList.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-white/8 rounded-[2rem]">
                                <Feather size={32} className="text-amber-500/25" />
                                <p className="font-crimson text-xl text-white/35 italic text-center">
                                    "הדיו עדיין לא נגע בדף הזה...<br />היה הראשון לכתוב."
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* כפתור חזרה למעלה */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="fixed bottom-10 right-10 w-14 h-14 bg-amber-600 text-amber-950 rounded-full flex items-center justify-center shadow-2xl z-50 hover:bg-amber-500 transition-all active:scale-90"
                style={{
                    opacity: scrollPct > 0.15 ? 1 : 0,
                    pointerEvents: scrollPct > 0.15 ? "auto" : "none",
                    transform: `scale(${scrollPct > 0.15 ? 1 : 0.8})`,
                    transition: "opacity 0.3s, transform 0.3s",
                }}
                aria-label="חזרה לראש הדף"
            >
                <ArrowUp size={24} />
            </button>

            <style jsx global>{`
                .chapter-content-view p { margin-bottom: 3rem; }
                .chapter-content-view p:first-of-type::first-letter { 
                    font-family: 'Cinzel', serif;
                    float: right;
                    font-size: 5rem;
                    line-height: 1;
                    padding-left: 0.5rem;
                    color: #f59e0b;
                    font-weight: 900;
                }
                .chapter-content-view strong { color: #f59e0b; font-weight: 900; }
                .chapter-content-view em { color: #fde68a; font-style: italic; }
                ::-webkit-scrollbar { width: 10px; }
                ::-webkit-scrollbar-track { background: #060608; }
                ::-webkit-scrollbar-thumb { background: #451a03; border-radius: 10px; border: 3px solid #060608; }
                ::-webkit-scrollbar-thumb:hover { background: #78350f; }
            `}</style>
        </div>
    );
}

