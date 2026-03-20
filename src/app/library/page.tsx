"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import Link from "next/link";
import {
    BookOpen, ShieldAlert, PlusCircle, Sparkles,
    Lock, Flame, Eye, ChevronLeft, Home, Book as BookIcon,
    Clock, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LibraryPage() {
    const [stories, setStories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAgeGate, setShowAgeGate] = useState(false);
    const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        const confirmed = localStorage.getItem("lumos_adult_confirmed") === "true";
        setIsAdultConfirmed(confirmed);

        const fetchStories = async () => {
            try {
                const { data, error } = await supabase
                    .from('stories')
                    .select(`
                        id, 
                        title, 
                        description, 
                        rating, 
                        views_count,
                        cover_url,
                        house_theme,
                        created_at,
                        author_id,
                        profiles!author_id (
                            full_name,
                            avatar_url
                        )
                    `)
                    .eq('is_published', true)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setStories(data || []);
            } catch (err) {
                console.error("Lumos Error [Library]:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStories();
    }, [supabase]);

    const handleConfirmAge = () => {
        localStorage.setItem("lumos_adult_confirmed", "true");
        setIsAdultConfirmed(true);
        setShowAgeGate(false);
    };

    const getHouseStyles = (house: string) => {
        switch (house) {
            case 'Gryffindor': return "border-red-600/40 hover:border-red-500/80 shadow-[0_0_60px_rgba(185,28,28,0.2)] hover:shadow-[0_0_80px_rgba(185,28,28,0.4)] bg-red-950/5";
            case 'Slytherin': return "border-emerald-600/40 hover:border-emerald-500/80 shadow-[0_0_60px_rgba(5,150,105,0.2)] hover:shadow-[0_0_80px_rgba(5,150,105,0.4)] bg-emerald-950/5";
            case 'Ravenclaw': return "border-blue-600/40 hover:border-blue-500/80 shadow-[0_0_60px_rgba(37,99,235,0.2)] hover:shadow-[0_0_80px_rgba(37,99,235,0.4)] bg-blue-950/5";
            case 'Hufflepuff': return "border-amber-500/40 hover:border-amber-500/80 shadow-[0_0_60px_rgba(251,191,36,0.2)] hover:shadow-[0_0_80px_rgba(251,191,36,0.4)] bg-amber-950/5";
            default: return "border-white/10 hover:border-amber-500/50 bg-white/[0.02] shadow-[0_0_40px_rgba(245,158,11,0.1)] hover:shadow-[0_0_60px_rgba(245,158,11,0.2)]";
        }
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#060608]"><Sparkles className="text-amber-500 animate-pulse w-12 h-12" /></div>;

    return (
        <div className="min-h-screen bg-[#060608] text-white selection:bg-amber-500/30 pb-32" dir="rtl">
            <AnimatePresence>
                {showAgeGate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/98 backdrop-blur-3xl p-6"
                    >
                        {/* שינוי ה-div העוטף של המודל (שורה 97) */}
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="glass-panel w-full p-8 md:p-12 rounded-[2.5rem] border-2 border-red-500/50 text-center shadow-[0_0_120px_rgba(220,38,38,0.3)] bg-[#0a0a0c]"
                            style={{ maxWidth: '450px' }} // "הגרזן": מקבע את הרוחב של המודל
                        >
                            <div className="w-20 h-20 bg-red-600/10 rounded-full flex items-center justify-center mx-auto border-2 border-red-600 mb-6 animate-pulse">
                                <ShieldAlert size={40} className="text-red-500" />
                            </div>
                            <h2 className="font-cinzel text-2xl md:text-3xl font-black text-red-400 mb-4 tracking-tighter uppercase">הספרייה האסורה</h2>
                            <p className="font-crimson text-lg md:text-xl text-white/70 mb-10 leading-relaxed italic">
                                "מדף זה מכיל תכנים המיועדים לקוסמים בוגרים בלבד (18+). האם תרצה להמשיך?"
                            </p>
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={handleConfirmAge}
                                    className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl transition-all shadow-[0_10px_40px_rgba(220,38,38,0.4)] active:scale-95 text-base"
                                >
                                    אני מאשר, פתח את הספר
                                </button>
                                <button
                                    onClick={() => setShowAgeGate(false)}
                                    className="w-full text-white/30 hover:text-white hover:bg-white/5 py-4 rounded-xl transition-all text-xs uppercase font-black tracking-widest"
                                >
                                    חזרה לאזור הבטוח
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="mx-auto px-6 py-12" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <nav className="mb-12 flex items-center gap-4 text-white/30 text-[10px] font-black uppercase tracking-[0.3em]" aria-label="ניווט">
                    <Link href="/" className="hover:text-amber-500 transition-colors flex items-center gap-1.5"><Home size={12} /> ראשי</Link>
                    <ChevronLeft size={10} />
                    <span className="text-amber-500/60 flex items-center gap-1.5"><BookIcon size={12} /> הספרייה</span>
                </nav>

                <header className="mb-32 flex flex-col lg:flex-row justify-between items-end gap-12">
                    <motion.div
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="max-w-3xl"
                    >
                        <h1 className="font-cinzel text-7xl md:text-9xl font-black text-amber-500 uppercase leading-[0.8] drop-shadow-[0_15px_50px_rgba(245,158,11,0.4)] mb-2">
                            הספרייה
                        </h1>
                        <div className="h-1 w-32 bg-gradient-to-l from-amber-500 to-transparent rounded-full mb-8" />
                        <p className="font-crimson text-3xl text-white/50 italic flex items-center gap-4">
                            <Flame size={28} className="text-amber-500/50 animate-pulse" />
                            "אלפי סיפורים מחכים להיכתב בין הצללים של הוגוורטס..."
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                    >
                        <Link href="/library/create" className="glass-panel px-12 py-8 rounded-[2.5rem] border-2 border-amber-500/30 hover:border-amber-500/70 transition-all flex items-center gap-6 group shadow-[0_0_60px_rgba(245,158,11,0.2)] hover:shadow-[0_0_80px_rgba(245,158,11,0.3)] bg-[#0d0d0f] hover:bg-amber-500/[0.03] hover:scale-105 active:scale-95">
                            <PlusCircle size={32} className="text-amber-500 group-hover:rotate-90 transition-transform duration-700" />
                            <div className="text-right">
                                <span className="block text-[10px] text-amber-500/60 uppercase font-black tracking-[0.2em] mb-1">יוצר חדש?</span>
                                <span className="block font-cinzel text-2xl text-amber-400 font-black tracking-widest uppercase">כתוב סיפור</span>
                            </div>
                        </Link>
                    </motion.div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
                    {stories.map((story, index) => {
                        const isAdult = story.rating === 'R' || story.rating === '18+';
                        const isYouth = story.rating === 'PG-13';
                        const isLocked = isAdult && !isAdultConfirmed;

                        return (
                            <motion.div
                                key={story.id}
                                initial={{ y: 40, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{
                                    delay: index * 0.08,
                                    duration: 0.6,
                                    ease: [0.22, 1, 0.36, 1]
                                }}
                            >
                                <Link
                                    href={isLocked ? "#" : `/library/${story.id}`}
                                    onClick={(e) => { if (isLocked) { e.preventDefault(); setShowAgeGate(true); } }}
                                    className="group block h-full focus:outline-none"
                                >
                                    <div className={`glass-panel h-full rounded-[3.5rem] border-2 transition-all duration-700 hover:-translate-y-8 hover:rotate-1 flex flex-col relative overflow-hidden shadow-2xl ${getHouseStyles(story.house_theme)} ${isLocked ? 'grayscale opacity-70 hover:opacity-80' : ''}`}>

                                        {/* תמונת כריכה - משופרת */}
                                        <div className="h-72 w-full relative bg-gradient-to-br from-[#0a0a0c] to-[#060608] flex items-center justify-center overflow-hidden border-b border-white/10 group/cover">
                                            {story.cover_url && story.cover_url.startsWith('http') ? (
                                                <>
                                                    <img
                                                        src={story.cover_url}
                                                        alt={story.title}
                                                        className="w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-110"
                                                    />
                                                    {/* Gradient Overlay למראה מקצועי */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                                                </>
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center p-10 bg-gradient-to-br from-white/[0.03] to-transparent">
                                                    <BookIcon size={64} className="text-amber-500/10 mb-4 group-hover/cover:scale-110 group-hover/cover:text-amber-500/20 transition-all duration-700" />
                                                    <span className="font-cinzel text-[10px] font-bold text-amber-500/20 uppercase tracking-[0.4em] text-center line-clamp-2">{story.title}</span>
                                                </div>
                                            )}

                                            <div className={`absolute top-8 right-8 px-5 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-20 backdrop-blur-xl transition-all duration-500 group-hover:scale-110 ${isAdult ? 'bg-red-950/90 border-red-500/60 text-red-400 shadow-red-500/30' :
                                                isYouth ? 'bg-amber-950/90 border-amber-500/60 text-amber-400 shadow-amber-500/30' :
                                                    'bg-emerald-950/90 border-emerald-500/60 text-emerald-400 shadow-emerald-500/30'
                                                }`}>
                                                {isAdult ? <Lock size={14} className="animate-pulse" /> : isYouth ? <Zap size={14} /> : <Sparkles size={14} />}
                                                {isAdult ? '18+' : isYouth ? 'לב צעיר' : 'לכולם'}
                                            </div>

                                            {isLocked && (
                                                <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-10 group-hover:bg-black/80 transition-all">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <Lock className="text-red-500/70 animate-pulse" size={56} />
                                                        <span className="text-red-400/80 font-cinzel text-xs uppercase tracking-[0.3em] font-black">נעול</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-10 pb-6 flex-grow">
                                            <h3 className="font-cinzel text-3xl font-black mb-5 group-hover:text-amber-500 transition-colors line-clamp-2 leading-tight tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                                                {story.title}
                                            </h3>

                                            <div className="text-[10px] text-white/30 uppercase tracking-[0.3em] mb-6 flex items-center gap-3 font-black">
                                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center text-amber-400 border border-amber-500/30 font-cinzel text-sm">
                                                    {story.profiles?.full_name?.[0] || "H"}
                                                </div>
                                                <span className="group-hover:text-amber-500/60 transition-colors">מאת: {story.profiles?.full_name || "קוסם אנונימי"}</span>
                                            </div>

                                            <p className="font-crimson text-white/60 group-hover:text-white/70 line-clamp-3 leading-relaxed italic text-xl transition-colors">
                                                "{story.description || "אין תיאור לסיפור זה..."}"
                                            </p>
                                        </div>

                                        <div className="px-10 pb-10 flex items-center justify-between mt-auto border-t border-white/5 pt-6">
                                            <div className="flex items-center gap-6 text-white/20 text-[10px] font-black uppercase tracking-widest">
                                                <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg border border-white/10 group-hover:text-amber-500/70 group-hover:border-amber-500/20 transition-all">
                                                    <Eye size={13} />
                                                    <span>{story.views_count || 0}</span>
                                                </div>
                                                <div className="flex items-center gap-2 group-hover:text-white/30 transition-colors">
                                                    <Clock size={13} />
                                                    <span>{new Date(story.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}</span>
                                                </div>
                                            </div>
                                            <Sparkles size={22} className="text-amber-500/30 group-hover:text-amber-500 group-hover:rotate-12 group-hover:scale-125 transition-all duration-700" />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>

                {stories.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-40 border-2 border-dashed border-white/10 rounded-[4rem] bg-gradient-to-br from-white/[0.02] to-transparent"
                    >
                        <BookOpen size={80} className="text-amber-500/20 mx-auto mb-8 animate-pulse" />
                        <p className="font-crimson text-3xl text-white/30 italic max-w-2xl mx-auto leading-relaxed">
                            "הספרייה עדיין שקטה... המדפים מחכים לסיפור הראשון שלך."
                        </p>
                        <Link
                            href="/library/create"
                            className="inline-flex items-center gap-3 mt-12 px-10 py-5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 hover:border-amber-500/50 rounded-2xl text-amber-400 font-cinzel font-black uppercase tracking-widest transition-all hover:scale-105"
                        >
                            <PlusCircle size={20} />
                            צור את הסיפור הראשון
                        </Link>
                    </motion.div>
                )}
            </div>

            <style jsx global>{`
                ::-webkit-scrollbar { width: 10px; }
                ::-webkit-scrollbar-track { background: #060608; }
                ::-webkit-scrollbar-thumb { background: #1e1b1e; border-radius: 10px; border: 3px solid #060608; }
                ::-webkit-scrollbar-thumb:hover { background: #451a03; }
            `}</style>
        </div>
    );
}