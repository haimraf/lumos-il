"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../utils/supabase/client";
import {
    ShieldAlert, BookOpen, ChevronLeft, User, Plus,
    Sparkles, Lock, Flame, Eye, Share2, Home, Book as BookIcon
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useOwlMail } from "@/components/OwlMail";
import { getRoleColor, getRoleColorFromDB } from "@/lib/roleColor";

export default function StoryViewPage() {
    const { id } = useParams();
    const router = useRouter();
    const { sendOwl } = useOwlMail();
    const [supabase] = useState(() => createClient());
    const [story, setStory] = useState<any>(null);
    const [chapters, setChapters] = useState<any[]>([]);
    const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [roleColors, setRoleColors] = useState<Record<string, string>>({});
    useEffect(() => { getRoleColorFromDB(supabase).then(setRoleColors); }, [supabase]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchStory = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);

            const { data: storyData } = await supabase
                .from('stories')
                .select(`*, profiles:author_id(*)`)
                .eq('id', id)
                .single();

            if (storyData) {
                setStory(storyData);
                const { data: chaptersData } = await supabase
                    .from('chapters')
                    .select('id, order_index, title')
                    .eq('story_id', id)
                    .order('order_index');
                setChapters(chaptersData || []);
            }
            if (localStorage.getItem('lumos_adult_confirmed') === 'true') setIsAdultConfirmed(true);
            setIsLoading(false);
        };
        fetchStory();
    }, [id, supabase]);

    useEffect(() => {
        const isAdult = story?.rating === 'R' || story?.rating === '18+';
        const isLocked = isAdult && !isAdultConfirmed;

        if (isLocked) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [story, isAdultConfirmed]);

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        sendOwl("הלחש הצליח!", "הקישור הועתק לקלף.", "success");
    };

    const houseGlows: Record<string, string> = {
        Gryffindor: "rgba(185,28,28,0.3)",
        Slytherin: "rgba(5,150,105,0.3)",
        Ravenclaw: "rgba(37,99,235,0.3)",
        Hufflepuff: "rgba(251,191,36,0.3)",
        Neutral: "rgba(245,158,11,0.1)"
    };

    const isAdult = story?.rating === 'R' || story?.rating === '18+';
    const isLocked = isAdult && !isAdultConfirmed;

    const AdultModal = mounted && isLocked ? createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-6" dir="rtl">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full glass-panel p-6 md:p-8 rounded-[2.5rem] border-2 border-red-500/40 text-center shadow-[0_0_80px_rgba(220,38,38,0.25)] bg-[#0a0a0c]"
                style={{ maxWidth: '420px', margin: '0 auto' }}
            >
                <div className="w-16 h-16 bg-red-600/10 rounded-full flex items-center justify-center mx-auto border-2 border-red-600 mb-6">
                    <Lock className="text-red-500" size={28} />
                </div>
                <h2 className="font-cinzel text-xl md:text-2xl text-white font-black mb-4 uppercase">הספרייה האסורה</h2>
                <p className="font-crimson text-white/60 text-base md:text-lg italic mb-8 leading-relaxed">
                    "התוכן שלפניך מיועד לקוסמים בוגרים בלבד. עליך לאשר את גילך כדי לפתוח את הספר."
                </p>
                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => {
                            localStorage.setItem('lumos_adult_confirmed', 'true');
                            setIsAdultConfirmed(true);
                        }}
                        className="w-full py-5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-lg transition-all shadow-xl active:scale-95 hover:shadow-2xl hover:shadow-red-500/30"
                    >
                        אני מאשר/ת
                    </button>
                    <button
                        onClick={() => router.push('/library')}
                        className="w-full py-4 text-white/20 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest hover:bg-white/5 rounded-xl"
                    >
                        חזרה לספרייה הכללית
                    </button>
                </div>
            </motion.div>
        </div>,
        document.body
    ) : null;

    if (isLoading) return <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center"><Sparkles className="text-amber-500 animate-pulse" size={48} /></div>;

    return (
        <div className="min-h-screen bg-[#0a0a0c] relative overflow-x-hidden pb-32 selection:bg-amber-500/30" dir="rtl">
            {/* הילת הבית */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-[150px] pointer-events-none z-0 opacity-20"
                style={{ backgroundColor: houseGlows[story?.house_theme || 'Neutral'] }} />

            {/* ✅ התיקון: inline style במקום max-w-6xl */}
            <div className="px-6 pt-12 relative z-10" style={{ maxWidth: '72rem', marginLeft: 'auto', marginRight: 'auto' }}>

                <nav className="mb-12 flex items-center gap-3 text-white/20 text-[10px] font-black uppercase tracking-[0.3em]" aria-label="ניווט">
                    <Link href="/" className="hover:text-amber-500 transition-colors flex items-center gap-1.5">
                        <Home size={12} /> ראשי
                    </Link>
                    <ChevronLeft size={10} />
                    <Link href="/library" className="hover:text-amber-500 transition-colors flex items-center gap-1.5">
                        <BookIcon size={12} /> הספרייה
                    </Link>
                    <ChevronLeft size={10} />
                    <span className="text-amber-500/60 truncate max-w-[200px]">{story?.title}</span>
                </nav>

                <div className="flex flex-col lg:flex-row gap-16 mb-24 items-start">
                    <motion.div
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="w-full lg:w-80 aspect-[2/3] relative shrink-0"
                    >
                        <div className="w-full h-full glass-panel rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 group">
                            {story?.cover_url ? (
                                <img src={story.cover_url} alt={story.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-white/5">
                                    <BookOpen className="text-white/10 mb-4" size={64} />
                                    <span className="text-white/20 font-cinzel text-[10px] tracking-widest uppercase text-center px-4">אין כריכה ליומן זה</span>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    <div className="flex-1 space-y-8 text-right">
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                            <h1 className="font-cinzel text-5xl md:text-7xl font-black text-amber-500 mb-6 leading-tight drop-shadow-2xl">
                                {story?.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 justify-end">
                                <span className={`px-5 py-2 rounded-xl text-[10px] font-black border tracking-[0.2em] uppercase backdrop-blur-md ${isAdult ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-emerald-500 text-emerald-500 bg-emerald-500/10'}`}>
                                    {story?.rating}
                                </span>
                                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                    <Eye size={14} className="text-amber-500/60" />
                                    <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{story?.views_count || 0} צפיות</span>
                                </div>
                                <button onClick={handleShare} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-all text-amber-500/60 hover:text-amber-500 border border-white/5">
                                    <Share2 size={16} />
                                </button>
                            </div>
                        </motion.div>

                        <div className="p-8 bg-[#0d0d0f]/80 backdrop-blur-md border-r-4 border-amber-500/40 rounded-l-3xl shadow-2xl">
                            <div className="font-crimson text-2xl text-white/70 italic leading-relaxed story-description"
                                dangerouslySetInnerHTML={{ __html: story?.description || 'התקציר אבד במרתפי הוגוורטס...' }} />
                        </div>

                        <div className="flex items-center gap-5 justify-end bg-white/[0.02] p-5 rounded-[2rem] border border-white/5 self-end">
                            <div className="text-right">
                                <p className="font-bold font-cinzel text-lg leading-none mb-1" style={{ color: getRoleColor(story?.profiles?.role, story?.profiles?.house, roleColors) }}>{story?.profiles?.full_name}</p>
                                <p className="text-[10px] text-amber-500/60 uppercase font-black tracking-widest">{story?.house_theme}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl border-2 border-amber-500/20 overflow-hidden bg-[#0d0d0f] shadow-2xl rotate-3">
                                {story?.profiles?.avatar_url ? (
                                    <img src={story.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-full h-full p-3 text-amber-500/20" />
                                )}
                            </div>
                        </div>

                        {currentUserId && currentUserId === story?.author_id && (
                            <div className="pt-6">
                                <Link href={`/library/${id}/add-chapter`} className="inline-flex items-center gap-3 px-12 py-5 bg-amber-600 hover:bg-amber-500 text-amber-950 rounded-[1.5rem] font-black font-cinzel transition-all shadow-xl transform hover:scale-105 active:scale-95">
                                    <Plus size={20} /> הוסף פרק חדש
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                <div className="glass-panel rounded-[3.5rem] p-10 md:p-16 border border-white/5 bg-[#0d0d0f]/40 backdrop-blur-xl shadow-3xl">
                    <div className="flex items-center justify-between mb-12">
                        <h3 className="font-cinzel text-3xl font-black text-amber-500 flex items-center gap-4">
                            <Flame size={28} className="text-amber-500/50" />
                            דפי הספר
                        </h3>
                        {chapters.length > 0 && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                                {chapters.length} פרקים
                            </span>
                        )}
                    </div>

                    {chapters.length > 0 ? (
                        <div className="grid gap-3">
                            {chapters.map((ch, idx) => (
                                <Link
                                    key={ch.id}
                                    href={`/library/${id}/${ch.order_index}`}
                                    className="flex items-center justify-between p-6 md:p-8 rounded-2xl border border-white/[0.04] hover:border-amber-500/20 hover:bg-amber-500/[0.03] transition-all duration-300 group relative overflow-hidden"
                                >
                                    {/* קו עיצובי שמאלי */}
                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-amber-500/0 to-transparent group-hover:via-amber-500/40 transition-all duration-500 rounded-full" />

                                    <ChevronLeft size={20} className="text-white/10 group-hover:text-amber-500 group-hover:-translate-x-1 transition-all shrink-0" />

                                    <div className="flex-1 text-right mx-4">
                                        <span className="font-crimson text-xl md:text-2xl text-white/70 group-hover:text-white transition-colors leading-snug">
                                            {ch.title}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="font-cinzel text-[10px] text-white/20 font-black tracking-widest group-hover:text-amber-500/50 transition-colors">
                                            פרק
                                        </span>
                                        <span className="font-cinzel text-2xl md:text-3xl text-white/10 font-black group-hover:text-amber-500/40 transition-colors tabular-nums">
                                            {(idx + 1).toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 gap-8">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                                    <BookOpen size={36} className="text-white/10" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500/10 rounded-full border border-amber-500/20 flex items-center justify-center">
                                    <Sparkles size={12} className="text-amber-500/40" />
                                </div>
                            </div>
                            <div className="text-center space-y-3">
                                <p className="font-cinzel text-white/20 text-sm uppercase tracking-[0.3em] font-black">
                                    הספר עדיין ריק
                                </p>
                                <p className="font-crimson text-white/10 text-xl italic">
                                    "הדפים מחכים לדיו הראשון..."
                                </p>
                            </div>
                            {currentUserId === story?.author_id && (
                                <Link
                                    href={`/library/${id}/add-chapter`}
                                    className="inline-flex items-center gap-2 px-8 py-3 border border-dashed border-amber-500/20 hover:border-amber-500/50 rounded-2xl text-amber-500/40 hover:text-amber-500 font-cinzel text-xs uppercase tracking-widest font-black transition-all hover:bg-amber-500/5"
                                >
                                    <Plus size={14} /> כתוב את הפרק הראשון
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                .story-description p { margin-bottom: 1.5rem; }
                .story-description strong { color: white; font-weight: 900; }
                .story-description em { color: #f59e0b; font-style: italic; }
            `}</style>

            {AdultModal}
        </div>
    );
}

