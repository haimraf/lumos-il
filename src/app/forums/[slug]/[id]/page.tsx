"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import dynamic from 'next/dynamic';
import {
    ChevronLeft, Clock, Reply, Zap, Hash, Home, MessageSquare, Edit3, Trash2, Flag, GraduationCap, AtSign, EyeOff, Eye, AlertTriangle, Check, X, Venus, Mars
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false }) as any;
import 'react-quill-new/dist/quill.snow.css';

/**
 * LUMOS IL - THREAD VIEW V1.3 (Gender Icon & Postbit Polish)
 */

const HOUSE_CONFIG: Record<string, { accent: string; bg: string; badge: string; nameHe: string; textColor: string; glow: string }> = {
    Gryffindor: { accent: "#dc2626", bg: "rgba(220,38,38,0.06)", badge: "bg-red-900/40 text-red-300 border-red-700/50", nameHe: "גריפינדור", textColor: "text-red-400", glow: "shadow-[0_0_20px_rgba(220,38,38,0.4)]" },
    Slytherin: { accent: "#059669", bg: "rgba(5,150,105,0.07)", badge: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50", nameHe: "סלית'רין", textColor: "text-emerald-400", glow: "shadow-[0_0_20px_rgba(5,150,105,0.4)]" },
    Ravenclaw: { accent: "#2563eb", bg: "rgba(37,99,235,0.07)", badge: "bg-blue-900/40 text-blue-300 border-blue-700/50", nameHe: "רייבנקלו", textColor: "text-blue-400", glow: "shadow-[0_0_20px_rgba(37,99,235,0.4)]" },
    Hufflepuff: { accent: "#fbbf24", bg: "rgba(251,191,36,0.07)", badge: "bg-amber-900/40 text-amber-300 border-amber-700/50", nameHe: "הפלפאף", textColor: "text-amber-400", glow: "shadow-[0_0_20px_rgba(251,191,36,0.4)]" },
};

const PREFIX_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
    "דיון": { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    "שאלה": { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
    "תיאוריה": { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
    "פרסום": { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
};

function Avatar({ house, isOnline, className = "w-10 h-10 text-xl" }: { house?: string | null, isOnline?: boolean | null, className?: string }) {
    const emoji = house === "Gryffindor" ? "🦁" : house === "Slytherin" ? "🐍" : house === "Ravenclaw" ? "🦅" : house === "Hufflepuff" ? "🦡" : "🧙";
    const config = house ? HOUSE_CONFIG[house] : null;
    return (
        <div className="relative inline-block group">
            <div className={`rounded-lg flex items-center justify-center border shrink-0 transition-all duration-500 ${className} ${config ? `group-hover:${config.glow} group-hover:scale-105` : ''}`}
                style={{
                    background: config ? config.bg : "rgba(255,255,255,0.04)",
                    borderColor: config ? config.accent + "40" : "rgba(255,255,255,0.08)"
                }}>
                {emoji}
            </div>
            {isOnline && <div className="absolute -bottom-1 -right-1 magic-online-dot" />}
        </div>
    );
}

export default function ThreadViewPage() {
    const { slug, id } = useParams();
    const router = useRouter();
    const supabase = createClient();
    const { sendOwl } = useOwlMail();

    const [forum, setForum] = useState<any>(null);
    const [thread, setThread] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [replyContent, setReplyContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

    const fetchData = useCallback(async (showLoading = true) => {
        if (!id) return;
        if (showLoading) setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            let currentYear = 1;
            if (user) {
                setCurrentUser(user);
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                currentYear = profile?.year || 1;
            }

            const { data: threadData } = await supabase.from('threads').select('*').eq('id', id).single();
            if (!threadData) { router.push('/forums'); return; }
            setThread(threadData);

            const { data: forumData } = await supabase.from('forums').select('*').eq('id', threadData.forum_id).single();
            if (forumData) {
                if (forumData.min_year && currentYear < forumData.min_year) {
                    sendOwl("גישה נחסמה", `עליך להיות לפחות בשנה ${forumData.min_year} כדי להיכנס לפורום זה!`, "error");
                    router.push('/forums');
                    return;
                }
                setForum(forumData);
            }

            const { data: postsData } = await supabase.from('forum_posts').select(`*, profiles (*)`).eq('thread_id', id).order('created_at', { ascending: true });
            setPosts((postsData as any) || []);
        } catch (e) { console.error("Fetch Error:", e); } finally { setIsLoading(false); }
    }, [id, supabase, router, sendOwl]);

    useEffect(() => {
        fetchData(true);
        const postsChannel = supabase.channel(`posts-${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts', filter: `thread_id=eq.${id}` }, () => fetchData(false))
            .subscribe();
        return () => { postsChannel.unsubscribe(); };
    }, [id, fetchData, supabase]);

    useEffect(() => {
        if (!currentUser || !id) return;
        const presenceChannel = supabase.channel(`presence-${id}`);
        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const onlineIds = new Set<string>();
                Object.values(state).forEach((presences: any) => {
                    presences.forEach((p: any) => onlineIds.add(p.userId));
                });
                setOnlineUserIds(onlineIds);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') await presenceChannel.track({ userId: currentUser.id, online_at: new Date().toISOString() });
            });
        return () => { presenceChannel.unsubscribe(); };
    }, [id, supabase, currentUser]);

    const handleReply = async () => {
        const cleanContentText = replyContent.replace(/<[^>]*>?/gm, '').trim();
        if (!cleanContentText || isSubmitting || !currentUser) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('forum_posts')
                .insert([{ thread_id: id, user_id: currentUser.id, content: replyContent }]);

            if (error) {
                sendOwl("הלחש נכשל", error.message, "error");
            } else {
                setReplyContent("");
                sendOwl("הלחש הצליח!", "התגובה פורסמה.", "success");
                fetchData(false);
            }
        } finally { setIsSubmitting(false); }
    };

    if (isLoading) return <div className="min-h-screen bg-[#060910] flex items-center justify-center"><div className="w-8 h-8 border-t-2 border-amber-500/60 rounded-full animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-[#060910] text-white font-assistant" dir="rtl">
            <style>{`
                .post-body blockquote { 
                    border-right: 4px solid #f59e0b; padding: 0.6rem 1.5rem; background: rgba(245, 158, 11, 0.05); 
                    color: rgba(255, 255, 255, 0.6); font-style: italic; text-align: right;
                }
                .reply-editor .ql-editor { text-align: right; direction: rtl; min-height: 150px; color: #f8fafc; }
            `}</style>

            <div className="forum-bg min-h-screen pt-24 pb-20">
                <div className="max-w-5xl mx-auto px-4">
                    <nav className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/30 mb-8">
                        <Link href="/" className="hover:text-amber-500 transition-colors flex items-center gap-1.5"><Home size={12} /> הוגוורטס</Link>
                        <ChevronLeft size={10} />
                        <Link href="/forums" className="hover:text-amber-500 transition-colors">היכל הפורומים</Link>
                        {forum && (
                            <>
                                <ChevronLeft size={10} />
                                <Link href={`/forums/${forum.slug}`} className="text-amber-500">{forum.name}</Link>
                            </>
                        )}
                    </nav>

                    <div className="glass-panel rounded-2xl p-6 flex items-center gap-4 mb-8">
                        {thread?.prefix && <span className={`text-[10px] font-black px-2.5 py-1 rounded border ${PREFIX_CONFIG[thread.prefix]?.bg} ${PREFIX_CONFIG[thread.prefix]?.text} border-white/10`}>{thread.prefix}</span>}
                        <h1 className="font-cinzel text-2xl font-black text-white tracking-widest uppercase">{thread?.title}</h1>
                    </div>

                    <div className="space-y-6">
                        {posts.map((post, index) => {
                            const config = post.profiles?.house ? HOUSE_CONFIG[post.profiles.house] : null;
                            const isOnline = onlineUserIds.has(post.user_id);
                            const gender = post.profiles?.gender;

                            return (
                                <div key={post.id} className="post-card glass-panel rounded-2xl overflow-hidden flex flex-col md:flex-row">
                                    <div className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-l border-white/5 p-6 flex flex-col items-center bg-black/20">
                                        <Avatar house={post.profiles?.house} isOnline={isOnline} className="w-20 h-20 text-4xl mb-4" />
                                        <p className={`font-cinzel font-black text-sm text-center ${config ? config.textColor : 'text-white'}`}>{post.profiles?.full_name}</p>

                                        {/* תצוגת תפקיד ומגדר עם אייקון */}
                                        <div className="flex items-center gap-1 text-[10px] uppercase text-white/40 mt-1 mb-4">
                                            <span>{post.profiles?.role || 'קוסם'}</span>
                                            {gender === 'male' ? <Mars size={10} className="text-blue-400" /> : gender === 'female' ? <Venus size={10} className="text-pink-400" /> : null}
                                        </div>

                                        {post.profiles?.house && config && <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${config.badge}`}>{config.nameHe}</span>}
                                        <div className="w-full mt-6 pt-6 border-t border-white/5 space-y-2">
                                            <div className="flex justify-between text-[10px]"><span className="text-white/30">גליאונים:</span><span className="text-amber-500 font-bold">{post.profiles?.galleons || 0}</span></div>
                                            <div className="flex justify-between text-[10px]"><span className="text-white/30">שנה:</span><span className="text-white/60 font-bold">{post.profiles?.year || 1}</span></div>
                                        </div>
                                    </div>
                                    <div className="flex-1 p-8 flex flex-col">
                                        <div className="flex justify-between text-[10px] text-white/20 mb-6">
                                            <span><Clock size={10} className="inline ml-1" /> {new Date(post.created_at).toLocaleString("he-IL")}</span>
                                            <span>#{index + 1}</span>
                                        </div>
                                        <div className="post-body flex-1 text-white/80" dangerouslySetInnerHTML={{ __html: post.content }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-12 glass-panel rounded-2xl p-8">
                        <div className="flex items-center gap-2 mb-6 text-amber-500"><Zap size={16} /><span className="font-cinzel font-black uppercase tracking-widest">תגובה מהירה</span></div>
                        <div className="reply-editor mb-6">
                            <ReactQuill theme="snow" value={replyContent} onChange={setReplyContent} placeholder="הקלד את הלחש שלך..." />
                        </div>
                        <button onClick={handleReply} disabled={isSubmitting} className="w-full md:w-auto px-12 py-4 bg-amber-600 hover:bg-amber-500 text-amber-950 font-cinzel font-black rounded-xl transition-all disabled:opacity-50">
                            {isSubmitting ? "רוקח שיקוי..." : "שליחת ינשוף"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}