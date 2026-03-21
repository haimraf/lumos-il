"use client";

import { useEffect, useState, useRef } from "react";
import { useOwlMail } from "@/components/OwlMail";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * LUMOS IL - GLOBAL MAGIC ENGINE V3.1
 * ✅ Hebrew + English keyboard support
 * ✅ Fallback by spell name when terminal_command empty in DB
 * ✅ Full effects: lumos, nox, alohomora, accio, expelliarmus, protego, wingardium, expecto
 */

// Fallback: אם terminal_command ריק ב-DB — נזהה לפי שם הלחש
const SPELL_NAME_FALLBACK: Record<string, string> = {
    "alohomora":   "אלוהומורה",
    "lumos":       "לומוס",
    "nox":         "נוקס",
    "wingardium":  "וינגארדיום",
    "expelliarmus":"אקספליארמוס",
    "protego":     "פרוטגו",
    "expecto":     "אקספקטו",
};

const CASTLE_LINKS = [
    { label: "האולם הגדול",  href: "/great-hall", emoji: "🏰" },
    { label: "פורומים",      href: "/forums",      emoji: "📬" },
    { label: "הספרייה",      href: "/library",     emoji: "📚" },
    { label: "הנביא היומי",  href: "/news",        emoji: "📰" },
    { label: "גביע הבתים",   href: "/house-cup",   emoji: "🏆" },
    { label: "חיפוש בטירה",  href: "/search",      emoji: "🔍" },
    { label: "דשבורד",       href: "/dashboard",   emoji: "✨" },
    { label: "מפת המרודים",  href: "/map",         emoji: "🗺️" },
];

export default function MagicSpells() {
    const { sendOwl } = useOwlMail();
    const { profile } = useAuth();
    const supabase = createClient();

    const [isLumosOn,        setIsLumosOn]        = useState(false);
    const [mousePos,         setMousePos]          = useState({ x: 0, y: 0 });
    const [flash,            setFlash]             = useState<"white"|"red"|null>(null);
    const [isMischiefManaged,setIsMischiefManaged] = useState(false);
    const [alohomoraOpen,    setAlohomoraOpen]     = useState(false);
    const [protegoActive,    setProtegoActive]     = useState(false);
    const [expectoActive,    setExpectoActive]     = useState(false);
    const [wingardiumActive, setWingardiumActive]  = useState(false);

    const inputBuffer  = useRef("");
    const allSpellsRef = useRef<any[]>([]);
    const profileRef   = useRef<any>(null);
    const sendOwlRef   = useRef(sendOwl);

    useEffect(() => {
        profileRef.current = profile;
        if (profile) console.log("[MagicSpells] profile learned_spells:", profile.learned_spells);
    }, [profile]);

    useEffect(() => { sendOwlRef.current = sendOwl; }, [sendOwl]);

    // טעינת לחשים מ-DB
    useEffect(() => {
        supabase.from('spells').select('id, name, terminal_command')
            .then(({ data, error }) => {
                if (error) {
                    console.error("[MagicSpells] DB error:", error);
                } else {
                    allSpellsRef.current = data || [];
                    console.log("[MagicSpells] spells loaded:", data?.map(s => `${s.name} → "${s.terminal_command}"`));
                }
            });
    }, [supabase]);

    // עכבר עם לומוס
    useEffect(() => {
        if (!isLumosOn) return;
        const onMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
        window.addEventListener("mousemove", onMove);
        return () => window.removeEventListener("mousemove", onMove);
    }, [isLumosOn]);

    // מנוע מקלדת
    useEffect(() => {
        const hasLearned = (command: string): boolean => {
            const p = profileRef.current;
            const spells = allSpellsRef.current;
            const cmd = command.toLowerCase();

            // לחשי בסיס — חינם לכולם
            if (cmd === 'lumos' || cmd === 'nox' || cmd === 'accio') return true;
            if (!p) return false;
            if (p.role === 'מנהל' || p.role?.toLowerCase() === 'admin') return true;

            // ✅ חיפוש לפי terminal_command (case-insensitive) או fallback לפי שם
            const fallbackName = SPELL_NAME_FALLBACK[cmd];
            const spell = spells.find(s =>
                s.terminal_command?.toLowerCase() === cmd ||
                (fallbackName && s.name?.includes(fallbackName))
            );

            if (!spell) {
                console.log(`[MagicSpells] spell "${cmd}" not found. DB spells:`, spells.map(s => `${s.name}→"${s.terminal_command}"`));
                return false;
            }

            const hasIt = p.learned_spells?.includes(spell.id) || false;
            console.log(`[MagicSpells] "${cmd}" (id=${spell.id}) — learned: ${hasIt}`);
            return hasIt;
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target.isContentEditable
            ) return;
            if (e.key.length !== 1) return;

            const key = e.key.toLowerCase();
            inputBuffer.current = (inputBuffer.current + key).slice(-50);
            const buf = inputBuffer.current;
            console.log("[MagicSpells] buf:", buf);

            /* ── LUMOS ── EN: lumos | HE: ךוצםד (l=ך u=ו m=צ o=ם s=ד) */
            if (buf.endsWith("lumos") || buf.endsWith("ךוצםד")) {
                if (hasLearned("lumos")) {
                    setIsLumosOn(true);
                    sendOwlRef.current("לומוס מקסימה! ✨", "האור נדלק. הניע את העכבר.", "magic");
                } else {
                    sendOwlRef.current("ניסיון כושל", "אינך מכיר את הלחש הזה.", "error");
                }
                inputBuffer.current = "";

            /* ── NOX ── EN: nox | HE: מםס */
            } else if (buf.endsWith("nox") || buf.endsWith("מםס")) {
                if (hasLearned("nox")) {
                    setIsLumosOn(false);
                    sendOwlRef.current("נוקס.", "האור כבה.", "info");
                } else {
                    sendOwlRef.current("ניסיון כושל", "אינך מכיר את לחש הכיבוי.", "error");
                }
                inputBuffer.current = "";

            /* ── ALOHOMORA ── EN: alohomora | HE: שךםיםצםרש */
            } else if (buf.endsWith("alohomora") || buf.endsWith("שךםיםצםרש")) {
                if (hasLearned("alohomora")) {
                    setFlash("white");
                    setTimeout(() => { setFlash(null); setAlohomoraOpen(true); }, 350);
sendOwlRef.current("אלוהומורה! 🔓", "שערי הטירה נפתחו.", "magic");
                } else {
                    sendOwlRef.current("המנעול חסום 🔒", "עליך ללמוד את לחש הפתיחה קודם.", "error");
                }
                inputBuffer.current = "";

            /* ── ACCIO ── EN: accio | HE: שבבנם — לחש בסיס */
            } else if (buf.endsWith("accio") || buf.endsWith("שבבנם")) {
                sendOwlRef.current("אקיו! 🔍", "מזמין את הרשומות...", "magic");
                setTimeout(() => { window.location.href = "/search"; }, 600);
                inputBuffer.current = "";

            /* ── EXPELLIARMUS ── EN: expelliarmus | HE: קסקךךישרצוד */
            } else if (buf.endsWith("expelliarmus") || buf.endsWith("קסקךךישרצוד")) {
                if (hasLearned("expelliarmus")) {
                    setFlash("red");
                    setTimeout(() => setFlash(null), 600);
                    sendOwlRef.current("אקספליארמוס! ⚡", "הנשק הושבת!", "magic");
                } else {
                    sendOwlRef.current("ניסיון כושל", "עליך ללמוד לחש זה קודם.", "error");
                }
                inputBuffer.current = "";

            /* ── PROTEGO ── EN: protego | HE: סרחאקעח */
            } else if (buf.endsWith("protego") || buf.endsWith("סרחאקעח")) {
                if (hasLearned("protego")) {
                    setProtegoActive(true);
                    setTimeout(() => setProtegoActive(false), 3000);
                    sendOwlRef.current("פרוטגו! 🛡️", "המגן הוטל עליך.", "magic");
                } else {
                    sendOwlRef.current("ניסיון כושל", "עליך ללמוד לחש זה קודם.", "error");
                }
                inputBuffer.current = "";

            /* ── WINGARDIUM LEVIOSA ── EN: wingardium | HE: 'ןמעשרגןוצ */
            } else if (buf.endsWith("wingardium") || buf.endsWith("'ןמעשרגןוצ")) {
                if (hasLearned("wingardium")) {
                    setWingardiumActive(true);
                    setTimeout(() => setWingardiumActive(false), 3500);
                    sendOwlRef.current("וינגארדיום לביוסה! 🪄", "האובייקט מרחף!", "magic");
                } else {
                    sendOwlRef.current("ניסיון כושל", "עליך ללמוד לחש זה קודם.", "error");
                }
                inputBuffer.current = "";

            /* ── EXPECTO PATRONUM ── EN: expecto | HE: קסקקבאח */
            } else if (buf.endsWith("expecto") || buf.endsWith("קסקקבאח")) {
                if (hasLearned("expecto")) {
                    setExpectoActive(true);
                    setTimeout(() => setExpectoActive(false), 4000);
                    sendOwlRef.current("אקספקטו פטרונום! 🦌", "הפטרונוס שלך מופיע!", "magic");
                } else {
                    sendOwlRef.current("ניסיון כושל", "עליך ללמוד לחש זה קודם.", "error");
                }
                inputBuffer.current = "";

            /* ── תם ונשלם הקונדס ── */
            } else if (buf.endsWith("תם ונשלם הקונדס")) {
                setIsMischiefManaged(true);
                setTimeout(async () => {
                    const sb = createClient();
                    await sb.auth.signOut();
                    window.location.href = "/";
                }, 2500);
                inputBuffer.current = "";
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <>
            {/* ── תם ונשלם הקונדס ── */}
            {isMischiefManaged && (
                <div className="fixed inset-0 z-[30000] pointer-events-auto flex flex-col items-center justify-center">
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-[#1a1a1a] border-b-4 border-amber-900/50 animate-parchment-top flex items-end justify-center pb-10 shadow-2xl">
                        <div className="text-amber-500 font-cinzel text-2xl md:text-4xl animate-pulse tracking-[0.5em]">תם ונשלם הקונדס...</div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-[#1a1a1a] border-t-4 border-amber-900/50 animate-parchment-bottom flex items-start justify-center pt-10 shadow-2xl">
                        <div className="text-amber-500/50 text-sm font-crimson italic">הטירה ננעלת. נתראה בקרוב.</div>
                    </div>
                </div>
            )}

            {/* ── Flash (white = alohomora, red = expelliarmus) ── */}
            {flash === "white" && (
                <div className="fixed inset-0 z-[10001] bg-white/90 pointer-events-none"
                    style={{ animation: "spellFlash 0.5s ease-out forwards" }} />
            )}
            {flash === "red" && (
                <div className="fixed inset-0 z-[10001] pointer-events-none"
                    style={{ background: "radial-gradient(ellipse at center, rgba(220,38,38,0.5) 0%, rgba(220,38,38,0.15) 60%, transparent 100%)", animation: "spellFlash 0.6s ease-out forwards" }} />
            )}

            {/* ── LUMOS darkness ── */}
            {isLumosOn && (
                <div className="fixed inset-0 z-[9998] pointer-events-none"
                    style={{ background: `radial-gradient(circle 320px at ${mousePos.x}px ${mousePos.y}px, transparent 0%, rgba(0,0,0,0.2) 55%, rgba(0,0,0,0.97) 100%)` }} />
            )}

            {/* ── PROTEGO shield ── */}
            {protegoActive && (
                <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
                    <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(99,179,237,0.08) 0%, transparent 70%)" }} />
                    <div className="w-[90vmin] h-[90vmin] rounded-full border-2 border-blue-300/30"
                        style={{ animation: "protegoExpand 3s ease-out forwards", boxShadow: "0 0 60px rgba(99,179,237,0.25), inset 0 0 60px rgba(99,179,237,0.1)" }} />
                </div>
            )}

            {/* ── WINGARDIUM LEVIOSA ── */}
            {wingardiumActive && (
                <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="absolute text-2xl"
                            style={{
                                left: `${8 + (i * 8)}%`,
                                bottom: "10%",
                                animation: `wingardiumFloat 3.5s cubic-bezier(0.2,0.8,0.4,1) ${i * 0.12}s forwards`,
                                opacity: 0,
                            }}>
                            {["✨","⭐","💫","🌟","✦","•"][i % 6]}
                        </div>
                    ))}
                </div>
            )}

            {/* ── EXPECTO PATRONUM ── */}
            {expectoActive && (
                <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center"
                    style={{ animation: "fadeInOut 4s ease forwards" }}>
                    <div className="text-center" style={{ animation: "patronusArise 4s cubic-bezier(0.22,1,0.36,1) forwards" }}>
                        <div className="text-[12rem] leading-none" style={{ filter: "drop-shadow(0 0 40px rgba(186,230,253,0.9)) drop-shadow(0 0 80px rgba(186,230,253,0.6))", animation: "patronusGlow 4s ease forwards" }}>
                            🦌
                        </div>
                        <p className="font-cinzel text-blue-200/80 text-sm uppercase tracking-[0.5em] mt-4">אקספקטו פטרונום</p>
                    </div>
                </div>
            )}

            {/* ── ALOHOMORA portal ── */}
            {alohomoraOpen && (
                <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4"
                    style={{ animation: "fadeIn 0.3s ease forwards" }}
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); setAlohomoraOpen(false); }}>
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setAlohomoraOpen(false); }} />
                    <div className="relative w-full max-w-md rounded-[2rem] overflow-hidden"
                        style={{ animation: "portalIn 0.4s cubic-bezier(0.22,1,0.36,1) forwards" }}
                        onClick={e => e.stopPropagation()}>
                        <div className="absolute inset-0 rounded-[2rem] pointer-events-none"
                            style={{ boxShadow: "0 0 0 1px rgba(245,158,11,0.35), 0 0 60px rgba(245,158,11,0.2), inset 0 0 40px rgba(245,158,11,0.04)" }} />
                        <div className="bg-[#07090f] p-7">
                            <div className="text-center mb-6 pb-5 border-b border-white/[0.06]">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-3">
                                    <span className="text-amber-500 text-lg">🔓</span>
                                    <span className="font-cinzel text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/70">אלוהומורה</span>
                                </div>
                                <h2 className="font-cinzel text-2xl font-black text-white">שערי הטירה פתוחים</h2>
                                <p className="font-crimson text-white/30 text-base italic mt-1">לאן תרצה לנסוע?</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                {CASTLE_LINKS.map(link => (
                                    <a key={link.href} href={link.href}
                                        onClick={() => setAlohomoraOpen(false)}
                                        className="flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.06] hover:border-amber-500/30 hover:bg-amber-500/[0.05] transition-all group text-right">
                                        <span className="text-xl shrink-0">{link.emoji}</span>
                                        <span className="font-cinzel text-xs font-bold text-white/55 group-hover:text-white/90 transition-colors truncate">{link.label}</span>
                                    </a>
                                ))}
                            </div>
                            <p className="text-center text-white/15 text-[10px] font-cinzel mt-5 uppercase tracking-widest">לחץ בכל מקום לסגירה</p>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes parchment-top    { from { transform: translateY(-100%); } to { transform: translateY(0); } }
                @keyframes parchment-bottom { from { transform: translateY(100%);  } to { transform: translateY(0); } }
                .animate-parchment-top    { animation: parchment-top    1.2s cubic-bezier(0.4,0,0.2,1) forwards; }
                .animate-parchment-bottom { animation: parchment-bottom 1.2s cubic-bezier(0.4,0,0.2,1) forwards; }

                @keyframes spellFlash   { 0% { opacity:1; } 100% { opacity:0; } }
                @keyframes fadeIn       { from { opacity:0; } to { opacity:1; } }
                @keyframes portalIn     { from { opacity:0; transform: scale(0.9) translateY(16px); } to { opacity:1; transform: scale(1) translateY(0); } }

                @keyframes protegoExpand {
                    0%   { transform: scale(0.1); opacity: 0.9; }
                    60%  { transform: scale(1.05); opacity: 0.6; }
                    100% { transform: scale(1.2); opacity: 0; }
                }

                @keyframes wingardiumFloat {
                    0%   { opacity: 0; transform: translateY(0) scale(0.5) rotate(0deg); }
                    15%  { opacity: 1; }
                    80%  { opacity: 0.8; }
                    100% { opacity: 0; transform: translateY(-80vh) scale(1.2) rotate(360deg); }
                }

                @keyframes patronusArise {
                    0%   { opacity: 0; transform: scale(0.3) translateY(40px); filter: blur(20px); }
                    30%  { opacity: 1; transform: scale(1.05) translateY(-5px); filter: blur(0); }
                    70%  { opacity: 1; transform: scale(1) translateY(0); }
                    100% { opacity: 0; transform: scale(0.9) translateY(-20px); filter: blur(10px); }
                }

                @keyframes patronusGlow {
                    0%,100% { filter: drop-shadow(0 0 20px rgba(186,230,253,0.7)); }
                    50%     { filter: drop-shadow(0 0 60px rgba(186,230,253,1)) drop-shadow(0 0 120px rgba(186,230,253,0.5)); }
                }

                @keyframes fadeInOut {
                    0%   { opacity:0; }
                    15%  { opacity:1; }
                    75%  { opacity:1; }
                    100% { opacity:0; }
                }
            `}</style>
        </>
    );
}
