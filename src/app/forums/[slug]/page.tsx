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
    Sparkles,
    Tag
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
    prefix: string | null;
    is_pinned: boolean;
    is_locked: boolean;
    created_at: string;
    reply_count?: number;
    profiles: {
        full_name: string | null;
        house: string | null;
        is_online: boolean | null;
        gender: string | null;
    };
}

// ✨ הגדרת צבעים לתחיליות
const PREFIX_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
    "דיון": { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    "שאלה": { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
    "תיאוריה": { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
    "פרסום": { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
};

const HOUSE_CONFIG: Record<string, { accent: string; text: string; badge: string; dot: string; color: string }> = {
    Gryffindor: { accent: "rgba(220,38,38,0.12)", text: "#f87171", badge: "bg-red-900/30 text-red-300 border-red-700/40", dot: "#dc2626", color: "text-red-400" },
    Slytherin: { accent: "rgba(5,150,105,0.12)", text: "#34d399", badge: "bg-emerald-900/30 text-emerald-300 border-emerald-700/40", dot: "#059669", color: "text-emerald-400" },
    Ravenclaw: { accent: "rgba(37,99,235,0.12)", text: "#60a5fa", badge: "bg-blue-900/30 text-blue-300 border-blue-700/40", dot: "#2563eb", color: "text-blue-400" },
    Hufflepuff: { accent: "rgba(217,119,6,0.12)", text: "#fbbf24", badge: "bg-amber-900/30 text-amber-300 border-amber-700/40", dot: "#d97706", color: "text-amber-400" },
};

const HOUSE_EMOJI: Record<string, string> = {
    Gryffindor: "🦁", Slytherin: "🐍", Ravenclaw: "🦅", Hufflepuff: "🦡",
};

function ThreadRow({ thread, slug }: { thread: Thread; slug: string }) {
    const config = thread.profiles?.house ? HOUSE_CONFIG[thread.profiles.house] : null;
    const prefixStyle = thread.prefix ? PREFIX_CONFIG[thread.prefix] : null;
    const isFemale = thread.profiles?.gender === 'female';
    const defaultTitle = isFemale ? "מכשפה" : "קוסם";

    return (
        <Link
            href={`/forums/${slug}/${thread.id}`}
            className="group flex items-center gap-4 px-6 py-5 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03] transition-all duration-300"
        >
            <div className="relative shrink-0">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110
                    ${thread.is_pinned
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                        : thread.is_locked
                            ? "bg-white/5 text-white/20"
                            : "bg-white/[0.04] text-white/25 border border-white/[0.08]"}`}
                >
                    {thread.is_pinned ? <Pin size={18} /> : thread.is_locked ? <Lock size={18} /> : <span>{thread.profiles?.house ? HOUSE_EMOJI[thread.profiles.house] : <MessageSquare size={18} />}</span>}
                </div>
                {thread.profiles?.is_online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0f1a] shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    {/* ✨ תצוגת תחילית צבעונית */}
                    {thread.prefix && prefixStyle && (
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${prefixStyle.bg} ${prefixStyle.text} ${prefixStyle.border}`}>
                            {thread.prefix}
                        </span>
                    )}
                    <h4 className={`font-bold text-lg truncate leading-tight transition-colors
                        ${thread.is_pinned ? "text-amber-300 group-hover:text-amber-200" : "text-white/80 group-hover:text-white"}`}>
                        {thread.title}
                    </h4>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className={`font-cinzel font-bold tracking-wider ${config ? config.color : 'text-white/40'} truncate max-w-[120px]`}>
                        {thread.profiles?.full_name || defaultTitle}
                    </span>
                    <span className="text-white/10">|</span>
                    <span className="text-white/25 flex items-center gap-1.5">
                        <Clock size={11} />
                        {new Date(thread.created_at).toLocaleDateString("he-IL")}
                    </span>
                </div>
            </div>

            <div className="hidden md:flex flex-col items-center justify-center min-w-[60px] px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <span className="font-mono font-black text-sm text-white/70 leading-none">{thread.reply_count || 0}</span>
                <span className="text-[9px] uppercase tracking-widest text-white/20 mt-1 font-bold">תגובות</span>
            </div>

            <ChevronLeft size={18} className="text-white/10 group-hover:text-amber-500 transition-all group-hover:-translate-x-1 shrink-0" />
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

    const [newThreadPrefix, setNewThreadPrefix] = useState("דיון");
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
                router.push('/forums');
                return;
            }

            setForum(forumData);

            const { data: threadsData } = await supabase
                .from('threads')
                .select('*, profiles(full_name, house, is_online, gender), forum_posts(count)')
                .eq('forum_id', forumData.id)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });

            const formattedThreads = threadsData?.map((t: any) => ({
                ...t,
                reply_count: t.forum_posts?.[0]?.count || 0
            }));

            setThreads(formattedThreads as any || []);
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
                .insert([{
                    forum_id: forum.id,
                    author_id: user.id,
                    title: newThreadTitle.trim(),
                    prefix: newThreadPrefix
                }])
                .select().single();

            if (tError) throw tError;

            await supabase.from('forum_posts').insert([{ thread_id: thread.id, user_id: user.id, content: newThreadContent }]);

            setNewThreadTitle(""); setNewThreadContent("");
            setIsNewThreadOpen(false);
            fetchThreads();
        } catch (err: any) { console.error(err); } finally { setIsSubmitting(false); }
    };

    const houseConfig = forum?.house_restriction ? HOUSE_CONFIG[forum.house_restriction] : null;

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
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .fade-up { animation: fadeUp 0.3s ease both; }
                
                /* ✨ תיקון יישור לימין לעורך הטקסט */
                .thread-editor .ql-editor {
                    text-align: right;
                    direction: rtl;
                    color: rgba(255,255,255,0.85);
                }
                .thread-editor .ql-editor.ql-blank::before {
                    left: auto !important;
                    right: 15px !important;
                    text-align: right !important;
                    direction: rtl !important;
                    color: rgba(255,255,255,0.2);
                    font-style: normal;
                }
                .thread-editor .ql-container {
                    background: rgba(255,255,255,0.015);
                    border-color: rgba(255,255,255,0.08) !important;
                    color: white; min-height: 200px;
                    border-bottom-left-radius: 0.75rem; border-bottom-right-radius: 0.75rem;
                }
                .thread-editor .ql-toolbar {
                    background: rgba(255,255,255,0.03);
                    border-color: rgba(255,255,255,0.08) !important;
                    border-top-left-radius: 0.75rem; border-top-right-radius: 0.75rem;
                }
                .thread-editor .ql-snow .ql-stroke { stroke: rgba(255,255,255,0.35) !important; }
                .thread-editor .ql-snow .ql-fill { fill: rgba(255,255,255,0.35) !important; }
            `}</style>

            <div className="forum-bg min-h-screen">
                <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">

                    <nav className="flex items-center gap-2 text-xs font-bold text-white/30 font-cinzel tracking-wider bg-black/20 p-3 rounded-lg border border-white/[0.03] fade-up">
                        <Link href="/" className="hover:text-white/60 transition-colors flex items-center gap-1">
                            <Home size={12} /> ראשי
                        </Link>
                        <ChevronLeft size={11} />
                        <Link href="/forums" className="hover:text-white/60 transition-colors">פורומים</Link>
                        <ChevronLeft size={11} />
                        <span style={{ color: houseConfig?.text || "#f59e0b" }} className="truncate max-w-[200px]">
                            {forum?.name}
                        </span>
                    </nav>

                    <div className="fade-up flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.02] border border-white/[0.07] rounded-2xl p-6 md:p-8"
                        style={{ background: houseConfig ? `linear-gradient(135deg, ${houseConfig.accent} 0%, transparent 100%)` : undefined }}>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                {forum?.house_restriction && (
                                    <span className="text-3xl drop-shadow-md">{HOUSE_EMOJI[forum.house_restriction]}</span>
                                )}
                                <h1 className="font-cinzel font-black text-2xl md:text-3xl drop-shadow-md"
                                    style={{ color: houseConfig?.text || "white" }}>
                                    {forum?.name}
                                </h1>
                            </div>
                            <p className="text-sm text-white/40 italic font-crimson max-w-2xl">{forum?.description}</p>
                        </div>
                        <button
                            onClick={() => setIsNewThreadOpen(true)}
                            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-cinzel font-black text-base
                                       bg-amber-600 hover:bg-amber-500 text-amber-950
                                       transition-all active:scale-95 shadow-xl shadow-amber-900/20 shrink-0"
                        >
                            <Plus size={18} /> נושא חדש
                        </button>
                    </div>

                    <div className="fade-up border border-white/[0.07] rounded-2xl bg-[#0a0f1a] shadow-2xl overflow-hidden" style={{ animationDelay: "100ms" }}>
                        <div className="hidden md:flex items-center px-6 py-3 bg-black/40 border-b border-white/[0.05] text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                            <span className="flex-1 flex items-center gap-2"><MessageSquare size={12} /> נושאי שיחה</span>
                            <span className="w-32 text-center">מידע נוסף</span>
                        </div>

                        {threads.length > 0 ? (
                            <div className="divide-y divide-white/[0.04]">
                                {threads.map((t) => (
                                    <ThreadRow key={t.id} thread={t} slug={slug as string} />
                                ))}
                            </div>
                        ) : (
                            <div className="py-24 text-center">
                                <Sparkles size={40} className="mx-auto mb-4 text-amber-500/20 animate-pulse" />
                                <p className="font-cinzel font-black text-xl text-white/30 tracking-widest uppercase">הדפים עדיין ריקים</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal: New Thread */}
            {isNewThreadOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0a0f1a]/80 border border-white/10 w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden relative fade-up flex flex-col" dir="rtl">
                        <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Plus size={18} /></div>
                                <div>
                                    <h3 className="font-cinzel font-black text-lg text-white tracking-widest">פתיחת דיון חדש</h3>
                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{forum?.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsNewThreadOpen(false)} className="text-white/20 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateThread} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-amber-500/60 mr-2 flex items-center gap-2"><Tag size={12} /> תחילית הנושא</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.keys(PREFIX_CONFIG).map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setNewThreadPrefix(opt)}
                                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all border ${newThreadPrefix === opt
                                                    ? `${PREFIX_CONFIG[opt].bg} ${PREFIX_CONFIG[opt].border} ${PREFIX_CONFIG[opt].text} scale-105 shadow-lg`
                                                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-amber-500/60 mr-2">כותרת הנושא</label>
                                <input
                                    autoFocus required
                                    placeholder="על מה נדבר היום?"
                                    value={newThreadTitle}
                                    onChange={(e) => setNewThreadTitle(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4
                                               text-lg font-bold text-white placeholder:text-white/20
                                               focus:outline-none focus:border-amber-500/30 focus:bg-white/[0.08] transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-amber-500/60 mr-2">תוכן הפוסט</label>
                                <div className="thread-editor shadow-inner">
                                    <ReactQuill
                                        theme="snow"
                                        value={newThreadContent}
                                        onChange={setNewThreadContent}
                                        placeholder="שתף את הקסם שלך עם הקהילה..."
                                        modules={{
                                            toolbar: [
                                                ['bold', 'italic', 'underline', 'blockquote'],
                                                [{ list: 'ordered' }, { list: 'bullet' }],
                                                ['link', 'image'],
                                                ['clean'],
                                            ],
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsNewThreadOpen(false)}
                                    className="px-8 py-3.5 rounded-xl text-sm font-black font-cinzel tracking-widest text-white/30 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    ביטול
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center gap-3 px-10 py-3.5 rounded-xl font-cinzel font-black text-base
                                               bg-amber-600 hover:bg-amber-500 text-amber-950
                                               disabled:opacity-40 transition-all active:scale-95 shadow-xl shadow-amber-900/30"
                                >
                                    {isSubmitting
                                        ? <><div className="w-5 h-5 border-t-2 border-amber-950 rounded-full animate-spin" /> שולח...</>
                                        : <><Sparkles size={18} /> שליחת ינשוף</>
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