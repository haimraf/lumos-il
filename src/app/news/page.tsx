"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import { getNewsArticlePath } from "@/lib/seo";
import { getRoleColor, getRoleColorFromDB } from "@/lib/roleColor";
import {
  ScrollText, ArrowRight, X, MessageSquare,
  BarChart3, Flag, AlertTriangle, EyeOff, Eye,
  Volume2, VolumeX, Sparkles, Clock, User, ChevronRight
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import { logActivityEvent } from "@/lib/activityEvents";
import { sanitizeHtml } from "@/utils/sanitize";
import Link from "next/link";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author?: string;
  meta_title?: string;
  meta_description?: string;
  image_url?: string;
  author_id?: string | null;
  author_profile?: { id: string; full_name?: string; role?: string; house?: string; group_id?: string | null; user_groups?: { name: string; color: string } | null } | null;
}

function readingTime(html: string) {
  const words = html.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("he-IL", {
    year: "numeric", month: "long", day: "numeric"
  });
}

export default function NewsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-12 h-12 border-t-2 border-amber-500 rounded-full animate-spin" />
      </div>
    }>
      <NewsContent />
    </Suspense>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN CONTENT
═══════════════════════════════════════════════════ */
function NewsContent() {
  const [supabase] = useState(() => createClient());
  const [news, setNews] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [roleColors, setRoleColors] = useState<Record<string, string>>({});
  useEffect(() => { getRoleColorFromDB(supabase).then(setRoleColors); }, [supabase]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const fetchNews = async () => {
      const { data } = await supabase
        .from("news")
        .select(`
          id, title, content, author, created_at,
          meta_title, meta_description, image_url, author_id,
          author_profile:profiles!news_author_id_fkey(
              id, full_name, role, house, group_id,
              user_groups(name, color)
          )
        `)
        .order("created_at", { ascending: false });
      const newsData = (data || []) as unknown as NewsItem[];
      setNews(newsData);
      setIsLoading(false);
    };
    fetchNews();
  }, [supabase]);

  useEffect(() => {
    if (selectedNews) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.title = selectedNews.meta_title || selectedNews.title;
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.title = "הנביא היומי | LUMOS IL";
    }
  }, [selectedNews]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedNews(null); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  if (isLoading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="w-12 h-12 border-t-2 border-amber-500 rounded-full animate-spin" />
    </div>
  );

  const [featured, ...rest] = news;

  /* ── Article Reader Portal ── */
  const articlePortal = mounted && selectedNews
    ? createPortal(<ArticleReader article={selectedNews} roleColors={roleColors} onClose={() => setSelectedNews(null)} />, document.body)
    : null;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-assistant pb-24 px-4 md:px-6" dir="rtl">
      <style>{`
        /* prose styles inside article */
        .prose-article { color: #1e0e04; }
        .prose-article h1 { font-family:'Cinzel',serif; font-size:2rem; margin:1.5rem 0 0.75rem; color:#5d2a00; }
        .prose-article h2 { font-family:'Cinzel',serif; font-size:1.4rem; margin:1.25rem 0 0.5rem; color:#6b3300; }
        .prose-article p  { margin-bottom:1rem; line-height:1.85; }
        .prose-article p:last-child { margin-bottom:0; }
        .prose-article strong { color:#3d1500; font-weight:800; }
        .prose-article ul { list-style:disc; margin-right:1.5rem; margin-bottom:1rem; }
        .prose-article a  { color:#92400e; text-decoration:underline; text-underline-offset:2px; }
        .prose-article img{ border-radius:8px; margin:1.5rem 0; width:100%; }
        .prose-article blockquote {
          border-right:4px solid #92400e; padding:12px 16px; margin:1.25rem 0;
          background:rgba(146,64,14,0.06); border-radius:0 6px 6px 0;
          font-style:italic; color:#5d2a00;
        }

        /* reading progress */
        #reading-progress {
          position:fixed; top:0; left:0; right:0; height:3px;
          background:linear-gradient(90deg,#f59e0b,#d97706);
          transform-origin:left; z-index:100010;
          transition:transform 0.1s linear;
        }

        /* news card hover */
        .news-card { transition: transform 0.25s, box-shadow 0.25s; }
        .news-card:hover { transform: translateY(-3px); box-shadow: 0 20px 50px rgba(0,0,0,0.4); }

        /* masthead ornament */
        .masthead-rule {
          height:1px;
          background:linear-gradient(90deg,transparent,rgba(245,158,11,0.5),transparent);
          margin:12px 0;
        }
      `}</style>

      {/* ── MASTHEAD ── */}
      <div className="max-w-3xl mx-auto">
        <header className="text-center pt-6 pb-8" aria-label="כותרת הנביא היומי">
          <div className="masthead-rule" />
          <div className="flex items-center justify-center gap-3 my-4">
            <ScrollText size={28} className="text-amber-500/70" aria-hidden="true" />
            <h1 className="font-cinzel text-3xl sm:text-5xl md:text-7xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-600">
              הנביא היומי
            </h1>
            <ScrollText size={28} className="text-amber-500/70" aria-hidden="true" />
          </div>
          <p className="font-cinzel text-xs text-amber-500/40 tracking-[0.3em] uppercase">
            {new Date().toLocaleDateString("he-IL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <div className="masthead-rule" />

          {/* reward banner */}
          <div
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-amber-500/8 border border-amber-500/15 rounded-full text-amber-200/70 text-sm"
            role="note"
            aria-label="תגובה מזכה בנקודות"
          >
            <Sparkles size={14} className="text-amber-500 flex-shrink-0" aria-hidden="true" />
            <span>כל תגובה בנביא מזכה את הבית שלך ב-1 נקודה וגליאון זהב</span>
          </div>
        </header>
      </div>

      {news.length === 0 ? (
          <div className="text-center py-32 text-white/20">
            <ScrollText size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-cinzel text-xl">אין כתבות עדיין</p>
          </div>
        ) : (
          <div className="space-y-8">

            {/* ── FEATURED ARTICLE ── */}
            {featured && (
              <article
                className="news-card group rounded-2xl overflow-hidden border border-white/[0.06] bg-[#e8d5a3] relative"
              >
                <Link
                  href={getNewsArticlePath(featured.id)}
                  aria-label={`קרא את הכתבה: ${featured.title}`}
                  className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
                />
                <div className="flex flex-col md:flex-row min-h-[320px]">
                  {featured.image_url && (
                    <div className="w-full md:w-2/5 h-56 md:h-auto overflow-hidden flex-shrink-0">
                      <img
                        src={featured.image_url}
                        alt={featured.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  )}
                  <div className="flex-1 p-7 md:p-10 flex flex-col justify-between text-[#1e0e04]">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-amber-700/15 text-amber-900 rounded-full border border-amber-700/20">
                          ✦ כתבה מובחרת
                        </span>
                      </div>
                      <h2 className="font-cinzel text-2xl md:text-3xl font-black leading-snug mb-3 text-[#1e0e04]">
                        {featured.title}
                      </h2>
                      <p className="text-[#5d2a00]/75 leading-relaxed line-clamp-3 text-base mb-4">
                        {featured.content.replace(/<[^>]*>/g, "").slice(0, 200)}…
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-[#1e0e04]/10">
                      <div className="flex items-center gap-4 text-xs text-[#5d2a00]/55 font-bold">
                        <span className="relative z-20 flex items-center gap-1.5">
                          <User size={11} aria-hidden="true" />
                          {featured.author_profile?.id ? (
                            <Link
                              href={`/wizard/${featured.author_profile.id}`}
                              onClick={e => e.stopPropagation()}
                              className="hover:underline transition-colors"
                              style={{ color: featured.author_profile.user_groups?.color || getRoleColor(featured.author_profile.role, featured.author_profile.house, roleColors) }}
                            >
                              {featured.author || featured.author_profile.full_name}
                            </Link>
                          ) : (featured.author || "כתב מערכת")}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={11} aria-hidden="true" />
                          {readingTime(featured.content)} דקות קריאה
                        </span>
                        <span>{formatDate(featured.created_at)}</span>
                      </div>
                      <span className="flex items-center gap-1.5 text-amber-800 font-cinzel text-xs font-black group-hover:gap-2.5 transition-all">
                        קרא עוד <ChevronRight size={14} aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {/* ── DIVIDER ── */}
            {rest.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">עוד כתבות</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
            )}

            {/* ── ARTICLES GRID ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {rest.map((item) => (
                <article
                  key={item.id}
                  className="news-card group rounded-xl overflow-hidden border border-white/[0.06] bg-[#e8d5a3] flex flex-col relative"
                >
                  <Link
                    href={getNewsArticlePath(item.id)}
                    aria-label={`קרא את הכתבה: ${item.title}`}
                    className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
                  />
                  {item.image_url && (
                    <div className="w-full h-44 overflow-hidden flex-shrink-0">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  )}
                  <div className="flex-1 p-5 flex flex-col justify-between text-[#1e0e04]">
                    <div>
                      <h2 className="font-cinzel text-lg font-black leading-snug mb-2 text-[#1e0e04] group-hover:text-amber-900 transition-colors">
                        {item.title}
                      </h2>
                      <p className="text-[#5d2a00]/65 text-sm leading-relaxed line-clamp-2">
                        {item.content.replace(/<[^>]*>/g, "").slice(0, 120)}…
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#1e0e04]/10">
                      <div className="flex items-center gap-3 text-[10px] text-[#5d2a00]/45 font-bold flex-wrap">
                        {item.author_profile?.id ? (
                          <span className="relative z-20 flex items-center gap-1">
                            <User size={9} aria-hidden="true" />
                            <Link
                              href={`/wizard/${item.author_profile.id}`}
                              onClick={e => e.stopPropagation()}
                              className="hover:underline transition-colors"
                              style={{ color: item.author_profile.user_groups?.color || getRoleColor(item.author_profile.role, item.author_profile.house, roleColors) }}
                            >
                              {item.author || item.author_profile.full_name}
                            </Link>
                          </span>
                        ) : item.author ? (
                          <span className="flex items-center gap-1">
                            <User size={9} aria-hidden="true" />
                            {item.author}
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1">
                          <Clock size={9} aria-hidden="true" />
                          {readingTime(item.content)} דק'
                        </span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      <span className="flex items-center gap-1 text-amber-800/70 text-[10px] font-black font-cinzel group-hover:text-amber-800 transition-colors">
                        קרא <ChevronRight size={11} aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

      {articlePortal}

      {/* mute button */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="fixed bottom-6 left-6 p-3.5 rounded-full bg-black/60 border border-white/10 text-white/50 hover:text-amber-400 hover:border-amber-500/30 backdrop-blur-md z-[100000] transition-all"
        aria-label={isMuted ? "הפעל קול" : "השתק"}
        title={isMuted ? "הפעל קול" : "השתק"}
      >
        {isMuted ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ARTICLE READER
═══════════════════════════════════════════════════ */
function ArticleReader({ article, roleColors, onClose }: { article: NewsItem; roleColors: Record<string, string>; onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const pct = scrollHeight <= clientHeight ? 100 : (scrollTop / (scrollHeight - clientHeight)) * 100;
      setProgress(Math.min(100, pct));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[7000] bg-[#020617]/95 backdrop-blur-md flex items-start justify-center overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={article.title}
    >
      {/* reading progress bar */}
      <div
        id="reading-progress"
        style={{ transform: `scaleX(${progress / 100})` }}
        aria-hidden="true"
      />

      {/* close button */}
      <button
        onClick={onClose}
        className="fixed top-5 left-5 z-[100001] p-2.5 rounded-full bg-black/70 border border-white/15 text-white/60 hover:text-white hover:bg-black/90 backdrop-blur-md transition-all shadow-xl"
        aria-label="סגור מאמר"
      >
        <X size={22} aria-hidden="true" />
      </button>

      {/* article scroll container */}
      <div
        ref={scrollRef}
        className="w-full h-screen overflow-y-auto py-10 px-4 md:px-6"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(245,158,11,0.3) transparent" }}
      >
        <div
          className="relative w-full max-w-2xl mx-auto bg-[#ede0c4] text-[#1e0e04] shadow-2xl rounded-sm animate-in fade-in zoom-in-95 duration-300"
          style={{
            backgroundImage: "url('https://www.transparenttextures.com/patterns/natural-paper.png')",
            border: "1px solid rgba(139,100,20,0.3)",
            boxShadow: "0 0 0 4px #f0e0b0, 0 0 0 5px rgba(122,92,20,0.3), 0 30px 80px rgba(0,0,0,0.7)"
          }}
        >
          {/* hero image */}
          {article.image_url && (
            <div className="w-full h-56 md:h-80 overflow-hidden">
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-7 md:p-12 space-y-6">
            {/* article header */}
            <header className="border-b-2 border-[#1e0e04]/15 pb-6 text-center space-y-3">
              <h2 className="font-cinzel text-2xl md:text-4xl font-black leading-tight text-[#1e0e04]">
                {article.title}
              </h2>
              <div className="flex items-center justify-center gap-4 text-xs text-[#5d2a00]/60 font-bold flex-wrap">
                <span className="flex items-center gap-1.5">
                  <User size={11} aria-hidden="true" />
                  {article.author_profile?.id ? (() => {
                    const authorColor = article.author_profile.user_groups?.color ||
                      getRoleColor(article.author_profile.role, article.author_profile.house, roleColors);
                    return (
                      <Link
                        href={`/wizard/${article.author_profile.id}`}
                        className="hover:underline transition-colors"
                        style={{ color: authorColor }}
                      >
                        {article.author || article.author_profile.full_name}
                      </Link>
                    );
                  })() : (article.author || "כתב מערכת")}
                </span>
                <span className="text-[#1e0e04]/20">•</span>
                <span>{formatDate(article.created_at)}</span>
                <span className="text-[#1e0e04]/20">•</span>
                <span className="flex items-center gap-1.5">
                  <Clock size={11} aria-hidden="true" />
                  {readingTime(article.content)} דקות קריאה
                </span>
              </div>
            </header>

            {/* ornament */}
            <div className="text-center text-[#92400e]/40 tracking-[12px] text-sm select-none" aria-hidden="true">
              ✦ ✦ ✦
            </div>

            {/* article body */}
            <div
              className="prose-article font-crimson text-xl leading-relaxed text-right"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
            />

            {/* poll */}
            <PollComponent key={article.id} newsId={article.id} />

            {/* comments */}
            <div className="mt-10 pt-8 border-t-2 border-[#1e0e04]/10">
              <CommentsSection newsId={article.id} roleColors={roleColors} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   POLL COMPONENT
═══════════════════════════════════════════════════ */
function PollComponent({ newsId }: { newsId: string }) {
  const [supabase] = useState(() => createClient());
  const [poll, setPoll] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { sendOwl } = useOwlMail();

  const fetchPollData = useCallback(async () => {
    const { data: pollData } = await supabase.from("polls").select("*, poll_options(*)").eq("news_id", newsId).maybeSingle();
    if (pollData) {
      setPoll(pollData);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: vote } = await supabase.from("poll_votes").select("*").eq("poll_id", pollData.id).eq("user_id", user.id).maybeSingle();
        if (vote) setHasVoted(true);
      }
    }
  }, [newsId, supabase]);

  useEffect(() => { fetchPollData(); }, [fetchPollData]);

  const handleVote = async () => {
    if (!selectedOption || isSubmitting) return;
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { sendOwl("מערכת הסקרים", "יש להתחבר כדי להצביע!", "error"); setIsSubmitting(false); return; }
    const { error } = await supabase.from("poll_votes").insert([{ poll_id: poll.id, user_id: user.id, option_id: selectedOption }]);
    if (error) { sendOwl("תקלת קסם", "חלה שגיאה בשמירת ההצבעה.", "error"); setIsSubmitting(false); return; }
    await supabase.rpc("increment_vote", { p_option_id: selectedOption });
    
    // Log activity for Passover points
    void logActivityEvent(supabase, {
      actorId: user.id,
      eventType: "news_poll_voted",
      icon: "📊",
      title: "הצביע/ה בסקר הנביא",
      subtitle: poll.question || "סקר הנביא היומי",
      targetType: "poll",
      targetId: poll.id
    });

    await fetchPollData();
    setHasVoted(true);
    setIsSubmitting(false);
  };

  if (!poll) return null;
  const totalVotes = poll.poll_options.reduce((acc: number, opt: any) => acc + (opt.votes_count || 0), 0);

  return (
    <div
      className="my-8 p-6 rounded-sm border-2 border-dashed border-amber-900/25 bg-amber-900/5"
      role="region"
      aria-label="סקר הנביא"
    >
      <h4 className="font-cinzel text-lg font-black mb-5 flex items-center gap-2 text-[#5d2a00]">
        <BarChart3 size={20} className="text-amber-800" aria-hidden="true" />
        סקר הנביא
        {totalVotes > 0 && (
          <span className="mr-auto text-xs font-bold text-[#5d2a00]/40">{totalVotes} הצבעות</span>
        )}
      </h4>

      {hasVoted ? (
        <div className="space-y-4" role="list" aria-label="תוצאות הסקר">
          {poll.poll_options.map((opt: any) => {
            const pct = totalVotes > 0 ? Math.round(((opt.votes_count || 0) / totalVotes) * 100) : 0;
            return (
              <div key={opt.id} role="listitem">
                <div className="flex justify-between text-sm font-bold text-[#5d2a00] mb-1.5">
                  <span>{pct}%</span>
                  <span>{opt.option_text}</span>
                </div>
                <div className="w-full bg-black/10 h-3 rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className="bg-amber-700 h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3" role="group" aria-label="אפשרויות הצבעה">
          {poll.poll_options.map((opt: any) => (
            <button
              key={opt.id}
              onClick={() => setSelectedOption(opt.id)}
              className="w-full text-right px-5 py-3.5 rounded-lg border-2 transition-all font-bold text-base"
              style={selectedOption === opt.id
                ? { background: "#92400e", borderColor: "#78350f", color: "white" }
                : { background: "rgba(255,255,255,0.5)", borderColor: "rgba(146,64,14,0.15)", color: "#5d2a00" }
              }
              aria-pressed={selectedOption === opt.id}
            >
              {opt.option_text}
            </button>
          ))}
          <button
            onClick={handleVote}
            disabled={!selectedOption || isSubmitting}
            className="mt-2 w-full py-3.5 bg-[#1e0e04] hover:bg-[#3d1500] text-[#e8d5a3] font-cinzel font-black text-sm rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed tracking-wide"
            aria-label="שליחת הצבעה"
          >
            {isSubmitting ? "שולח…" : "🪄 הצבעה"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   COMMENTS SECTION
═══════════════════════════════════════════════════ */
const HOUSE_ACCENT: Record<string, { border: string; bg: string; text: string }> = {
  Gryffindor: { border: "#dc2626", bg: "rgba(220,38,38,0.05)", text: "#b91c1c" },
  Slytherin:  { border: "#059669", bg: "rgba(5,150,105,0.05)",  text: "#047857" },
  Hufflepuff: { border: "#d97706", bg: "rgba(217,119,6,0.06)",  text: "#b45309" },
  Ravenclaw:  { border: "#2563eb", bg: "rgba(37,99,235,0.05)",  text: "#1d4ed8" },
};

const MIN_COMMENT_LENGTH = 20;
const COOLDOWN_MS = 30_000;

function CommentsSection({ newsId, roleColors }: { newsId: string; roleColors: Record<string, string> }) {
  const [supabase] = useState(() => createClient());
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reportingComment, setReportingComment] = useState<any | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const { sendOwl } = useOwlMail();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Cooldown ticker
  useEffect(() => {
    if (cooldownRemaining <= 0) {
      if (cooldownInterval.current) clearInterval(cooldownInterval.current);
      return;
    }
    cooldownInterval.current = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1000) { clearInterval(cooldownInterval.current!); return 0; }
        return prev - 1000;
      });
    }, 1000);
    return () => { if (cooldownInterval.current) clearInterval(cooldownInterval.current); };
  }, [cooldownRemaining]);

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      setCurrentUserId(session.user.id);
      const { data: blocks } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", session.user.id);
      if (blocks) setBlockedUserIds(blocks.map((b: any) => b.blocked_id));
    }
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(id, full_name, house, role, avatar_url, is_ghost, user_groups(name, color))")
      .eq("news_id", newsId)
      .order("created_at", { ascending: true });
    if (data) setComments(data);
  }, [newsId, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePost = async () => {
    const trimmed = newComment.trim();

    if (!trimmed) {
      sendOwl("תגובה ריקה 📭", "לא ניתן לשלוח תגובה ריקה.", "error");
      return;
    }

    if (trimmed.length < MIN_COMMENT_LENGTH) {
      sendOwl(
        "הלחש קצר מדי 📜",
        `תגובה איכותית דורשת לפחות ${MIN_COMMENT_LENGTH} תווים. כתבת ${trimmed.length} • עוד ${MIN_COMMENT_LENGTH - trimmed.length} תווים נדרשים.`,
        "error"
      );
      return;
    }

    if (cooldownRemaining > 0) {
      sendOwl("חוקי הקסם ⏳", `המתן עוד ${Math.ceil(cooldownRemaining / 1000)} שניות לפני תגובה נוספת.`, "error");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { sendOwl("לא מחובר 🔒", "יש להתחבר לטירה כדי להגיב.", "error"); return; }

    // בדיקה שהמשתמש לא כבר הגיב על אותה כתבה
    const alreadyCommented = comments.some(c => c.user_id === user.id);
    if (alreadyCommented) {
      sendOwl(
        "כבר הגבת 🦉",
        "כבר שלחת תגובה לכתבה זו. הנקודות מוענקות רק על תגובה ראשונה ואיכותית.",
        "error"
      );
      return;
    }

    setIsPosting(true);
    const { error } = await supabase.rpc("create_news_comment_secure", {
      p_news_id: newsId,
      p_content: trimmed,
    });

    if (error) {
      const releaseMatch = error.message.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/);
      const releaseStr = releaseMatch
        ? new Date(releaseMatch[0]).toLocaleString("he-IL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
        : null;
      sendOwl("לחש השתקה ❄️", releaseStr ? `הצינון יסתיים ב-${releaseStr}.` : "פנו למשרד הקסמים לפרטים.", "error");
      setIsPosting(false);
      return;
    }

    setNewComment("");
    fetchData();
    setCooldownRemaining(COOLDOWN_MS);
    
    // Log activity for Passover points
    void logActivityEvent(supabase, {
      actorId: user.id,
      eventType: "news_comment_created",
      icon: "📜",
      title: "הגיב/ה לכתבה בנביא",
      subtitle: trimmed.slice(0, 40) + "...",
      targetType: "news",
      targetId: newsId
    });

    sendOwl(
      "התגובה נשלחה ✅",
      "תגובתך פורסמה ונרשמה בהצלחה.",
      "magic"
    );
    setIsPosting(false);
  };

  const handleSendReport = async () => {
    if (!reportReason || !reportingComment) return;
    setIsReporting(true);
    const { error } = await supabase.from("reports").insert([{
      reporter_id: currentUserId,
      target_id: reportingComment.id,
      target_type: "comment",
      reason: reportReason,
      content_preview: reportingComment.content,
      status: "pending"
    }]);
    if (!error) {
      sendOwl("דיווח נשלח", "הדיווח הועבר לטיפול משרד הקסמים.", "success");
      setReportingComment(null);
      setReportReason("");
    }
    setIsReporting(false);
  };

  const handleToggleMute = async (targetId: string, isMuted: boolean) => {
    if (isMuted) {
      await supabase.from("blocks").delete().eq("blocker_id", currentUserId).eq("blocked_id", targetId);
      setBlockedUserIds((p) => p.filter((id) => id !== targetId));
    } else {
      await supabase.from("blocks").insert({ blocker_id: currentUserId, blocked_id: targetId });
      setBlockedUserIds((p) => [...p, targetId]);
    }
  };

  return (
    <section aria-label="תגובות הקהילה">
      <h3 className="font-cinzel text-xl font-black flex items-center gap-2 text-[#3d1500] mb-5">
        <MessageSquare size={20} className="text-amber-800" aria-hidden="true" />
        תגובות הקהילה
        <span className="mr-auto text-xs font-bold text-[#5d2a00]/40 font-assistant">{comments.length} תגובות</span>
      </h3>

      {/* comment input */}
      <div className="space-y-3 mb-8">
        <textarea
          ref={inputRef}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handlePost(); }}
          placeholder="כתוב תגובה… (Ctrl+Enter לשליחה)"
          rows={3}
          className="w-full bg-white/50 border-2 border-amber-900/15 focus:border-amber-800/40 rounded-xl p-4 font-assistant text-sm text-[#1e0e04] placeholder:text-[#5d2a00]/35 outline-none resize-none transition-colors"
          aria-label="כתיבת תגובה חדשה"
        />
        <div className="flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* char counter */}
            <span
              className="text-[10px] font-bold"
              style={{
                color: newComment.trim().length >= MIN_COMMENT_LENGTH
                  ? "rgba(5,150,105,0.7)"
                  : newComment.trim().length > 0
                    ? "rgba(180,83,9,0.7)"
                    : "rgba(93,42,0,0.35)",
              }}
            >
              {newComment.trim().length} / {MIN_COMMENT_LENGTH} תווים מינימום
              {newComment.trim().length >= MIN_COMMENT_LENGTH && " ✓"}
              {currentUserId && comments.some(c => c.user_id === currentUserId) && (
                <span className="mr-2" style={{ color: "rgba(180,83,9,0.6)" }}>• כבר הגבת לכתבה זו</span>
              )}
            </span>
            {/* cooldown indicator */}
            {cooldownRemaining > 0 && (
              <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: "rgba(180,83,9,0.7)" }}>
                <Clock size={10} /> המתן {Math.ceil(cooldownRemaining / 1000)} שניות
              </span>
            )}
          </div>
          <button
            onClick={handlePost}
            disabled={isPosting || cooldownRemaining > 0 || newComment.trim().length < MIN_COMMENT_LENGTH}
            className="px-6 py-2.5 bg-[#1e0e04] hover:bg-[#3d1500] text-[#e8d5a3] font-cinzel font-black text-xs rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed tracking-wide shrink-0"
            aria-label="שלח תגובה"
          >
            {isPosting ? "שולח…" : cooldownRemaining > 0 ? `⏳ ${Math.ceil(cooldownRemaining / 1000)}s` : "שליחת ינשוף 🦉"}
          </button>
        </div>
      </div>

      {/* comments list */}
      <div className="space-y-3" role="list" aria-label="רשימת תגובות">
        {comments.length === 0 && (
          <p className="text-center text-[#5d2a00]/35 text-sm italic py-6">היה הראשון להגיב!</p>
        )}
        {comments.map((c) => {
          // 👻 הסתרת תגובות של רוחות רפאים (Shadowban)
          if (c.profiles?.is_ghost && c.user_id !== currentUserId) return null;
          const isMuted = blockedUserIds.includes(c.user_id);
          const house = c.profiles?.house;
          const houseStyle = house ? HOUSE_ACCENT[house] : null;

          if (isMuted) return (
            <div
              key={c.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg border border-[#1e0e04]/08 bg-black/[0.03] opacity-60"
              role="listitem"
            >
              <span className="text-xs italic text-[#5d2a00]/50">תגובה מוסתרת</span>
              <button
                onClick={() => handleToggleMute(c.user_id, true)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-[#5d2a00]/50 hover:text-[#5d2a00] transition-colors"
                aria-label="הצג תגובה מוסתרת"
              >
                <Eye size={12} aria-hidden="true" /> הצג
              </button>
            </div>
          );

          return (
            <div
              key={c.id}
              className="group relative rounded-xl p-4 border-r-4 transition-all"
              style={{
                borderRightColor: houseStyle?.border || "rgba(146,64,14,0.4)",
                background: houseStyle?.bg || "rgba(255,255,255,0.3)",
                border: `1px solid rgba(146,64,14,0.1)`,
                borderRight: `4px solid ${houseStyle?.border || "rgba(146,64,14,0.4)"}`,
              }}
              role="listitem"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Avatar */}
                  <Link href={`/wizard/${c.user_id}`} className="shrink-0 group/av">
                    <div
                      className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center text-base border transition-transform group-hover/av:scale-105"
                      style={{
                        background: houseStyle?.bg || "rgba(146,64,14,0.08)",
                        borderColor: houseStyle?.border ? `${houseStyle.border}50` : "rgba(146,64,14,0.2)",
                      }}
                    >
                      {c.profiles?.avatar_url
                        ? <img src={c.profiles.avatar_url} alt={c.profiles.full_name || "אווטאר"} className="w-full h-full object-cover" />
                        : house === "Gryffindor" ? "🦁"
                        : house === "Slytherin"  ? "🐍"
                        : house === "Ravenclaw"  ? "🦅"
                        : house === "Hufflepuff" ? "🦡" : "🧙"}
                    </div>
                  </Link>
                  {/* Name as profile link */}
                  {(() => {
                    const cGrp = (c.profiles as any)?.user_groups as { name: string; color: string } | null;
                    const nameColor = cGrp?.color || getRoleColor(c.profiles?.role, c.profiles?.house, roleColors);
                    const badgeLabel = cGrp?.name || c.profiles?.role || null;
                    const badgeColor = cGrp?.color || nameColor;
                    return (
                      <>
                        <Link
                          href={`/wizard/${c.user_id}`}
                          className="font-cinzel font-black text-sm hover:underline transition-colors"
                          style={{ color: nameColor }}
                        >
                          {c.profiles?.full_name || "קוסם אנונימי"}
                        </Link>
                        {badgeLabel && (
                          <span style={{
                            fontSize: "9px", fontWeight: 900, fontFamily: "'Cinzel', serif",
                            textTransform: "uppercase", letterSpacing: "0.1em",
                            color: badgeColor, background: `${badgeColor}18`,
                            border: `1px solid ${badgeColor}40`,
                            padding: "1px 8px", borderRadius: "999px",
                          }}>{badgeLabel}</span>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <time
                    className="text-[10px] text-[#5d2a00]/35 font-bold"
                    dateTime={c.created_at}
                  >
                    {new Date(c.created_at).toLocaleDateString("he-IL")}
                    {" "}
                    {new Date(c.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                  </time>

                  {currentUserId && currentUserId !== c.user_id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                      <button
                        onClick={() => handleToggleMute(c.user_id, false)}
                        className="p-1 rounded text-[#5d2a00]/30 hover:text-[#5d2a00]/70 transition-colors"
                        title="השתקה"
                        aria-label={`השתק את ${c.profiles?.full_name || "משתמש"}`}
                      >
                        <EyeOff size={13} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setReportingComment(c)}
                        className="p-1 rounded text-[#5d2a00]/30 hover:text-red-700 transition-colors"
                        title="דיווח"
                        aria-label={`דווח על תגובה של ${c.profiles?.full_name || "משתמש"}`}
                      >
                        <Flag size={13} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-[#1e0e04]/80 leading-relaxed font-assistant">{c.content}</p>
            </div>
          );
        })}
      </div>

      {/* Report Modal */}
      {reportingComment && (
        <div
          className="fixed inset-0 z-[100002] flex items-center justify-center bg-black/70 backdrop-blur-md p-6"
          role="dialog"
          aria-modal="true"
          aria-label="דיווח על תגובה"
        >
          <div className="bg-[#fdfaf5] w-full max-w-sm rounded-2xl p-8 space-y-6 shadow-2xl animate-in zoom-in duration-200">
            <h4 className="font-cinzel text-lg font-black text-red-900 flex items-center gap-2">
              <AlertTriangle size={22} aria-hidden="true" /> דיווח על תגובה
            </h4>
            <div className="space-y-2.5" role="group" aria-label="סיבת הדיווח">
              {["תוכן פוגעני", "ספוילרים", "ספאם", "אחר"].map((r) => (
                <button
                  key={r}
                  onClick={() => setReportReason(r)}
                  className="w-full text-right px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all"
                  style={reportReason === r
                    ? { background: "#7f1d1d", color: "white", borderColor: "#7f1d1d" }
                    : { background: "white", borderColor: "#f1f5f9", color: "#1e0e04" }
                  }
                  aria-pressed={reportReason === r}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSendReport}
                disabled={!reportReason || isReporting}
                className="flex-1 py-3 bg-red-900 hover:bg-red-800 text-white rounded-xl font-black text-sm transition-colors disabled:opacity-50"
                aria-label="שלח דיווח"
              >
                דווח
              </button>
              <button
                onClick={() => { setReportingComment(null); setReportReason(""); }}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors"
                aria-label="בטל דיווח"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


