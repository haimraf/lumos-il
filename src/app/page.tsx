"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import HouseCupLeaderboard from "@/components/HouseCupLeaderboard";
import { Sparkles, Mail, Trophy, Users, Star, ArrowRight, X, Lock, ScrollText } from "lucide-react";

/**
 * LUMOS IL - THE INFINITE SCROLL LANDING V13.0
 * פתרון סופי: גלילה גלובלית (עכבר), מניעת התנגשות בלוגו, ועיצוב מגילה ארוכה.
 */

export default function Home() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const supabase = createClient();

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
    <main className="min-h-screen bg-[#020617] text-[#f8fafc] relative" dir="rtl">

      {/* רקע קסום קבוע */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_20%,_rgba(120,80,20,0.15)_0%,_transparent_50%)]"></div>
        <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>
      </div>

      <section className="relative z-10 flex flex-col items-center px-6 transition-all duration-1000">

        {/* LOGO - תמיד למעלה עם מרווח נדיב */}
        <div className="text-center pt-24 mb-20 space-y-0 animate-float">
          <h1 className="font-cinzel text-7xl md:text-[9rem] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-400 to-amber-700 drop-shadow-[0_0_40px_rgba(245,158,11,0.3)]">
            LUMOS<span className="opacity-90">IL</span>
          </h1>
          <p className="font-crimson text-amber-500/80 text-xl md:text-2xl tracking-[0.2em] italic uppercase font-bold -mt-6">
            The Magic Is Real
          </p>
        </div>

        {/* מכולת המעטפה והמכתב - עכשיו היא גמישה (Relative) */}
        <div className={`relative w-full max-w-[550px] transition-all duration-1000 ${isOpen ? 'mb-[100px]' : 'mb-20'}`}>

          <div
            role="button"
            tabIndex={0}
            onClick={() => !isOpen && setIsOpen(true)}
            className={`relative w-full h-[350px] transition-all duration-1000 cursor-pointer group ${isOpen ? 'opacity-0 pointer-events-none' : 'hover:scale-[1.02]'}`}
            style={{ perspective: "2000px" }}
          >
            {/* גוף המעטפה כשהיא סגורה */}
            <div className="absolute inset-0 bg-[#dcc49b] rounded-lg shadow-2xl border border-amber-900/20 overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-30"></div>
              <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none">
                <polygon points="0,0 275,175 550,0" fill="none" stroke="#8b4513" strokeWidth="1" />
                <polygon points="0,350 275,175 550,350" fill="#e5d1ae" />
              </svg>
              {/* חותם שעווה חיצוני */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60%] origin-top">
                <svg viewBox="0 0 550 210" className="w-full h-full drop-shadow-xl"><polygon points="0,0 550,0 275,210" fill="#eed9b7" /></svg>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-24 h-24 rounded-full shadow-2xl flex items-center justify-center border-2 border-red-950/20" style={{ background: "radial-gradient(circle, #b22222, #8b0000)" }}>
                  <div className="w-20 h-20 border border-white/10 rounded-full flex items-center justify-center font-cinzel text-3xl text-red-200 font-bold">L</div>
                </div>
              </div>
            </div>
          </div>

          {/* --- המכתב הפרוס (מגילה ארוכה ללא גלגלת פנימית) --- */}
          <div
            className={`transition-all duration-[1500ms] ease-out ${isOpen ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-20 absolute inset-0 pointer-events-none'}`}
          >
            <div
              className="w-full rounded-sm shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-amber-900/30 overflow-visible"
              style={{
                backgroundImage: "url('https://www.transparenttextures.com/patterns/old-map.png'), linear-gradient(135deg, #fdfaf5 0%, #f3eedc 100%)",
                color: "#2d1b0a",
                boxShadow: "inset 0 0 100px rgba(139, 69, 19, 0.15), 0 40px 100px rgba(0,0,0,0.6)"
              }}
            >
              <div className="p-8 md:p-16 text-right">
                {/* עיטור עליון */}
                <div className="flex flex-col items-center mb-12 border-b border-amber-900/10 pb-10">
                  <ScrollText size={48} className="text-amber-900/40 mb-4" />
                  <h3 className="font-cinzel text-sm tracking-[0.5em] uppercase opacity-60 mb-2">Lumos IL Academy</h3>
                  <h2 className="font-cinzel text-4xl md:text-5xl font-black tracking-tight text-center">הודעת קבלה רשמית</h2>
                </div>

                {/* תוכן המכתב */}
                <div className="space-y-10 font-crimson text-2xl md:text-3xl leading-relaxed italic">
                  <p className="font-bold not-italic text-4xl mb-4">קוסם/ת יקר/ה,</p>

                  <p>אנו שמחים להודיעך כי נמצא עבורך מקום בבית הספר הגבוה לקוסמות ולכישוף של קהילת <strong>Lumos IL</strong>. מכתב זה מהווה אישור רשמי להצטרפותך לקהילה הגדולה והאיכותית ביותר בישראל.</p>

                  <p>בהוגוורטס שלנו, תמצא/י שותפים לדרך, שיעורי כשפים, תחרויות בין בתים ומרחב בטוח לחלוק את אהבתך לעולם הקסמים. שערי הטירה פתוחים כעת בפניך.</p>

                  <div className="bg-amber-900/[0.03] p-8 rounded-lg border-r-8 border-amber-900/20 my-12 not-italic">
                    <h4 className="font-cinzel text-xl font-bold mb-6 uppercase tracking-widest text-amber-950">רשימת ציוד נדרשת:</h4>
                    <ul className="space-y-4 text-xl">
                      <li className="flex items-center gap-4">✨ שרביט אחד (ניתן לרכוש באוליבנדר)</li>
                      <li className="flex items-center gap-4">✨ גלימת בית רשמית</li>
                      <li className="flex items-center gap-4">✨ רוח הרפתקנית ותעוזה</li>
                      <li className="flex items-center gap-4">✨ נאמנות מוחלטת לחברי הבית שלך</li>
                    </ul>
                  </div>

                  <p>מצנפת המיון כבר מחכה בקוצר רוח ללחוש באוזנך את גורלך. האם תהיה גריפינדור אמיץ? או אולי סלית'רין שאפתן?</p>

                  <p className="text-xl opacity-70 border-t border-amber-900/10 pt-8">אנו מצפים לינשוף שלך לא יאוחר מהיום בחצות.<br /><br />בכבוד רב,<br /><strong className="text-3xl">הנהלת Lumos IL</strong></p>
                </div>

                {/* סיומת חגיגית עם כפתור */}
                <div className="flex flex-col items-center mt-20 space-y-12">
                  <div className="w-28 h-28 rounded-full bg-red-800 shadow-2xl flex items-center justify-center border-4 border-red-950/40 transform rotate-[-8deg] shadow-[0_0_40px_rgba(127,0,0,0.3)]">
                    <span className="font-cinzel text-white text-5xl font-bold opacity-90">L</span>
                  </div>

                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full bg-[#2d1b0a] text-[#fdfaf5] py-8 rounded-md font-cinzel text-3xl font-black hover:bg-amber-950 transition-all shadow-2xl flex items-center justify-center gap-6 group/btn active:scale-95"
                  >
                    היכנס בשערי הטירה
                    <ArrowRight className="group-hover:translate-x-[-12px] transition-transform rotate-180" size={32} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* הנחיה ראשונית */}
        {!isOpen && (
          <div className="mt-10 mb-20 animate-bounce opacity-60">
            <p className="font-crimson text-2xl italic flex items-center gap-4 text-amber-500/80">
              <Sparkles size={24} /> גע במעטפה כדי לגלות את גורלך
            </p>
          </div>
        )}
      </section>

      {/* שאר חלקי העמוד נדחפים למטה באופן טבעי */}
      <section className="relative z-10 py-40 bg-gradient-to-b from-transparent via-black/40 to-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <HouseCupLeaderboard />
        </div>
      </section>

      {/* AUTH MODAL - נשאר ללא שינוי פונקציונלי, רק שיפור עיצובי קטן */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-md overflow-hidden rounded-[3.5rem] border border-white/10 shadow-2xl bg-[#050505] p-10 md:p-14 animate-in fade-in zoom-in duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 left-8 text-white/20 hover:text-white transition-colors outline-none"><X size={24} /></button>
            <div className="flex flex-col items-center gap-8 w-full">
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
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/50 transition-all font-crimson text-lg text-white" placeholder="name@magic.co.il" required dir="ltr" />
                </div>
                <div className="space-y-2 text-right">
                  <label className="text-[10px] uppercase tracking-[0.4em] text-white/30 mr-4 font-cinzel">סיסמת קסם</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-amber-500/50 transition-all font-crimson text-lg text-white" placeholder="••••••••" required dir="ltr" />
                </div>
                <button type="submit" disabled={isLoading} className="group relative w-full overflow-hidden py-6 bg-amber-600 hover:bg-amber-500 text-amber-950 font-cinzel font-black text-xl uppercase tracking-[0.2em] rounded-2xl shadow-2xl transition-all active:scale-95 disabled:opacity-50">
                  <span className="relative z-10">{isLoading ? "מטיל לחש..." : (isLoginMode ? "התחברות" : "הרשמה לקהילה")}</span>
                </button>
              </form>
              <button onClick={() => setIsLoginMode(!isLoginMode)} className="font-crimson text-white/30 hover:text-white transition-all text-base underline underline-offset-[10px] outline-none">
                {isLoginMode ? "עדיין לא קיבלת מכתב זימון? הירשם" : "כבר יש לך מכתב? התחבר"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}