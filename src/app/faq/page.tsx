"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { SITE_FAQ } from "@/data/site-features-faq";
import { ChevronDown, Wand2, BookOpen, Feather, Search, X } from "lucide-react";

const CATEGORIES = [...new Set(SITE_FAQ.map(f => f.category))];

const CATEGORY_ICONS: Record<string, string> = {
    "לחשי מקלדת": "✨",
    "מצנפת המיון": "🎩",
    "שרביטים": "🪄",
    "פטרונוס": "🦌",
    "מפת הקונדסאים": "🗺️",
    "גביע הבתים": "🏆",
    "מערכת שנים": "📜",
    "בחינות": "🦉",
    "פורומים": "📬",
    "האולם הגדול": "🏰",
    "הנביא היומי": "📰",
    "ספרייה": "📚",
    "חנות": "🛒",
    "Easter Eggs": "🥚",
    "מודרציה": "🛡️",
    "ניהול": "⚡",
    "אווירה": "🌙",
    "פרופיל": "👤",
    "דובי": "🧸",
    "זירת קרבות": "⚔️",
    "ינשוף מייל": "📮",
    "לחשים": "🔮",
    "טיקר": "📡",
    "מערכת הקווסטים": "✦",
    "תכונות": "⭐",
};

export default function FAQPage() {
    const [openItemId, setOpenItemId] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

    const filtered = SITE_FAQ.filter((item) => {
        const matchesCategory = activeCategory ? item.category === activeCategory : true;
        const matchesSearch = deferredSearchQuery
            ? [item.q, item.a, item.category].some((value) => value.toLowerCase().includes(deferredSearchQuery))
            : true;

        return matchesCategory && matchesSearch;
    });

    const faqStructuredData = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        inLanguage: "he-IL",
        mainEntity: SITE_FAQ.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.a,
            },
        })),
    };

    return (
        <main className="min-h-screen bg-[#06040a] text-white relative overflow-hidden" dir="rtl" aria-label="מרכז השאלות והתשובות של Lumos IL">
            <Script
                id="faq-structured-data"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
            />
            {/* ambient glows */}
            <div className="fixed top-0 right-1/3 w-[700px] h-[500px] bg-amber-500/[0.04] rounded-full blur-[160px] pointer-events-none" />
            <div className="fixed bottom-1/4 left-0 w-[500px] h-[500px] bg-purple-500/[0.03] rounded-full blur-[140px] pointer-events-none" />
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=IM+Fell+English:ital@0;1&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');

                @keyframes twinkle {
                    0%,100% { opacity:0.15; } 50% { opacity:0.7; }
                }
                @keyframes float-slow {
                    0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); }
                }
                @keyframes faq-open {
                    from { opacity:0; transform:translateY(-8px); }
                    to   { opacity:1; transform:translateY(0); }
                }
                .faq-answer { animation: faq-open 0.25s ease forwards; }

                .parchment-card {
                    background: radial-gradient(ellipse at 30% 0%, rgba(245,215,150,0.06) 0%, rgba(245,215,150,0.02) 50%, transparent 100%);
                    border: 1px solid rgba(245,215,150,0.1);
                    transition: all 0.2s ease;
                }
                .parchment-card:hover {
                    border-color: rgba(245,215,150,0.22);
                    background: radial-gradient(ellipse at 30% 0%, rgba(245,215,150,0.08) 0%, rgba(245,215,150,0.03) 50%, transparent 100%);
                }
                .parchment-card.open {
                    border-color: rgba(245,158,11,0.3);
                    background: radial-gradient(ellipse at 20% 0%, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 60%, transparent 100%);
                }

                .cat-pill {
                    transition: all 0.18s ease;
                    cursor: pointer;
                }
                .cat-pill:hover { transform: translateY(-1px); }

                .scroll-divider {
                    background: linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.4) 30%, rgba(245,215,150,0.6) 50%, rgba(245,158,11,0.4) 70%, transparent 100%);
                    height: 1px;
                }
            `}</style>

            {/* Starfield */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                {Array.from({ length: 60 }, (_, i) => (
                    <div key={i} className="absolute rounded-full bg-amber-100"
                        style={{
                            left: `${(i * 17.3) % 100}%`,
                            top: `${(i * 23.7) % 100}%`,
                            width: `${0.5 + (i % 3) * 0.5}px`,
                            height: `${0.5 + (i % 3) * 0.5}px`,
                            animation: `twinkle ${2 + (i % 4)}s ${(i * 0.3) % 4}s ease-in-out infinite`,
                            opacity: 0.15,
                        }} />
                ))}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[50%] bg-[radial-gradient(ellipse_at_50%_0%,rgba(120,80,20,0.12),transparent_60%)]" />
                <div className="absolute bottom-0 right-0 w-[60%] h-[40%] bg-[radial-gradient(ellipse_at_100%_100%,rgba(80,20,120,0.08),transparent_60%)]" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 py-20">

                {/* ── Header ── */}
                <header className="text-center mb-16 space-y-6" aria-labelledby="faq-page-title">
                    {/* Floating quill icon */}
                    <div className="flex justify-center" style={{ animation: "float-slow 4s ease-in-out infinite" }}>
                        <div className="relative w-20 h-20 rounded-full border border-amber-500/20 bg-amber-500/5 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.15)]">
                            <BookOpen size={36} className="text-amber-500/70" />
                            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full border border-amber-500/30 bg-[#06040a] flex items-center justify-center">
                                <Wand2 size={12} className="text-amber-400" />
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", letterSpacing: "0.5em", color: "rgba(245,158,11,0.5)", textTransform: "uppercase", marginBottom: "12px" }}>
                            ספר הלחשים המקיף של הטירה
                        </p>
                        <h1 id="faq-page-title" style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: "clamp(2.5rem,7vw,5rem)", lineHeight: 1.1, color: "white" }}>
                            מה מסתתר{" "}
                            <span style={{ background: "linear-gradient(135deg,#fcd34d,#d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                בטירה?
                            </span>
                        </h1>
                        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: "rgba(255,255,255,0.4)", fontSize: "1.15rem", marginTop: "12px" }}>
                            כל הפיצ׳רים, הקסמים, ה-Easter Eggs וסודות הטירה — מרוכזים כאן
                        </p>
                    </div>

                    {/* Stats strip */}
                    <div className="flex items-center justify-center gap-8 pt-2" role="status" aria-live="polite">
                        {[
                            { value: SITE_FAQ.length, label: "שאלות" },
                            { value: CATEGORIES.length, label: "קטגוריות" },
                            { value: "∞", label: "קסמים" },
                        ].map(s => (
                            <div key={s.label} className="text-center">
                                <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: "1.5rem", color: "#fbbf24" }}>{s.value}</div>
                                <div style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", letterSpacing: "0.25em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </header>

                <div className="scroll-divider mb-10" />

                <section className="mb-8" aria-labelledby="faq-search-title">
                    <div id="faq-search-title" className="sr-only">חיפוש בספר השאלות</div>
                    <div className="max-w-2xl mx-auto">
                        <label htmlFor="faq-search" className="sr-only">חיפוש שאלה או תשובה</label>
                        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/15 bg-white/[0.03] px-4 py-3 shadow-[0_0_30px_rgba(245,158,11,0.06)]">
                            <Search size={16} className="text-amber-400/70 shrink-0" />
                            <input
                                id="faq-search"
                                type="search"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="חפשו לחש, מערכת או שאלה נפוצה"
                                className="w-full bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none"
                                dir="rtl"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] p-1.5 text-white/35 transition-colors hover:text-white hover:border-amber-500/30"
                                    aria-label="ניקוי החיפוש"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                        <p className="mt-3 text-center text-sm text-white/35" role="status" aria-live="polite">
                            {filtered.length} תוצאות זמינות
                        </p>
                    </div>
                </section>

                {/* ── Category Filter ── */}
                <section className="mb-10" aria-labelledby="faq-category-title">
                    <p id="faq-category-title" style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", letterSpacing: "0.35em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: "14px", textAlign: "center" }}>
                        סנן לפי פרק
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        <button
                            type="button"
                            onClick={() => setActiveCategory(null)}
                            className="cat-pill px-4 py-1.5 rounded-full border"
                            style={{
                                fontFamily: "'Cinzel', serif", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase",
                                background: activeCategory === null ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.03)",
                                borderColor: activeCategory === null ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.07)",
                                color: activeCategory === null ? "#fbbf24" : "rgba(255,255,255,0.35)",
                                boxShadow: activeCategory === null ? "0 0 12px rgba(245,158,11,0.15)" : "none",
                            }}
                        >
                            ✦ הכל
                        </button>
                        {CATEGORIES.map(cat => {
                            const isActive = activeCategory === cat;
                            const icon = CATEGORY_ICONS[cat] || "•";
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                                    className="cat-pill px-3 py-1.5 rounded-full border"
                                    style={{
                                        fontFamily: "'Cinzel', serif", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase",
                                        background: isActive ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.025)",
                                        borderColor: isActive ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.06)",
                                        color: isActive ? "#fcd34d" : "rgba(255,255,255,0.3)",
                                        boxShadow: isActive ? "0 0 10px rgba(245,158,11,0.12)" : "none",
                                    }}
                                >
                                    {icon} {cat}
                                </button>
                            );
                        })}
                    </div>
                    {activeCategory && (
                        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: "rgba(245,158,11,0.4)", fontSize: "0.85rem", textAlign: "center", marginTop: "10px" }}>
                            מציג {filtered.length} שאלות מתוך פרק {activeCategory}
                            <button type="button" onClick={() => setActiveCategory(null)} style={{ marginRight: "8px", color: "rgba(255,255,255,0.3)", textDecoration: "underline", cursor: "pointer", fontSize: "0.75rem" }}>
                                נקה סינון
                            </button>
                        </p>
                    )}
                </section>

                {/* ── FAQ Accordion ── */}
                <section className="space-y-2.5" aria-labelledby="faq-results-title">
                    <h2 id="faq-results-title" className="sr-only">תוצאות השאלות והתשובות</h2>
                    {filtered.map((item) => {
                        const itemId = `faq-item-${item.category}-${item.q}`
                            .replace(/\s+/g, "-")
                            .replace(/["׳״!?.,/]/g, "")
                            .toLowerCase();
                        const isOpen = openItemId === itemId;
                        const icon = CATEGORY_ICONS[item.category] || "•";
                        return (
                            <div
                                key={itemId}
                                className={`parchment-card rounded-2xl overflow-hidden ${isOpen ? "open" : ""}`}
                            >
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between gap-4 px-6 py-4 text-right"
                                    onClick={() => setOpenItemId(isOpen ? null : itemId)}
                                    aria-expanded={isOpen}
                                    aria-controls={`${itemId}-panel`}
                                    id={`${itemId}-button`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        {/* Category badge */}
                                        <span style={{
                                            flexShrink: 0,
                                            fontFamily: "'Cinzel', serif", fontSize: "7px",
                                            letterSpacing: "0.2em", textTransform: "uppercase",
                                            color: "rgba(245,158,11,0.5)",
                                            padding: "3px 8px", borderRadius: "20px",
                                            border: "1px solid rgba(245,158,11,0.12)",
                                            background: "rgba(245,158,11,0.05)",
                                            whiteSpace: "nowrap",
                                        }} className="hidden sm:inline-flex items-center gap-1">
                                            {icon} {item.category}
                                        </span>
                                        {/* Question */}
                                        <span style={{
                                            fontFamily: "'Cinzel', serif", fontWeight: 700,
                                            fontSize: "0.875rem", lineHeight: 1.4,
                                            color: isOpen ? "#fcd34d" : "rgba(255,255,255,0.82)",
                                            transition: "color 0.2s",
                                        }}>
                                            {item.q}
                                        </span>
                                    </div>

                                    {/* Chevron */}
                                    <div style={{
                                        flexShrink: 0,
                                        width: "28px", height: "28px", borderRadius: "50%",
                                        border: `1px solid ${isOpen ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.08)"}`,
                                        background: isOpen ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.03)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        transition: "all 0.2s",
                                    }} aria-hidden="true">
                                        <ChevronDown
                                            size={14}
                                            style={{
                                                color: isOpen ? "#fbbf24" : "rgba(255,255,255,0.2)",
                                                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                                                transition: "transform 0.25s ease",
                                            }}
                                        />
                                    </div>
                                </button>

                                {isOpen && (
                                    <div id={`${itemId}-panel`} role="region" aria-labelledby={`${itemId}-button`} className="faq-answer px-6 pb-5">
                                        {/* Divider */}
                                        <div style={{ height: "1px", background: "linear-gradient(90deg,rgba(245,158,11,0.3),transparent)", marginBottom: "14px" }} />
                                        <div className="flex gap-3">
                                            <div style={{ flexShrink: 0, width: "3px", borderRadius: "2px", background: "linear-gradient(180deg,rgba(245,158,11,0.6),rgba(245,158,11,0.1))", alignSelf: "stretch" }} />
                                            <p style={{
                                                fontFamily: "'Crimson Text', 'IM Fell English', serif",
                                                fontSize: "1.05rem", lineHeight: 1.75,
                                                color: "rgba(255,255,255,0.68)",
                                            }}>
                                                {item.a}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {filtered.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center" role="status" aria-live="polite">
                            <p className="text-lg text-white/55">לא נמצאו התאמות לחיפוש או לסינון שבחרת.</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setActiveCategory(null);
                                }}
                                className="mt-4 rounded-full border border-amber-500/20 bg-amber-500/10 px-5 py-2 text-sm text-amber-300 transition-colors hover:bg-amber-500/15"
                            >
                                נקה חיפוש וסינון
                            </button>
                        </div>
                    )}
                </section>

                {/* ── Footer ── */}
                <div className="mt-16 text-center space-y-5">
                    <div className="scroll-divider mb-8" />
                    <div className="flex justify-center">
                        <div style={{ animation: "float-slow 5s ease-in-out infinite 1s" }}>
                            <Feather size={28} className="text-amber-500/30" />
                        </div>
                    </div>
                    <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: "rgba(255,255,255,0.25)", fontSize: "1rem" }}>
                        עדיין לא מצאתם תשובה?
                    </p>
                    <Link
                        href="/great-hall"
                        aria-label="מעבר לאולם הגדול כדי לשאול את הקהילה"
                        className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl transition-all hover:-translate-y-0.5"
                        style={{
                            fontFamily: "'Cinzel', serif", fontWeight: 700,
                            fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase",
                            background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
                            color: "#fbbf24",
                            boxShadow: "0 0 20px rgba(245,158,11,0.08)",
                        }}
                    >
                        <Wand2 size={14} /> שאלו באולם הגדול
                    </Link>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", letterSpacing: "0.3em", color: "rgba(255,255,255,0.1)", textTransform: "uppercase", marginTop: "24px" }}>
                        © LUMOS IL — משרד הקסמים הישראלי
                    </p>
                </div>

            </div>
        </main>
    );
}
