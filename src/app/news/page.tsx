"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  ScrollText, ArrowRight, X, MessageSquare,
  BarChart3, Flag, AlertTriangle, EyeOff, Eye, Volume2, VolumeX
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";

// --- Interfaces ---
interface NewsItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author?: string;
  meta_title?: string;
  meta_description?: string;
  image_url?: string;
}

export default function NewsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="w-16 h-16 border-t-4 border-amber-500 rounded-full animate-spin"></div></div>}>
      <NewsContent />
    </Suspense>
  );
}

function NewsContent() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const initialCheckDone = useRef(false);

  const supabase = createClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 1. טעינת חדשות ראשונית (בלי ריצודים)
  useEffect(() => {
    const fetchNews = async () => {
      const { data } = await supabase.from("news").select("*").order("created_at", { ascending: false });
      const newsData = data || [];
      setNews(newsData);
      setIsLoading(false);

      // בדיקת URL רק בטעינה הראשונה
      if (!initialCheckDone.current) {
        const articleId = searchParams.get("article");
        if (articleId) {
          const found = newsData.find(n => n.id === articleId);
          if (found) setSelectedNews(found);
        }
        initialCheckDone.current = true;
      }
    };
    fetchNews();
  }, [supabase]);

  // 2. עדכון ה-URL והכותרת בזמן אמת
  useEffect(() => {
    if (selectedNews) {
      document.body.style.overflow = 'hidden';
      document.title = selectedNews.meta_title || selectedNews.title;
      const newUrl = `${window.location.pathname}?article=${selectedNews.id}`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    } else {
      document.body.style.overflow = 'unset';
      document.title = "הנביא היומי | LUMOS IL";
      if (initialCheckDone.current && window.location.search.includes("article=")) {
        window.history.replaceState({ path: window.location.pathname }, '', window.location.pathname);
      }
    }
  }, [selectedNews]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedNews(null); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-[#f8fafc] py-20 px-6 font-assistant" dir="rtl">
      <style>{`
        .prose-magic h1 { font-family: 'Cinzel', serif; font-size: 2.5rem; margin-bottom: 1rem; color: #f59e0b; }
        .prose-magic p { margin-bottom: 1.2rem; line-height: 1.8; }
        .prose-magic strong { color: #fef3c7; font-weight: 800; }
        .prose-magic ul { list-style-type: disc; margin-right: 1.5rem; margin-bottom: 1rem; }
        .prose-magic a { color: #f59e0b; text-decoration: underline; }
        .prose-magic img { border-radius: 1rem; border: 2px solid rgba(245, 158, 11, 0.2); margin: 2rem 0; }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-amber-500/10 rounded-full border border-amber-500/20 mb-4">
            <ScrollText size={40} className="text-amber-500" />
          </div>
          <h1 className="font-cinzel text-5xl md:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-100 to-amber-500">
            הנביא היומי
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-12">
          {news.map((item) => (
            <div key={item.id} className="group relative bg-[#e2d1b0] text-[#020617] rounded-sm shadow-xl border border-[#8b6a3a]/30 p-8 md:p-10 flex flex-col md:flex-row gap-8" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/natural-paper.png')" }}>
              {item.image_url && (
                <div className="w-full md:w-48 h-48 shrink-0 rounded-lg overflow-hidden border-2 border-amber-900/10 shadow-lg order-1 md:order-2">
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
              )}
              <div className="flex-1 space-y-4 order-2 md:order-1 text-right">
                <h2 className="font-cinzel text-3xl font-black leading-tight">{item.title}</h2>
                <p className="font-crimson text-xl leading-relaxed opacity-80 line-clamp-3">
                  {item.content.replace(/<[^>]*>?/gm, '').slice(0, 180)}...
                </p>
                <button onClick={() => setSelectedNews(item)} className="flex items-center gap-2 font-cinzel text-lg font-bold uppercase border-b-2 border-[#020617] transition-all hover:bg-black/5">
                  להמשך קריאה <ArrowRight size={20} className="rotate-180" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedNews && (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto bg-[#020617] backdrop-blur-md pt-0 md:pt-10 px-0 md:px-4">
          <div className="relative w-full max-w-4xl bg-[#e2d1b0] text-[#020617] shadow-2xl border-x-0 md:border-4 border-amber-700/30 min-h-screen md:min-h-0 mb-0 md:mb-10 animate-in fade-in zoom-in duration-300" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/natural-paper.png')" }}>
            <button onClick={() => setSelectedNews(null)} className="fixed top-6 left-6 md:absolute md:top-6 md:left-6 p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors z-[10000]"><X size={32} /></button>

            <div className="p-8 md:p-16 space-y-8 text-right pt-20 md:pt-16">
              {selectedNews.image_url && (
                <div className="w-full h-64 md:h-[450px] rounded-2xl overflow-hidden mb-10 shadow-2xl border-4 border-amber-900/10">
                  <img src={selectedNews.image_url} alt={selectedNews.title} className="w-full h-full object-cover" />
                </div>
              )}
              <header className="space-y-4 border-b-2 border-[#020617]/20 pb-8 text-center">
                <p className="font-cinzel text-sm font-bold opacity-60 uppercase tracking-widest">
                  {new Date(selectedNews.created_at).toLocaleDateString("he-IL")} | מאת: {selectedNews.author || "כתב מערכת"}
                </p>
                <h2 className="font-cinzel text-4xl md:text-7xl font-black leading-tight">{selectedNews.title}</h2>
              </header>
              <div
                className="prose-magic font-crimson text-2xl md:text-3xl leading-relaxed whitespace-pre-wrap text-justify"
                dangerouslySetInnerHTML={{ __html: selectedNews.content }}
              />
              <PollComponent newsId={selectedNews.id} />
              <div className="mt-16 pt-8 border-t-4 border-[#020617]/10">
                <CommentsSection newsId={selectedNews.id} />
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsMuted(!isMuted)}
        className="fixed bottom-6 left-6 p-4 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 backdrop-blur-md z-[100000] transition-all"
        title={isMuted ? "הפעל קול" : "השתק"}
      >
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>
    </div>
  );
}

// --- Poll Component ---
function PollComponent({ newsId }: { newsId: string }) {
  const [poll, setPoll] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const fetchPollData = useCallback(async () => {
    const { data: pollData } = await supabase.from('polls').select('*, poll_options(*)').eq('news_id', newsId).maybeSingle();
    if (pollData) {
      setPoll(pollData);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: vote } = await supabase.from('poll_votes').select('*').eq('poll_id', pollData.id).eq('user_id', session.user.id).maybeSingle();
        if (vote) setHasVoted(true);
      }
    }
  }, [newsId, supabase]);

  useEffect(() => { fetchPollData(); }, [fetchPollData]);

  const handleVote = async () => {
    if (!selectedOption || isSubmitting) return;
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("יש להתחבר להצבעה!"); setIsSubmitting(false); return; }
    const { error } = await supabase.from('poll_votes').insert([{ poll_id: poll.id, user_id: user.id, option_id: selectedOption }]);
    if (!error) {
      await supabase.rpc('increment_vote', { option_id: selectedOption });
      await fetchPollData();
      setHasVoted(true);
    }
    setIsSubmitting(false);
  };

  if (!poll) return null;
  const totalVotes = poll.poll_options.reduce((acc: number, opt: any) => acc + (opt.votes_count || 0), 0);

  return (
    <div className="bg-[#020617]/5 p-8 border-2 border-dashed border-amber-800/30 my-12 rounded-lg">
      <h4 className="font-cinzel text-2xl font-black mb-8 flex items-center gap-3"><BarChart3 size={28} className="text-amber-800" /> סקר הנביא</h4>
      {hasVoted ? (
        <div className="space-y-6">
          {poll.poll_options.map((opt: any) => {
            const p = totalVotes > 0 ? Math.round(((opt.votes_count || 0) / totalVotes) * 100) : 0;
            return (
              <div key={opt.id} className="space-y-2">
                <div className="flex justify-between font-crimson text-xl font-bold"><span>{p}%</span><span>{opt.option_text}</span></div>
                <div className="w-full bg-black/10 h-4 rounded-full overflow-hidden shadow-inner"><div className="bg-amber-600 h-full transition-all duration-1000" style={{ width: `${p}%` }}></div></div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {poll.poll_options.map((opt: any) => (
            <button key={opt.id} onClick={() => setSelectedOption(opt.id)} className={`w-full text-right p-5 border-2 transition-all font-crimson text-2xl rounded-xl ${selectedOption === opt.id ? 'bg-amber-500 border-amber-800 text-[#020617] font-bold' : 'bg-white/40 border-amber-900/10 hover:bg-amber-500/10'}`}>{opt.option_text}</button>
          ))}
          <button onClick={handleVote} disabled={!selectedOption || isSubmitting} className="mt-6 w-full py-5 bg-[#020617] text-white font-cinzel text-xl font-black">הצבעה 🪄</button>
        </div>
      )}
    </div>
  );
}

// --- Comments Section ---
function CommentsSection({ newsId }: { newsId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reportingComment, setReportingComment] = useState<any | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const supabase = createClient();

  const houseClasses: { [key: string]: string } = {
    Gryffindor: "border-red-700 bg-red-900/5",
    Slytherin: "border-green-800 bg-green-900/5",
    Hufflepuff: "border-yellow-600 bg-yellow-600/10",
    Ravenclaw: "border-blue-700 bg-blue-900/5",
  };

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      setCurrentUserId(session.user.id);
      const { data: blocks } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', session.user.id);
      if (blocks) setBlockedUserIds(blocks.map(b => b.blocked_id));
    }
    const { data } = await supabase.from("comments").select("*, profiles (full_name, house, role)").eq("news_id", newsId).order("created_at", { ascending: true });
    if (data) setComments(data);
  }, [newsId, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePost = async () => {
    if (!newComment.trim() || !currentUserId) return;
    setIsPosting(true);

    const { error } = await supabase.from("comments").insert([{
      news_id: newsId,
      user_id: currentUserId,
      content: newComment,
      user_name: null
    }]).select().maybeSingle();

    if (error) {
      console.log(error);
    }

    setNewComment("");
    fetchData();
    setIsPosting(false);
  };

  const handleSendReport = async () => {
    if (!reportReason || !reportingComment) return;
    setIsReporting(true);
    const { error } = await supabase.from('reports').insert([{ reporter_id: currentUserId, target_id: reportingComment.id, target_type: 'comment', reason: reportReason, content_preview: reportingComment.content, status: 'pending' }]);
    if (!error) { alert("דווח למשרד הקסמים."); setReportingComment(null); setReportReason(""); }
    setIsReporting(false);
  };

  const handleToggleMute = async (targetId: string, isMuted: boolean) => {
    if (isMuted) {
      await supabase.from('blocks').delete().eq('blocker_id', currentUserId).eq('blocked_id', targetId);
      setBlockedUserIds(p => p.filter(id => id !== targetId));
    } else {
      await supabase.from('blocks').insert({ blocker_id: currentUserId, blocked_id: targetId });
      setBlockedUserIds(p => [...p, targetId]);
    }
  };

  return (
    <div className="space-y-8">
      <h3 className="font-cinzel text-3xl font-black flex items-center gap-3"><MessageSquare className="text-amber-800" /> תגובות הקהילה</h3>
      <div className="flex flex-col md:flex-row gap-4">
        <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="כתיבת תגובה..." className="flex-1 bg-white/50 border-2 border-amber-900/20 p-5 font-crimson text-2xl outline-none rounded-xl" />
        <button onClick={handlePost} disabled={isPosting} className="bg-[#020617] text-white px-12 py-5 font-cinzel font-black rounded-xl hover:bg-black/80 transition-all">שליחה</button>
      </div>
      <div className="space-y-6">
        {comments.map((c) => {
          const isMuted = blockedUserIds.includes(c.user_id);
          const houseColorClass = houseClasses[c.profiles?.house] || "border-amber-700 bg-white/40";

          if (isMuted) return (
            <div key={c.id} className="p-5 border-r-8 border-gray-400 bg-gray-100/50 rounded-lg flex justify-between items-center opacity-70">
              <p className="font-crimson text-xl italic text-gray-500">תגובה מוסתרת.</p>
              <button onClick={() => handleToggleMute(c.user_id, true)} className="text-sm font-bold bg-gray-200 px-4 py-2 rounded-full"><Eye size={16} /></button>
            </div>
          );

          return (
            <div key={c.id} className={`p-8 border-r-8 ${houseColorClass} rounded-lg shadow-md animate-in fade-in`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-cinzel text-2xl font-black text-amber-900">{c.profiles?.full_name || c.user_id?.substring(0, 8)}</p>
                  <div className="flex gap-3 items-center opacity-60">
                    <p className="text-xs font-bold uppercase">{c.profiles?.house || 'ללא בית'}</p>
                    <span className="text-[10px]">•</span>
                    <p className="text-xs font-bold">
                      {new Date(c.created_at).toLocaleDateString("he-IL")} | {new Date(c.created_at).toLocaleTimeString("he-IL", { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {currentUserId !== c.user_id && (
                  <div className="flex items-center gap-3 opacity-30 hover:opacity-100 transition-opacity">
                    <button title="השתקה" onClick={() => handleToggleMute(c.user_id, false)}><EyeOff size={18} /></button>
                    <button title="דיווח" onClick={() => setReportingComment(c)} className="text-red-800"><Flag size={18} /></button>
                  </div>
                )}
              </div>
              <p className="font-crimson text-2xl text-gray-800 leading-relaxed">{c.content}</p>
            </div>
          );
        })}
      </div>

      {reportingComment && (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
          <div className="bg-[#fdfaf5] w-full max-w-md rounded-[3rem] p-10 space-y-8 shadow-2xl animate-in zoom-in duration-200">
            <h4 className="font-cinzel text-2xl font-black text-red-900 flex items-center gap-3"><AlertTriangle size={32} /> דיווח</h4>
            <div className="grid grid-cols-1 gap-4">
              {['תוכן פוגעני', 'ספוילרים', 'אחר'].map((r) => (
                <button key={r} onClick={() => setReportReason(r)} className={`w-full text-right p-5 rounded-2xl border-2 font-bold text-xl transition-all ${reportReason === r ? 'bg-red-900 text-white border-red-900' : 'bg-white border-gray-100 hover:border-red-200'}`}>{r}</button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={handleSendReport} disabled={!reportReason || isReporting} className="flex-1 py-5 bg-red-900 text-white rounded-2xl font-black hover:bg-red-800 disabled:opacity-50">דווח</button>
              <button onClick={() => setReportingComment(null)} className="flex-1 py-5 bg-gray-200 rounded-2xl font-bold">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}