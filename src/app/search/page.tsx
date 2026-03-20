"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Search, BookOpen, ScrollText, Users, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Result {
    id: string;
    title: string;
    excerpt: string;
    type: 'story' | 'news' | 'forum';
    href: string;
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#060608] flex items-center justify-center">
                <Sparkles className="text-amber-500 animate-pulse" size={40} />
            </div>
        }>
            <SearchContent />
        </Suspense>
    );
}

function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const supabase = createClient();

    const initialQuery = searchParams.get("q") || "";
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<Result[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [activeFilter, setActiveFilter] = useState<'all' | 'story' | 'news' | 'forum'>('all');

    // חיפוש אוטומטי עם query מה-URL
    useEffect(() => {
        if (initialQuery.trim()) {
            runSearch(initialQuery);
        }
    }, []);

    const runSearch = async (q: string) => {
        if (!q.trim()) return;
        setIsLoading(true);
        setSearched(true);

        // עדכון URL
        router.replace(`/search?q=${encodeURIComponent(q.trim())}`, { scroll: false });

        const term = q.trim();
        const found: Result[] = [];

        // חיפוש בסיפורים
        const { data: stories } = await supabase
            .from('stories')
            .select('id, title, description')
            .eq('is_published', true)
            .or(`title.ilike.%${term}%,description.ilike.%${term}%`)
            .limit(8);

        (stories || []).forEach(s => found.push({
            id: s.id,
            title: s.title,
            excerpt: s.description?.replace(/<[^>]*>?/gm, '').slice(0, 120) + '...' || '',
            type: 'story',
            href: `/library/${s.id}`
        }));

        // חיפוש בחדשות
        const { data: news } = await supabase
            .from('news')
            .select('id, title, content')
            .or(`title.ilike.%${term}%,content.ilike.%${term}%`)
            .limit(6);

        (news || []).forEach(n => found.push({
            id: n.id,
            title: n.title,
            excerpt: n.content?.replace(/<[^>]*>?/gm, '').slice(0, 120) + '...' || '',
            type: 'news',
            href: `/news?article=${n.id}`
        }));

        // חיפוש בפורומים (אם קיים טבלה)
        const { data: forums } = await supabase
            .from('forums')  // ✅
            .select('id, title, content')
            .or(`title.ilike.%${term}%,content.ilike.%${term}%`)
            .limit(6);
        (forums || []).forEach(f => found.push({
            id: f.id,
            title: f.title,
            excerpt: f.content?.replace(/<[^>]*>?/gm, '').slice(0, 120) + '...' || '',
            type: 'forum',
            href: `/forums/${f.id}`
        }));

        setResults(found);
        setIsLoading(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        runSearch(query);
    };

    const typeConfig = {
        story: { label: 'סיפור', icon: BookOpen, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
        news: { label: 'כתבה', icon: ScrollText, color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' },
        forum: { label: 'אשכול', icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    };

    const filtered = activeFilter === 'all' ? results : results.filter(r => r.type === activeFilter);

    const counts = {
        all: results.length,
        story: results.filter(r => r.type === 'story').length,
        news: results.filter(r => r.type === 'news').length,
        forum: results.filter(r => r.type === 'forum').length,
    };

    return (
        <div className="min-h-screen bg-[#060608] pt-36 pb-24 px-6 relative overflow-hidden" dir="rtl">

            {/* הילה */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none z-0" />

            <div className="relative z-10" style={{ maxWidth: '52rem', marginLeft: 'auto', marginRight: 'auto' }}>

                {/* כותרת */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-amber-500/20 bg-amber-500/5 mb-6">
                        <Search size={28} className="text-amber-500/70" />
                    </div>
                    <h1 className="font-cinzel text-4xl md:text-5xl font-black text-amber-500 uppercase tracking-widest mb-3">
                        חיפוש בטירה
                    </h1>
                    <div className="h-px w-32 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent mx-auto" />
                </div>

                {/* שדה חיפוש */}
                <form onSubmit={handleSubmit} className="relative mb-10">
                    <div className="flex items-center gap-3 bg-[#0c0c0f] border border-white/12 hover:border-amber-500/30 focus-within:border-amber-500/50 rounded-2xl px-6 py-4 transition-all shadow-2xl">
                        <Search size={20} className="text-amber-500/50 shrink-0" />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="חפש סיפורים, כתבות, אשכולות..."
                            className="flex-1 bg-transparent text-white text-xl outline-none placeholder:text-white/25 text-right font-assistant"
                            dir="rtl"
                            autoFocus
                        />
                        {query && (
                            <button type="button" onClick={() => { setQuery(""); setResults([]); setSearched(false); }}
                                className="text-white/25 hover:text-white/60 transition-colors shrink-0">
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </form>

                {/* פילטרים */}
                {searched && results.length > 0 && (
                    <div className="flex items-center gap-2 mb-8 flex-wrap">
                        {(['all', 'story', 'news', 'forum'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-4 py-2 rounded-xl font-cinzel text-[10px] font-black uppercase tracking-widest transition-all border ${activeFilter === f
                                        ? 'bg-amber-500 text-amber-950 border-amber-500 shadow-lg'
                                        : 'bg-white/5 text-white/50 border-white/8 hover:text-white/80 hover:border-white/20'
                                    }`}
                            >
                                {f === 'all' ? 'הכל' : typeConfig[f].label}
                                <span className="mr-2 opacity-60">({counts[f]})</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* תוצאות */}
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-24 gap-4">
                            <Sparkles className="text-amber-500 animate-pulse" size={36} />
                            <p className="font-crimson text-xl text-white/40 italic">הטירה מחפשת...</p>
                        </motion.div>
                    ) : searched && filtered.length === 0 ? (
                        <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center py-24 gap-5 border border-dashed border-white/8 rounded-[2rem]">
                            <Search size={40} className="text-white/15" />
                            <div className="text-center space-y-2">
                                <p className="font-cinzel text-white/30 text-sm uppercase tracking-widest font-black">לא נמצאו תוצאות</p>
                                <p className="font-crimson text-white/20 text-lg italic">
                                    "אולי הקסם שחיפשת עדיין לא נכתב..."
                                </p>
                            </div>
                        </motion.div>
                    ) : searched ? (
                        <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                            <p className="text-[11px] text-white/30 font-black uppercase tracking-widest mb-6">
                                נמצאו {filtered.length} תוצאות עבור "{initialQuery}"
                            </p>
                            {filtered.map((r, i) => {
                                const cfg = typeConfig[r.type];
                                const Icon = cfg.icon;
                                return (
                                    <motion.div
                                        key={r.id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <Link href={r.href}
                                            className="flex items-start gap-5 p-6 rounded-2xl border border-white/6 hover:border-amber-500/25 hover:bg-amber-500/[0.03] bg-[#0c0c0f] transition-all group">
                                            <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${cfg.bg}`}>
                                                <Icon size={18} className={cfg.color} />
                                            </div>
                                            <div className="flex-1 text-right">
                                                <div className="flex items-center gap-3 justify-end mb-1.5">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                                                </div>
                                                <h3 className="font-cinzel text-lg font-black text-white/85 group-hover:text-amber-400 transition-colors mb-2 leading-snug">
                                                    {r.title}
                                                </h3>
                                                <p className="font-crimson text-base text-white/45 leading-relaxed line-clamp-2">
                                                    {r.excerpt}
                                                </p>
                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    ) : (
                        <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                            <p className="font-crimson text-2xl text-white/20 italic">
                                "הקלידו את שם הקסם שאתם מחפשים..."
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}