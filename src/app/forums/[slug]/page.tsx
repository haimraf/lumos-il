"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import dynamic from 'next/dynamic';
import {
    ChevronLeft,
    Pin,
    Lock,
    MessageSquare,
    Clock,
    Plus,
    X,
    Home,
} from "lucide-react";

const ReactQuill = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => <div className="h-[220px] bg-white/5 animate-pulse rounded-lg" />,
});
import 'react-quill-new/dist/quill.snow.css';

interface Forum {
    id: string;
    name: string;
    description: string;
    slug: string;
    house_restriction: string | null;
}

interface Thread {
    id: string;
    title: string;
    author_id: string;
    is_pinned: boolean;
    is_locked: boolean;
    created_at: string;
    profiles: {
        full_name: string | null;
        house: string | null;
    };
}

const HOUSE_CONFIG: Record<string, { accent: string; text: string; badge: string; dot: string }> = {
    Gryffindor: { accent: "rgba(220,38,38,0.12)", text: "#f87171", badge: "bg-red-900/30 text-red-300 border-red-700/40", dot: "#dc2626" },
    Slytherin: { accent: "rgba(5,150,105,0.12)", text: "#34d399", badge: "bg-emerald-900/30 text-emerald-300 border-emerald-700/40", dot: "#059669" },
    Ravenclaw: { accent: "rgba(37,99,235,0.12)", text: "#60a5fa", badge: "bg-blue-900/30 text-blue-300 border-blue-700/40", dot: "#2563eb" },
    Hufflepuff: { accent: "rgba(217,119,6,0.12)", text: "#fbbf24", badge: "bg-amber-900/30 text-amber-300 border-amber-700/40", dot: "#d97706" },
};

const HOUSE_EMOJI: Record<string, string> = {
    Gryffindor: "🦁", Slytherin: "🐍", Ravenclaw: "🦅", Hufflepuff: "🦡",
};

function ThreadRow({ thread, slug, index }: { thread: Thread; slug: string; index: number }) {
    return (
        <Link
            href={`/forums/${slug}/${thread.id}`}
            className="group flex items-center gap-4 px-5 py-4 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03] transition-colors"
        >
            {/* Icon */}
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors
                ${thread.is_pinned
                    ? "bg-amber-500/15 text-amber-400"
                    : thread.is_locked
                        ? "bg-white/5 text-white/20"
                        : "bg-white/[0.04] text-white/25 group-hover:text-white/40"}`}
            >
                {thread.is_pinned ? <Pin size={15} /> : thread.is_locked ? <Lock size={15} /> : <MessageSquare size={15} />}
            </div>

            {/* Title + meta */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    {thread.is_pinned && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            נעוץ
                        </span>
                    )}
                    {thread.is_locked && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                            נעול
                        </span>
                    )}
                    <h4 className={`font-bold text-base truncate leading-tight transition-colors
                        ${thread.is_pinned ? "text-amber-300 group-hover:text-amber-200" : "text-white/80 group-hover:text-white"}`}>
                        {thread.title}
                    </h4>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    {thread.profiles?.house && (
                        <span className="text-sm">{HOUSE_EMOJI[thread.profiles.house] || ""}</span>
                    )}
                    <span className="text-[11px] text-white/30">
                        {thread.profiles?.full_name || "קוסם"}
                    </span>
                    <span className="text-white/15 text-[10px]">·</span>
                    <span className="text-[11px] text-white/20 flex items-center gap-1">
                        <Clock size={9} />
                        {new Date(thread.created_at).toLocaleDateString("he-IL")}
                    </span>
                </div>
            </div>

            <ChevronLeft size={14} className="text-white/15 group-hover:text-white/40 transition-colors shrink-0" />
        </Link>
    );
}

export default function ForumThreadsPage() {
    const { slug } = useParams();
    const router = useRouter();
    const supabase = createClient();

    const [forum, setForum] = useState<Forum | null>(null);
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isNewThreadOpen, setIsNewThreadOpen] = useState(false);
    const [newThreadTitle, setNewThreadTitle] = useState("");
    const [newThreadContent, setNewThreadContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchThreads = useCallback(async () => {
        if (!slug) return;
        try {
            const { data: forumData } = await supabase.from('forums').select('*').eq('slug', slug).single();
            if (!forumData) { router.push('/forums'); return; }

            const { data: { session } } = await supabase.auth.getSession();
            const { data: profile } = await supabase.from('profiles').select('house, role').eq('id', session?.user.id).maybeSingle();

            if (forumData.house_restriction && forumData.house_restriction !== profile?.house && profile?.role !== 'מנהל') {
                alert("לחש הגנה מונע ממך להיכנס למועדון הזה!");
                router.push('/forums');
                return;
            }

            setForum(forumData);

            const { data: threadsData } = await supabase
                .from('threads')
                .select('*, profiles(full_name, house)')
                .eq('forum_id', forumData.id)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });

            setThreads(threadsData as any || []);
        } catch (err) { console.error(err); } finally { setIsLoading(false); }
    }, [slug, supabase, router]);

    useEffect(() => { fetchThreads(); }, [fetchThreads]);

    const handleCreateThread = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanContent = newThreadContent.replace(/<[^>]*>?/gm, '').trim();
        if (!newThreadTitle.trim() || !cleanContent || !forum) return;

        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: thread, error: tError } = await supabase
                .from('threads')
                .insert([{ forum_id: forum.id, author_id: user.id, title: newThreadTitle.trim() }])
                .select().single();

            if (tError) throw tError;

            await supabase.from('forum_posts').insert([{ thread_id: thread.id, user_id: user.id, content: newThreadContent }]);

            setNewThreadTitle(""); setNewThreadContent("");
            setIsNewThreadOpen(false);
            fetchThreads();
        } catch (err: any) { alert("שגיאה: " + err.message); } finally { setIsSubmitting(false); }
    };

    const houseConfig = forum?.house_restriction ? HOUSE_CONFIG[forum.house_restriction] : null;
    const pinnedThreads = threads.filter(t => t.is_pinned);
    const normalThreads = threads.filter(t => !t.is_pinned);

    if (isLoading) return (
        <div className="min-h-screen bg-[#060910] flex items-center justify-center">
            <div className="w-8 h-8 border-t-2 border-amber-500/60 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#060910] text-white font-assistant" dir="rtl">
            <style>{`
                .forum-bg {
                    background-image:
                        linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px);
                    background-size: 40px 40px;
                }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .fade-up { animation: fadeUp 0.25s ease both; }
                .thread-editor .ql-container {
                    background: rgba(255,255,255,0.015);
                    border-color: rgba(255,255,255,0.08) !important;
                    color: white; min-height: 180px;
                    border-bottom-left-radius: 0.75rem; border-bottom-right-radius: 0.75rem;
                    font-family: 'Assistant', sans-serif; font-size: 1rem;
                }
                .thread-editor .ql-toolbar {
                    background: rgba(255,255,255,0.03);
                    border-color: rgba(255,255,255,0.08) !important;
                    border-top-left-radius: 0.75rem; border-top-right-radius: 0.75rem;
                    direction: rtl;
                }
                .thread-editor .ql-editor { text-align: right; direction: rtl; color: rgba(255,255,255,0.85); }
                .thread-editor .ql-editor.ql-blank::before { color: rgba(255,255,255,0.2); right: 15px; left: auto; font-style: normal; }
                .thread-editor .ql-snow .ql-stroke { stroke: rgba(255,255,255,0.35) !important; }
                .thread-editor .ql-snow .ql-fill { fill: rgba(255,255,255,0.35) !important; }
                .thread-editor .ql-snow.ql-toolbar button:hover .ql-stroke { stroke: #f59e0b !important; }
                .thread-editor .ql-picker-label { color: rgba(255,255,255,0.35); }
            `}</style>

            <div className="forum-bg min-h-screen">
                <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">

                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-xs font-bold text-white/30 font-cinzel tracking-wider mb-6">
                        <Link href="/" className="hover:text-white/60 transition-colors flex items-center gap-1">
                            <Home size={11} /> ראשי
                        </Link>
                        <ChevronLeft size={11} />
                        <Link href="/forums" className="hover:text-white/60 transition-colors">פורומים</Link>
                        <ChevronLeft size={11} />
                        <span style={{ color: houseConfig?.text || "#f59e0b" }} className="truncate max-w-[180px]">
                            {forum?.name}
                        </span>
                    </nav>

                    {/* Forum header */}
                    <div
                        className="fade-up border border-white/[0.07] rounded-xl px-6 py-5 flex items-center justify-between gap-4"
                        style={{ background: houseConfig ? houseConfig.accent : "rgba(255,255,255,0.02)" }}
                    >
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                {forum?.house_restriction && (
                                    <span className="text-lg">{HOUSE_EMOJI[forum.house_restriction]}</span>
                                )}
                                <h1 className="font-cinzel font-black text-xl md:text-2xl"
                                    style={{ color: houseConfig?.text || "white" }}>
                                    {forum?.name}
                                </h1>
                            </div>
                            {forum?.description && (
                                <p className="text-xs text-white/35 italic">{forum.description}</p>
                            )}
                        </div>
                        <button
                            onClick={() => setIsNewThreadOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-cinzel font-black text-sm
                                       bg-amber-600 hover:bg-amber-500 text-amber-950
                                       transition-all active:scale-95 shadow-lg shadow-amber-900/20 shrink-0"
                        >
                            <Plus size={15} /> נושא חדש
                        </button>
                    </div>

                    {/* Threads list */}
                    <div className="fade-up border border-white/[0.07] rounded-xl overflow-hidden" style={{ animationDelay: "60ms" }}>

                        {/* Column headers */}
                        <div className="hidden md:flex items-center px-5 py-2.5 bg-white/[0.02] border-b border-white/[0.06]
                                        text-[9px] font-black uppercase tracking-widest text-white/20">
                            <span className="flex-1">נושא</span>
                            <span className="w-24 text-right pl-6">תאריך</span>
                        </div>

                        {/* Pinned threads */}
                        {pinnedThreads.length > 0 && (
                            <>
                                <div className="px-5 py-2 bg-amber-500/[0.04] border-b border-amber-500/10">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-500/50">נעוצים</span>
                                </div>
                                {pinnedThreads.map((t, i) => (
                                    <ThreadRow key={t.id} thread={t} slug={slug as string} index={i} />
                                ))}
                            </>
                        )}

                        {/* Normal threads */}
                        {normalThreads.length > 0 && (
                            <>
                                {pinnedThreads.length > 0 && (
                                    <div className="px-5 py-2 bg-white/[0.015] border-b border-white/[0.05]">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20">כל הנושאים</span>
                                    </div>
                                )}
                                {normalThreads.map((t, i) => (
                                    <ThreadRow key={t.id} thread={t} slug={slug as string} index={i + pinnedThreads.length} />
                                ))}
                            </>
                        )}

                        {/* Empty state */}
                        {threads.length === 0 && (
                            <div className="py-16 text-center">
                                <MessageSquare size={28} className="mx-auto mb-3 text-white/15" />
                                <p className="text-sm font-bold text-white/25">אין נושאים עדיין</p>
                                <p className="text-xs mt-1 text-white/15">היה הראשון לפתוח דיון</p>
                            </div>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 px-1 text-[11px] text-white/20">
                        <span>{threads.length} נושאים</span>
                        {pinnedThreads.length > 0 && <>
                            <span className="text-white/10">·</span>
                            <span>{pinnedThreads.length} נעוצים</span>
                        </>}
                    </div>

                </div>
            </div>

            {/* Modal: New Thread */}
            {isNewThreadOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="bg-[#0a0f1a] border border-white/[0.08] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative fade-up" dir="rtl">

                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                                <Plus size={14} className="text-amber-500" />
                                <span className="font-cinzel font-black text-sm text-white/80">נושא חדש</span>
                                <span className="text-white/20 text-xs">· {forum?.name}</span>
                            </div>
                            <button onClick={() => setIsNewThreadOpen(false)} className="text-white/25 hover:text-white/60 transition-colors p-1">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal body */}
                        <form onSubmit={handleCreateThread} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/25">כותרת</label>
                                <input
                                    autoFocus required
                                    placeholder="על מה נדבר?"
                                    value={newThreadTitle}
                                    onChange={(e) => setNewThreadTitle(e.target.value)}
                                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-3
                                               text-base font-bold text-white placeholder:text-white/20
                                               focus:outline-none focus:border-amber-500/30 transition-colors"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/25">תוכן</label>
                                <div className="thread-editor">
                                    <ReactQuill
                                        theme="snow"
                                        value={newThreadContent}
                                        onChange={setNewThreadContent}
                                        placeholder="כתוב את הפוסט הראשון..."
                                        modules={{
                                            toolbar: [
                                                ['bold', 'italic', 'underline'],
                                                [{ list: 'ordered' }, { list: 'bullet' }],
                                                ['link', 'image'],
                                                ['clean'],
                                            ],
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setIsNewThreadOpen(false)}
                                    className="px-5 py-2.5 rounded-lg text-sm font-bold text-white/35 hover:text-white/60 transition-colors"
                                >
                                    ביטול
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-7 py-2.5 rounded-lg font-cinzel font-black text-sm
                                               bg-amber-600 hover:bg-amber-500 text-amber-950
                                               disabled:opacity-40 transition-all active:scale-95"
                                >
                                    {isSubmitting
                                        ? <><div className="w-4 h-4 border-t-2 border-amber-950 rounded-full animate-spin" /> שולח...</>
                                        : <><Plus size={15} /> פתח נושא</>
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}