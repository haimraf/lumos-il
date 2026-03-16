"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import HouseCupLeaderboard from "@/components/HouseCupLeaderboard";
import { Sparkles, Mail, Trophy, Users, Star, ArrowRight, X, Lock, ScrollText, Wand2 } from "lucide-react";

/**
 * LUMOS IL - LANDING V14.2
 * שדרוגים: הוספת שורת טיפ סודית (Easter Egg Hint) מעוצבת בעמוד הראשי.
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
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const supabase = createClient();

  // Generate stars once on mount
  useEffect(() => {
    const generated = Array.from({ length: 80 }, () => ({
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
      if (profile?.house && profile.house !== 'Unsorted' && profile.house !== 'Unknown') {
        router.push('/dashboard');
      } else {
        router.push('/sorting');
      }
    };
    checkSession();
  }, [supabase, router]);

  const handleOpenEnvelope = () => {
    if (isOpen) return;
    setIsOpen(true);
    // Letter appears after envelope flip animation (~800ms)
    setTimeout(() => setLetterVisible(true), 800);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (isLoginMode) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthMessage({ type: 'error', text: "הלחש נכשל: " + error.message });
      else window.location.href = '/dashboard';
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthMessage({ type: 'error', text: error.message });
      else if (data?.user) {
        setAuthMessage({ type: 'success', text: "מכתב הקבלה נשלח!" });
        setIsLoginMode(true);
      }
    }
    setIsLoading(false);
  };

  if (isCheckingSession) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="w-16 h-16 border-t-2 border-amber-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <>
      <style>{`
        /* ========== STAR TWINKLE ========== */
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }

        /* ========== LOGO FLOAT ========== */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }

        /* ========== ENVELOPE WRAPPER ========== */
        .envelope-scene {
          perspective: 2000px;
          width: 100%;
          max-width: 550px;
        }

        /* The flip card container — holds both envelope and letter */
        .envelope-card {
          position: relative;
          width: 100%;
          transform-style: preserve-3d;
          transition: none; /* controlled via JS class */
        }

        /* When open: flip upward */
        .envelope-card.is-open {
          animation: envelopeFlip 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes envelopeFlip {
          0%   { transform: rotateX(0deg) scale(1);    opacity: 1; }
          40%  { transform: rotateX(-25deg) scale(1.03); opacity: 1; }
          70%  { transform: rotateX(8deg) scale(0.97);  opacity: 0.7; }
          100% { transform: rotateX(90deg) scale(0.9);  opacity: 0; }
        }

        /* Envelope hover idle bounce */
        .envelope-card:not(.is-open) {
          animation: envelopeIdle 3s ease-in-out infinite;
          cursor: pointer;
        }

        @keyframes envelopeIdle {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25%       { transform: translateY(-6px) rotate(0.4deg); }
          75%       { transform: translateY(-3px) rotate(-0.4deg); }
        }

        /* ========== FLAP OPEN ========== */
        .envelope-flap {
          transform-origin: top center;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .envelope-card.is-open .envelope-flap {
          transform: rotateX(-180deg);
        }

        /* ========== LETTER RISE ========== */
        .letter-rise {
          opacity: 0;
          transform: translateY(40px) scale(0.97);
          transition: opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1);
        }
        .letter-rise.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        /* ========== SEAL PULSE ========== */
        @keyframes sealPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(180,0,0,0.4); }
          50%       { box-shadow: 0 0 50px rgba(220,0,0,0.7), 0 0 80px rgba(180,0,0,0.3); }
        }
        .seal-pulse { animation: sealPulse 2.5s ease-in-out infinite; }

        /* ========== PARTICLE SPARKLES ========== */
        @keyframes particleFly {
          0%   { transform: translate(0,0) scale(0); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
        }
        .particle {
          position: absolute;
          pointer-events: none;
          animation: particleFly 1s ease-out forwards;
        }

        /* ========== MODAL ENTRANCE ========== */
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-enter { animation: modalIn 0.4s cubic-bezier(0.22,1,0.36,1) forwards; }

        /* ========== SHIMMER on CTA ========== */
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer-btn {
          background: linear-gradient(90deg, #92400e 0%, #d97706 40%, #fbbf24 50%, #d97706 60%, #92400e 100%);
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }

        /* ========== HINT TEXT ========== */
        @keyframes hintBounce {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50%       { transform: translateY(-6px); opacity: 1; }
        }
        .hint-bounce { animation: hintBounce 2s ease-in-out infinite; }
      `}</style>

      <main className="min-h-screen bg-[#020617] text-[#f8fafc] relative overflow-x-hidden font-crimson" dir="rtl">

        {/* ===== STARFIELD ===== */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          {stars.map((s, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                animation: `twinkle ${s.duration}s ${s.delay}s ease-in-out infinite`,
              }}
            />
          ))}
          {/* Ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[60%] bg-[radial-gradient(ellipse_at_50%_0%,_rgba(120,80,20,0.18)_0%,_transparent_60%)]" />
          <div className="absolute bottom-0 left-1/4 w-[60%] h-[40%] bg-[radial-gradient(ellipse_at_50%_100%,_rgba(60,20,100,0.12)_0%,_transparent_60%)]" />
        </div>

        {/* ===== HERO SECTION ===== */}
        <section className="relative z-10 flex flex-col items-center justify-center min-h-[92vh] px-6 py-12">

          {/* Logo */}
          <div className="text-center mb-12 animate-float">
            <h1 className="font-cinzel text-6xl md:text-[8rem] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-400 to-amber-700"
              style={{ filter: 'drop-shadow(0 0 40px rgba(245,158,11,0.35))' }}>
              LUMOS<span className="opacity-90">IL</span>
            </h1>
            <p className="font-crimson text-amber-500/80 text-xl md:text-2xl tracking-[0.2em] italic uppercase font-semibold -mt-3 md:-mt-5">
              The Magic Is Real
            </p>
          </div>

          {/* ===== ENVELOPE SCENE ===== */}
          <div className="envelope-scene flex flex-col items-center w-full relative">

            {/* המעטפה - עטופה בגריד שמתכווץ לאפס בצורה חלקה כשהמכתב נפתח */}
            <div className={`w-full grid transition-all duration-700 ease-in-out ${letterVisible ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
              <div className="overflow-hidden flex justify-center w-full">
                <div
                  className={`envelope-card w-full ${isOpen ? 'is-open' : ''}`}
                  onClick={handleOpenEnvelope}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleOpenEnvelope()}
                  aria-label="פתח את המעטפה"
                >
                  {/* גוף המעטפה */}
                  <div className="relative w-full h-[300px] md:h-[360px] rounded-lg overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.7)] border border-amber-900/20"
                    style={{ background: 'linear-gradient(160deg, #e8d5b0 0%, #dcc49b 50%, #c9ad82 100%)' }}>

                    {/* טקסטורת נייר */}
                    <div className="absolute inset-0 opacity-25 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />

                    {/* משולש תחתון */}
                    <svg className="absolute bottom-0 left-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 550 350">
                      <polygon points="0,350 275,185 550,350" fill="#c9a870" opacity="0.7" />
                      <polygon points="0,350 275,185 550,350" fill="none" stroke="#8b6a3a" strokeWidth="0.8" opacity="0.4" />
                    </svg>

                    {/* משולשים בצדדים */}
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 550 350">
                      <polygon points="0,0 0,350 275,185" fill="#d4b987" opacity="0.5" />
                      <polygon points="550,0 550,350 275,185" fill="#d4b987" opacity="0.5" />
                    </svg>

                    {/* הכיסוי הנפתח (משולש עליון) */}
                    <div className="envelope-flap absolute top-0 left-0 w-full origin-top">
                      <svg viewBox="0 0 550 210" className="w-full drop-shadow-lg">
                        <polygon points="0,0 550,0 275,210" fill="#eed9b7" />
                        <polygon points="0,0 550,0 275,210" fill="none" stroke="#8b6a3a" strokeWidth="0.8" opacity="0.3" />
                      </svg>
                    </div>

                    {/* חותמת שעווה */}
                    <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                      <div className="seal-pulse w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center border-2 border-red-950/30"
                        style={{ background: 'radial-gradient(circle at 35% 35%, #c0392b, #7b0000)' }}>
                        <div className="w-14 h-14 md:w-18 md:h-18 rounded-full border border-white/15 flex items-center justify-center font-cinzel text-2xl md:text-3xl text-red-100 font-bold select-none">
                          L
                        </div>
                      </div>
                    </div>

                    {/* אפקט ברק בהעברת עכבר */}
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* המכתב - עטוף בגריד שגובהו אפס במקור, ומתרחב בצורה חלקה רק כשנפתח */}
            <div className={`w-full grid transition-all duration-[1000ms] ease-in-out ${letterVisible ? 'grid-rows-[1fr] mt-4' : 'grid-rows-[0fr] mt-0'}`}>
              <div className="overflow-hidden w-full">
                <div className={`letter-rise w-full ${letterVisible ? 'visible' : ''}`}>
                  <div
                    className="w-full rounded-sm shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-amber-900/30 overflow-hidden"
                    style={{
                      backgroundImage: "url('https://www.transparenttextures.com/patterns/old-map.png'), linear-gradient(135deg, #fdfaf5 0%, #f5eedc 100%)",
                      color: "#2d1b0a",
                      boxShadow: "inset 0 0 80px rgba(139,69,19,0.12), 0 40px 100px rgba(0,0,0,0.6)",
                    }}
                  >
                    <div className="p-8 md:p-12 text-right">

                      {/* Header */}
                      <div className="flex flex-col items-center mb-10 border-b border-amber-900/10 pb-8">
                        <ScrollText size={40} className="text-amber-900/40 mb-3" />
                        <h3 className="font-cinzel text-xs tracking-[0.5em] uppercase opacity-60 mb-2">Lumos IL Academy</h3>
                        <h2 className="font-cinzel text-3xl md:text-4xl font-black tracking-tight text-center">הודעת קבלה רשמית</h2>
                      </div>

                      {/* Body */}
                      <div className="space-y-6 md:space-y-8 font-crimson text-xl md:text-2xl leading-relaxed italic">
                        <p className="font-bold not-italic text-2xl md:text-3xl mb-2">קוסם/ת יקר/ה,</p>

                        <p>אנו שמחים להודיעך כי נמצא עבורך מקום בבית הספר הגבוה לקוסמות ולכישוף של קהילת <strong>Lumos IL</strong>. מכתב זה מהווה אישור רשמי להצטרפותך לקהילה הגדולה והאיכותית ביותר בישראל.</p>

                        <p>בהוגוורטס שלנו, תמצא/י שותפים לדרך, שיעורי כשפים, תחרויות בין בתים ומרחב בטוח לחלוק את אהבתך לעולם הקסמים. שערי הטירה פתוחים כעת בפניך.</p>

                        <div className="bg-amber-900/[0.04] p-6 rounded-lg border-r-4 border-amber-800/25 my-8 not-italic">
                          <h4 className="font-cinzel text-lg font-bold mb-4 uppercase tracking-widest text-amber-950">רשימת ציוד נדרשת:</h4>
                          <ul className="space-y-3 text-lg md:text-xl">
                            <li className="flex items-center gap-3">✨ שרביט אחד (ניתן לרכוש באוליבנדר)</li>
                            <li className="flex items-center gap-3">✨ גלימת בית רשמית</li>
                            <li className="flex items-center gap-3">✨ רוח הרפתקנית ותעוזה</li>
                            <li className="flex items-center gap-3">✨ נאמנות מוחלטת לחברי הבית שלך</li>
                          </ul>
                        </div>

                        <p>מצנפת המיון כבר מחכה בקוצר רוח ללחוש באוזנך את גורלך. האם תהיה גריפינדור אמיץ? או אולי סלית'רין שאפתן?</p>

                        <p className="text-lg opacity-70 border-t border-amber-900/10 pt-6">
                          אנו מצפים לינשוף שלך לא יאוחר מהיום בחצות.<br /><br />
                          בכבוד רב,<br />
                          <strong className="text-2xl">הנהלת Lumos IL</strong>
                        </p>
                      </div>

                      {/* Seal + CTA */}
                      <div className="flex flex-col items-center mt-12 space-y-8">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center border-4 border-red-950/30 transform rotate-[-8deg]"
                          style={{
                            background: 'radial-gradient(circle at 35% 35%, #c0392b, #7b0000)',
                            boxShadow: '0 0 40px rgba(127,0,0,0.35)',
                          }}>
                          <span className="font-cinzel text-white text-4xl font-bold opacity-90 select-none">L</span>
                        </div>

                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="shimmer-btn group relative w-full text-amber-950 py-6 md:py-7 rounded-md font-cinzel text-xl md:text-2xl font-black shadow-2xl flex items-center justify-center gap-4 transition-transform active:scale-95 hover:scale-[1.01] overflow-hidden"
                        >
                          <span className="relative z-10">היכנס בשערי הטירה</span>
                          <ArrowRight className="relative z-10 group-hover:-translate-x-2 transition-transform rotate-180" size={24} />
                        </button>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* רמז ה-Easter Egg מתחת למעטפה */}
            <div className="mt-12 md:mt-20 px-6 py-2.5 rounded-full bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.08] hover:border-amber-500/30 transition-all duration-500 cursor-default group flex items-center gap-3 shadow-lg opacity-40 hover:opacity-100">
              <Wand2 size={16} className="text-amber-500/50 group-hover:text-amber-400 transition-colors" />
              <span className="font-crimson text-white/50 group-hover:text-white/90 text-sm md:text-base tracking-widest italic transition-colors">
                לחש קטן באפלה: נסו להקליד <kbd className="font-sans font-bold text-amber-500/80 mx-1 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">LUMOS</kbd> באוויר הפתוח...
              </span>
            </div>

          </div>

          {/* Hint */}
          {!isOpen && (
            <div className="mt-8 hint-bounce">
              <p className="font-crimson text-xl md:text-2xl italic flex items-center gap-3 text-amber-500/70">
                <Sparkles size={20} /> גע במעטפה כדי לגלות את גורלך
              </p>
            </div>
          )}
        </section>

        {/* ===== HOUSE CUP ===== */}
        <section className="relative z-10 py-20 bg-gradient-to-b from-transparent via-black/40 to-transparent">
          <div className="max-w-7xl mx-auto px-6">
            <HouseCupLeaderboard />
          </div>
        </section>

        {/* ===== AUTH MODAL ===== */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto py-10">
            <div
              className="fixed inset-0 bg-black/85 backdrop-blur-2xl"
              onClick={() => setIsModalOpen(false)}
            />
            <div className="modal-enter relative w-full max-w-md overflow-hidden rounded-[3rem] border border-white/10 shadow-2xl bg-[#050505] p-10 md:p-14 m-auto">

              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-8 left-8 text-white/20 hover:text-white/70 transition-colors outline-none hover:rotate-90 transition-transform duration-300"
              >
                <X size={22} />
              </button>

              <div className="flex flex-col items-center gap-8 w-full">
                {/* Icon */}
                <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  {isLoginMode ? <Lock size={32} /> : <Mail size={32} />}
                </div>

                <div className="text-center space-y-2">
                  <h3 className="font-cinzel text-4xl tracking-tight font-bold text-white">שערי הטירה</h3>
                  <p className="font-crimson text-lg text-amber-500/50 italic">הזן את פרטי הקסם שלך</p>
                </div>

                <form onSubmit={handleAuth} className="w-full space-y-6">
                  <div className="space-y-2 text-right">
                    <label className="text-[10px] uppercase tracking-[0.4em] text-white/30 mr-4 font-cinzel">דואר ינשופים</label>
                    <input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/50 transition-all font-crimson text-lg text-white placeholder-white/20"
                      placeholder="name@magic.co.il" required dir="ltr"
                    />
                  </div>
                  <div className="space-y-2 text-right">
                    <label className="text-[10px] uppercase tracking-[0.4em] text-white/30 mr-4 font-cinzel">סיסמת קסם</label>
                    <input
                      type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/50 transition-all font-crimson text-lg text-white placeholder-white/20"
                      placeholder="••••••••" required dir="ltr"
                    />
                  </div>

                  {authMessage && (
                    <div className={`text-sm p-4 rounded-xl border font-crimson text-center ${authMessage.type === 'error' ? 'bg-red-950/30 text-red-400 border-red-500/20' : 'bg-green-950/30 text-green-400 border-green-500/20'}`}>
                      {authMessage.text}
                    </div>
                  )}

                  <button
                    type="submit" disabled={isLoading}
                    className="shimmer-btn group relative w-full py-6 text-amber-950 font-cinzel font-black text-xl uppercase tracking-[0.2em] rounded-2xl shadow-2xl transition-transform active:scale-95 hover:scale-[1.01] disabled:opacity-50"
                  >
                    {isLoading ? "מטיל לחש..." : (isLoginMode ? "התחברות" : "הרשמה לקהילה")}
                  </button>
                </form>

                <button
                  onClick={() => setIsLoginMode(!isLoginMode)}
                  className="font-crimson text-white/30 hover:text-white/60 transition-all text-base underline underline-offset-[10px] outline-none"
                >
                  {isLoginMode ? "עדיין לא קיבלת מכתב זימון? הירשם" : "כבר יש לך מכתב? התחבר"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}