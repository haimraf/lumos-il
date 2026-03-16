"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ScrollText, Calendar, User, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author?: string;
  image_url?: string;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setIsLoading(true);
        setErrorStatus(null);
        
        const { data, error } = await supabase
          .from("news")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setNews(data || []);
      } catch (err: any) {
        console.error("Error fetching news:", err);
        setErrorStatus(err.message || "נכשלה טעינת העדכונים");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-16 h-16 border-t-2 border-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-[#f8fafc] py-20 px-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-16">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-amber-500/10 rounded-full border border-amber-500/20 mb-4">
            <ScrollText size={40} className="text-amber-500" />
          </div>
          <h1 className="font-cinzel text-5xl md:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-100 to-amber-500">
            נביא היומי
          </h1>
          <p className="font-crimson text-xl md:text-2xl text-white/60 italic">
            כל העדכונים מעולם הקסמים של לומוס ישראל
          </p>
        </div>

        {/* News Feed */}
        <div className="grid grid-cols-1 gap-12">
          {errorStatus ? (
            <div className="text-center py-20 space-y-6 bg-red-500/10 border border-red-500/20 rounded-3xl backdrop-blur-sm">
              <Sparkles size={48} className="text-red-500/40 mx-auto" />
              <p className="font-crimson text-2xl text-red-500/80 italic font-bold">תקלה בתקשורת עם משרד הקסמים. נסו שוב מאוחר יותר.</p>
              <button 
                onClick={() => window.location.reload()}
                className="font-cinzel text-sm text-white/60 hover:text-white underline underline-offset-8 decoration-amber-500/50"
              >
                נסה שוב
              </button>
            </div>
          ) : news.length > 0 ? (
            news.map((item, index) => (
              <NewsCard key={item.id} item={item} index={index} />
            ))
          ) : (
            <div className="text-center py-20 space-y-6 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-sm">
              <Sparkles size={48} className="text-amber-500/20 mx-auto" />
              <p className="font-crimson text-2xl text-white/40 italic">הינשופים בדרך... אין עדכונים חדשים כרגע.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const date = new Date(item.created_at).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div 
      className="group relative bg-[#e2d1b0] text-[#020617] rounded-sm overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[#8b6a3a]/30 animate-ink-bleed"
      style={{ 
        backgroundImage: "url('https://www.transparenttextures.com/patterns/natural-paper.png')",
        animationDelay: `${index * 0.2}s`
      }}
    >
      {/* Decorative Blueprint Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute top-0 left-0 w-full h-px bg-[#020617] translate-y-8"></div>
        <div className="absolute top-0 left-0 w-px h-full bg-[#020617] translate-x-8"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-[#020617] -translate-y-8"></div>
        <div className="absolute top-0 right-0 w-px h-full bg-[#020617] -translate-x-8"></div>
      </div>

      <div className="p-8 md:p-12 space-y-6 relative z-10">
        <div className="flex flex-wrap items-center gap-6 text-sm font-cinzel uppercase tracking-widest opacity-60">
          <div className="flex items-center gap-2">
            <Calendar size={14} />
            <span>{date}</span>
          </div>
          {item.author && (
            <div className="flex items-center gap-2">
              <User size={14} />
              <span>{item.author}</span>
            </div>
          )}
        </div>

        <h2 className="font-cinzel text-3xl md:text-4xl font-black leading-tight group-hover:text-amber-800 transition-colors">
          {item.title}
        </h2>

        <div className="font-crimson text-xl leading-relaxed whitespace-pre-wrap">
          {item.content}
        </div>

        <div className="pt-6 border-t border-[#020617]/10 flex justify-between items-center">
          <Link 
            href="#"
            className="group/btn flex items-center gap-2 font-cinzel text-sm font-bold uppercase tracking-widest border-b-2 border-transparent hover:border-[#020617] transition-all"
          >
            קרא עוד <ArrowRight size={16} className="rotate-180 group-hover/btn:-translate-x-1 transition-transform" />
          </Link>
          <div className="text-[10px] font-cinzel opacity-40 uppercase tracking-widest">
            Ref: L-MN-{item.id.slice(0, 4)}
          </div>
        </div>
      </div>
      
      {/* Ink Bleed Texture Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#020617]/5 to-transparent pointer-events-none"></div>
    </div>
  );
}
