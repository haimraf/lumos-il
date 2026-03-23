"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import HouseCupLeaderboard from "@/components/HouseCupLeaderboard";
import {
  Sparkles, Mail, Trophy, Users, Star, ArrowRight, X, Lock,
  ScrollText, Wand2, Volume2, VolumeX, KeyRound, ChevronDown,
  MessageSquare, BookOpen, ShoppingBag, HelpCircle, GraduationCap,
  Map, Zap, Bell, Swords
} from "lucide-react";
import { useUIState } from "@/context/UIContext";
import HotTopicsTeaser from "@/components/HotTopicsTeaser";
import Link from "next/link";

/**
 * LUMOS IL - LANDING V15
 * ✅ סדר סקציות תוקן — HotTopics אחרי ה-hero, לפני הכל
 * ✅ עיצוב feature cards
 * ✅ ניווט קל לפורומים / ספרייה
 * ✅ כל הלוגיקה הקיימת שמורה
 */

export default function Home() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [letterVisible, setLetterVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stars, setStars] = useState<{ x: number; y: number; size: number; delay: number; duration: number }[]>([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const supabase = createClient();
  const { isMuted, toggleMute } = useUIState();

  useEffect(() => {
    const count = window.innerWidth < 768 ? 30 : 80;
    const generated = Array.from({ length: count }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      delay: Math.random() * 4,
      duration: Math.random() * 3 + 2,
    }));
    setStars(generated);
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsCheckingSession(false); return; }
      const { data: profile } = await supabase.from('profiles').select('house').eq('id', session.user.id).single();
      if (!profile || !profile.house || profile.house === 'Unsorted' || profile.house === 'Unknown') {
        router.push('/sorting');
      } else {
        router.push('/home');
      }
    };
    checkSession();
  }, [supabase, router]);

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen]);

  const handleOpenEnvelope = () => {
    if (isOpen) return;
    setIsOpen(true);
    setTimeout(() => setLetterVisible(true), 800);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthMessage(null);
    if (isLoginMode) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setAuthMessage({ type: 'error', text: "הלחש נכשל: " + error.message }); }
      else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prof } = await supabase.from('profiles').select('house').eq('id', user.id).single();
          window.location.href = (!prof?.house || prof.house === 'Unsorted') ? '/sorting' : '/home';
        } else {
          window.location.href = '/home';
        }
      }
    } else {
      if (password.length < 6) {
        setAuthMessage({ type: 'error', text: "סיסמת הקסם חייבת להכיל לפחות 6 תווים." });
        setIsLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthMessage({ type: 'error', text: error.message });
      else if (data?.user) {
        setAuthMessage({ type: 'success', text: "מכתב הקבלה נשלח! בדקו את תיבת המייל שלכם." });
        setIsLoginMode(true);
      }
    }
    setIsLoading(false);
  };

  if (isCheckingSession) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 border-t-4 border-amber-500 rounded-full animate-spin shadow-[0_0_30px_rgba(245,158,11,0.5)]" />
      <span className="font-cinzel tracking-[0.3em] text-amber-500/50 uppercase text-sm animate-pulse">פותח את שערי הטירה...</span>
    </div>
  );

  return (
    <>
      <style>{`
                @keyframes twinkle {
                    0%, 100% { opacity: 0.2; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.3); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float { animation: float 4s ease-in-out infinite; }

                .envelope-scene { perspective: 2000px; width: 100%; max-width: 550px; }
                .envelope-card { position: relative; width: 100%; transform-style: preserve-3d; transition: none; }
                .envelope-card.is-open { animation: envelopeFlip 0.9s cubic-bezier(0.4,0,0.2,1) forwards; }
                @keyframes envelopeFlip {
                    0%   { transform: rotateX(0deg) scale(1); opacity: 1; }
                    40%  { transform: rotateX(-25deg) scale(1.03); opacity: 1; }
                    70%  { transform: rotateX(8deg) scale(0.97); opacity: 0.7; }
                    100% { transform: rotateX(90deg) scale(0.9); opacity: 0; }
                }
                .envelope-card:not(.is-open) { animation: envelopeIdle 3s ease-in-out infinite; cursor: pointer; }
                @keyframes envelopeIdle {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    25%      { transform: translateY(-6px) rotate(0.4deg); }
                    75%      { transform: translateY(-3px) rotate(-0.4deg); }
                }
                .envelope-flap { transform-origin: top center; transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(0.4,0,0.2,1); }
                .envelope-card.is-open .envelope-flap { transform: rotateX(-180deg); }
                .letter-rise { opacity: 0; transform: translateY(40px) scale(0.97); transition: opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1); }
                .letter-rise.visible { opacity: 1; transform: translateY(0) scale(1); }
                @keyframes sealPulse {
                    0%, 100% { box-shadow: 0 0 20px rgba(180,0,0,0.4); }
                    50%      { box-shadow: 0 0 50px rgba(220,0,0,0.7), 0 0 80px rgba(180,0,0,0.3); }
                }
                .seal-pulse { animation: sealPulse 2.5s ease-in-out infinite; }
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(20px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
                .modal-enter { animation: modalIn 0.4s cubic-bezier(0.22,1,0.36,1) forwards; }
                .shimmer-btn {
                    background: linear-gradient(90deg, #92400e 0%, #d97706 40%, #fbbf24 50%, #d97706 60%, #92400e 100%);
                    background-size: 200% auto;
                    animation: shimmer 3s linear infinite;
                }
                @keyframes shimmer {
                    0%   { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes hintBounce {
                    0%, 100% { transform: translateY(0); opacity: 0.6; }
                    50%      { transform: translateY(-6px); opacity: 1; }
                }
                .hint-bounce { animation: hintBounce 2s ease-in-out infinite; }

                /* Scroll indicator */
                @keyframes scrollDown {
                    0%, 100% { transform: translateY(0); opacity: 0.4; }
                    50%      { transform: translateY(6px); opacity: 1; }
                }
                .scroll-hint { animation: scrollDown 2s ease-in-out infinite; }

                /* Feature cards */
                .feature-card {
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.05);
                    transition: all 0.4s ease;
                }
                .feature-card:hover {
                    background: rgba(245,158,11,0.04);
                    border-color: rgba(245,158,11,0.15);
                    transform: translateY(-4px);
                }

                /* Divider */
                .magic-divider {
                    background: linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.3) 50%, transparent 100%);
                    height: 1px;
                }
            `}</style>

      <main className="min-h-screen bg-[#020617] text-[#f8fafc] relative overflow-x-hidden font-crimson" dir="rtl">

        {/* ── STARFIELD ── */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          {stars.map((s, i) => (
            <div key={i} className="absolute rounded-full bg-white"
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.size}px`, height: `${s.size}px`, animation: `twinkle ${s.duration}s ${s.delay}s ease-in-out infinite` }} />
          ))}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[60%] bg-[radial-gradient(ellipse_at_50%_0%,_rgba(120,80,20,0.18)_0%,_transparent_60%)]" />
          <div className="absolute bottom-0 left-1/4 w-[60%] h-[40%] bg-[radial-gradient(ellipse_at_50%_100%,_rgba(60,20,100,0.12)_0%,_transparent_60%)]" />
        </div>

        {/* ── AUDIO TOGGLE ── */}
        <button onClick={toggleMute}
          className="fixed bottom-6 lg:bottom-10 left-6 lg:left-10 z-[200] p-4 rounded-full bg-[#020617]/80 backdrop-blur-xl border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:scale-110 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] outline-none group"
          title={isMuted ? "הפעל מוזיקת רקע" : "השתק מוזיקת רקע"}>
          {isMuted ? <VolumeX size={26} /> : <Volume2 size={26} />}
        </button>

        {/* ══════════════════════════════════════
                    HERO — Envelope
                ══════════════════════════════════════ */}
        <section className="relative z-10 flex flex-col items-center justify-center min-h-[92vh] px-4 sm:px-6 py-12">

          {/* Logo */}
          <div className="text-center mb-12 animate-float">
            <h1
              className="font-cinzel text-5xl sm:text-6xl md:text-[8rem] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-400 to-amber-700"
              style={{ filter: 'drop-shadow(0 0 40px rgba(245,158,11,0.35))' }}>
              LUMOS<span className="opacity-90">IL</span>
            </h1>
            <p className="font-crimson text-amber-500/80 text-lg md:text-2xl tracking-[0.2em] italic uppercase font-semibold -mt-2 md:-mt-5">
              הקסם הוא אמיתי
            </p>
          </div>

          {/* Envelope */}
          <div className="envelope-scene flex flex-col items-center w-full relative max-w-[90vw] md:max-w-[550px]">

            <div className={`w-full grid transition-all duration-700 ease-in-out ${letterVisible ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
              <div className="overflow-hidden flex justify-center w-full">
                <div className={`envelope-card w-full ${isOpen ? 'is-open' : ''}`}
                  onClick={handleOpenEnvelope} role="button" tabIndex={0}>
                  <div className="relative w-full h-[250px] sm:h-[300px] md:h-[360px] rounded-lg overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.7)] border border-amber-900/20"
                    style={{ background: 'linear-gradient(160deg, #e8d5b0 0%, #dcc49b 50%, #c9ad82 100%)' }}>
                    <div className="absolute inset-0 opacity-25 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
                    <svg className="absolute bottom-0 left-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 550 350">
                      <polygon points="0,350 275,185 550,350" fill="#c9a870" opacity="0.7" />
                      <polygon points="0,350 275,185 550,350" fill="none" stroke="#8b6a3a" strokeWidth="0.8" opacity="0.4" />
                    </svg>
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 550 350">
                      <polygon points="0,0 0,350 275,185" fill="#d4b987" opacity="0.5" />
                      <polygon points="550,0 550,350 275,185" fill="#d4b987" opacity="0.5" />
                    </svg>
                    <div className="envelope-flap absolute top-0 left-0 w-full origin-top">
                      <svg viewBox="0 0 550 210" className="w-full drop-shadow-lg" preserveAspectRatio="none" height="100%">
                        <polygon points="0,0 550,0 275,210" fill="#eed9b7" />
                        <polygon points="0,0 550,0 275,210" fill="none" stroke="#8b6a3a" strokeWidth="0.8" opacity="0.3" />
                      </svg>
                    </div>
                    <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                      <div className="seal-pulse w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center border-2 border-red-950/30"
                        style={{ background: 'radial-gradient(circle at 35% 35%, #c0392b, #7b0000)' }}>
                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border border-white/15 flex items-center justify-center font-cinzel text-xl md:text-3xl text-red-100 font-bold select-none">L</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* המכתב */}
            <div className={`w-full grid transition-all duration-[1000ms] ease-in-out ${letterVisible ? 'grid-rows-[1fr] mt-4' : 'grid-rows-[0fr] mt-0'}`}>
              <div className="overflow-hidden w-full">
                <div className={`letter-rise w-full ${letterVisible ? 'visible' : ''}`}>
                  <div className="w-full rounded-sm shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-amber-900/30 overflow-hidden"
                    style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/old-map.png'), linear-gradient(135deg, #fdfaf5 0%, #f5eedc 100%)", color: "#2d1b0a", boxShadow: "inset 0 0 80px rgba(139,69,19,0.12), 0 40px 100px rgba(0,0,0,0.6)" }}>
                    <div className="p-6 md:p-12 text-right">
                      <div className="flex flex-col items-center mb-8 border-b border-amber-900/10 pb-6">
                        <ScrollText size={36} className="text-amber-900/40 mb-3" />
                        <h3 className="font-cinzel text-[10px] md:text-xs tracking-[0.5em] uppercase opacity-60 mb-2 text-center">אקדמיית לומוס IL</h3>
                        <h2 className="font-cinzel text-2xl md:text-4xl font-black tracking-tight text-center">הודעת קבלה רשמית</h2>
                      </div>
                      <div className="space-y-6 font-crimson text-lg md:text-2xl leading-relaxed italic">
                        <p className="font-bold not-italic text-xl md:text-3xl mb-2">מכשפה או קוסם יקרים,</p>
                        <p>אנו שמחים להודיעכם כי נמצא עבורכם מקום בבית הספר הגבוה לקוסמות ולכישוף של קהילת <strong>Lumos IL</strong>. מכתב זה מהווה אישור רשמי להצטרפותכם לקהילה הגדולה ביותר בישראל.</p>
                        <p>בהוגוורטס שלנו, תמצאו שותפים לדרך, שיעורי כשפים, תחרויות בין בתים ומרחב בטוח לחלוק את אהבתכם לעולם הקסמים.</p>
                        <div className="bg-amber-900/[0.04] p-5 rounded-lg border-r-4 border-amber-800/25 not-italic">
                          <h4 className="font-cinzel text-base font-bold mb-4 uppercase tracking-widest text-amber-950">רשימת ציוד נדרשת:</h4>
                          <ul className="space-y-2 text-base md:text-xl">
                            <li>✨ שרביט אחד (ניתן לרכוש באוליבנדר)</li>
                            <li>✨ גלימת בית רשמית</li>
                            <li>✨ רוח הרפתקנית ותעוזה</li>
                            <li>✨ נאמנות מוחלטת לחברי הבית שלכם</li>
                          </ul>
                        </div>
                        <p>מצנפת המיון כבר מחכה בקוצר רוח ללחוש באוזניכם את גורלכם.</p>
                        <p className="text-base opacity-70 border-t border-amber-900/10 pt-6">
                          בכבוד רב,<br />
                          <strong className="text-xl md:text-2xl">הנהלת Lumos IL</strong>
                        </p>
                      </div>
                      <div className="flex flex-col items-center mt-10 space-y-6">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center border-4 border-red-950/30 rotate-[-8deg]"
                          style={{ background: 'radial-gradient(circle at 35% 35%, #c0392b, #7b0000)', boxShadow: '0 0 40px rgba(127,0,0,0.35)' }}>
                          <span className="font-cinzel text-white text-3xl font-bold select-none">L</span>
                        </div>
                        <button onClick={() => setIsModalOpen(true)}
                          className="shimmer-btn group relative w-full text-amber-950 py-5 md:py-7 rounded-md font-cinzel text-lg md:text-2xl font-black shadow-2xl flex items-center justify-center gap-4 transition-transform active:scale-95 hover:scale-[1.01]">
                          <span className="relative z-10">כניסה לשערי הטירה</span>
                          <ArrowRight className="relative z-10 group-hover:-translate-x-2 transition-transform rotate-180" size={24} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Easter egg */}
            <div className="mt-10 px-4 py-2.5 rounded-full bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-amber-500/20 transition-all duration-500 cursor-default group flex items-center gap-3 opacity-40 hover:opacity-100">
              <Wand2 size={14} className="text-amber-500/50 group-hover:text-amber-400 transition-colors shrink-0" />
              <span className="font-crimson text-white/50 group-hover:text-white/80 text-xs md:text-sm tracking-widest italic transition-colors">
                נסו להקליד <kbd className="font-sans font-bold text-amber-500/80 mx-1">LUMOS</kbd> באוויר...
              </span>
            </div>
          </div>

          {/* Hint */}
          {!isOpen && (
            <div className="mt-8 hint-bounce">
              <p className="font-crimson text-lg md:text-2xl italic flex items-center gap-3 text-amber-500/70">
                <Sparkles size={20} /> פתיחת המעטפה תחשוף את גורלכם
              </p>
            </div>
          )}

          {/* Scroll indicator */}
          {letterVisible && (
            <div className="mt-12 scroll-hint flex flex-col items-center gap-2 text-white/20">
              <span className="text-[10px] font-cinzel uppercase tracking-widest">גלול לגלות עוד</span>
              <ChevronDown size={16} />
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════
                    HOT TOPICS — מיד אחרי ה-hero
                ══════════════════════════════════════ */}
        <section className="relative z-10 py-16 md:py-20">
          <div className="magic-divider w-full mb-16" />
          <HotTopicsTeaser />
          <div className="magic-divider w-full mt-16" />
        </section>

        {/* ══════════════════════════════════════
                    FAQ ANNOUNCEMENT BANNER
                ══════════════════════════════════════ */}
        <section className="relative z-10 px-4 max-w-5xl mx-auto -mt-4 mb-4">
          <button onClick={() => setIsModalOpen(true)} className="group block w-full text-right">
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-l from-amber-900/25 via-amber-950/20 to-[#020617]/80 p-5 md:p-6 transition-all duration-500 hover:border-amber-400/50 hover:shadow-[0_0_40px_rgba(245,158,11,0.12)]">
              {/* glow blob */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(245,158,11,0.07),transparent_65%)] pointer-events-none" />
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

              <div className="relative flex items-center gap-4 md:gap-6">
                {/* icon */}
                <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.15)] group-hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] transition-all">
                  <HelpCircle size={24} className="text-amber-400" />
                </div>

                {/* text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 font-cinzel text-[9px] text-amber-400 uppercase tracking-[0.3em]">
                      <Zap size={8} className="fill-amber-400" /> חדש בטירה
                    </span>
                    <Bell size={12} className="text-amber-500/40 animate-pulse" />
                  </div>
                  <h3 className="font-cinzel font-black text-sm md:text-base text-white group-hover:text-amber-300 transition-colors">
                    פתחנו את ספר שאלות ותשובות הטירה!
                  </h3>
                  <p className="font-crimson text-white/40 text-sm md:text-base leading-snug mt-0.5">
                    כל הפיצ׳רים, הקסמים, בחינות O.W.L ו-N.E.W.T, ושאר סודות הטירה — במקום אחד
                  </p>
                </div>

                {/* cta */}
                <div className="shrink-0 flex items-center gap-1.5 font-cinzel text-[10px] uppercase tracking-widest text-amber-400/60 group-hover:text-amber-300 transition-colors">
                  לגלות <ArrowRight size={12} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </button>
        </section>

        {/* ══════════════════════════════════════
                    FEATURE CARDS — מה יש פה
                ══════════════════════════════════════ */}
        <section className="relative z-10 py-12 px-4 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-cinzel text-2xl md:text-4xl font-black text-white mb-2">מה מחכה לכם בטירה</h2>
            <p className="text-white/30 font-crimson text-lg italic">עולם שלם של קסם, קהילה ואהבה לסדרה</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              {
                icon: MessageSquare,
                title: "האולם הגדול",
                desc: "פורומים חיים לדיונים, תיאוריות, ספויילרים וכל מה שאוהבים",
                href: "/forums",
                color: "text-amber-400",
                glow: "rgba(245,158,11,0.08)",
                badge: null,
              },
              {
                icon: BookOpen,
                title: "הספרייה",
                desc: "לור, כתבות ועולם עשיר לחובבי הסדרה",
                href: "/library",
                color: "text-blue-400",
                glow: "rgba(37,99,235,0.08)",
                badge: null,
              },
              {
                icon: Map,
                title: "מפת הקונדסאים",
                desc: "ראו בזמן אמת היכן נמצאים חברי הקהילה ברחבי הטירה",
                href: "/map",
                color: "text-teal-400",
                glow: "rgba(20,184,166,0.08)",
                badge: null,
              },
              {
                icon: GraduationCap,
                title: "בחינות O.W.L & N.E.W.T",
                desc: "הוכיחו את שליטתכם בקסם המתקדם — לקוסמים בכירים בלבד",
                href: "/exams/owl",
                color: "text-purple-400",
                glow: "rgba(139,92,246,0.08)",
                badge: "חדש",
              },
              {
                icon: ShoppingBag,
                title: "סמטת דיאגון",
                desc: "חנות קסמים לרכישת שרביטים, גלימות וחפצים קסומים",
                href: "/shop",
                color: "text-emerald-400",
                glow: "rgba(5,150,105,0.08)",
                badge: null,
              },
              {
                icon: HelpCircle,
                title: "שאלות ותשובות",
                desc: "כל הסודות, הפיצ׳רים ו-Easter Eggs של הטירה מרוכזים במקום אחד",
                href: "/faq",
                color: "text-rose-400",
                glow: "rgba(244,63,94,0.08)",
                badge: "חדש",
              },
              {
                icon: Swords,
                title: "זירת הקרבות",
                desc: "אתגרו קוסמים אחרים לדו-קרב לחשים — הטובים ביותר עולים לטבלת האלופים",
                href: "/arena",
                color: "text-orange-400",
                glow: "rgba(251,146,60,0.08)",
                badge: "חדש",
              },
            ].map(({ icon: Icon, title, desc, color, glow, badge }) => (
              <button key={title} onClick={() => setIsModalOpen(true)}
                className="feature-card group rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden text-right cursor-pointer active:scale-[0.98] transition-transform">
                {badge && (
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/20 font-cinzel text-[8px] text-amber-400 uppercase tracking-wider">
                    {badge}
                  </span>
                )}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                  style={{ background: glow }}>
                  <Icon size={22} className={color} />
                </div>
                <div>
                  <h3 className={`font-cinzel font-black text-base mb-1 transition-colors text-white group-hover:${color}`}>{title}</h3>
                  <p className="text-white/35 text-sm font-crimson leading-relaxed">{desc}</p>
                </div>
                <div className={`flex items-center gap-1 text-xs font-cinzel uppercase tracking-widest ${color} opacity-0 group-hover:opacity-100 transition-opacity mt-auto`}>
                  <Lock size={10} /> להצטרף ולגלות
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════
                    HOUSE CUP
                ══════════════════════════════════════ */}
        <section className="relative z-10 py-16 md:py-20">
          <div className="magic-divider w-full mb-16" />
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <HouseCupLeaderboard />
          </div>
        </section>

        {/* ══════════════════════════════════════
                    EMPOWERMENT — בתחתית, לא חוסם
                ══════════════════════════════════════ */}
        <section className="relative z-10 py-16 px-6 max-w-4xl mx-auto text-center">
          <p className="font-crimson text-lg md:text-xl text-white/30 leading-relaxed italic">
            היסטוריית הקסם מעולם לא הייתה שלמה לולא המכשפות המבריקות שעיצבו אותה.<br />
            ב-Lumos IL בונים קהילה שוויונית, בטוחה ומעצימה — שבה לכל מכשפה וקוסם יש קול ומקום.
          </p>
        </section>

        {/* ══════════════════════════════════════
                    AUTH MODAL
                ══════════════════════════════════════ */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
            <div className="modal-enter relative w-full max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[2.5rem] border border-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.1)] bg-[#050505] p-8 md:p-10 z-10 my-auto"
              style={{ maxWidth: '420px' }}>
              <button onClick={() => setIsModalOpen(false)}
                className="absolute top-6 left-6 text-white/20 hover:text-amber-500 transition-all bg-white/5 p-2 rounded-full hover:rotate-90 duration-300">
                <X size={18} />
              </button>
              <div className="flex flex-col items-center gap-6 w-full">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  {isLoginMode ? <Lock size={28} /> : <Mail size={28} />}
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-cinzel text-2xl font-bold text-white">שערי הטירה</h3>
                  <p className="font-crimson text-sm text-amber-500/60 italic">הזנת פרטי הקסם שלך</p>
                </div>
                <form onSubmit={handleAuth} className="w-full space-y-5">
                  <div className="space-y-1.5 text-right">
                    <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-cinzel">דואר ינשופים</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-white/20"><Mail size={16} /></div>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pr-12 pl-4 py-3.5 outline-none focus:border-amber-500/50 transition-all font-crimson text-lg text-white placeholder-white/20"
                        placeholder="name@magic.co.il" required dir="ltr" />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-cinzel">סיסמת קסם</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-white/20"><KeyRound size={16} /></div>
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pr-12 pl-4 py-3.5 outline-none focus:border-amber-500/50 transition-all font-crimson text-lg text-white placeholder-white/20"
                        placeholder="••••••••" required dir="ltr" />
                    </div>
                  </div>
                  {authMessage && (
                    <div className={`text-sm p-4 rounded-xl border font-crimson text-center ${authMessage.type === 'error' ? 'bg-red-950/30 text-red-400 border-red-500/20' : 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20'}`}>
                      {authMessage.text}
                    </div>
                  )}
                  <button type="submit" disabled={isLoading}
                    className="shimmer-btn group relative w-full py-4 mt-2 text-amber-950 font-cinzel font-black text-lg uppercase tracking-[0.2em] rounded-xl shadow-2xl transition-all active:scale-95 hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-3">
                    {isLoading ? (
                      <><div className="w-5 h-5 border-t-2 border-amber-950 rounded-full animate-spin" />מטיל לחש...</>
                    ) : (isLoginMode ? "התחברות" : "הרשמה לקהילה")}
                  </button>
                </form>
                <button onClick={() => { setIsLoginMode(!isLoginMode); setAuthMessage(null); }}
                  className="font-crimson text-white/40 hover:text-white/80 transition-all text-sm border-b border-white/20 pb-0.5 hover:border-amber-500/50">
                  {isLoginMode ? "טרם התקבל מכתב זימון? להרשמה" : "כבר קיבלתם מכתב? להתחברות"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}