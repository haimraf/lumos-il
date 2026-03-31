"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getNewsArticlePath } from "@/lib/seo";
import {
    Search, BookOpen, ScrollText, MessageSquare, Sparkles,
    X, User, Loader2, Wand2, ChevronRight
} from "lucide-react";
import Link from "next/link";

/* ─── Types ─── */
type ResultType = 'story' | 'news' | 'thread' | 'user';

interface Result {
    id: string;
    title: string;
    excerpt?: string;
    type: ResultType;
    href: string;
    meta?: { house?: string; role?: string; avatar_url?: string; forum_name?: string; group_name?: string; group_color?: string };
}

/* ─── Config ─── */
const TYPE_CONFIG: Record<ResultType, { label: string; labelPlural: string; icon: any; color: string; bg: string; border: string; hoverBorder: string }> = {
    story:  { label: 'סיפור',  labelPlural: 'סיפורים',  icon: BookOpen,        color: '#818cf8', bg: 'rgba(129,140,248,0.07)', border: 'rgba(129,140,248,0.2)', hoverBorder: 'rgba(129,140,248,0.35)' },
    news:   { label: 'כתבה',   labelPlural: 'כתבות',    icon: ScrollText,      color: '#94a3b8', bg: 'rgba(148,163,184,0.07)', border: 'rgba(148,163,184,0.2)', hoverBorder: 'rgba(148,163,184,0.35)' },
    thread: { label: 'אשכול',  labelPlural: 'אשכולות',  icon: MessageSquare,   color: '#f59e0b', bg: 'rgba(245,158,11,0.07)',  border: 'rgba(245,158,11,0.2)',  hoverBorder: 'rgba(245,158,11,0.35)'  },
    user:   { label: 'קוסם',   labelPlural: 'קוסמים',   icon: User,            color: '#34d399', bg: 'rgba(52,211,153,0.07)',  border: 'rgba(52,211,153,0.2)',  hoverBorder: 'rgba(52,211,153,0.35)'  },
};

const HOUSE_COLORS: Record<string, string> = {
    Gryffindor: '#ef4444', Slytherin: '#10b981', Ravenclaw: '#60a5fa', Hufflepuff: '#f59e0b',
};
const HOUSE_NAMES: Record<string, string> = {
    Gryffindor: 'גריפינדור', Slytherin: "סלית'רין", Ravenclaw: 'רייבנקלו', Hufflepuff: 'הפלפאף',
};
const HOUSE_EMOJIS: Record<string, string> = {
    Gryffindor: '🦁', Slytherin: '🐍', Ravenclaw: '🦅', Hufflepuff: '🦡',
};

/* ─── Highlight component ─── */
function Highlight({ text, query }: { text: string; query: string }) {
    if (!query.trim() || !text) return <>{text}</>;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
        <>
            {parts.map((p, i) =>
                p.toLowerCase() === query.toLowerCase()
                    ? <mark key={i} className="bg-amber-500/30 text-amber-200 rounded px-0.5 not-italic">{p}</mark>
                    : p
            )}
        </>
    );
}

/* ─── Page wrapper (Suspense for useSearchParams) ─── */
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

/* ─── Main content ─── */
function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [supabase] = useState(() => createClient());

    const initialQuery = searchParams.get("q") || "";
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<Result[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [activeFilter, setActiveFilter] = useState<ResultType | 'all'>('all');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const runSearch = useCallback(async (q: string) => {
        if (!q.trim() || q.trim().length < 2) return;
        setIsLoading(true);
        setSearched(true);
        router.replace(`/search?q=${encodeURIComponent(q.trim())}`, { scroll: false });

        const term = q.trim();
        const found: Result[] = [];

        const [{ data: stories }, { data: news }, { data: threads }, { data: users }] = await Promise.all([
            supabase.from('stories').select('id, title, description')
                .eq('is_published', true)
                .or(`title.ilike.%${term}%,description.ilike.%${term}%`)
                .limit(8),
            supabase.from('news').select('id, title, content')
                .or(`title.ilike.%${term}%,content.ilike.%${term}%`)
                .limit(6),
            supabase.from('threads').select('id, title, forums(slug, name)')
                .ilike('title', `%${term}%`)
                .limit(8),
            supabase.from('profiles').select('id, full_name, house, role, avatar_url, user_groups(name, color)')
                .ilike('full_name', `%${term}%`)
                .limit(6),
        ]);

        (stories || []).forEach(s => found.push({
            id: s.id, title: s.title, type: 'story', href: `/library/${s.id}`,
            excerpt: s.description?.replace(/<[^>]*>/g, '').slice(0, 150),
        }));
        (news || []).forEach(n => found.push({
            id: n.id, title: n.title, type: 'news', href: getNewsArticlePath(n.id),
            excerpt: n.content?.replace(/<[^>]*>/g, '').slice(0, 150),
        }));
        (threads || []).forEach((t: any) => found.push({
            id: t.id, title: t.title, type: 'thread',
            href: `/forums/${t.forums?.slug}/${t.id}`,
            meta: { forum_name: t.forums?.name },
        }));
        (users || []).forEach((u: any) => found.push({
            id: u.id, title: u.full_name || 'קוסם אנונימי', type: 'user',
            href: `/wizard/${u.id}`,
            meta: {
                house: u.house,
                role: u.role,
                avatar_url: u.avatar_url,
                group_name: u.user_groups?.name,
                group_color: u.user_groups?.color,
            },
        }));

        setResults(found);
        setIsLoading(false);
    }, [supabase, router]);

    // Auto-search on load from URL
    useEffect(() => {
        if (initialQuery.trim()) runSearch(initialQuery);
    }, []);

    // Live search while typing
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const q = query.trim();
        if (q.length < 2) { setResults([]); setSearched(false); setIsLoading(false); return; }
        setIsLoading(true);
        debounceRef.current = setTimeout(() => runSearch(q), 380);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        runSearch(query);
    };

    const counts = {
        all: results.length,
        story: results.filter(r => r.type === 'story').length,
        news: results.filter(r => r.type === 'news').length,
        thread: results.filter(r => r.type === 'thread').length,
        user: results.filter(r => r.type === 'user').length,
    };

    const filtered = activeFilter === 'all' ? results : results.filter(r => r.type === activeFilter);
    const groupOrder: ResultType[] = ['user', 'thread', 'story', 'news'];

    return (
        <div className="min-h-screen bg-[#060608] pt-36 pb-24 px-4 md:px-6 relative overflow-hidden" dir="rtl">

            {/* Ambient */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-amber-500/[0.04] rounded-full blur-[150px] pointer-events-none z-0" />
            <div className="fixed top-1/3 right-0 w-[350px] h-[350px] bg-indigo-500/[0.03] rounded-full blur-[100px] pointer-events-none z-0" />
            <div className="fixed bottom-1/4 left-0 w-[350px] h-[350px] bg-emerald-500/[0.025] rounded-full blur-[100px] pointer-events-none z-0" />

            <div className="relative z-10 max-w-3xl mx-auto">

                {/* ── Header ── */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/8 border border-amber-500/15 mb-5">
                        <Wand2 size={12} className="text-amber-500/70" />
                        <span className="font-cinzel text-[10px] font-black uppercase tracking-widest text-amber-500/60">חדר הרשומות</span>
                    </div>
                    <h1 className="font-cinzel text-4xl md:text-5xl font-black tracking-tight mb-3">
                        <span className="text-white">חיפוש </span>
                        <span style={{ color: '#f59e0b' }}>בטירה</span>
                    </h1>
                    <div className="flex items-center justify-center gap-3 mt-3">
                        {(['story','news','thread','user'] as ResultType[]).map((t) => {
                            const cfg = TYPE_CONFIG[t];
                            const Icon = cfg.icon;
                            return (
                                <div key={t} className="flex items-center gap-1.5 opacity-35">
                                    <Icon size={12} style={{ color: cfg.color }} />
                                    <span className="font-cinzel text-[9px] uppercase tracking-widest text-white/60">{cfg.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Search input ── */}
                <form onSubmit={handleSubmit} className="relative mb-8">
                    <div className={`flex items-center gap-3 bg-[#0b0f1e] border rounded-2xl px-5 py-4 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.5)] ${
                        query ? 'border-amber-500/40' : 'border-white/8 hover:border-white/15 focus-within:border-amber-500/40'
                    }`}>
                        {isLoading
                            ? <Loader2 size={20} className="text-amber-500/60 shrink-0 animate-spin" />
                            : <Search size={20} className="text-amber-500/35 shrink-0" />
                        }
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="חפש סיפורים, כתבות, אשכולות, קוסמים..."
                            className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-white/20 text-right font-assistant"
                            dir="rtl"
                            autoFocus
                        />
                        {query && (
                            <button type="button"
                                onClick={() => { setQuery(""); setResults([]); setSearched(false); }}
                                className="text-white/20 hover:text-white/60 transition-colors shrink-0 p-1 rounded-lg hover:bg-white/5">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </form>

                {/* ── Filter tabs ── */}
                {searched && results.length > 0 && (
                    <div className="flex items-center gap-2 mb-8 flex-wrap">
                        {(['all', 'user', 'thread', 'story', 'news'] as const).map(f => {
                            const cfg = f === 'all' ? null : TYPE_CONFIG[f];
                            const Icon = cfg?.icon;
                            const count = counts[f];
                            if (f !== 'all' && count === 0) return null;
                            return (
                                <button key={f} onClick={() => setActiveFilter(f)}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-cinzel text-[10px] font-black uppercase tracking-widest transition-all border ${
                                        activeFilter === f
                                            ? 'bg-amber-500 text-amber-950 border-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.25)]'
                                            : 'bg-white/[0.03] text-white/40 border-white/8 hover:text-white/70 hover:border-white/15'
                                    }`}
                                >
                                    {Icon && <Icon size={11} />}
                                    {f === 'all' ? 'הכל' : cfg!.label}
                                    <span className={`${activeFilter === f ? 'text-amber-900/70' : 'text-white/20'}`}>({count})</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* ── States ── */}
                {isLoading && !searched ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Sparkles className="text-amber-500/50 animate-pulse" size={36} />
                        <p className="font-crimson text-xl text-white/30 italic">הטירה מחפשת...</p>
                    </div>

                ) : searched && filtered.length === 0 && !isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-5 border border-dashed border-white/8 rounded-[2rem]">
                        <Search size={36} className="text-white/10" />
                        <div className="text-center space-y-2">
                            <p className="font-cinzel text-white/25 text-sm uppercase tracking-widest font-black">הקסם לא נמצא בספרי הטירה</p>
                            <p className="font-crimson text-white/20 text-xl italic">"אולי הלחש הזה עדיין לא נכתב..."</p>
                        </div>
                    </div>

                ) : searched && filtered.length > 0 ? (
                    <div>
                        {/* Results summary */}
                        <div className="flex items-center gap-2 mb-6">
                            <span className="font-cinzel text-[11px] font-black uppercase tracking-widest text-white/20">נמצאו</span>
                            <span className="font-cinzel text-sm font-black text-amber-500/70">{filtered.length}</span>
                            <span className="font-cinzel text-[11px] font-black uppercase tracking-widest text-white/20">תוצאות עבור</span>
                            <span className="font-assistant text-sm text-white/50">"{query}"</span>
                        </div>

                        {/* Grouped or flat */}
                        {activeFilter === 'all' ? (
                            <div className="space-y-8">
                                {groupOrder.filter(t => counts[t] > 0).map(type => {
                                    const typeResults = results.filter(r => r.type === type);
                                    const cfg = TYPE_CONFIG[type];
                                    const Icon = cfg.icon;
                                    return (
                                        <section key={type}>
                                            <div className="flex items-center gap-2.5 mb-3">
                                                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                                                    <Icon size={13} style={{ color: cfg.color }} />
                                                </div>
                                                <span className="font-cinzel text-xs font-black uppercase tracking-widest" style={{ color: cfg.color }}>
                                                    {cfg.labelPlural}
                                                </span>
                                                <span className="font-cinzel text-[10px] text-white/20">({typeResults.length})</span>
                                                <div className="flex-1 h-px" style={{ background: `${cfg.color}15` }} />
                                            </div>
                                            <div className="space-y-2">
                                                {typeResults.map((r, i) => (
                                                    <ResultCard key={r.id} result={r} query={query} index={i} />
                                                ))}
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filtered.map((r, i) => <ResultCard key={r.id} result={r} query={query} index={i} />)}
                            </div>
                        )}
                    </div>

                ) : !query ? (
                    /* Idle state */
                    <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
                        <div className="grid grid-cols-4 gap-3 mb-2">
                            {(['story','news','thread','user'] as ResultType[]).map(t => {
                                const cfg = TYPE_CONFIG[t];
                                const Icon = cfg.icon;
                                return (
                                    <div key={t} className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
                                        <Icon size={20} style={{ color: `${cfg.color}60` }} />
                                        <span className="font-cinzel text-[9px] uppercase tracking-widest text-white/20">{cfg.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="font-crimson text-xl text-white/20 italic">לחשו שם, כישרון או כותרת ספר...</p>
                    </div>
                ) : null}

            </div>
        </div>
    );
}

/* ─── Result Card ─── */
function ResultCard({ result, query, index }: { result: Result; query: string; index: number }) {
    const cfg = TYPE_CONFIG[result.type];
    const Icon = cfg.icon;

    if (result.type === 'user') {
        const house = result.meta?.house;
        const houseColor = house ? HOUSE_COLORS[house] : 'rgba(255,255,255,0.3)';
        const houseEmoji = house ? HOUSE_EMOJIS[house] : '✨';
        const groupName = result.meta?.group_name;
        const nameColor = result.meta?.group_color || houseColor;
        const badgeLabel = groupName || result.meta?.role;
        return (
            <Link href={result.href}
                className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] hover:bg-emerald-500/[0.03] transition-all group"
                onMouseEnter={e => (e.currentTarget.style.borderColor = cfg.hoverBorder)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
            >
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 shrink-0 flex items-center justify-center text-xl bg-slate-900"
                    style={{ borderColor: `${nameColor}40` }}>
                    {result.meta?.avatar_url
                        ? <img src={result.meta.avatar_url} alt={result.title || "אווטאר"} className="w-full h-full object-cover" />
                        : <span>{houseEmoji}</span>
                    }
                </div>
                <div className="flex-1 min-w-0 text-right">
                    <p className="font-cinzel font-black text-[15px] truncate transition-colors"
                        style={{ color: nameColor }}>
                        <Highlight text={result.title} query={query} />
                    </p>
                    {(house || badgeLabel) && (
                        <p className="font-assistant text-xs mt-0.5" style={{ color: `${houseColor}80` }}>
                            {house ? HOUSE_NAMES[house] : ''}
                            {house && badgeLabel && ' • '}
                            {badgeLabel || ''}
                        </p>
                    )}
                </div>
                <ChevronRight size={14} className="text-white/15 group-hover:text-white/40 transition-colors shrink-0 rotate-180" />
            </Link>
        );
    }

    return (
        <Link href={result.href}
            className="flex items-start gap-4 p-5 rounded-2xl border border-white/[0.06] bg-[#0a0e1a]/60 hover:bg-white/[0.02] transition-all group"
            onMouseEnter={e => (e.currentTarget.style.borderColor = cfg.hoverBorder)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
        >
            <div className="p-2.5 rounded-xl shrink-0 mt-0.5"
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                <Icon size={16} style={{ color: cfg.color }} />
            </div>
            <div className="flex-1 text-right min-w-0">
                <div className="flex items-center gap-2 justify-end mb-1.5">
                    <span className="font-cinzel text-[9px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>
                        {cfg.label}
                    </span>
                    {result.meta?.forum_name && (
                        <span className="text-[10px] text-white/20 font-assistant">• {result.meta.forum_name}</span>
                    )}
                </div>
                <h3 className="font-cinzel text-[15px] font-black text-white/80 group-hover:text-white transition-colors mb-1.5 leading-snug">
                    <Highlight text={result.title} query={query} />
                </h3>
                {result.excerpt && (
                    <p className="font-crimson text-[15px] text-white/35 leading-relaxed line-clamp-2">
                        <Highlight text={result.excerpt} query={query} />
                    </p>
                )}
            </div>
            <ChevronRight size={13} className="text-white/15 group-hover:text-white/40 transition-colors shrink-0 mt-1 rotate-180" />
        </Link>
    );
}


