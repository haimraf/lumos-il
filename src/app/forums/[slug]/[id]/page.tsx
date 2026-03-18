"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import dynamic from 'next/dynamic';
import {
    ChevronLeft,
    Clock,
    Reply,
    Zap,
    Hash,
    Home,
    MessageSquare,
} from "lucide-react";

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

interface Profile {
    full_name: string | null;
    house: string | null;
    role: string | null;
}

interface Post {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles: Profile;
}

interface Thread {
    id: string;
    title: string;
    forum_id: string;
}

interface Forum {
    id: string;
    name: string;
    slug: string;
}

const HOUSE_CONFIG: Record<string, { accent: string; bg: string; badge: string }> = {
    Gryffindor: { accent: "#dc2626", bg: "rgba(220,38,38,0.06)", badge: "bg-red-900/40 text-red-300 border-red-700/50" },
    Slytherin: { accent: "#059669", bg: "rgba(5,150,105,0.06)", badge: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50" },
    Ravenclaw: { accent: "#2563eb", bg: "rgba(37,99,235,0.06)", badge: "bg-blue-900/40 text-blue-300 border-blue-700/50" },
    Hufflepuff: { accent: "#d97706", bg: "rgba(217,119,6,0.06)", badge: "bg-amber-900/40 text-amber-300 border-amber-700/50" },
};

const HOUSE_AVATARS: Record<string, string> = {
    Gryffindor: "🦁", Slytherin: "🐍", Ravenclaw: "🦅", Hufflepuff: "🦡",
};

function PostNumber({ n }: { n: number }) {
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-white/20">
            <Hash size={9} />{n}
        </span>
    );
}

function Avatar({ house }: { house: string | null }) {
    const emoji = house && HOUSE_AVATARS[house] ? HOUSE_AVATARS[house] : "🧙";
    const config = house ? HOUSE_CONFIG[house] : null;
    return (
        <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl border shrink-0"
            style={{
                background: config ? config.bg : "rgba(255,255,255,0.04)",
                borderColor: config ? config.accent + "40" : "rgba(255,255,255,0.08)",
            }}
        >
            {emoji}
        </div>
    );
}

export default function ThreadViewPage() {
    const { slug, id } = useParams();
    const router = useRouter();
    const supabase = createClient();

    const [forum, setForum] = useState<Forum | null>(null);
    const [thread, setThread] = useState<Thread | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [replyContent, setReplyContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        if (!id) return;

        // שליפת הנושא
        const { data: threadData } = await supabase
            .from('threads')
            .select('id, title, forum_id')
            .eq('id', id)
            .single();

        if (!threadData) { router.push('/forums'); return; }
        setThread(threadData);

        // שליפת הפורום לפירורי הלחם
        const { data: forumData } = await supabase
            .from('forums')
            .select('id, name, slug')
            .eq('id', threadData.forum_id)
            .single();

        if (forumData) setForum(forumData);

        // שליפת הפוסטים
        const { data: postsData } = await supabase
            .from('forum_posts')
            .select('*, profiles(full_name, house, role)')
            .eq('thread_id', id)
            .order('created_at', { ascending: true });

        setPosts(postsData as any || []);
        setIsLoading(false);
    }, [id, supabase, router]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleReply = async () => {
        const cleanContent = replyContent.replace(/<[^>]*>?/gm, '').trim();
        if (!cleanContent || isSubmitting) return;

        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { error } = await supabase
                .from('forum_posts')
                .insert([{ thread_id: id, user_id: user.id, content: replyContent }]);

            if (!error) {
                setReplyContent("");
                fetchData();
            }
        }
        setIsSubmitting(false);
    };

    if (isLoading) return (
        <div className="min-h-screen bg-[#060910] flex items-center justify-center">
            <div className="w-8 h-8 border-t-2 border-amber-500/60 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#060910] text-white font-assistant" dir="rtl">
            <style>{`
                .post-body { font-family: 'Assistant', sans-serif; line-height: 1.85; font-size: 1.05rem; color: rgba(255,255,255,0.82); }
                .post-body p { margin-bottom: 0.9rem; }
                .post-body img { border-radius: 0.75rem; max-width: 100%; margin: 1rem 0; }
                .post-body blockquote {
                    border-right: 3px solid rgba(245,158,11,0.4);
                    padding: 0.6rem 1rem; margin: 1rem 0;
                    background: rgba(245,158,11,0.04);
                    border-radius: 0 0.5rem 0.5rem 0;
                    color: rgba(255,255,255,0.55); font-style: italic;
                }
                .post-body strong { color: rgba(255,255,255,0.95); }
                .post-body a { color: #f59e0b; text-decoration: underline; text-underline-offset: 3px; }

                .reply-editor .ql-container {
                    background: rgba(255,255,255,0.015);
                    border-color: rgba(255,255,255,0.08) !important;
                    color: white; min-height: 130px;
                    border-bottom-left-radius: 0.75rem; border-bottom-right-radius: 0.75rem;
                    font-family: 'Assistant', sans-serif; font-size: 1rem;
                }
                .reply-editor .ql-toolbar {
                    background: rgba(255,255,255,0.03);
                    border-color: rgba(255,255,255,0.08) !important;
                    border-top-left-radius: 0.75rem; border-top-right-radius: 0.75rem;
                    direction: rtl;
                }
                .reply-editor .ql-editor { text-align: right; direction: rtl; color: rgba(255,255,255,0.85); }
                .reply-editor .ql-editor.ql-blank::before { color: rgba(255,255,255,0.2); right: 15px; left: auto; font-style: normal; }
                .reply-editor .ql-snow .ql-stroke { stroke: rgba(255,255,255,0.35) !important; }
                .reply-editor .ql-snow .ql-fill { fill: rgba(255,255,255,0.35) !important; }
                .reply-editor .ql-snow.ql-toolbar button:hover .ql-stroke { stroke: #f59e0b !important; }
                .reply-editor .ql-picker-label { color: rgba(255,255,255,0.35); }

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
                .post-card { animation: fadeUp 0.25s ease both; }
            `}</style>

            <div className="forum-bg min-h-screen">
                <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">

                    {/* ── Breadcrumb ── */}
                    <nav className="flex items-center gap-2 text-xs font-bold text-white/30 font-cinzel tracking-wider mb-4 flex-wrap">
                        <Link href="/" className="hover:text-white/60 transition-colors flex items-center gap-1 shrink-0">
                            <Home size={11} /> ראשי
                        </Link>
                        <ChevronLeft size={11} className="shrink-0" />
                        <Link href="/forums" className="hover:text-white/60 transition-colors shrink-0">
                            פורומים
                        </Link>
                        {forum && (
                            <>
                                <ChevronLeft size={11} className="shrink-0" />
                                <Link
                                    href={`/forums/${forum.slug}`}
                                    className="hover:text-white/60 transition-colors truncate max-w-[100px]"
                                >
                                    {forum.name}
                                </Link>
                            </>
                        )}
                        <ChevronLeft size={11} className="shrink-0" />
                        <span className="text-amber-500/80 truncate max-w-[140px]">{thread?.title}</span>
                    </nav>

                    {/* ── Thread title bar ── */}
                    <div className="border border-white/[0.07] rounded-xl bg-white/[0.02] px-5 py-4">
                        <h1 className="font-cinzel text-lg md:text-xl font-black text-white leading-tight">
                            {thread?.title}
                        </h1>
                        <p className="text-xs text-white/25 flex items-center gap-1.5 mt-1">
                            <MessageSquare size={10} />
                            {posts.length} הודעות
                        </p>
                    </div>

                    {/* ── Posts ── */}
                    <div className="space-y-3">
                        {posts.map((post, index) => {
                            const config = post.profiles?.house ? HOUSE_CONFIG[post.profiles.house] : null;
                            const isFirst = index === 0;

                            return (
                                <div
                                    key={post.id}
                                    className="post-card border border-white/[0.07] rounded-xl overflow-hidden"
                                    style={{
                                        animationDelay: `${index * 40}ms`,
                                        background: config ? config.bg : "rgba(255,255,255,0.015)",
                                        ...(isFirst && config ? { borderColor: config.accent + "30" } : {}),
                                    }}
                                >
                                    {/* Header */}
                                    <div
                                        className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]"
                                        style={{ background: "rgba(0,0,0,0.2)" }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar house={post.profiles?.house} />
                                            <div>
                                                <p className="font-cinzel font-black text-sm text-white leading-none">
                                                    {post.profiles?.full_name || "קוסם"}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span className="text-[10px] text-white/30 uppercase tracking-widest">
                                                        {post.profiles?.role || "תלמיד/ה"}
                                                    </span>
                                                    {post.profiles?.house && (
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${config?.badge}`}>
                                                            {post.profiles.house}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 text-white/20 shrink-0">
                                            <span className="hidden sm:flex items-center gap-1.5 text-[10px]">
                                                <Clock size={10} />
                                                {new Date(post.created_at).toLocaleString("he-IL", {
                                                    day: "2-digit", month: "2-digit", year: "numeric",
                                                    hour: "2-digit", minute: "2-digit",
                                                })}
                                            </span>
                                            <PostNumber n={index + 1} />
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="px-5 py-5">
                                        <div className="post-body" dangerouslySetInnerHTML={{ __html: post.content }} />
                                    </div>

                                    {/* Footer */}
                                    <div className="px-5 py-2.5 border-t border-white/[0.04] flex justify-end">
                                        <button className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/20 hover:text-amber-500/70 transition-colors">
                                            <Reply size={11} /> ציטוט
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Reply box ── */}
                    <div className="mt-6 border border-white/[0.07] rounded-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02] flex items-center gap-2">
                            <Zap size={13} className="text-amber-500" />
                            <span className="font-cinzel font-black text-sm text-white/70">תגובה מהירה</span>
                        </div>

                        <div className="p-5 space-y-4" style={{ background: "rgba(0,0,0,0.15)" }}>
                            <div className="reply-editor">
                                <ReactQuill
                                    theme="snow"
                                    value={replyContent}
                                    onChange={setReplyContent}
                                    placeholder="כתוב את תגובתך..."
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

                            <div className="flex justify-end">
                                <button
                                    onClick={handleReply}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-7 py-2.5 rounded-lg font-cinzel font-black text-sm
                                               bg-amber-600 hover:bg-amber-500 text-amber-950
                                               disabled:opacity-40 disabled:cursor-not-allowed
                                               transition-all active:scale-95 shadow-lg shadow-amber-900/20"
                                >
                                    {isSubmitting
                                        ? <><div className="w-4 h-4 border-t-2 border-amber-950 rounded-full animate-spin" /> שולח...</>
                                        : <><Reply size={14} /> שלח תגובה</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}